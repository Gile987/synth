import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';
import { GATE_MONITOR_BUFFER_SIZE } from '$core/constants';
import workletUrl from './adsr-gate-monitor.worklet.js?url';

const GATE_THRESHOLD = 0.3;
const GATE_ANALYSER_FFT_SIZE = 512;
const ADSR_GATE_MONITOR_WORKLET_NAME = 'adsr-gate-monitor';

export const ADSR_DEFAULT_ATTACK = 0.1;
export const ADSR_DEFAULT_DECAY = 0.3;
export const ADSR_DEFAULT_SUSTAIN = 0.7;
export const ADSR_DEFAULT_RELEASE = 0.5;

export const ADSR_HELP = {
  title: 'ADSR Envelope',
  description: 'Attack-Decay-Sustain-Release envelope generator shapes sound over time. Essential for giving sounds character - punchy bass, swelling pads, plucky leads, or fading drones. The envelope auto-triggers in a loop so you can hear the effect immediately.',
  usage: 'Connect the envelope output to filter cutoff, oscillator frequency, or output gain. The envelope cycles automatically (attack → decay → sustain → release → repeat). Use Depth to control how much the target parameter moves (1000-3000 for filter cutoff, 10-100 for pitch).',
  tips: [
    'Short attack (0.01) = punchy, percussive sounds',
    'Long attack (1+) = swelling, pad-like sounds',
    'Sustain at 0 = the sound fades completely after decay',
    'Sustain at 1 = full volume held during gate',
    'Use on filter cutoff for "wah" effects without an LFO',
    'Try Release at 2+ seconds for long ambient tails',
    'Depth of 2000 works well for filter cutoff modulation',
    'Percussive: Attack 0.01, Decay 0.2, Sustain 0, Release 0.3',
    'Pad: Attack 0.5, Decay 0.5, Sustain 0.8, Release 2.0',
  ],
  related: ['oscillator', 'filter', 'output'],
};

export const ADSR_DEFINITION: ModuleDefinition = {
  type: 'adsr',
  label: 'ADSR',
  category: 'modulation',
  version: '1.0.0',
  ports: [
    { name: 'gate', type: 'gate', direction: 'input' },
    { name: 'output', type: 'control', direction: 'output' },
  ],
  params: [
    {
      name: 'attack',
      label: 'Attack',
      controlType: 'slider',
      min: 0,
      max: 5,
      step: 0.01,
      defaultValue: ADSR_DEFAULT_ATTACK,
    },
    {
      name: 'decay',
      label: 'Decay',
      controlType: 'slider',
      min: 0,
      max: 5,
      step: 0.01,
      defaultValue: ADSR_DEFAULT_DECAY,
    },
    {
      name: 'sustain',
      label: 'Sustain',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: ADSR_DEFAULT_SUSTAIN,
    },
    {
      name: 'release',
      label: 'Release',
      controlType: 'slider',
      min: 0,
      max: 10,
      step: 0.01,
      defaultValue: ADSR_DEFAULT_RELEASE,
    },
    {
      name: 'depth',
      label: 'Depth',
      controlType: 'slider',
      min: 0,
      max: 5000,
      step: 10,
      defaultValue: 1000,
    },
  ],
  help: ADSR_HELP,
};

export class ADSRModule extends BaseModule {
  private static gateMonitorWorkletLoaders = new WeakMap<AudioContext, Promise<void>>();

  private constantSource: ConstantSourceNode | undefined;
  private gainNode: GainNode | undefined;
  private depthNode: GainNode | undefined;
  private gateInputNode: GainNode | undefined;
  private gateMonitor: AudioWorkletNode | undefined;
  private gateAnalyser: AnalyserNode | undefined;
  private gateAnalyserBuffer = new Float32Array(GATE_ANALYSER_FFT_SIZE);
  private gatePollInterval: number | undefined;
  private silentGain: GainNode | undefined;
  private isGateHigh = false;
  private autoTriggerInterval: number | undefined;
  private autoTriggerReleaseTimeout: number | undefined;

