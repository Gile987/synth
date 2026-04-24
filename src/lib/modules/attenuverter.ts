import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const ATTENUVERTER_DEFAULT_AMOUNT = 1;

export const ATTENUVERTER_HELP = {
  title: 'Attenuverter',
  description: 'Attenuates (reduces) and/or inverts signals. Essential utility for controlling modulation depth and polarity.',
  usage: 'Place between a modulation source (LFO, envelope) and destination (filter, VCA) to control how much effect the modulation has. Use negative values to invert the modulation direction.',
  tips: [
    '+1.0: Full signal passes through unchanged',
    '+0.5: Signal reduced by half',
    '0.0: No signal (silence)',
    '-0.5: Signal reduced and inverted',
    '-1.0: Full inverted signal',
    'Use after LFO to control filter modulation depth',
    'Use before VCA to shape envelope response',
    'Invert an envelope for ducking effects',
  ],
  related: ['lfo', 'adsr', 'vca', 'filter'],
};

export const ATTENUVERTER_DEFINITION: ModuleDefinition = {
  type: 'attenuverter',
  label: 'Attenuverter',
  category: 'modulation',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'amount',
      label: 'Amount',
      controlType: 'slider',
      min: -1,
      max: 1,
      step: 0.01,
      defaultValue: ATTENUVERTER_DEFAULT_AMOUNT,
    },
  ],
  help: ATTENUVERTER_HELP,
};

export class AttenuverterModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private outputGain: GainNode | undefined;

  constructor(id: string) {
    super(id, ATTENUVERTER_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.inputGain = ctx.createGain();
    this.outputGain = ctx.createGain();

    // Get initial value
    const amount = this.getParam('amount') as number;

    // Set gain (amount ranges from -1 to 1)
    this.inputGain.gain.value = amount;

    // Connect
    this.inputGain.connect(this.outputGain);

    // Register ports
    this.registerPort({
      name: 'input',
      type: 'audio',
      direction: 'input',
      node: this.inputGain,
    });

    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.outputGain,
    });
  }

  protected destroyNodes(): void {
    if (this.inputGain !== undefined) {
      this.inputGain.disconnect();
      this.inputGain = undefined;
    }
    if (this.outputGain !== undefined) {
      this.outputGain.disconnect();
      this.outputGain = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (this.inputGain === undefined) return;

    if (name === 'amount' && typeof value === 'number') {
      // Clamp to valid range -1 to 1
      this.inputGain.gain.value = Math.min(1, Math.max(-1, value));
    }
  }
}
