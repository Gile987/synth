import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';
import { DEFAULT_MASTER_GAIN } from '$core/constants';

export const OUTPUT_DEFAULT_GAIN = DEFAULT_MASTER_GAIN;
export const OUTPUT_DEFAULT_MUTE = false;

export const OUTPUT_HELP = {
  title: 'Output',
  description: 'The final stage that sends audio to your speakers or headphones. Every patch needs at least one output module to produce sound.',
  usage: 'Connect any audio source (oscillator, filter, effects) to the input port. Adjust gain to control overall volume. Use mute to silence output without changing gain settings.',
  tips: [
    'Always include an output module in your patch',
    'Start with low gain and increase gradually to protect your ears',
    'Mute is useful for comparing sounds before and after processing',
    'Multiple output modules can create stereo or multi-channel setups',
    'Watch for clipping - if audio sounds distorted, lower the gain',
  ],
  related: ['oscillator', 'filter'],
};

export const OUTPUT_DEFINITION: ModuleDefinition = {
  type: 'output',
  label: 'Output',
  category: 'output',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
  ],
  params: [
    {
      name: 'gain',
      label: 'Gain',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: OUTPUT_DEFAULT_GAIN,
    },
    {
      name: 'mute',
      label: 'Mute',
      controlType: 'toggle',
      defaultValue: OUTPUT_DEFAULT_MUTE,
    },
  ],
  help: OUTPUT_HELP,
};

/**
 * Output module - sends audio to speakers/headphones
 */
export class OutputModule extends BaseModule {
  private gainNode: GainNode | undefined;
  private masterGain = DEFAULT_MASTER_GAIN;
  private muted = OUTPUT_DEFAULT_MUTE;

  constructor(id: string) {
    super(id, OUTPUT_DEFINITION);
    this.masterGain = OUTPUT_DEFAULT_GAIN;
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.gainNode = ctx.createGain();
    this.gainNode.connect(ctx.destination);

    // Set initial gain
    this.gainNode.gain.value = this.muted ? 0 : this.masterGain;

    // Register port
    this.registerPort({
      name: 'input',
      type: 'audio',
      direction: 'input',
      node: this.gainNode,
    });
  }

  protected destroyNodes(): void {
    if (this.gainNode !== undefined) {
      this.gainNode.disconnect();
      this.gainNode = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    switch (name) {
      case 'gain':
        if (typeof value === 'number') {
          this.masterGain = Math.min(1, Math.max(0, value));
          this.updateGain();
        }
        break;
      case 'mute':
        if (typeof value === 'boolean') {
          this.muted = value;
          this.updateGain();
        }
        break;
    }
  }

  private updateGain(): void {
    if (this.gainNode !== undefined) {
      this.gainNode.gain.value = this.muted ? 0 : this.masterGain;
    }
  }
}
