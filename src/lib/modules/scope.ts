import { BaseModule } from '$core/base-module';
import type { ModuleDefinition } from '$types';
import { ANALYSER_FFT_SIZE, SCOPE_BUFFER_SIZE } from '$core/constants';

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
  private silentGain: GainNode | undefined;
  private animationFrameId: number | undefined;
  private analyserTimeDomainData: Float32Array = new Float32Array(ANALYSER_FFT_SIZE);
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
    this.inputGain.connect(this.analyser);
    // Connect to silent gain (not destination) to avoid audio output leak
    this.silentGain = ctx.createGain();
    this.silentGain.gain.value = 0;
    this.analyser.connect(this.silentGain);
    this.startWaveformCapture();

    this.registerPort({ name: 'input', type: 'audio', direction: 'input', node: this.inputGain });
  }

  private startWaveformCapture(): void {
    const pollWaveform = () => {
      if (!this.analyser) return;

      this.animationFrameId = window.requestAnimationFrame(pollWaveform);

      if (this.getBooleanParam('freeze') ?? false) return;

      this.analyser.getFloatTimeDomainData(this.analyserTimeDomainData as Float32Array<ArrayBuffer>);
      const sourceOffset = Math.max(0, this.analyserTimeDomainData.length - this.waveformData.length);
      this.waveformData.set(this.analyserTimeDomainData.subarray(sourceOffset));
      this.dataUpdateCallback?.(this.waveformData);
    };

    pollWaveform();
  }

  protected destroyNodes(): void {
    if (this.animationFrameId !== undefined) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.analyser?.disconnect();
    this.inputGain?.disconnect();
    this.silentGain?.disconnect();
    this.analyser = undefined;
    this.inputGain = undefined;
    this.silentGain = undefined;
    this.dataUpdateCallback = null;
  }

  onDataUpdate(callback: (data: Float32Array) => void): void {
    this.dataUpdateCallback = callback;
  }

  offDataUpdate(): void {
    this.dataUpdateCallback = null;
  }
}
