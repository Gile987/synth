import { BaseModule } from '$core/base-module';
import type { ModuleDefinition } from '$types';

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
  private waveformData: Float32Array = new Float32Array(1024);
  private dataUpdateCallback: ((data: Float32Array) => void) | null = null;

  constructor(id: string) {
    super(id, SCOPE_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = this.getParam('gain') as number;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.scriptProcessor = ctx.createScriptProcessor(1024, 1, 1);
    this.inputGain.connect(this.analyser);
    this.analyser.connect(this.scriptProcessor);
    this.scriptProcessor.connect(ctx.destination);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.getParam('freeze') as boolean) return;
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
    this.scriptProcessor = undefined;
    this.analyser = undefined;
    this.inputGain = undefined;
  }

  onDataUpdate(callback: (data: Float32Array) => void): void {
    this.dataUpdateCallback = callback;
  }
}
