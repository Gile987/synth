import { get } from 'svelte/store';
import type { PatchState, ModuleInstance, SerializableModuleInstance } from '$types';
import { modules, connections } from './patch';
import { synthService } from './service';

const CURRENT_VERSION = '1.0.0';
const LOCAL_STORAGE_KEY = 'modular-synth-presets';
const AUTOSAVE_PREF_KEY = 'modular-synth-autosave-pref';
const AUTOSAVE_DELAY = 5000;

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
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSavedState: string = '';

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
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const state = JSON.parse(content) as PatchState;
            
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
   * Validate patch state structure
   */
  private validatePatchState(state: unknown): state is PatchState {
    if (typeof state !== 'object' || state === null) return false;
    const patch = state as PatchState;
    
    if (!Array.isArray(patch.modules)) return false;
    if (!Array.isArray(patch.connections)) return false;
    if (typeof patch.version !== 'string') return false;

    // Validate modules
    for (const mod of patch.modules) {
      if (typeof mod.id !== 'string') return false;
      if (typeof mod.type !== 'string') return false;
      if (typeof mod.position !== 'object' || mod.position === null) return false;
      if (typeof mod.position.x !== 'number') return false;
      if (typeof mod.position.y !== 'number') return false;
      if (typeof mod.params !== 'object' || mod.params === null) return false;
    }

    // Validate connections
    for (const conn of patch.connections) {
      if (typeof conn.id !== 'string') return false;
      if (typeof conn.sourceModuleId !== 'string') return false;
      if (typeof conn.sourcePortName !== 'string') return false;
      if (typeof conn.targetModuleId !== 'string') return false;
      if (typeof conn.targetPortName !== 'string') return false;
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
      this.lastSavedState = JSON.stringify(stateToSave);
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
   * Get stored presets from localStorage
   */
  private getStoredPresets(): StoredPresets {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return { presets: {}, lastModified: new Date().toISOString() };
      }
      return JSON.parse(raw) as StoredPresets;
    } catch {
      return { presets: {}, lastModified: new Date().toISOString() };
    }
  }

  /**
   * Auto-save to localStorage on changes (debounced)
   */
  public triggerAutosave(onSave?: () => void): void {
    if (!this.getAutosavePreference()) return;

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(() => {
      const currentState = this.getCurrentPatchState();
      const currentStateJson = JSON.stringify(currentState);
      
      // Only save if state has changed
      if (currentStateJson !== this.lastSavedState) {
        if (currentState.modules.length === 0) {
          this.clearAutosave();
        } else {
          this.saveToLocalStorage('autosave', currentState);
        }
        console.log('[preset] Auto-saved patch');
        if (onSave) onSave();
      }
    }, AUTOSAVE_DELAY);
  }

  public getAutosavePreference(): boolean {
    try {
      const pref = localStorage.getItem(AUTOSAVE_PREF_KEY);
      return pref !== null ? JSON.parse(pref) : true;
    } catch {
      return true;
    }
  }

  public setAutosavePreference(enabled: boolean): void {
    try {
      localStorage.setItem(AUTOSAVE_PREF_KEY, JSON.stringify(enabled));
    } catch (err) {
      console.error('[preset] Failed to save autosave preference:', err);
    }
  }

  public clearSession(): void {
    // Get all module IDs and remove them properly to stop audio
    const moduleMap = get(modules);
    const moduleIds = Array.from(moduleMap.keys());
    
    // Remove each module through synthService to properly dispose audio nodes
    for (const id of moduleIds) {
      synthService.removeModule(id);
    }
    
    // Clear connections store
    connections.clear();
    
    // Clear autosave
    this.clearAutosave();
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
}

export const presetManager = new PresetManager();
