import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const DISTORTION_DEFAULT_AMOUNT = 0.3;
export const DISTORTION_DEFAULT_MIX = 0.5;

export const DISTORTION_HELP = {
  title: 'Distortion',
  description:
    'Adds harmonic distortion and saturation to audio signals for grit, aggression, and warmth.',
  usage:
    'Place after oscillators or other sound sources to add character. Use mix to blend clean and distorted signals.',
  tips: [
    'Low amount (0.1-0.3): Subtle warmth and saturation',
    'Medium amount (0.4-0.6): Classic overdrive tone',
    'High amount (0.7-1.0): Heavy distortion, fuzz effects',
    'Use mix at 50% for parallel distortion',
    'Great for bass, drums, and lead sounds',
  ],
  related: ['oscillator', 'noise', 'filter', 'vca', 'output'],
};

export const DISTORTION_DEFINITION: ModuleDefinition = {
  type: 'distortion',
  label: 'Distortion',
  category: 'effect',
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
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: DISTORTION_DEFAULT_AMOUNT,
    },
    {
      name: 'mix',
      label: 'Mix',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: DISTORTION_DEFAULT_MIX,
    },
  ],
  help: DISTORTION_HELP,
};

/**
 * Create a distortion curve for the WaveShaperNode.
 * Uses aggressive mathematical shaping for real distortion sound.
 * The amount parameter controls the intensity (0-1).
 */
function makeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);

  // Scale amount exponentially for better control
  // At 0 = clean, at 1 = heavy distortion
  const drive = amount * amount * 20 + 1; // Range: 1 to 21

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1; // Input range: -1 to 1

    // Apply drive (pre-gain)
    let driven = x * drive;

    // Hard clipping with tanh (aggressive but musical)
    // This creates the actual distortion harmonics
    curve[i] = Math.tanh(driven);

    // Additional shaping for higher amounts
    if (amount > 0.5) {
      const extraDrive = (amount - 0.5) * 2; // 0 to 1 for upper half
      // Add some asymmetry for more grit
      const currentValue = curve[i] ?? 0;
      curve[i] = currentValue * (1 + extraDrive * 0.3) - extraDrive * 0.1;
    }
  }

  return curve;
}

export class DistortionModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private waveShaper: WaveShaperNode | undefined;
  private wetGain: GainNode | undefined;
  private dryGain: GainNode | undefined;
  private outputGain: GainNode | undefined;

  constructor(id: string) {
    super(id, DISTORTION_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;

    // Create nodes
    this.inputGain = ctx.createGain();
    this.waveShaper = ctx.createWaveShaper();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.outputGain = ctx.createGain();

    // Set initial values
    const amount = this.getParam('amount') as number;
    const mix = this.getParam('mix') as number;

    // Configure WaveShaper with distortion curve
    this.waveShaper.curve = makeDistortionCurve(amount) as Float32Array<ArrayBuffer>;
    this.waveShaper.oversample = '4x';

    // Set wet/dry levels
    this.wetGain.gain.value = mix;
    this.dryGain.gain.value = 1 - mix;

    // Connect signal path:
    // Input → [Split]
    //          ├→ Dry Gain ───────────────────────┐
    //          └→ WaveShaper → Wet Gain → Output ─┘

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Distortion path
    this.inputGain.connect(this.waveShaper);
    this.waveShaper.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);

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
    if (this.waveShaper !== undefined) {
      this.waveShaper.disconnect();
      this.waveShaper.curve = null;
      this.waveShaper = undefined;
    }
    if (this.wetGain !== undefined) {
      this.wetGain.disconnect();
      this.wetGain = undefined;
    }
    if (this.dryGain !== undefined) {
      this.dryGain.disconnect();
      this.dryGain = undefined;
    }
    if (this.outputGain !== undefined) {
      this.outputGain.disconnect();
      this.outputGain = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    switch (name) {
      case 'amount':
        if (typeof value === 'number' && this.waveShaper !== undefined) {
          const amountValue = Math.min(1, Math.max(0, value));
          // Regenerate the distortion curve with new amount
          this.waveShaper.curve = makeDistortionCurve(amountValue) as Float32Array<ArrayBuffer>;
        }
        break;
      case 'mix':
        if (typeof value === 'number') {
          const mixValue = Math.min(1, Math.max(0, value));
          if (this.wetGain !== undefined) {
            this.wetGain.gain.value = mixValue;
          }
          if (this.dryGain !== undefined) {
            this.dryGain.gain.value = 1 - mixValue;
          }
        }
        break;
    }
  }
}
