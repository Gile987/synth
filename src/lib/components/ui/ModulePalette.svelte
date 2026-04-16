<script lang="ts">
  import { moduleDefinitions, synthService } from '$stores';
  import type { ModuleDefinition } from '$types';

  let definitions = $derived($moduleDefinitions);

  function handleAddModule(def: ModuleDefinition) {
    // Add at center of visible area
    const x = 300 + Math.random() * 100;
    const y = 200 + Math.random() * 100;
    synthService.addModule(def.type, { x, y });
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
</aside>

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
</style>
