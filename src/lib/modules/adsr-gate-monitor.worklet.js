class ADSRGateMonitorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options && options.processorOptions ? options.processorOptions : {};
    this.threshold = typeof processorOptions.threshold === 'number' ? processorOptions.threshold : 0.3;
    this.bufferSize = typeof processorOptions.bufferSize === 'number' ? processorOptions.bufferSize : 256;
    this.accumulatedAbsSum = 0;
    this.accumulatedSamples = 0;
    this.lastGateHigh = false;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const channel = input && input[0] ? input[0] : null;
    const output = outputs[0];
    const frameCount = channel ? channel.length : ((output && output[0]) ? output[0].length : 128);

    if (output) {
      for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
        output[channelIndex].fill(0);
      }
    }

    for (let sampleIndex = 0; sampleIndex < frameCount; sampleIndex += 1) {
      const sample = channel ? channel[sampleIndex] || 0 : 0;
      this.accumulatedAbsSum += Math.abs(sample);
      this.accumulatedSamples += 1;

      if (this.accumulatedSamples >= this.bufferSize) {
        const avgAmplitude = this.accumulatedAbsSum / this.accumulatedSamples;
        const isHigh = avgAmplitude > this.threshold;

        if (isHigh !== this.lastGateHigh) {
          this.port.postMessage({ type: isHigh ? 'gate-on' : 'gate-off', avgAmplitude });
          this.lastGateHigh = isHigh;
        }

        this.accumulatedAbsSum = 0;
        this.accumulatedSamples = 0;
      }
    }

    return true;
  }
}

registerProcessor('adsr-gate-monitor', ADSRGateMonitorProcessor);
