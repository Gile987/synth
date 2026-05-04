import { BaseModule } from '$core/base-module';
import { calculateWetDryGain, clamp } from '$core/constants';
import type { ModuleDefinition, ParamValue } from '$types';

export const CHORUS_FLANGER_DEFAULT_RATE = 0.8;
export const CHORUS_FLANGER_DEFAULT_DEPTH = 0.003;
export const CHORUS_FLANGER_DEFAULT_DELAY = 0.012;
export const CHORUS_FLANGER_DEFAULT_FEEDBACK = 0.2;
export const CHORUS_FLANGER_DEFAULT_MIX = 0.45;

export const CHORUS_FLANGER_HELP = {
  title: 'Chorus/Flanger',
  description:
    'A modulated delay effect that covers wide chorus thickening and tighter flanger sweeps in one module.',
  usage:
    'Place it after oscillators, noise, or full patches. Use slower rate and longer delay for chorus width, or shorter delay with more feedback for jet-like flanging.',
  tips: [
    'Chorus: delay around 0.010-0.020s, low feedback, mix around 0.4-0.6',
    'Flanger: delay around 0.001-0.008s, higher feedback, rate around 0.2-1.5Hz',
    'Depth controls how far the delay time sweeps',
    'High feedback adds resonance but can get intense quickly',
    'Try it after distortion for animated stereo-like motion from a mono source',
  ],
  related: ['delay', 'filter', 'distortion', 'output'],
};

export const CHORUS_FLANGER_DEFINITION: ModuleDefinition = {
  type: 'chorus-flanger',
  label: 'Chorus/Flanger',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'rate',
      label: 'Rate',
      controlType: 'slider',
      min: 0.05,
      max: 10,
      step: 0.01,
      defaultValue: CHORUS_FLANGER_DEFAULT_RATE,
    },
    {
      name: 'depth',
      label: 'Depth',
      controlType: 'slider',
      min: 0,
      max: 0.01,
      step: 0.0001,
      defaultValue: CHORUS_FLANGER_DEFAULT_DEPTH,
    },
    {
      name: 'delay',
      label: 'Delay',
      controlType: 'slider',
      min: 0.001,
      max: 0.03,
      step: 0.0001,
      defaultValue: CHORUS_FLANGER_DEFAULT_DELAY,
    },
    {
      name: 'feedback',
      label: 'Feedback',
      controlType: 'slider',
      min: 0,
      max: 0.95,
      step: 0.01,
      defaultValue: CHORUS_FLANGER_DEFAULT_FEEDBACK,
    },
    {
      name: 'mix',
      label: 'Mix',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: CHORUS_FLANGER_DEFAULT_MIX,
    },
  ],
  help: CHORUS_FLANGER_HELP,
};

export class ChorusFlangerModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private delayNode: DelayNode | undefined;
  private feedbackGain: GainNode | undefined;
  private wetGain: GainNode | undefined;
  private dryGain: GainNode | undefined;
  private outputGain: GainNode | undefined;
  private modulationOscillator: OscillatorNode | undefined;
  private modulationDepth: GainNode | undefined;
  private modulationOffset: ConstantSourceNode | undefined;

  constructor(id: string) {
    super(id, CHORUS_FLANGER_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;

    this.inputGain = ctx.createGain();
    this.delayNode = ctx.createDelay(0.05);
    this.feedbackGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.outputGain = ctx.createGain();
    this.modulationOscillator = ctx.createOscillator();
    this.modulationDepth = ctx.createGain();
    this.modulationOffset = ctx.createConstantSource();

    const rate = clamp(this.getNumberParam('rate') ?? CHORUS_FLANGER_DEFAULT_RATE, 0.05, 10);
    const depth = clamp(this.getNumberParam('depth') ?? CHORUS_FLANGER_DEFAULT_DEPTH, 0, 0.01);
    const delay = clamp(this.getNumberParam('delay') ?? CHORUS_FLANGER_DEFAULT_DELAY, 0.001, 0.03);
    const feedback = clamp(this.getNumberParam('feedback') ?? CHORUS_FLANGER_DEFAULT_FEEDBACK, 0, 0.95);
    const mix = clamp(this.getNumberParam('mix') ?? CHORUS_FLANGER_DEFAULT_MIX, 0, 1);

    this.modulationOscillator.type = 'sine';
    this.modulationOscillator.frequency.value = rate;
    this.modulationDepth.gain.value = depth;
    this.modulationOffset.offset.value = delay;
    this.feedbackGain.gain.value = feedback;

    const { wet, dry } = calculateWetDryGain(mix);
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = dry;

    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    this.inputGain.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

    this.modulationOscillator.connect(this.modulationDepth);
    this.modulationDepth.connect(this.delayNode.delayTime);
    this.modulationOffset.connect(this.delayNode.delayTime);

    this.modulationOscillator.start();
    this.modulationOffset.start();

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
    this.safeStopOscillator(this.modulationOscillator);

    if (this.modulationOffset !== undefined) {
      try {
        this.modulationOffset.stop();
      } catch {
        // Constant source may already be stopped, ignore
      }
      this.safeDisconnect(this.modulationOffset);
    }

    this.safeDisconnect(this.modulationDepth);

    this.inputGain = undefined;
    this.delayNode = undefined;
    this.feedbackGain = undefined;
    this.wetGain = undefined;
    this.dryGain = undefined;
    this.outputGain = undefined;
    this.modulationOscillator = undefined;
    this.modulationDepth = undefined;
    this.modulationOffset = undefined;
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    switch (name) {
      case 'rate':
        if (typeof value === 'number' && this.modulationOscillator !== undefined) {
          this.modulationOscillator.frequency.value = clamp(value, 0.05, 10);
        }
        break;
      case 'depth':
        if (typeof value === 'number' && this.modulationDepth !== undefined) {
          this.modulationDepth.gain.value = clamp(value, 0, 0.01);
        }
        break;
      case 'delay':
        if (typeof value === 'number' && this.modulationOffset !== undefined) {
          this.modulationOffset.offset.value = clamp(value, 0.001, 0.03);
        }
        break;
      case 'feedback':
        if (typeof value === 'number' && this.feedbackGain !== undefined) {
          this.feedbackGain.gain.value = clamp(value, 0, 0.95);
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
