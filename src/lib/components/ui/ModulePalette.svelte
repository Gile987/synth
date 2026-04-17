<script lang="ts">
  import { moduleDefinitions, synthService } from '$stores';
  import type { ModuleDefinition } from '$types';
  import SynthHelpModal from './SynthHelpModal.svelte';

  let definitions = $derived($moduleDefinitions);
  let helpOpen = $state(false);

  function handleAddModule(def: ModuleDefinition) {
    // Add at center of visible area
    const x = 300 + Math.random() * 100;
    const y = 200 + Math.random() * 100;
    synthService.addModule(def.type, { x, y });
  }

  function openHelp() {
    helpOpen = true;
  }

  function closeHelp() {
    helpOpen = false;
  }
</script>

<aside class="palette">
  <h2>Modules</h2>
  
  <div class="module-list">
    {#each definitions as def}
      <button
        class="module-button"
        class:category-source={def.category === 'source'}
        class:category-effect={def.category === 'effect'}
        class:category-output={def.category === 'output'}
        class:category-modulation={def.category === 'modulation'}
        onclick={() => handleAddModule(def)}
      >
        {def.label}
      </button>
    {/each}
  </div>

  <div class="help-section">
    <button class="help-button" onclick={openHelp}>
      <span class="help-icon">❓</span>
      <span class="help-text">How does this work?</span>
    </button>
  </div>
</aside>

<SynthHelpModal isOpen={helpOpen} onClose={closeHelp} />

<style>
  .palette {
    width: 200px;
    background: #252542;
    border-right: 1px solid #333;
    padding: 16px;
    overflow-y: auto;
  }

  h2 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .module-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .module-button {
    padding: 12px 16px;
    border: none;
    border-radius: 6px;
    background: #3a3a5e;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .module-button:hover {
    transform: translateX(4px);
    filter: brightness(1.1);
  }

  .category-source {
    border-left: 3px solid #4a9eff;
  }

  .category-effect {
    border-left: 3px solid #9b59b6;
  }

  .category-output {
    border-left: 3px solid #e74c3c;
  }

  .category-modulation {
    border-left: 3px solid #2ecc71;
  }

  .help-section {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #444;
  }

  .help-button {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #4a9eff;
    border-radius: 6px;
    background: rgba(74, 158, 255, 0.1);
    color: #4a9eff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .help-button:hover {
    background: rgba(74, 158, 255, 0.2);
    transform: translateX(4px);
  }

  .help-icon {
    font-size: 16px;
  }

  .help-text {
    font-weight: 500;
  }
</style>
