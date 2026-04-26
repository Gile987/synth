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
    background: linear-gradient(180deg, #3a3530 0%, #2a2520 100%);
    border-right: 2px solid #4a4035;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    box-shadow: 
      4px 0 15px rgba(0, 0, 0, 0.4),
      inset -1px 0 0 rgba(255, 255, 255, 0.05);
  }

  h2 {
    margin: 0 0 16px 0;
    font-family: 'Space Mono', 'IBM Plex Mono', monospace;
    font-size: 20px;
    font-weight: 400;
    color: #c4b8a8;
    text-transform: uppercase;
    letter-spacing: 3px;
    border-bottom: 1px solid #4a4035;
    padding-bottom: 12px;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
  }

  .module-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .module-button {
    padding: 10px 14px;
    border: 1px solid #4a4035;
    border-radius: 2px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    color: #b4a898;
    font-size: 12px;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }

  .module-button:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #5a5040;
    color: #d4c4a8;
  }

  .category-source {
    border-left: 3px solid #7c9c7c;
  }

  .category-effect {
    border-left: 3px solid #9c7c8c;
  }

  .category-output {
    border-left: 3px solid #9c847c;
  }

  .category-modulation {
    border-left: 3px solid #7c8c9c;
  }

  .help-section {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #4a4035;
  }

  .help-button {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #5a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    color: #c4b8a8;
    font-size: 12px;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .help-button:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #6a6050;
    color: #d4c4a8;
  }

  .help-icon {
    font-size: 14px;
  }

  .help-text {
    font-weight: 400;
  }
</style>
