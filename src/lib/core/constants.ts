// Constants only - no imports needed

/**
 * Audio constants used throughout the application
 */
export const MIN_FREQUENCY = 20;
export const MAX_FREQUENCY = 20000;
export const A4_FREQUENCY = 440;
export const MIN_FILTER_Q = 0.1;
export const MAX_FILTER_Q = 20;
export const DEFAULT_MASTER_GAIN = 0.7;

/**
 * Audio processing constants
 */
export const DEFAULT_SAMPLE_RATE = 44100;
export const ANALYSER_FFT_SIZE = 2048;
export const SCOPE_BUFFER_SIZE = 1024;
export const SCRIPT_PROCESSOR_BUFFER_SIZE = 1024;
export const GATE_MONITOR_BUFFER_SIZE = 256;

/**
 * Clamp a value between min and max
 * Used throughout modules for parameter validation
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate wet/dry gain values from mix parameter (0-1)
 * Returns { wet, dry } gain values for parallel signal mixing
 * mix: 0 = fully dry, 1 = fully wet
 */
export function calculateWetDryGain(mix: number): { wet: number; dry: number } {
  const clampedMix = clamp(mix, 0, 1);
  return {
    wet: clampedMix,
    dry: 1 - clampedMix,
  };
}
