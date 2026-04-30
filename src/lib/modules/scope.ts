import { BaseModule } from '$core/base-module';
import type { ModuleDefinition } from '$types';
import { ANALYSER_FFT_SIZE, SCOPE_BUFFER_SIZE, SCRIPT_PROCESSOR_BUFFER_SIZE } from '$core/constants';

export const SCOPE_HELP = {
  title: 'Oscilloscope',
  description: 'Visualizes audio signals in real-time.',
  usage: 'Connect any signal to see the waveform.',
  tips: ['Use Time Scale to zoom', 'Use Gain to adjust amplitude'],
  related: ['oscillator', 'lfo'],
};

export const SCOPE_DEFINITION: ModuleDefinition = {
  type: 'scope',
  label: 'Scope',
  category: 'utility',
  version: '1.0.0',
  ports: [{ name: 'input', type: 'audio', direction: 'input' }],
  params: [
    { name: 'timeScale', label: 'Time Scale', controlType: 'slider', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
    { name: 'gain', label: 'Gain', controlType: 'slider', min: 0.1, max: 5, step: 0.1, defaultValue: 1 },
    { name: 'freeze', label: 'Freeze', controlType: 'toggle', defaultValue: false },
  ],
  help: SCOPE_HELP,
};

export class ScopeModule extends BaseModule {
  private inputGain: GainNode | undefined;
  private analyser: AnalyserNode | undefined;
  private scriptProcessor: ScriptProcessorNode | undefined;
  private silentGain: GainNode | undefined;
  private waveformData: Float32Array = new Float32Array(SCOPE_BUFFER_SIZE);
  private dataUpdateCallback: ((data: Float32Array) => void) | null = null;

  constructor(id: string) {
    super(id, SCOPE_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = this.getNumberParam('gain') ?? 1;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = ANALYSER_FFT_SIZE;
    this.scriptProcessor = ctx.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);
    this.inputGain.connect(this.analyser);
    this.analyser.connect(this.scriptProcessor);
    // Connect to silent gain (not destination) to avoid audio output leak
    this.silentGain = ctx.createGain();
    this.silentGain.gain.value = 0;
    this.scriptProcessor.connect(this.silentGain);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.getBooleanParam('freeze') ?? false) return;
      const inputData = event.inputBuffer.getChannelData(0);
      this.waveformData.set(inputData);
      if (this.dataUpdateCallback) this.dataUpdateCallback(this.waveformData);
    };

    this.registerPort({ name: 'input', type: 'audio', direction: 'input', node: this.inputGain });
  }

  protected destroyNodes(): void {
    this.scriptProcessor?.disconnect();
    this.analyser?.disconnect();
    this.inputGain?.disconnect();
    this.silentGain?.disconnect();
    this.scriptProcessor = undefined;
    this.analyser = undefined;
    this.inputGain = undefined;
    this.silentGain = undefined;
    this.dataUpdateCallback = null;
  }

  onDataUpdate(callback: (data: Float32Array) => void): void {
    this.dataUpdateCallback = callback;
  }
}
