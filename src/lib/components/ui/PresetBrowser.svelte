<script lang="ts">
  import { presetManager } from '$stores/presets';
  import { synthService } from '$stores/service';
  import { DEFAULT_PRESETS, getDefaultPresetNames } from '$content/default-presets';
  import type { PatchState } from '$types';
  import { fade, scale } from 'svelte/transition';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let presets = $state<{ name: string; isDefault: boolean }[]>([]);
  let newPresetName = $state('');
  let saveError = $state('');

  // Load presets list when modal opens
  $effect(() => {
    if (isOpen) {
      refreshPresets();
    }
  });

  function refreshPresets() {
    const savedPresets = presetManager.listPresets().map(p => ({
      name: p.name,
      isDefault: false
    }));
    
    const defaultPresetList = getDefaultPresetNames().map(name => ({
      name,
      isDefault: true
    }));
    
    presets = [...defaultPresetList, ...savedPresets];
  }

  async function loadPreset(name: string, isDefault: boolean) {
    try {
      let state: PatchState | null;
      
      if (isDefault) {
        state = DEFAULT_PRESETS[name];
      } else {
        state = presetManager.loadFromLocalStorage(name);
      }

      if (state) {
        await synthService.loadPatch(state);
        onClose();
      }
    } catch (err) {
      console.error('[preset] Failed to load preset:', err);
      alert('Failed to load preset. Check console for details.');
    }
  }

  function deletePreset(name: string) {
    if (confirm(`Delete preset "${name}"?`)) {
      presetManager.deletePreset(name);
      refreshPresets();
    }
  }

  function saveCurrentPreset() {
    saveError = '';
    
    if (!newPresetName.trim()) {
      saveError = 'Please enter a preset name';
      return;
    }

    if (getDefaultPresetNames().includes(newPresetName.trim())) {
      saveError = 'Cannot overwrite default presets';
      return;
    }

    presetManager.saveToLocalStorage(newPresetName.trim());
    newPresetName = '';
    refreshPresets();
  }

  async function loadFromFile() {
    const state = await presetManager.loadFromFile();
    if (state) {
      try {
        await synthService.loadPatch(state);
        onClose();
      } catch (err) {
        console.error('[preset] Failed to load patch:', err);
        alert('Failed to load patch. Check console for details.');
      }
    }
  }

  function saveToFile() {
    presetManager.saveToFile();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    onclick={onClose}
    onkeydown={handleKeydown}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
      transition:scale={{ duration: 200, start: 0.9 }}
    >
      <header class="modal-header">
        <h2>Presets</h2>
        <button class="close-btn" onclick={onClose}>×</button>
      </header>

      <div class="modal-body">
        <!-- Save Current Section -->
        <section class="save-section">
          <h3>Save Current Patch</h3>
          <div class="save-row">
            <input
              type="text"
              bind:value={newPresetName}
              placeholder="Preset name..."
              onkeydown={(e) => e.key === 'Enter' && saveCurrentPreset()}
            />
            <button class="btn-primary" onclick={saveCurrentPreset}>
              Save
            </button>
          </div>
          {#if saveError}
            <p class="error-text">{saveError}</p>
          {/if}
        </section>

        <!-- File Operations -->
        <section class="file-section">
          <h3>File Operations</h3>
          <div class="file-buttons">
            <button class="btn-secondary" onclick={loadFromFile}>
              Load from File
            </button>
            <button class="btn-secondary" onclick={saveToFile}>
              Save to File
            </button>
          </div>
        </section>

        <!-- Preset List -->
        <section class="preset-list-section">
          <h3>Available Presets</h3>
          {#if presets.length === 0}
            <p class="empty-text">No saved presets yet</p>
          {:else}
            <ul class="preset-list">
              {#each presets as preset}
                <li class="preset-item">
                  <div class="preset-info">
                    <span class="preset-name">{preset.name}</span>
                    {#if preset.isDefault}
                      <span class="preset-badge default">Default</span>
                    {:else}
                      <span class="preset-badge saved">Saved</span>
                    {/if}
                  </div>
                  <div class="preset-actions">
                    <button
                      class="btn-load"
                      onclick={() => loadPreset(preset.name, preset.isDefault)}
                    >
                      Load
                    </button>
                    {#if !preset.isDefault}
                      <button
                        class="btn-delete"
                        onclick={() => deletePreset(preset.name)}
                      >
                        Delete
                      </button>
                    {/if}
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 14, 12, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: linear-gradient(180deg, #3a3530 0%, #2a2520 100%);
    border-radius: 3px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
    border: 2px solid #4a4035;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #4a4035;
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #d4c4a8;
    font-family: 'Space Mono', 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #5a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #5a4035 0%, #4a3025 100%);
    color: #c4b8a8;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
  }

  .close-btn:hover {
    background: linear-gradient(180deg, #6a5045 0%, #5a4035 100%);
    border-color: #7a6050;
    color: #e4d4b8;
  }

  .modal-body {
    padding: 20px;
    color: #c4b8a8;
    line-height: 1.6;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
  }

  section {
    margin-bottom: 24px;
  }

  section:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 12px;
    color: #a8b8c4;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-family: 'Space Mono', 'IBM Plex Mono', monospace;
  }

  /* Save Section */
  .save-row {
    display: flex;
    gap: 8px;
  }

  .save-row input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #4a4035;
    border-radius: 2px;
    background: linear-gradient(180deg, #2a2520 0%, #1a1815 100%);
    color: #d4c4a8;
    font-size: 13px;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
  }

  .save-row input:focus {
    outline: none;
    border-color: #5a5040;
  }

  .error-text {
    color: #c4a8a8;
    font-size: 11px;
    margin: 8px 0 0 0;
  }

  /* Buttons */
  .btn-primary {
    padding: 8px 16px;
    border: 1px solid #4a4035;
    border-radius: 2px;
    background: linear-gradient(180deg, #5a5040 0%, #4a4035 100%);
    color: #d4c4a8;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-primary:hover {
    background: linear-gradient(180deg, #6a6050 0%, #5a5040 100%);
    border-color: #7a7060;
    color: #e4d4c8;
  }

  .btn-secondary {
    padding: 8px 14px;
    border: 1px solid #4a4035;
    border-radius: 2px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    color: #b4a898;
    font-size: 12px;
    cursor: pointer;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .btn-secondary:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #5a5040;
    color: #d4c4a8;
  }

  /* File Section */
  .file-buttons {
    display: flex;
    gap: 12px;
  }

  /* Preset List */
  .empty-text {
    color: #7a6a5a;
    font-style: italic;
    margin: 0;
  }

  .preset-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preset-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    border-radius: 2px;
    border: 1px solid #4a4035;
  }

  .preset-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .preset-name {
    font-weight: 500;
    color: #d4c4a8;
    font-size: 13px;
  }

  .preset-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Space Mono', monospace;
  }

  .preset-badge.default {
    background: #3a4538;
    color: #a8c4a8;
    border: 1px solid #4a5548;
  }

  .preset-badge.saved {
    background: #3a4035;
    color: #c4c4a8;
    border: 1px solid #4a5045;
  }

  .preset-actions {
    display: flex;
    gap: 8px;
  }

  .btn-load {
    padding: 5px 12px;
    border: 1px solid #4a4035;
    border-radius: 2px;
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    color: #c4b8a8;
    font-size: 11px;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase;
  }

  .btn-load:hover {
    background: linear-gradient(180deg, #5a5045 0%, #4a4035 100%);
    border-color: #6a6050;
    color: #d4c8b8;
  }

  .btn-delete {
    padding: 5px 12px;
    border: 1px solid #6a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #5a4035 0%, #4a3025 100%);
    color: #d4a8a8;
    font-size: 11px;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase;
  }

  .btn-delete:hover {
    background: linear-gradient(180deg, #6a5045 0%, #5a4035 100%);
    border-color: #8a6050;
    color: #e4c4c4;
  }
</style>
