import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

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
  private constantSource: ConstantSourceNode | undefined;
  private gainNode: GainNode | undefined;
  private depthNode: GainNode | undefined;
  private gateInputNode: GainNode | undefined;
  private gateMonitor: ScriptProcessorNode | undefined;
  private isGateHigh = false;
  private lastGateValue = 0;
  private autoTriggerInterval: number | undefined;

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

    const depth = (this.getParam('depth') as number) ?? 1000;
    this.depthNode.gain.value = depth;

    this.constantSource.connect(this.gainNode);
    this.gainNode.connect(this.depthNode);

    // Create gate input using GainNode (allows external signals to be connected)
    this.gateInputNode = ctx.createGain();
    this.gateInputNode.gain.value = 1;

    // Use ScriptProcessorNode to monitor gate signal level
    this.gateMonitor = ctx.createScriptProcessor(256, 1, 1);
    this.gateInputNode.connect(this.gateMonitor);
    
    // Connect monitor to a silent gain node (not destination!) to keep it processing
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    this.gateMonitor.connect(silentGain);

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

    // Monitor gate input for changes using audio processing
    this.setupGateMonitoring();
    
    // Start auto-trigger for demo purposes
    this.startAutoTrigger();
  }

  private startAutoTrigger(): void {
    const loop = () => {
      if (!this.gainNode) return;

      const attack = this.getParam('attack') as number;
      const decay = this.getParam('decay') as number;
      const release = this.getParam('release') as number;

      const cycleTime = (attack + decay + 0.5 + release) * 1000;

      this.trigger();

      setTimeout(() => {
        this.release();
      }, (attack + decay + 0.5) * 1000);

      this.autoTriggerInterval = window.setTimeout(loop, cycleTime);
    };

    loop();
  }

  private setupGateMonitoring(): void {
    if (!this.gateMonitor) return;
    
    this.gateMonitor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      
      // Calculate average amplitude
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += Math.abs(inputData[i] ?? 0);
      }
      const avgAmplitude = sum / inputData.length;
      
      // Detect gate state (threshold at 0.3)
      const wasLow = this.lastGateValue <= 0.3;
      const isHigh = avgAmplitude > 0.3;
      
      if (isHigh && wasLow) {
        // Rising edge - trigger envelope
        console.log(`[ADSR ${this.id}] Gate ON (amplitude: ${avgAmplitude.toFixed(2)})`);
        this.trigger();
        this.isGateHigh = true;
      } else if (!isHigh && !wasLow) {
        // Falling edge - release envelope
        console.log(`[ADSR ${this.id}] Gate OFF (amplitude: ${avgAmplitude.toFixed(2)})`);
        this.release();
        this.isGateHigh = false;
      }
      
      this.lastGateValue = avgAmplitude;
    };
  }

  protected destroyNodes(): void {
    if (this.autoTriggerInterval !== undefined) {
      clearTimeout(this.autoTriggerInterval);
      this.autoTriggerInterval = undefined;
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
      this.gateMonitor.disconnect();
      this.gateMonitor = undefined;
    }
  }

  public trigger(): void {
    if (this.gainNode === undefined) return;

    console.log(`[ADSR ${this.id}] TRIGGER called`);

    const now = this.context.currentTime;
    const attack = Math.max(0.002, this.getParam('attack') as number); // Minimum 2ms attack
    const decay = this.getParam('decay') as number;
    const sustain = this.getParam('sustain') as number;

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
    const releaseTime = Math.max(0.005, this.getParam('release') as number); // Minimum 5ms release

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
