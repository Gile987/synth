import { BaseModule } from '$core/base-module';
import type { ModuleDefinition, ParamValue } from '$types';

export const SEQUENCER_DEFAULT_STEPS = 16;
export const SEQUENCER_DEFAULT_RATE = 4; // Steps per second (240 BPM with 16 steps)

export const SEQUENCER_HELP = {
  title: 'Sequencer',
  description: 'A step sequencer that creates rhythmic patterns by stepping through 8 or 16 steps. Each step can be ON (sends signal) or OFF (silent).',
  usage: 'Gate output (sustained 50ms) → triggers ADSR envelopes for melodic/harmonic sounds with full attack/decay/sustain/release. Trigger output (sharp 5ms) → hits percussion modules or clocks other sequencers instantly. Reset input → any incoming gate/trigger forces the sequencer back to step 1, useful for syncing multiple sequencers or creating polymeters.',
  tips: [
    'Gate = long signal for notes that ring out (connect to ADSR)',
    'Trigger = instant ping for drums or clock signals',
    'Reset = restart from step 1 when another sequencer hits',
    'Create a kick drum: steps 1, 5, 9, 13 ON, rest OFF',
    'Create a snare: steps 5, 13 ON, connect trigger to a noise source',
    'Make an arpeggio: connect gate to oscillator frequency input',
    'Polyrhythm: 2 sequencers with different step counts, one resets the other',
    'Swing feel: offset every other beat by one step',
    'Rate below 1 Hz = slow ambient drones',
    'Rate above 10 Hz = audio-rate modulation (buzzy textures)',
  ],
  related: ['adsr', 'oscillator', 'lfo', 'filter'],
};

export const SEQUENCER_DEFINITION: ModuleDefinition = {
  type: 'sequencer',
  label: 'Sequencer',
  category: 'modulation',
  version: '1.0.0',
  ports: [
    { name: 'gate', type: 'gate', direction: 'output' },
    { name: 'trigger', type: 'trigger', direction: 'output' },
    { name: 'rate', type: 'control', direction: 'input' },
    { name: 'reset', type: 'gate', direction: 'input' },
  ],
  params: [
    {
      name: 'steps',
      label: 'Steps',
      controlType: 'select',
      defaultValue: 16,
      options: ['8', '16'],
    },
    {
      name: 'rate',
      label: 'Rate',
      controlType: 'slider',
      min: 0.5,
      max: 20,
      step: 0.5,
      defaultValue: SEQUENCER_DEFAULT_RATE,
    },
    {
      name: 'playing',
      label: 'Playing',
      controlType: 'toggle',
      defaultValue: true,
    },
    {
      name: 'stepPattern',
      label: 'Step Pattern',
      controlType: 'number',
      defaultValue: 0, // Will be managed as JSON string internally
    },
  ],
  help: SEQUENCER_HELP,
};

/**
 * Sequencer module - generates rhythmic gate patterns
 */
export class SequencerModule extends BaseModule {
  private stepData: boolean[] = new Array(16).fill(false);
  private currentStep = 0;
  private nextNoteTime = 0;
  private scheduleAheadTime = 0.1; // How far ahead to schedule (seconds)
  private lookahead = 25; // How often to call scheduler (ms)
  private timerID: number | undefined;
  private gateNode: ConstantSourceNode | undefined;
  private gateGainNode: GainNode | undefined;
  private triggerNode: ConstantSourceNode | undefined;
  private triggerGainNode: GainNode | undefined;
  private resetNode: ConstantSourceNode | undefined;
  private rateInputNode: ConstantSourceNode | undefined;
  private isPlaying = true;
  private lastResetValue = 0;

  constructor(id: string) {
    super(id, SEQUENCER_DEFINITION);
    // Initialize with a simple pattern
    this.stepData[0] = true;
    this.stepData[4] = true;
    this.stepData[8] = true;
    this.stepData[12] = true;
  }

  protected createNodes(): void {
    const ctx = this.context;
    
    // Create gate output (sustained 50ms)
    // Use a constant source (value 1) through a gain node to create gate signal
    this.gateNode = ctx.createConstantSource();
    this.gateNode.offset.value = 1;
    
    this.gateGainNode = ctx.createGain();
    this.gateGainNode.gain.value = 0; // Start with gate OFF
    
    this.gateNode.connect(this.gateGainNode);
    this.gateNode.start();

    // Create trigger output (short 5ms pulse)
    // Use a constant source (value 1) through a gain node to create trigger signal
    this.triggerNode = ctx.createConstantSource();
    this.triggerNode.offset.value = 1;
    
    this.triggerGainNode = ctx.createGain();
    this.triggerGainNode.gain.value = 0; // Start with trigger OFF
    
    this.triggerNode.connect(this.triggerGainNode);
    this.triggerNode.start();

    // Register ports
    this.registerPort({
      name: 'gate',
      type: 'gate',
      direction: 'output',
      node: this.gateGainNode,
    });

    this.registerPort({
      name: 'trigger',
      type: 'trigger',
      direction: 'output',
      node: this.triggerGainNode,
    });

    // Create rate input with smoothing - use a separate node to avoid audio-rate modulation issues
    this.rateInputNode = ctx.createConstantSource();
    this.rateInputNode.offset.value = SEQUENCER_DEFAULT_RATE;
    this.rateInputNode.start();
    
    this.registerPort({
      name: 'rate',
      type: 'control',
      direction: 'input',
      node: this.rateInputNode.offset,
    });

    // Create reset input - this will be handled in the connection callback
    this.resetNode = ctx.createConstantSource();
    this.resetNode.offset.value = 0;
    this.resetNode.start();
    
    this.registerPort({
      name: 'reset',
      type: 'gate',
      direction: 'input',
      node: this.resetNode.offset,
    });

    // Start the scheduler
    this.isPlaying = this.getParam('playing') as boolean;
    if (this.isPlaying) {
      this.startScheduler();
    }
  }

