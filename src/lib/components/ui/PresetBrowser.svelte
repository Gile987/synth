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
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1a1a2e;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid #333;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #333;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 24px;
    color: #fff;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #888;
    font-size: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .modal-body {
    padding: 20px 24px;
    color: #e0e0e0;
    line-height: 1.6;
  }

  section {
    margin-bottom: 24px;
  }

  section:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #4a9eff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Save Section */
  .save-row {
    display: flex;
    gap: 8px;
  }

  .save-row input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #444;
    border-radius: 6px;
    background: #252542;
    color: #e0e0e0;
    font-size: 14px;
  }

  .save-row input:focus {
    outline: none;
    border-color: #4a9eff;
  }

  .error-text {
    color: #ff6b6b;
    font-size: 12px;
    margin: 8px 0 0 0;
  }

  /* Buttons */
  .btn-primary {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: linear-gradient(135deg, #4a9eff, #2980b9);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
  }

  .btn-secondary {
    padding: 10px 16px;
    border: 1px solid #444;
    border-radius: 6px;
    background: transparent;
    color: #e0e0e0;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #666;
  }

  /* File Section */
  .file-buttons {
    display: flex;
    gap: 12px;
  }

  /* Preset List */
  .empty-text {
    color: #888;
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
    padding: 12px 16px;
    background: #252542;
    border-radius: 8px;
    border: 1px solid #333;
  }

  .preset-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .preset-name {
    font-weight: 500;
    color: #fff;
  }

  .preset-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .preset-badge.default {
    background: rgba(74, 158, 255, 0.2);
    color: #4a9eff;
  }

  .preset-badge.saved {
    background: rgba(46, 204, 113, 0.2);
    color: #2ecc71;
  }

  .preset-actions {
    display: flex;
    gap: 8px;
  }

  .btn-load {
    padding: 6px 14px;
    border: none;
    border-radius: 4px;
    background: #4a9eff;
    color: white;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-load:hover {
    background: #3a8eef;
  }

  .btn-delete {
    padding: 6px 14px;
    border: 1px solid #ff6b6b;
    border-radius: 4px;
    background: transparent;
    color: #ff6b6b;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-delete:hover {
    background: rgba(255, 107, 107, 0.1);
  }
</style>
