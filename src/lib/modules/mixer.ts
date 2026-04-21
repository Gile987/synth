import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const MIXER_DEFAULT_LEVEL = 0.7;
export const MIXER_DEFAULT_MASTER = 1.0;

export const MIXER_HELP = {
  title: '4-Channel Mixer',
  description:
    'Combines up to four audio signals with individual level controls and a master output.',
  usage:
    'Connect multiple sound sources or modulation sources to the inputs, adjust each channel\'s level to balance the mix, and use the master to control overall volume.',
  tips: [
    'Use to mix multiple oscillators for thick sounds',
    'Combine LFO outputs for complex modulation',
    'Blend noise with oscillator tones',
    'Route multiple sequencers for layered patterns',
    'Adjust master to prevent clipping when mixing loud sources',
  ],
  related: ['oscillator', 'lfo', 'noise', 'vca', 'adsr'],
};

export const MIXER_DEFINITION: ModuleDefinition = {
  type: 'mixer',
  label: 'Mixer',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input1', type: 'audio', direction: 'input' },
    { name: 'input2', type: 'audio', direction: 'input' },
    { name: 'input3', type: 'audio', direction: 'input' },
    { name: 'input4', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'level1',
      label: 'Level 1',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: MIXER_DEFAULT_LEVEL,
    },
    {
      name: 'level2',
      label: 'Level 2',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: MIXER_DEFAULT_LEVEL,
    },
    {
      name: 'level3',
      label: 'Level 3',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: MIXER_DEFAULT_LEVEL,
    },
    {
      name: 'level4',
      label: 'Level 4',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: MIXER_DEFAULT_LEVEL,
    },
    {
      name: 'master',
      label: 'Master',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: MIXER_DEFAULT_MASTER,
    },
  ],
  help: MIXER_HELP,
};

export class MixerModule extends BaseModule {
  private input1Gain: GainNode | undefined;
  private input2Gain: GainNode | undefined;
  private input3Gain: GainNode | undefined;
  private input4Gain: GainNode | undefined;
  private masterGain: GainNode | undefined;
  private outputGain: GainNode | undefined;

  constructor(id: string) {
    super(id, MIXER_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;

    // Create gain nodes for each input channel
    this.input1Gain = ctx.createGain();
    this.input2Gain = ctx.createGain();
    this.input3Gain = ctx.createGain();
    this.input4Gain = ctx.createGain();

    // Create master gain for overall level control
    this.masterGain = ctx.createGain();

    // Create output gain
    this.outputGain = ctx.createGain();

    // Get initial parameter values
    const level1 = this.getParam('level1') as number;
    const level2 = this.getParam('level2') as number;
    const level3 = this.getParam('level3') as number;
    const level4 = this.getParam('level4') as number;
    const master = this.getParam('master') as number;

    // Set initial gain values
    this.input1Gain.gain.value = level1;
    this.input2Gain.gain.value = level2;
    this.input3Gain.gain.value = level3;
    this.input4Gain.gain.value = level4;
    this.masterGain.gain.value = master;

    // Connect signal paths:
    // All inputs through their gains to master
    this.input1Gain.connect(this.masterGain);
    this.input2Gain.connect(this.masterGain);
    this.input3Gain.connect(this.masterGain);
    this.input4Gain.connect(this.masterGain);

    // Master to output
    this.masterGain.connect(this.outputGain);

    // Register input ports
    this.registerPort({
      name: 'input1',
      type: 'audio',
      direction: 'input',
      node: this.input1Gain,
    });

    this.registerPort({
      name: 'input2',
      type: 'audio',
      direction: 'input',
      node: this.input2Gain,
    });

    this.registerPort({
      name: 'input3',
      type: 'audio',
      direction: 'input',
      node: this.input3Gain,
    });

    this.registerPort({
      name: 'input4',
      type: 'audio',
      direction: 'input',
      node: this.input4Gain,
    });

    // Register output port
    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.outputGain,
    });
  }

  protected destroyNodes(): void {
    if (this.input1Gain !== undefined) {
      this.input1Gain.disconnect();
      this.input1Gain = undefined;
    }
    if (this.input2Gain !== undefined) {
      this.input2Gain.disconnect();
      this.input2Gain = undefined;
    }
    if (this.input3Gain !== undefined) {
      this.input3Gain.disconnect();
      this.input3Gain = undefined;
    }
    if (this.input4Gain !== undefined) {
      this.input4Gain.disconnect();
      this.input4Gain = undefined;
    }
    if (this.masterGain !== undefined) {
      this.masterGain.disconnect();
      this.masterGain = undefined;
    }
    if (this.outputGain !== undefined) {
      this.outputGain.disconnect();
      this.outputGain = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (typeof value !== 'number') return;

    // Clamp value between 0 and 1 to prevent distortion
    const clampedValue = Math.min(1, Math.max(0, value));

    switch (name) {
      case 'level1':
        if (this.input1Gain !== undefined) {
          this.input1Gain.gain.value = clampedValue;
        }
        break;
      case 'level2':
        if (this.input2Gain !== undefined) {
          this.input2Gain.gain.value = clampedValue;
        }
        break;
      case 'level3':
        if (this.input3Gain !== undefined) {
          this.input3Gain.gain.value = clampedValue;
        }
        break;
      case 'level4':
        if (this.input4Gain !== undefined) {
          this.input4Gain.gain.value = clampedValue;
        }
        break;
      case 'master':
        if (this.masterGain !== undefined) {
          this.masterGain.gain.value = clampedValue;
        }
        break;
    }
  }
}
