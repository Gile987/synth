import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';
import { A4_FREQUENCY, MAX_FREQUENCY, MIN_FREQUENCY } from '$core/constants';

export const OSCILLATOR_WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle'] as const;
export type OscillatorWaveform = typeof OSCILLATOR_WAVEFORMS[number];

export const OSCILLATOR_DEFAULT_FREQUENCY = A4_FREQUENCY;
export const OSCILLATOR_DEFAULT_DETUNE = 0;
export const OSCILLATOR_DEFAULT_WAVEFORM: OscillatorWaveform = 'sine';

export const OSCILLATOR_HELP = {
  title: 'Oscillator',
  description: 'Generates continuous audio waveforms at a specified frequency. This is the fundamental sound source in modular synthesis.',
  usage: 'Connect the output to other modules (filters, effects) or directly to the output module. Adjust frequency to change pitch, detune for subtle variations, and waveform to change timbre.',
  tips: [
    'Start with sine wave for pure tones, try sawtooth/square for richer harmonics',
    'Use frequency input port for vibrato or pitch modulation',
    'Detune in cents: 100 cents = 1 semitone',
    'Multiple oscillators with slight detuning creates chorus effect',
  ],
  related: ['filter', 'output'],
};

export const OSCILLATOR_DEFINITION: ModuleDefinition = {
  type: 'oscillator',
  label: 'Oscillator',
  category: 'source',
  version: '1.0.0',
  ports: [
    { name: 'output', type: 'audio', direction: 'output' },
    { name: 'frequency', type: 'control', direction: 'input' },
  ],
  params: [
    {
      name: 'frequency',
      label: 'Frequency',
      controlType: 'knob',
      min: MIN_FREQUENCY,
      max: MAX_FREQUENCY,
      defaultValue: OSCILLATOR_DEFAULT_FREQUENCY,
      scale: 'log',
    },
    {
      name: 'detune',
      label: 'Detune',
      controlType: 'knob',
      min: -1200,
      max: 1200,
      defaultValue: OSCILLATOR_DEFAULT_DETUNE,
    },
    {
      name: 'waveform',
      label: 'Waveform',
      controlType: 'select',
      defaultValue: OSCILLATOR_DEFAULT_WAVEFORM,
      options: [...OSCILLATOR_WAVEFORMS],
    },
  ],
  help: OSCILLATOR_HELP,
};

/**
 * Oscillator module - generates continuous waveforms
 */
export class OscillatorModule extends BaseModule {
  private oscillatorNode: OscillatorNode | undefined;

  constructor(id: string) {
    super(id, OSCILLATOR_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.oscillatorNode = ctx.createOscillator();

    // Set initial values
    const frequency = this.getNumberParam('frequency') ?? OSCILLATOR_DEFAULT_FREQUENCY;
    const detune = this.getNumberParam('detune') ?? OSCILLATOR_DEFAULT_DETUNE;
    const waveform = this.getStringParam('waveform') ?? OSCILLATOR_DEFAULT_WAVEFORM;

    this.oscillatorNode.frequency.value = frequency;
    this.oscillatorNode.detune.value = detune;
    this.oscillatorNode.type = waveform as OscillatorWaveform;

    // Register ports
    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.oscillatorNode,
    });

    this.registerPort({
      name: 'frequency',
      type: 'control',
      direction: 'input',
      node: this.oscillatorNode.frequency,
    });

    this.oscillatorNode.start();
  }

  protected destroyNodes(): void {
    if (this.oscillatorNode !== undefined) {
      this.oscillatorNode.stop();
      this.oscillatorNode.disconnect();
      this.oscillatorNode = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (this.oscillatorNode === undefined) return;

    switch (name) {
      case 'frequency':
        if (typeof value === 'number') {
          this.oscillatorNode.frequency.value = Math.min(
            MAX_FREQUENCY,
            Math.max(MIN_FREQUENCY, value)
          );
        }
        break;
      case 'detune':
        if (typeof value === 'number') {
          this.oscillatorNode.detune.value = value;
        }
        break;
      case 'waveform':
        if (typeof value === 'string' && OSCILLATOR_WAVEFORMS.includes(value as OscillatorWaveform)) {
          this.oscillatorNode.type = value as OscillatorWaveform;
        }
        break;
    }
  }
}
