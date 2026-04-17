import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';
import { MAX_FILTER_Q, MAX_FREQUENCY, MIN_FILTER_Q, MIN_FREQUENCY } from '$core/constants';

export const FILTER_TYPES = [
  'lowpass',
  'highpass',
  'bandpass',
  'notch',
  'allpass',
  'peaking',
  'lowshelf',
  'highshelf',
] as const;
export type FilterType = typeof FILTER_TYPES[number];

export const FILTER_DEFAULT_FREQUENCY = 1000;
export const FILTER_DEFAULT_Q = 1;
export const FILTER_DEFAULT_GAIN = 0;
export const FILTER_DEFAULT_TYPE: FilterType = 'lowpass';

export const FILTER_HELP = {
  title: 'Filter',
  description: 'Shapes the timbre of audio by removing or boosting certain frequencies. Essential for subtractive synthesis and sound design.',
  usage: 'Connect audio input from an oscillator or other source. Adjust cutoff to control which frequencies pass through. Use resonance to emphasize frequencies near the cutoff point. Connect modulation sources (LFO, ADSR) to cutoff input for dynamic filter sweeps.',
  tips: [
    'Lowpass: removes high frequencies (classic "warm" filter sound)',
    'Highpass: removes low frequencies (thin, airy sounds)',
    'Bandpass: only allows a band of frequencies (telephone/radio effect)',
    'Modulate cutoff with an LFO for wah-wah effects',
    'Higher Q values create more resonant, vocal-like sweeps',
    'GAIN only works with: peaking, lowshelf, highshelf types',
    'For lowpass/highpass/bandpass, the gain slider has no effect',
    'ADSR/LFO connected to cutoff will ADD to the base frequency',
  ],
  related: ['oscillator', 'output', 'adsr'],
};

export const FILTER_DEFINITION: ModuleDefinition = {
  type: 'filter',
  label: 'Filter',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
    { name: 'cutoff', type: 'control', direction: 'input' },
  ],
  params: [
    {
      name: 'frequency',
      label: 'Cutoff',
      controlType: 'knob',
      min: MIN_FREQUENCY,
      max: MAX_FREQUENCY,
      defaultValue: FILTER_DEFAULT_FREQUENCY,
    },
    {
      name: 'q',
      label: 'Resonance',
      controlType: 'knob',
      min: MIN_FILTER_Q,
      max: MAX_FILTER_Q,
      defaultValue: FILTER_DEFAULT_Q,
    },
    {
      name: 'gain',
      label: 'Gain',
      controlType: 'knob',
      min: -40,
      max: 40,
      defaultValue: FILTER_DEFAULT_GAIN,
    },
    {
      name: 'filterType',
      label: 'Type',
      controlType: 'select',
      options: [...FILTER_TYPES],
      defaultValue: FILTER_DEFAULT_TYPE,
    },
  ],
  help: FILTER_HELP,
};

export class FilterModule extends BaseModule {
  private biquadFilter: BiquadFilterNode | undefined;

  constructor(id: string) {
    super(id, FILTER_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.biquadFilter = ctx.createBiquadFilter();

    const frequency = this.getParam('frequency') as number;
    const q = this.getParam('q') as number;
    const gain = this.getParam('gain') as number;
    const filterType = this.getParam('filterType') as FilterType;

    this.biquadFilter.frequency.value = frequency;
    this.biquadFilter.Q.value = q;
    this.biquadFilter.gain.value = gain;
    this.biquadFilter.type = filterType;

    this.registerPort({
      name: 'input',
      type: 'audio',
      direction: 'input',
      node: this.biquadFilter,
    });

    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.biquadFilter,
    });

    this.registerPort({
      name: 'cutoff',
      type: 'control',
      direction: 'input',
      node: this.biquadFilter.frequency,
    });
  }

  protected destroyNodes(): void {
    if (this.biquadFilter !== undefined) {
      this.biquadFilter.disconnect();
      this.biquadFilter = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (this.biquadFilter === undefined) return;

    switch (name) {
      case 'frequency':
        if (typeof value === 'number') {
          this.biquadFilter.frequency.value = Math.min(
            MAX_FREQUENCY,
            Math.max(MIN_FREQUENCY, value)
          );
        }
        break;
      case 'q':
        if (typeof value === 'number') {
          this.biquadFilter.Q.value = Math.min(
            MAX_FILTER_Q,
            Math.max(MIN_FILTER_Q, value)
          );
        }
        break;
      case 'gain':
        if (typeof value === 'number') {
          this.biquadFilter.gain.value = Math.min(40, Math.max(-40, value));
        }
        break;
      case 'filterType':
        if (typeof value === 'string' && FILTER_TYPES.includes(value as FilterType)) {
          this.biquadFilter.type = value as FilterType;
        }
        break;
    }
  }
}
