import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
export type NoiseType = typeof NOISE_TYPES[number];

export const NOISE_DEFAULT_LEVEL = 0.5;
export const NOISE_DEFAULT_TYPE: NoiseType = 'white';

export const NOISE_HELP = {
  title: 'Noise Generator',
  description: 'Generates noise for percussion, textures, and sound effects. Essential for creating drums (hi-hats, snares), wind, rain, and industrial sounds.',
  usage: 'Use white noise for hi-hats and snares, pink noise for natural textures, brown noise for deep rumbling. Combine with filters and envelopes to shape the sound.',
  tips: [
    'White noise: All frequencies equal - crisp and bright',
    'Pink noise: More low frequencies - natural and balanced',
    'Brown noise: Mostly low frequencies - deep and rumbling',
    'Use with highpass filter for hi-hat sounds',
    'Use with bandpass filter for snare sounds',
    'Short envelope + noise = perfect percussion',
    'Connect sequencer gate for rhythmic noise bursts',
  ],
  related: ['filter', 'adsr', 'sequencer'],
};

export const NOISE_DEFINITION: ModuleDefinition = {
  type: 'noise',
  label: 'Noise',
  category: 'source',
  version: '1.0.0',
  ports: [
    { name: 'output', type: 'audio', direction: 'output' },
    { name: 'level', type: 'control', direction: 'input' },
  ],
  params: [
    {
      name: 'type',
      label: 'Type',
      controlType: 'select',
      defaultValue: NOISE_DEFAULT_TYPE,
      options: [...NOISE_TYPES],
    },
    {
      name: 'level',
      label: 'Level',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: NOISE_DEFAULT_LEVEL,
    },
  ],
  help: NOISE_HELP,
};

/**
 * Generate noise buffer of specified type and duration
 */
function createNoiseBuffer(ctx: AudioContext, type: NoiseType, duration: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  if (!data) {
    throw new Error('Failed to create noise buffer');
  }

  if (type === 'white') {
    // White noise: completely random
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Pink noise: 1/f - more low frequencies
    // Using Paul Kellet's method
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const sample = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] = sample * 0.11; // Normalize
      b6 = white * 0.115926;
    }
  } else if (type === 'brown') {
    // Brown noise: 1/f² - mostly low frequencies
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3.5; // Apply gain, don't accumulate
    }
  }

  return buffer;
}

/**
 * Noise generator module - produces white, pink, and brown noise
 */
export class NoiseModule extends BaseModule {
  private bufferSource: AudioBufferSourceNode | undefined;
  private gainNode: GainNode | undefined;

  constructor(id: string) {
    super(id, NOISE_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    
    // Create gain node for level control
    this.gainNode = ctx.createGain();
    
    const level = this.getNumberParam('level') ?? NOISE_DEFAULT_LEVEL;
    this.gainNode.gain.value = level;

    // Create noise buffer and source
    const noiseType = (this.getStringParam('type') as NoiseType) ?? NOISE_DEFAULT_TYPE;
    const buffer = createNoiseBuffer(ctx, noiseType);
    
    this.bufferSource = ctx.createBufferSource();
    this.bufferSource.buffer = buffer;
    this.bufferSource.loop = true;
    
    // Connect: buffer -> gain
    this.bufferSource.connect(this.gainNode);
    
    // Register ports
    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.gainNode,
    });

    this.registerPort({
      name: 'level',
      type: 'control',
      direction: 'input',
      node: this.gainNode.gain,
    });

    // Start playing
    this.bufferSource.start();
  }

  protected destroyNodes(): void {
    if (this.bufferSource !== undefined) {
      this.bufferSource.stop();
      this.bufferSource.disconnect();
      this.bufferSource = undefined;
    }
    if (this.gainNode !== undefined) {
      this.gainNode.disconnect();
      this.gainNode = undefined;
    }
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (this.gainNode === undefined) return;

    if (name === 'level' && typeof value === 'number') {
      this.gainNode.gain.value = Math.min(1, Math.max(0, value));
    } else if (name === 'type' && typeof value === 'string') {
      // Type changed - recreate only the buffer source, not the gain node
      // This preserves connections
      if (this.bufferSource !== undefined) {
        this.bufferSource.stop();
        this.bufferSource.disconnect();
      }
      
      // Create new buffer source with new noise type
      const noiseType = value as NoiseType;
      const buffer = createNoiseBuffer(this.context, noiseType);
      
      this.bufferSource = this.context.createBufferSource();
      this.bufferSource.buffer = buffer;
      this.bufferSource.loop = true;
      
      // Connect to existing gain node
      this.bufferSource.connect(this.gainNode);
      
      // Start playing
      this.bufferSource.start();
    }
  }
}
