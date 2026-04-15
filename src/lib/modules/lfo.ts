import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const LFO_WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle'] as const;
export type LFOWaveform = typeof LFO_WAVEFORMS[number];

export const LFO_DEFAULT_RATE = 2;
export const LFO_DEFAULT_AMPLITUDE = 1;
export const LFO_DEFAULT_WAVEFORM: LFOWaveform = 'sine';

export const LFO_HELP = {
  title: 'LFO',
  description: 'Low Frequency Oscillator generates periodic waveforms at sub-audio rates (0.1Hz - 20Hz) for modulating other parameters like pitch, filter cutoff, or amplitude.',
  usage: 'Connect the LFO output to a control input (blue square) on another module, such as the filter cutoff or oscillator frequency. Adjust rate to change modulation speed, depth to change how far the parameter moves.',
  tips: [
    'Start with 0.5-5 Hz for vibrato and filter sweeps',
    'Try square wave for on/off or trill effects',
    'Sawtooth creates rising or falling ramps',
    'Depth of 500-2000 works well for filter cutoff modulation',
    'Depth of 10-100 works well for pitch vibrato',
    'Connect multiple LFOs at different rates for complex modulation',
  ],
  related: ['oscillator', 'filter'],
};

export const LFO_DEFINITION: ModuleDefinition = {
  type: 'lfo',
  label: 'LFO',
  category: 'modulation',
  version: '1.0.0',
  ports: [
    { name: 'output', type: 'control', direction: 'output' },
    { name: 'rate', type: 'control', direction: 'input' },
    { name: 'amplitude', type: 'control', direction: 'input' },
  ],
  params: [
    {
      name: 'rate',
      label: 'Rate',
      controlType: 'slider',
      min: 0.1,
      max: 20,
      step: 0.1,
      defaultValue: LFO_DEFAULT_RATE,
    },
    {
      name: 'amplitude',
      label: 'Depth',
      controlType: 'slider',
      min: 0,
      max: 5000,
      step: 10,
      defaultValue: 500,
    },
    {
      name: 'waveform',
      label: 'Waveform',
      controlType: 'select',
      defaultValue: LFO_DEFAULT_WAVEFORM,
      options: [...LFO_WAVEFORMS],
    },
  ],
  help: LFO_HELP,
};

/**
 * LFO module - Low Frequency Oscillator for modulation
 */
export class LFOModule extends BaseModule {
  private oscillatorNode: OscillatorNode | undefined;
  private gainNode: GainNode | undefined;
  private currentAmplitude = LFO_DEFAULT_AMPLITUDE;

  constructor(id: string) {
    super(id, LFO_DEFINITION);
    this.currentAmplitude = LFO_DEFAULT_AMPLITUDE;
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.oscillatorNode = ctx.createOscillator();
    this.gainNode = ctx.createGain();

    // Set initial values
    const rate = this.getParam('rate') as number;
    const depth = this.getParam('amplitude') as number;
    const waveform = this.getParam('waveform') as LFOWaveform;

    this.oscillatorNode.frequency.value = rate;
    this.oscillatorNode.type = waveform;
    // Scale the LFO output: oscillator (-1 to +1) * depth = modulation range
    this.gainNode.gain.value = depth;
    this.currentAmplitude = depth;

    // Connect oscillator to gain (scales the modulation amount)
    this.oscillatorNode.connect(this.gainNode);

    // Register ports
    this.registerPort({
      name: 'output',
      type: 'control',
      direction: 'output',
      node: this.gainNode,
    });

    this.registerPort({
      name: 'rate',
      type: 'control',
      direction: 'input',
      node: this.oscillatorNode.frequency,
    });

    this.registerPort({
      name: 'amplitude',
      type: 'control',
      direction: 'input',
      node: this.gainNode.gain,
    });

    this.oscillatorNode.start();
  }

  protected destroyNodes(): void {
    if (this.oscillatorNode !== undefined) {
      this.oscillatorNode.stop();
      this.oscillatorNode.disconnect();
      this.oscillatorNode = undefined;
    }
    if (this.gainNode !== undefined) {
      this.gainNode.disconnect();
      this.gainNode = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (this.oscillatorNode === undefined || this.gainNode === undefined) return;

    switch (name) {
      case 'rate':
        if (typeof value === 'number') {
          this.oscillatorNode.frequency.value = Math.min(
            20,
            Math.max(0.1, value)
          );
        }
        break;
      case 'amplitude':
        if (typeof value === 'number') {
          this.currentAmplitude = Math.min(5000, Math.max(0, value));
          this.gainNode.gain.value = this.currentAmplitude;
        }
        break;
      case 'waveform':
        if (typeof value === 'string' && LFO_WAVEFORMS.includes(value as LFOWaveform)) {
          this.oscillatorNode.type = value as LFOWaveform;
        }
        break;
    }
  }
}
