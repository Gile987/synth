import { get } from 'svelte/store';
import type { PatchState, ModuleInstance, SerializableModuleInstance } from '$types';
import { modules, connections } from './patch';

const CURRENT_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];
const LOCAL_STORAGE_KEY = 'modular-synth-presets';
const AUTOSAVE_PREF_KEY = 'modular-synth-autosave-pref';

interface StoredPresets {
  presets: Record<string, PatchState>;
  lastModified: string;
}

interface PresetEntry {
  name: string;
  state: PatchState;
  createdAt: string;
}

class PresetManager {

  /**
   * Convert ModuleInstance map to serializable array
   */
  private serializeModules(moduleMap: Map<string, ModuleInstance>): SerializableModuleInstance[] {
    return Array.from(moduleMap.values()).map(module => ({
      id: module.id,
      type: module.type,
      position: { ...module.position },
      params: Object.fromEntries(module.params)
    }));
  }

  /**
   * Get current patch state from stores
   */
  public getCurrentPatchState(): PatchState {
    const moduleMap = get(modules);
    const connectionMap = get(connections);

    return {
      modules: this.serializeModules(moduleMap),
      connections: Array.from(connectionMap.values()),
      version: CURRENT_VERSION
    };
  }

  /**
   * Save current patch to a JSON file (download)
   */
  public saveToFile(filename?: string): void {
    const state = this.getCurrentPatchState();
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `patch-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Load patch from a JSON file
   */
  public async loadFromFile(): Promise<PatchState | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';

      input.onchange = (e) => {
        if (!(e.target instanceof HTMLInputElement)) {
          resolve(null);
          return;
        }
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result;
            if (typeof content !== 'string') {
              throw new Error('File content is not a string');
            }
            const state: unknown = JSON.parse(content);
            
            if (!this.validatePatchState(state)) {
              throw new Error('Invalid patch file format');
            }

            resolve(state);
          } catch (err) {
            console.error('[preset] Failed to load patch file:', err);
            alert('Failed to load patch file. Please check the file format.');
            resolve(null);
          }
        };
        reader.onerror = () => {
          console.error('[preset] File read error');
          alert('Failed to read file.');
          resolve(null);
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  /**
   * Validate patch state structure and version compatibility
   */
  private validatePatchState(state: unknown): state is PatchState {
    if (typeof state !== 'object' || state === null) return false;

    const candidate = state as Record<string, unknown>;

    if (!Array.isArray(candidate.modules)) return false;
    if (!Array.isArray(candidate.connections)) return false;
    if (typeof candidate.version !== 'string') return false;

    // Version compatibility check
    if (!SUPPORTED_VERSIONS.includes(candidate.version)) {
      console.error(`[preset] Unsupported patch version: ${candidate.version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`);
      return false;
    }

    // Validate modules
    for (const mod of candidate.modules) {
      if (typeof mod !== 'object' || mod === null) return false;
      const module = mod as Record<string, unknown>;
      if (typeof module.id !== 'string') return false;
      if (typeof module.type !== 'string') return false;
      if (typeof module.position !== 'object' || module.position === null) return false;
      const position = module.position as Record<string, unknown>;
      if (typeof position.x !== 'number') return false;
      if (typeof position.y !== 'number') return false;
      if (typeof module.params !== 'object' || module.params === null) return false;
    }

    // Validate connections
    for (const conn of candidate.connections) {
      if (typeof conn !== 'object' || conn === null) return false;
      const connection = conn as Record<string, unknown>;
      if (typeof connection.id !== 'string') return false;
      if (typeof connection.sourceModuleId !== 'string') return false;
      if (typeof connection.sourcePortName !== 'string') return false;
      if (typeof connection.targetModuleId !== 'string') return false;
      if (typeof connection.targetPortName !== 'string') return false;
    }

    return true;
  }

  /**
   * Save patch state to localStorage
   */
  public saveToLocalStorage(presetName: string, state?: PatchState): void {
    try {
      const stateToSave = state || this.getCurrentPatchState();
      const stored = this.getStoredPresets();
      
      stored.presets[presetName] = stateToSave;
      stored.lastModified = new Date().toISOString();
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
      console.error('[preset] Failed to save to localStorage:', err);
    }
  }

  /**
   * Load patch state from localStorage
   */
  public loadFromLocalStorage(presetName: string): PatchState | null {
    try {
      const stored = this.getStoredPresets();
      const state = stored.presets[presetName];
      
      if (!state) return null;
      
      if (!this.validatePatchState(state)) {
        console.error('[preset] Invalid stored preset:', presetName);
        return null;
      }

      return state;
    } catch (err) {
      console.error('[preset] Failed to load from localStorage:', err);
      return null;
    }
  }

  /**
   * List all saved presets
   */
  public listPresets(): PresetEntry[] {
    try {
      const stored = this.getStoredPresets();
      return Object.entries(stored.presets).map(([name, state]) => ({
        name,
        state,
        createdAt: stored.lastModified
      }));
    } catch (err) {
      console.error('[preset] Failed to list presets:', err);
      return [];
    }
  }

  /**
   * Delete a preset from localStorage
   */
  public deletePreset(presetName: string): boolean {
    try {
      const stored = this.getStoredPresets();
      
      if (!(presetName in stored.presets)) {
        return false;
      }

      delete stored.presets[presetName];
      stored.lastModified = new Date().toISOString();
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
      return true;
    } catch (err) {
      console.error('[preset] Failed to delete preset:', err);
      return false;
    }
  }

  /**
   * Validate stored presets structure
   */
  private isValidStoredPresets(value: unknown): value is StoredPresets {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.presets !== 'object' || candidate.presets === null) return false;
    if (typeof candidate.lastModified !== 'string') return false;
    return true;
  }

  /**
   * Get stored presets from localStorage
   */
  private getStoredPresets(): StoredPresets {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return { presets: {}, lastModified: new Date().toISOString() };
      }
      const parsed: unknown = JSON.parse(raw);
      if (!this.isValidStoredPresets(parsed)) {
        return { presets: {}, lastModified: new Date().toISOString() };
      }
      return parsed;
    } catch {
      return { presets: {}, lastModified: new Date().toISOString() };
    }
  }

  /**
   * Check if autosave exists
   */
  public hasAutosave(): boolean {
    const stored = this.getStoredPresets();
    return 'autosave' in stored.presets;
  }

  /**
   * Load autosave if exists
   */
  public loadAutosave(): PatchState | null {
    return this.loadFromLocalStorage('autosave');
  }

  /**
   * Clear autosave
   */
  public clearAutosave(): void {
    this.deletePreset('autosave');
  }

  /**
   * Get autosave preference from localStorage
   */
  public getAutosavePreference(): boolean {
    try {
      const pref = localStorage.getItem(AUTOSAVE_PREF_KEY);
      return pref !== 'false'; // Default to true
    } catch {
      return true;
    }
  }

  /**
   * Set autosave preference in localStorage
   */
  public setAutosavePreference(enabled: boolean): void {
    try {
      localStorage.setItem(AUTOSAVE_PREF_KEY, String(enabled));
    } catch (err) {
      console.error('[preset] Failed to save autosave preference:', err);
    }
  }

  /**
   * Clear session by removing autosave and resetting stores
   */
  public clearSession(): void {
    this.clearAutosave();
    // Note: Store clearing is handled by synthService.dispose() in App.svelte
  }
}

export const presetManager = new PresetManager();
