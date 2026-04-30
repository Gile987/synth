import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const MULTI_FX_HELP = {
  title: 'Multi-FX',
  description:
    'Multiple effects in one module. Ring modulation, bit crusher, wave folder, and tremolo for a wide range of sound mangling possibilities.',
  usage: 'Enable effects with toggles. Ring modulator creates metallic tones. Bit crusher reduces bit depth. Wave folder adds harmonics. Tremolo creates rhythmic volume swells. Use mix to blend with clean signal.',
  tips: [
    'Ring Mod: 100-500Hz for metallic, 1000Hz+ for sci-fi',
    'Bit Crusher: 8-12 bits for lo-fi warmth, 4-6 bits for harsh distortion, 1-2 bits for destruction',
    'Wave Folder: Low amount for subtle saturation, high amount for aggressive harmonics',
    'Tremolo: Slow rates (1-3Hz) for ambient swells, fast rates (5-10Hz) for aggressive pumping',
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
      name: 'waveFoldEnabled',
      label: 'Wave Folder',
      controlType: 'toggle',
      defaultValue: false,
    },
    {
      name: 'foldAmount',
      label: 'Fold Amount',
      controlType: 'slider',
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 3,
    },
    {
      name: 'tremoloEnabled',
      label: 'Tremolo',
      controlType: 'toggle',
      defaultValue: false,
    },
    {
      name: 'tremoloRate',
      label: 'Tremolo Rate',
      controlType: 'knob',
      min: 0.5,
      max: 20,
      defaultValue: 5,
    },
    {
      name: 'tremoloDepth',
      label: 'Tremolo Depth',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.7,
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

/**
 * Create a wave folding curve
 * Folds the waveform back when it exceeds thresholds
 * Higher fold amount = more aggressive folding
 */
function createWaveFoldCurve(foldAmount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1; // Input: -1 to 1
    
    // Apply wave folding
    // Scale input by fold amount, then use sin to create folding
    const scaled = x * foldAmount;
    // Use sine-based folding for smooth harmonics
    const folded = Math.sin(scaled * Math.PI / 2);
    
    curve[i] = folded;
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
  
  // Wave folder
  private waveFoldShaper: WaveShaperNode | undefined;
  
  // Tremolo
  private tremoloLFO: OscillatorNode | undefined;
  private tremoloGain: GainNode | undefined;

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
    
    // Wave folder
    this.waveFoldShaper = ctx.createWaveShaper();
    this.waveFoldShaper.oversample = 'none';
    
    // Tremolo: LFO modulates a gain node
    this.tremoloLFO = ctx.createOscillator();
    this.tremoloLFO.type = 'sine';
    this.tremoloGain = ctx.createGain();

    // Get params
    const mix = this.getParam('mix') as number;
    const ringModEnabled = this.getParam('ringModEnabled') as boolean;
    const ringModFreq = this.getParam('ringModFreq') as number;
    const bitCrushEnabled = this.getParam('bitCrushEnabled') as boolean;
    const bitDepth = this.getParam('bitDepth') as number;
    const waveFoldEnabled = this.getParam('waveFoldEnabled') as boolean;
    const foldAmount = this.getParam('foldAmount') as number;
    const tremoloEnabled = this.getParam('tremoloEnabled') as boolean;
    const tremoloRate = this.getParam('tremoloRate') as number;
    const tremoloDepth = this.getParam('tremoloDepth') as number;

    // Set values
    this.dryGain.gain.value = 1 - mix;
    this.wetGain.gain.value = mix;
    this.ringModCarrier.frequency.value = ringModFreq;
    this.tremoloLFO.frequency.value = tremoloRate;

    // FIXED CHAIN (always connected):
    // Input -> [Ring Mod] -> [Bit Crusher] -> [Wave Folder] -> [Tremolo] -> Wet -> Output
    // Input -> Dry -> Output
    
    // Dry path (always clean)
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet path - always goes through all effects in series
    // Input -> RingModMultiply -> BitCrushShaper -> WaveFoldShaper -> TremoloGain -> WetGain -> Output
    this.inputGain.connect(this.ringModMultiply);
    this.ringModMultiply.connect(this.bitCrushShaper);
    this.bitCrushShaper.connect(this.waveFoldShaper);
    this.waveFoldShaper.connect(this.tremoloGain);
    this.tremoloGain.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Ring mod carrier modulates the multiply gain
    if (ringModEnabled) {
      this.ringModCarrier.connect(this.ringModMultiply.gain);
      this.ringModMultiply.gain.value = 0;
    } else {
      this.ringModMultiply.gain.value = 1;
    }
    
    // Set curves or null for bypass
    (this.bitCrushShaper.curve as Float32Array | null) = bitCrushEnabled ? createBitCrushCurve(bitDepth) : null;
    (this.waveFoldShaper.curve as Float32Array | null) = waveFoldEnabled ? createWaveFoldCurve(foldAmount) : null;
    
    // Tremolo setup
    // LFO oscillates between -1 and 1, we scale it and offset to modulate gain
    // With depth 0: gain stays at 1
    // With depth 1: gain oscillates between 0 and 1 (full tremolo)
    if (tremoloEnabled) {
      this.tremoloLFO.connect(this.tremoloGain.gain);
      // Set initial gain - the LFO will modulate around this
      this.tremoloGain.gain.value = 1 - (tremoloDepth / 2);
    } else {
      // No tremolo - gain stays at 1
      this.tremoloGain.gain.value = 1;
    }

    // Start oscillators
    this.ringModCarrier.start();
    this.tremoloLFO.start();

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
    this.safeStopOscillator(this.ringModCarrier);
    this.safeDisconnect(this.ringModMultiply);
    if (this.bitCrushShaper !== undefined) {
      this.bitCrushShaper.curve = null;
    }
    this.safeDisconnect(this.bitCrushShaper);
    if (this.waveFoldShaper !== undefined) {
      this.waveFoldShaper.curve = null;
    }
    this.safeDisconnect(this.waveFoldShaper);
    this.safeStopOscillator(this.tremoloLFO);
    this.safeDisconnect(this.tremoloGain);
    this.safeDisconnect(this.inputGain);
    this.safeDisconnect(this.outputGain);
    this.safeDisconnect(this.dryGain);
    this.safeDisconnect(this.wetGain);
    this.ringModCarrier = undefined;
    this.ringModMultiply = undefined;
    this.bitCrushShaper = undefined;
    this.waveFoldShaper = undefined;
    this.tremoloLFO = undefined;
    this.tremoloGain = undefined;
    this.inputGain = undefined;
    this.outputGain = undefined;
    this.dryGain = undefined;
    this.wetGain = undefined;
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
      case 'waveFoldEnabled':
        if (this.waveFoldShaper !== undefined) {
          if (value) {
            const foldAmount = this.getParam('foldAmount') as number;
            (this.waveFoldShaper.curve as Float32Array | null) = createWaveFoldCurve(foldAmount);
          } else {
            this.waveFoldShaper.curve = null;
          }
        }
        break;
      case 'foldAmount':
        if (typeof value === 'number' && this.waveFoldShaper !== undefined) {
          const waveFoldEnabled = this.getParam('waveFoldEnabled') as boolean;
          if (waveFoldEnabled) {
            const foldValue = Math.min(10, Math.max(1, value));
            (this.waveFoldShaper.curve as Float32Array | null) = createWaveFoldCurve(foldValue);
          }
        }
        break;
      case 'tremoloEnabled':
        if (this.tremoloLFO !== undefined && this.tremoloGain !== undefined) {
          if (value) {
            // Enable: connect LFO to modulate gain
            this.tremoloLFO.connect(this.tremoloGain.gain);
            const tremoloDepth = this.getParam('tremoloDepth') as number;
            this.tremoloGain.gain.value = 1 - (tremoloDepth / 2);
          } else {
            // Disable: disconnect LFO, set gain to 1
            this.tremoloLFO.disconnect();
            this.tremoloGain.gain.value = 1;
          }
        }
        break;
      case 'tremoloRate':
        if (typeof value === 'number' && this.tremoloLFO !== undefined) {
          this.tremoloLFO.frequency.value = Math.min(20, Math.max(0.5, value));
        }
        break;
      case 'tremoloDepth':
        if (typeof value === 'number' && this.tremoloGain !== undefined) {
          const tremoloEnabled = this.getParam('tremoloEnabled') as boolean;
          if (tremoloEnabled) {
            const depthValue = Math.min(1, Math.max(0, value));
            // Center the gain around 1 - depth/2 so it oscillates properly
            this.tremoloGain.gain.value = 1 - (depthValue / 2);
          }
        }
        break;
    }
  }
}
