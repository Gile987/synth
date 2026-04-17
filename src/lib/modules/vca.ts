import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const VCA_DEFAULT_GAIN = 1;

export const VCA_HELP = {
  title: 'VCA',
  description: 'Voltage Controlled Amplifier controls the loudness of audio signals. The key feature is the CV (Control Voltage) input that allows other modules to modulate the volume dynamically.',
  usage: 'Place between your sound source and output. Use the Level slider for manual volume control. Connect ADSR to the CV input for shaped amplitude envelopes, or LFO for tremolo effects.',
  tips: [
    'Connect ADSR to CV input for percussive plucks or swelling pads',
    'Connect LFO to CV input for tremolo (volume wobble) effects',
    'Start with Level at 1.0 when using CV modulation',
    'VCA is essential for giving sounds dynamic character',
    'Use after a filter for classic subtractive synthesis voice',
    'Multiple VCAs can create complex layered amplitude patterns',
  ],
  related: ['adsr', 'lfo', 'oscillator'],
};

export const VCA_DEFINITION: ModuleDefinition = {
  type: 'vca',
  label: 'VCA',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
    { name: 'cv', type: 'control', direction: 'input' },
  ],
  params: [
    {
      name: 'gain',
      label: 'Level',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: VCA_DEFAULT_GAIN,
    },
  ],
  help: VCA_HELP,
};

export class VCAModule extends BaseModule {
  private gainNode: GainNode | undefined;

  constructor(id: string) {
    super(id, VCA_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.gainNode = ctx.createGain();

    // Start with gain at 0, let CV control it
    this.gainNode.gain.value = 0;

    this.registerPort({
      name: 'input',
      type: 'audio',
      direction: 'input',
      node: this.gainNode,
    });

    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.gainNode,
    });

    // CV controls the gain directly - 0 = silent, 1 = full volume
    this.registerPort({
      name: 'cv',
      type: 'control',
      direction: 'input',
      node: this.gainNode.gain,
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

    if (this.gainNode === undefined) return;

    if (name === 'gain' && typeof value === 'number') {
      this.gainNode.gain.value = Math.min(1, Math.max(0, value));
    }
  }
}
