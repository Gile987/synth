import type { PatchState } from '$types';

/**
 * Default preset patches for the modular synthesizer
 */

export const DEFAULT_PRESETS: Record<string, PatchState> = {
  // No default presets - users can create and save their own
};

/**
 * Get list of default preset names
 */
export function getDefaultPresetNames(): string[] {
  return Object.keys(DEFAULT_PRESETS);
}

/**
 * Get a specific default preset
 */
export function getDefaultPreset(name: string): PatchState | undefined {
  return DEFAULT_PRESETS[name];
}