  constructor(id: string) {
    super(id, ADSR_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.constantSource = ctx.createConstantSource();
    this.constantSource.offset.value = 1;

    this.gainNode = ctx.createGain();
    this.depthNode = ctx.createGain();

    this.gainNode.gain.value = 0;

    const depth = this.getNumberParam('depth') ?? 1000;
    this.depthNode.gain.value = depth;

    this.constantSource.connect(this.gainNode);
    this.gainNode.connect(this.depthNode);

    // Create gate input using GainNode (allows external signals to be connected)
    this.gateInputNode = ctx.createGain();
    this.gateInputNode.gain.value = 1;

    this.silentGain = ctx.createGain();
    this.silentGain.gain.value = 0;

    this.registerPort({
      name: 'gate',
      type: 'gate',
      direction: 'input',
      node: this.gateInputNode,
    });

    this.registerPort({
      name: 'output',
      type: 'control',
      direction: 'output',
      node: this.depthNode,
    });

    this.constantSource.start();

    // Monitor gate input for changes using AudioWorklet when available
    this.setupGateMonitoring();
    
    // Start auto-trigger for demo purposes
    this.startAutoTrigger();
  }

  private startAutoTrigger(): void {
    const loop = () => {
      if (!this.gainNode) return;

      const attack = this.getNumberParam('attack') ?? ADSR_DEFAULT_ATTACK;
      const decay = this.getNumberParam('decay') ?? ADSR_DEFAULT_DECAY;
      const release = this.getNumberParam('release') ?? ADSR_DEFAULT_RELEASE;

      const cycleTime = (attack + decay + 0.5 + release) * 1000;

      this.trigger();

      this.autoTriggerReleaseTimeout = window.setTimeout(() => {
        this.release();
      }, (attack + decay + 0.5) * 1000);

      this.autoTriggerInterval = window.setTimeout(loop, cycleTime);
    };

    loop();
  }

  private setupGateMonitoring(): void {
    if (!this.gateInputNode || !this.silentGain) return;

    this.setupAnalyserGateMonitoring();

    if (typeof AudioWorkletNode !== 'undefined' && this.context.audioWorklet) {
      void this.setupAudioWorkletGateMonitoring();
    }
  }

  private static ensureGateMonitorWorklet(context: AudioContext): Promise<void> {
    const existingLoader = ADSRModule.gateMonitorWorkletLoaders.get(context);
    if (existingLoader) {
      return existingLoader;
    }

    const loader = context.audioWorklet.addModule(workletUrl)
      .catch((error) => {
        ADSRModule.gateMonitorWorkletLoaders.delete(context);
        throw error;
      });

    ADSRModule.gateMonitorWorkletLoaders.set(context, loader);
    return loader;
  }

  private async setupAudioWorkletGateMonitoring(): Promise<void> {
    try {
      await ADSRModule.ensureGateMonitorWorklet(this.context);

      if (this.state === 'disposed' || !this.gateInputNode || !this.silentGain) {
        return;
      }

      this.stopAnalyserGateMonitoring();

      this.gateMonitor = new AudioWorkletNode(this.context, ADSR_GATE_MONITOR_WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          threshold: GATE_THRESHOLD,
          bufferSize: GATE_MONITOR_BUFFER_SIZE,
        },
      });

      this.gateMonitor.port.onmessage = (event: MessageEvent<{ type?: string; avgAmplitude?: number }>) => {
        const message = event.data;
        if (message.type === 'gate-on') {
          this.setGate(true);
        } else if (message.type === 'gate-off') {
          this.setGate(false);
        }
      };

      this.gateInputNode.connect(this.gateMonitor);
      this.gateMonitor.connect(this.silentGain);
    } catch {
      if (this.state !== 'disposed') {
        this.setupAnalyserGateMonitoring();
      }
    }
  }

  private setupAnalyserGateMonitoring(): void {
    if (!this.gateInputNode || !this.silentGain || this.gateAnalyser) {
      return;
    }

    this.gateAnalyser = this.context.createAnalyser();
    this.gateAnalyser.fftSize = GATE_ANALYSER_FFT_SIZE;
    this.gateInputNode.connect(this.gateAnalyser);
    this.gateAnalyser.connect(this.silentGain);

    const pollGate = () => {
      if (!this.gateAnalyser) return;

      this.gateAnalyser.getFloatTimeDomainData(this.gateAnalyserBuffer as Float32Array<ArrayBuffer>);

      let sum = 0;
      const startIndex = this.gateAnalyserBuffer.length - GATE_MONITOR_BUFFER_SIZE;
      for (let i = startIndex; i < this.gateAnalyserBuffer.length; i += 1) {
        sum += Math.abs(this.gateAnalyserBuffer[i] ?? 0);
      }

      const avgAmplitude = sum / GATE_MONITOR_BUFFER_SIZE;
      this.setGate(avgAmplitude > GATE_THRESHOLD);
    };

    pollGate();

    const pollIntervalMs = Math.max(4, Math.round((GATE_MONITOR_BUFFER_SIZE / this.context.sampleRate) * 1000));
    this.gatePollInterval = window.setInterval(pollGate, pollIntervalMs);
  }

  private stopAnalyserGateMonitoring(): void {
    if (this.gatePollInterval !== undefined) {
      clearInterval(this.gatePollInterval);
      this.gatePollInterval = undefined;
    }

    if (this.gateAnalyser !== undefined) {
      if (this.gateInputNode !== undefined) {
        try {
          this.gateInputNode.disconnect(this.gateAnalyser);
        } catch {
          // Analyser connection may already be gone.
        }
      }
      this.gateAnalyser.disconnect();
      this.gateAnalyser = undefined;
    }
  }

  protected destroyNodes(): void {
    if (this.autoTriggerInterval !== undefined) {
      clearTimeout(this.autoTriggerInterval);
      this.autoTriggerInterval = undefined;
    }
    if (this.autoTriggerReleaseTimeout !== undefined) {
      clearTimeout(this.autoTriggerReleaseTimeout);
      this.autoTriggerReleaseTimeout = undefined;
    }
    if (this.constantSource !== undefined) {
      this.constantSource.stop();
      this.constantSource.disconnect();
      this.constantSource = undefined;
    }
    if (this.gainNode !== undefined) {
      this.gainNode.disconnect();
      this.gainNode = undefined;
    }
    if (this.depthNode !== undefined) {
      this.depthNode.disconnect();
      this.depthNode = undefined;
    }
    if (this.gateInputNode !== undefined) {
      this.gateInputNode.disconnect();
      this.gateInputNode = undefined;
    }
    if (this.gateMonitor !== undefined) {
      this.gateMonitor.port.onmessage = null;
      this.gateMonitor.disconnect();
      this.gateMonitor = undefined;
    }
    this.stopAnalyserGateMonitoring();
    if (this.silentGain !== undefined) {
      this.silentGain.disconnect();
      this.silentGain = undefined;
    }
  }

  public trigger(): void {
    if (this.gainNode === undefined) return;

    const now = this.context.currentTime;
    const attack = Math.max(0.002, this.getNumberParam('attack') ?? ADSR_DEFAULT_ATTACK); // Minimum 2ms attack
    const decay = this.getNumberParam('decay') ?? ADSR_DEFAULT_DECAY;
    const sustain = this.getNumberParam('sustain') ?? ADSR_DEFAULT_SUSTAIN;

    this.gainNode.gain.cancelScheduledValues(now);

    // Start from 0 for proper envelope shape
    this.gainNode.gain.setValueAtTime(0, now);

    // Attack to full volume
    this.gainNode.gain.linearRampToValueAtTime(1, now + attack);

    // Decay to sustain level
    this.gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.01, sustain),
      now + attack + decay
    );
  }

  public release(): void {
    if (this.gainNode === undefined) return;

    const now = this.context.currentTime;
    const releaseTime = Math.max(0.005, this.getNumberParam('release') ?? ADSR_DEFAULT_RELEASE); // Minimum 5ms release

    this.gainNode.gain.cancelScheduledValues(now);

    // Release to 0 (completely silent)
    const currentValue = this.gainNode.gain.value;
    this.gainNode.gain.setValueAtTime(currentValue, now);
    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (name !== 'depth' || this.depthNode === undefined || typeof value !== 'number') {
      return;
    }

    this.depthNode.gain.value = Math.min(5000, Math.max(0, value));
  }
  public setGate(high: boolean): void {
    if (high && !this.isGateHigh) {
      this.trigger();
    } else if (!high && this.isGateHigh) {
      this.release();
    }
    this.isGateHigh = high;
  }
}
