import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const REVERB_DEFAULT_ROOM_SIZE = 0.5;
export const REVERB_DEFAULT_WET = 0.3;
export const REVERB_DEFAULT_DRY = 0.7;

export const REVERB_HELP = {
  title: 'Reverb',
  description: 'Creates a sense of space and depth by simulating sound reflections in an acoustic environment. Uses convolution to model the acoustics of virtual rooms.',
  usage: 'Place after a sound source (oscillator, noise) or after a filter to add ambience. Adjust room size for smaller or larger virtual spaces. Balance wet and dry levels to control how prominent the effect is.',
  tips: [
    'Small room size (0.1-0.3): Tight, subtle ambience for drums and percussion',
    'Medium room size (0.3-0.6): Natural sounding spaces for most instruments',
    'Large room size (0.6-1.0): Big halls, cathedrals, atmospheric sounds',
    'Start with wet at 0.3 and adjust to taste',
    'Use high wet values (0.7+) for ambient/drone textures',
    'Keep dry signal high for clarity in the mix',
    'Combines well with filters for lush pad sounds',
  ],
  related: ['filter', 'oscillator', 'noise', 'output'],
};

export const REVERB_DEFINITION: ModuleDefinition = {
  type: 'reverb',
  label: 'Reverb',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'roomSize',
      label: 'Room Size',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: REVERB_DEFAULT_ROOM_SIZE,
    },
    {
      name: 'wet',
      label: 'Wet',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: REVERB_DEFAULT_WET,
    },
    {
      name: 'dry',
      label: 'Dry',
      controlType: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: REVERB_DEFAULT_DRY,
    },
  ],
  help: REVERB_HELP,
};

export class ReverbModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private convolver: ConvolverNode | undefined;
  private wetGain: GainNode | undefined;
  private dryGain: GainNode | undefined;
  private outputGain: GainNode | undefined;
  private currentRoomSize: number = REVERB_DEFAULT_ROOM_SIZE;

  constructor(id: string) {
    super(id, REVERB_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;

    // Create nodes
    this.inputGain = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.outputGain = ctx.createGain();

    // Set initial values
    const roomSize = this.getParam('roomSize') as number;
    const wet = this.getParam('wet') as number;
    const dry = this.getParam('dry') as number;

    this.currentRoomSize = roomSize;

    // Generate and set impulse response
    const impulseResponse = this.createImpulseResponse(this.roomSizeToDuration(roomSize));
    this.convolver.buffer = impulseResponse;

    // Set wet/dry levels
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = dry;

    // Connect signal path:
    // Input → [split] → Dry path → Output
    //           ↓
    //      Convolver (wet path) → Wet Gain → Output

    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);

    // Wet path
    this.inputGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);
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
    if (this.convolver !== undefined) {
      this.convolver.disconnect();
      this.convolver = undefined;
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
      case 'roomSize':
        if (typeof value === 'number' && this.convolver !== undefined) {
          const newRoomSize = Math.min(1, Math.max(0, value));
          // Only regenerate impulse response if roomSize changed significantly
          if (Math.abs(newRoomSize - this.currentRoomSize) > 0.05) {
            this.currentRoomSize = newRoomSize;
            const impulseResponse = this.createImpulseResponse(
              this.roomSizeToDuration(newRoomSize)
            );
            this.convolver.buffer = impulseResponse;
          }
        }
        break;
      case 'wet':
        if (typeof value === 'number' && this.wetGain !== undefined) {
          this.wetGain.gain.value = Math.min(1, Math.max(0, value));
        }
        break;
      case 'dry':
        if (typeof value === 'number' && this.dryGain !== undefined) {
          this.dryGain.gain.value = Math.min(1, Math.max(0, value));
        }
        break;
    }
  }

  /**
   * Convert room size (0-1) to impulse response duration in seconds
   */
  private roomSizeToDuration(roomSize: number): number {
    // Map 0-1 to 0.1-4.0 seconds
    return 0.1 + roomSize * 3.9;
  }

  /**
   * Create an impulse response buffer for the convolver
   * Generates a noise burst with exponential decay
   */
  private createImpulseResponse(duration: number): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with white noise
        const decay = Math.pow(1 - i / length, 2);
        // Add some variation for more natural sound
        const noise = Math.random() * 2 - 1;
        data[i] = noise * decay;
      }
    }

    return impulse;
  }
}
