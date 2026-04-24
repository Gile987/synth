import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const MULTI_FX_HELP = {
  title: 'Multi-FX',
  description:
    'Multiple effects in one module. Ring modulation for metallic tones and bit crusher for lo-fi digital distortion.',
  usage: 'Enable effects with toggles. Ring modulator creates metallic/sci-fi sounds. Bit crusher reduces bit depth for digital distortion. Use mix to blend with clean signal.',
  tips: [
    'Ring Mod: 100-500Hz for metallic, 1000Hz+ for sci-fi',
    'Bit Crusher: 8-12 bits for lo-fi warmth, 4-6 bits for harsh distortion, 1-2 bits for destruction',
    'Mix control blends clean and effected signal',
  ],
  related: ['oscillator', 'filter', 'distortion'],
};

export const MULTI_FX_DEFINITION: ModuleDefinition = {
  type: 'multi-fx',
  label: 'Multi-FX',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'ringModEnabled',
      label: 'Ring Mod',
      controlType: 'toggle',
      defaultValue: false,
    },
    {
      name: 'ringModFreq',
      label: 'Ring Mod Freq',
      controlType: 'knob',
      min: 10,
      max: 2000,
      defaultValue: 100,
    },
    {
      name: 'bitCrushEnabled',
      label: 'Bit Crusher',
      controlType: 'toggle',
      defaultValue: false,
    },
    {
      name: 'bitDepth',
      label: 'Bit Depth',
      controlType: 'slider',
      min: 1,
      max: 16,
      step: 1,
      defaultValue: 8,
    },
    {
      name: 'mix',
      label: 'Mix',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.5,
    },
  ],
  help: MULTI_FX_HELP,
};

function createBitCrushCurve(bitDepth: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const levels = Math.pow(2, bitDepth - 1);
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    const quantized = Math.round(x * levels) / levels;
    curve[i] = quantized;
  }
  
  return curve;
}

export class MultiFxModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private outputGain: GainNode | undefined;
  private dryGain: GainNode | undefined;
  private wetGain: GainNode | undefined;
  
  // Ring mod - signal goes through here, carrier modulates a separate gain
  private ringModCarrier: OscillatorNode | undefined;
  private ringModMultiply: GainNode | undefined;
  
  // Bit crusher
  private bitCrushShaper: WaveShaperNode | undefined;

  constructor(id: string) {
    super(id, MULTI_FX_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;

    // Create nodes
    this.inputGain = ctx.createGain();
    this.outputGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    
    // Ring mod: multiply input by carrier
    this.ringModCarrier = ctx.createOscillator();
    this.ringModCarrier.type = 'sine';
    this.ringModMultiply = ctx.createGain();
    
    // Bit crusher
    this.bitCrushShaper = ctx.createWaveShaper();
    this.bitCrushShaper.oversample = 'none';

    // Get params
    const mix = this.getParam('mix') as number;
    const ringModEnabled = this.getParam('ringModEnabled') as boolean;
    const ringModFreq = this.getParam('ringModFreq') as number;
    const bitCrushEnabled = this.getParam('bitCrushEnabled') as boolean;
    const bitDepth = this.getParam('bitDepth') as number;

    // Set values
    this.dryGain.gain.value = 1 - mix;
    this.wetGain.gain.value = mix;
    this.ringModCarrier.frequency.value = ringModFreq;

    // FIXED CHAIN (always connected):
    // Input -> [Ring Mod] -> [Bit Crusher] -> Wet -> Output
    // Input -> Dry -> Output
    
    // Dry path (always clean)
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet path - always goes through both effects
    // Input -> RingModMultiply -> BitCrushShaper -> WetGain -> Output
    this.inputGain.connect(this.ringModMultiply);
    this.ringModMultiply.connect(this.bitCrushShaper);
    this.bitCrushShaper.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Ring mod carrier modulates the multiply gain
    // When enabled: carrier oscillates between -1 and 1, creating ring mod
    // When disabled: we set multiply gain to 1 (unity)
    if (ringModEnabled) {
      // Connect carrier to modulate
      this.ringModCarrier.connect(this.ringModMultiply.gain);
      // Set initial gain to 0 (it will be modulated by carrier)
      this.ringModMultiply.gain.value = 0;
    } else {
      // Bypass ring mod - set gain to 1
      this.ringModMultiply.gain.value = 1;
    }
    
    // Bit crusher - set curve or null
    (this.bitCrushShaper.curve as Float32Array | null) = bitCrushEnabled ? createBitCrushCurve(bitDepth) : null;

    // Start oscillator
    this.ringModCarrier.start();

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
    if (this.ringModCarrier !== undefined) {
      this.ringModCarrier.stop();
      this.ringModCarrier.disconnect();
      this.ringModCarrier = undefined;
    }
    if (this.ringModMultiply !== undefined) {
      this.ringModMultiply.disconnect();
      this.ringModMultiply = undefined;
    }
    if (this.bitCrushShaper !== undefined) {
      this.bitCrushShaper.disconnect();
      this.bitCrushShaper.curve = null;
      this.bitCrushShaper = undefined;
    }
    if (this.inputGain !== undefined) {
      this.inputGain.disconnect();
      this.inputGain = undefined;
    }
    if (this.outputGain !== undefined) {
      this.outputGain.disconnect();
      this.outputGain = undefined;
    }
    if (this.dryGain !== undefined) {
      this.dryGain.disconnect();
      this.dryGain = undefined;
    }
    if (this.wetGain !== undefined) {
      this.wetGain.disconnect();
      this.wetGain = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    switch (name) {
      case 'mix':
        if (typeof value === 'number' && this.dryGain !== undefined && this.wetGain !== undefined) {
          const mixValue = Math.min(1, Math.max(0, value));
          this.dryGain.gain.value = 1 - mixValue;
          this.wetGain.gain.value = mixValue;
        }
        break;
      case 'ringModEnabled':
        if (this.ringModCarrier !== undefined && this.ringModMultiply !== undefined) {
          if (value) {
            // Enable: connect carrier to modulate, set gain to 0 (will be modulated)
            this.ringModCarrier.connect(this.ringModMultiply.gain);
            this.ringModMultiply.gain.value = 0;
          } else {
            // Disable: disconnect carrier, set gain to 1 (unity)
            this.ringModCarrier.disconnect();
            this.ringModMultiply.gain.value = 1;
          }
        }
        break;
      case 'ringModFreq':
        if (typeof value === 'number' && this.ringModCarrier !== undefined) {
          this.ringModCarrier.frequency.value = Math.min(2000, Math.max(10, value));
        }
        break;
      case 'bitCrushEnabled':
        if (this.bitCrushShaper !== undefined) {
          if (value) {
            const bitDepth = this.getParam('bitDepth') as number;
            (this.bitCrushShaper.curve as Float32Array | null) = createBitCrushCurve(bitDepth);
          } else {
            this.bitCrushShaper.curve = null;
          }
        }
        break;
      case 'bitDepth':
        if (typeof value === 'number' && this.bitCrushShaper !== undefined) {
          const bitCrushEnabled = this.getParam('bitCrushEnabled') as boolean;
          if (bitCrushEnabled) {
            const bitDepthValue = Math.min(16, Math.max(1, value));
            (this.bitCrushShaper.curve as Float32Array | null) = createBitCrushCurve(bitDepthValue);
          }
        }
        break;
    }
  }
}