  protected destroyNodes(): void {
    this.stopScheduler();
    
    if (this.gateNode !== undefined) {
      this.gateNode.stop();
      this.gateNode.disconnect();
      this.gateNode = undefined;
    }
    if (this.gateGainNode !== undefined) {
      this.gateGainNode.disconnect();
      this.gateGainNode = undefined;
    }
    if (this.triggerNode !== undefined) {
      this.triggerNode.stop();
      this.triggerNode.disconnect();
      this.triggerNode = undefined;
    }
    if (this.triggerGainNode !== undefined) {
      this.triggerGainNode.disconnect();
      this.triggerGainNode = undefined;
    }
    if (this.resetNode !== undefined) {
      this.resetNode.stop();
      this.resetNode.disconnect();
      this.resetNode = undefined;
    }
    if (this.rateInputNode !== undefined) {
      this.rateInputNode.stop();
      this.rateInputNode.disconnect();
      this.rateInputNode = undefined;
    }
  }

  private startScheduler(): void {
    this.nextNoteTime = this.context.currentTime;
    this.scheduler();
  }

  private stopScheduler(): void {
    if (this.timerID !== undefined) {
      clearTimeout(this.timerID);
      this.timerID = undefined;
    }
  }

  private scheduler(): void {
    // Check for reset input
    if (this.resetNode) {
      const resetValue = this.resetNode.offset.value;
      if (resetValue > 0.5 && this.lastResetValue <= 0.5) {
        // Rising edge on reset - go back to step 0
        this.currentStep = 0;
      }
      this.lastResetValue = resetValue;
    }

    // Schedule all notes that need to play before the next interval
    while (this.nextNoteTime < this.context.currentTime + this.scheduleAheadTime) {
      this.scheduleStep();
      this.advanceStep();
    }
    
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
    }
  }

  private scheduleStep(): void {
    if (!this.gateNode || !this.gateGainNode || !this.triggerGainNode) return;

    const steps = this.getParam('steps') as number;
    const stepIndex = this.currentStep % steps;

    // Always ensure gate is low at start of step window to prevent stuck gates
    this.gateGainNode.gain.setValueAtTime(0, this.nextNoteTime);
    this.triggerGainNode.gain.setValueAtTime(0, this.nextNoteTime);

    if (this.stepData[stepIndex]) {
      // Step is ON - send gate high then low

      // Gate high with 2ms ramp to prevent clicking
      this.gateGainNode.gain.setValueAtTime(0, this.nextNoteTime);
      this.gateGainNode.gain.linearRampToValueAtTime(1, this.nextNoteTime + 0.002);
      // Gate low with 2ms ramp - hold high for longer (100ms total)
      const holdDuration = 0.1; // 100ms gate
      this.gateGainNode.gain.setValueAtTime(1, this.nextNoteTime + holdDuration - 0.002);
      this.gateGainNode.gain.linearRampToValueAtTime(0, this.nextNoteTime + holdDuration);

      // Trigger: short pulse with ramps
      const triggerDuration = 0.005;
      this.triggerGainNode.gain.setValueAtTime(0, this.nextNoteTime);
      this.triggerGainNode.gain.linearRampToValueAtTime(1, this.nextNoteTime + 0.001);
      this.triggerGainNode.gain.setValueAtTime(1, this.nextNoteTime + triggerDuration - 0.001);
      this.triggerGainNode.gain.linearRampToValueAtTime(0, this.nextNoteTime + triggerDuration);

      console.log(`[Sequencer ${this.id}] Step ${stepIndex + 1} ON at ${this.nextNoteTime.toFixed(3)}s, gate gain: ${this.gateGainNode.gain.value}`);
    }
  }

  private advanceStep(): void {
    // Get rate directly from param - no smoothing
    let rate = this.getParam('rate') as number;

    // Clamp rate to musical range (0.5 to 20 Hz = 0.5 to 20 steps per second)
    rate = Math.max(0.5, Math.min(20, rate));

    // Rate is steps per second, so time per step is 1/rate
    const secondsPerStep = 1 / rate;

    this.nextNoteTime += secondsPerStep;

    const steps = this.getParam('steps') as number;
    this.currentStep = (this.currentStep + 1) % steps;
  }

  /**
   * Toggle a step on/off
   */
  public toggleStep(index: number): void {
    if (index >= 0 && index < 16) {
      this.stepData[index] = !this.stepData[index];
    }
  }

  /**
   * Get the current step pattern
   */
  public getStepPattern(): readonly boolean[] {
    return [...this.stepData];
  }

  /**
   * Set a specific step value
   */
  public setStep(index: number, value: boolean): void {
    if (index >= 0 && index < 16) {
      this.stepData[index] = value;
    }
  }

  /**
   * Get the current step index
   */
  public getCurrentStep(): number {
    return this.currentStep;
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value);

    if (name === 'playing') {
      const shouldPlay = value as boolean;
      if (shouldPlay !== this.isPlaying) {
        this.isPlaying = shouldPlay;
        if (this.isPlaying) {
          this.startScheduler();
        } else {
          this.stopScheduler();
          // Reset gates to low
          if (this.gateGainNode) {
            this.gateGainNode.gain.setValueAtTime(0, this.context.currentTime);
          }
          if (this.triggerGainNode) {
            this.triggerGainNode.gain.setValueAtTime(0, this.context.currentTime);
          }
        }
      }
    }
  }

  /**
   * Reset the sequencer to step 1
   */
  public reset(): void {
    this.currentStep = 0;
  }
}
