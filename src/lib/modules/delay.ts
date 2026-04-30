import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';
import { calculateWetDryGain } from '$core/constants';

export const DELAY_DEFAULT_TIME = 0.3;
export const DELAY_DEFAULT_FEEDBACK = 0.3;
export const DELAY_DEFAULT_MIX = 0.5;

export const DELAY_HELP = {
  title: 'Delay',
  description:
    'Creates echo effects by delaying the input signal and mixing it back with the original.',
  usage:
    'Place after sound sources or other effects to add echo. Adjust time for short slapback or long echoes. Use feedback for multiple repeats.',
  tips: [
    'Short time (0.05-0.1s): Slapback echo',
    'Medium time (0.2-0.4s): Rockabilly/rock echo',
    'Long time (0.5-2s): Ambient/spacious echoes',
    'High feedback (0.7+): Infinite repeats effect',
    'Combine with Reverb for lush ambient sounds',
  ],
  related: ['reverb', 'filter', 'oscillator', 'output'],
};

export const DELAY_DEFINITION: ModuleDefinition = {
  type: 'delay',
  label: 'Delay',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'time',
      label: 'Time',
      controlType: 'slider',
      min: 0.01,
      max: 2.0,
      step: 0.01,
      defaultValue: DELAY_DEFAULT_TIME,
    },
    {
      name: 'feedback',
      label: 'Feedback',
      controlType: 'slider',
      min: 0,
      max: 0.95,
      step: 0.01,
      defaultValue: DELAY_DEFAULT_FEEDBACK,
    },
    {
      name: 'mix',
      label: 'Mix',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: DELAY_DEFAULT_MIX,
    },
  ],
  help: DELAY_HELP,
};

export class DelayModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private delayNode: DelayNode | undefined;
  private feedbackGain: GainNode | undefined;
  private wetGain: GainNode | undefined;
  private dryGain: GainNode | undefined;
  private outputGain: GainNode | undefined;

  constructor(id: string) {
    super(id, DELAY_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;

    // Create nodes
    this.inputGain = ctx.createGain();
    this.delayNode = ctx.createDelay(2.0); // max 2 seconds
    this.feedbackGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.outputGain = ctx.createGain();

    // Set initial values
    const time = this.getNumberParam('time') ?? DELAY_DEFAULT_TIME;
    const feedback = this.getNumberParam('feedback') ?? DELAY_DEFAULT_FEEDBACK;
    const mix = this.getNumberParam('mix') ?? DELAY_DEFAULT_MIX;

    this.delayNode.delayTime.value = time;
    this.feedbackGain.gain.value = feedback;
    const { wet, dry } = calculateWetDryGain(mix);
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = dry;

    // Connect signal path:
    // Input → [Split]
    //          ├→ Dry Gain ───────────────────────┐
    //          └→ Delay Node → Wet Gain → Output ─┤
    //               ↑______________________________┘ (feedback loop)

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Delay path with feedback
    this.inputGain.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    // Feedback loop: delay output goes back to delay input
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

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
    this.safeDisconnect(this.inputGain);
    this.safeDisconnect(this.delayNode);
    this.safeDisconnect(this.feedbackGain);
    this.safeDisconnect(this.wetGain);
    this.safeDisconnect(this.dryGain);
    this.safeDisconnect(this.outputGain);
    this.inputGain = undefined;
    this.delayNode = undefined;
    this.feedbackGain = undefined;
    this.wetGain = undefined;
    this.dryGain = undefined;
    this.outputGain = undefined;
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    switch (name) {
      case 'time':
        if (typeof value === 'number' && this.delayNode !== undefined) {
          this.delayNode.delayTime.value = Math.min(
            2.0,
            Math.max(0.01, value)
          );
        }
        break;
      case 'feedback':
        if (typeof value === 'number' && this.feedbackGain !== undefined) {
          // Keep feedback below 0.95 to prevent runaway feedback
          this.feedbackGain.gain.value = Math.min(
            0.95,
            Math.max(0, value)
          );
        }
        break;
      case 'mix':
        if (typeof value === 'number') {
          const { wet, dry } = calculateWetDryGain(value);
          if (this.wetGain !== undefined) {
            this.wetGain.gain.value = wet;
          }
          if (this.dryGain !== undefined) {
            this.dryGain.gain.value = dry;
          }
        }
        break;
    }
  }
}
