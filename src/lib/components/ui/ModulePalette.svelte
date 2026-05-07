<script lang="ts">
  import { moduleDefinitions, synthService } from '$stores';
  import type { ModuleDefinition, ModuleCategory } from '$types';
  import SynthHelpModal from './SynthHelpModal.svelte';

  let definitions = $derived($moduleDefinitions);
  let helpOpen = $state(false);
  let searchQuery = $state('');
  
  // Initialize collapsed state from localStorage (run once on mount)
  function getInitialCollapsedState(): Record<ModuleCategory, boolean> {
    const defaults = {
      source: false,
      effect: false,
      modulation: false,
      utility: false,
      output: false
    };
    
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('synth-palette-collapsed');
      if (saved) {
        try {
          return { ...defaults, ...JSON.parse(saved) };
        } catch {
          // Ignore parse errors, use defaults
        }
      }
    }
    return defaults;
  }
  
  let collapsedSections = $state<Record<ModuleCategory, boolean>>(getInitialCollapsedState());

  // Save collapsed state when it changes (only after initial load)
  let isInitialized = $state(false);
  $effect(() => {
    // Skip first run (initialization)
    if (!isInitialized) {
      isInitialized = true;
      return;
    }
    // Save to localStorage on subsequent changes
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('synth-palette-collapsed', JSON.stringify(collapsedSections));
    }
  });

  const categories: ModuleCategory[] = ['source', 'effect', 'modulation', 'utility', 'output'];
  
  const categoryLabels: Record<ModuleCategory, string> = {
    source: 'Sources',
    effect: 'Effects',
    modulation: 'Modulation',
    utility: 'Utilities',
    output: 'Output'
  };
  
  const categoryIcons: Record<ModuleCategory, string> = {
    source: '∿',  // Wave symbol
    effect: '✦',  // Star/diamond for effects
    modulation: '◯', // Circle for modulation signals
    utility: '⚡', // Lightning for utilities
    output: '▶'   // Play/output symbol
  };

  function toggleSection(category: ModuleCategory) {
    collapsedSections = { ...collapsedSections, [category]: !collapsedSections[category] };
  }

  function getModulesByCategory(category: ModuleCategory): ModuleDefinition[] {
    return definitions
      .filter(def => def.category === category)
      .filter(def => searchQuery === '' || def.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }

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
  
  <div class="search-container">
    <input
      type="text"
      class="search-input"
      placeholder="Find module..."
      bind:value={searchQuery}
    />
    <span class="search-icon">⌕</span>
  </div>

  <div class="category-list">
    {#each categories as category}
      {@const modules = getModulesByCategory(category)}
      {@const isCollapsed = collapsedSections[category]}
      {@const totalCount = definitions.filter(d => d.category === category).length}
      {@const visibleCount = modules.length}
      
      {#if searchQuery === '' || visibleCount > 0}
        <div class="category-section">
          <button
            class="category-header"
            class:collapsed={isCollapsed}
            onclick={() => toggleSection(category)}
          >
            <span class="category-icon">{categoryIcons[category]}</span>
            <span class="category-label">{categoryLabels[category]}</span>
            <span class="category-count">({searchQuery ? `${visibleCount}/${totalCount}` : totalCount})</span>
            <span class="expand-icon">{isCollapsed ? '▶' : '▼'}</span>
          </button>
          
          {#if !isCollapsed}
            <div class="module-list">
              {#each modules as def}
                <button
                  class="module-button"
                  onclick={() => handleAddModule(def)}
                >
                  {def.label}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
    
    {#if searchQuery && categories.every(cat => getModulesByCategory(cat).length === 0)}
      <div class="no-results">No modules found</div>
    {/if}
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
    width: 260px;
    background: linear-gradient(180deg, #3a3530 0%, #2a2520 100%);
    border-right: 2px solid #4a4035;
    padding: 16px 16px 16px 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 
      4px 0 15px rgba(0, 0, 0, 0.4),
      inset -1px 0 0 rgba(255, 255, 255, 0.05);
  }

  h2 {
    margin: 0 0 12px 0;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: #f0e8dc;
    text-transform: uppercase;
    letter-spacing: 3px;
    border-bottom: 1px solid #4a4035;
    padding-bottom: 10px;
  }

  .search-container {
    position: relative;
    margin-bottom: 12px;
  }

  .search-input {
    width: 100%;
    padding: 10px 28px 10px 10px;
    border: 1px solid #4a4035;
    border-radius: 2px;
    background: linear-gradient(180deg, #2a2018 0%, #1a1510 100%);
    color: #f0e8dc;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    box-sizing: border-box;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .search-input::placeholder {
    color: #6a6050;
  }

  .search-input:focus {
    outline: none;
    border-color: #6a6050;
  }

  .search-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #6a6050;
    font-size: 14px;
    pointer-events: none;
  }

  .category-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: 12px;
    margin-right: -12px;
    box-sizing: border-box;
  }

  .category-section {
    display: flex;
    flex-direction: column;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 8px;
    border: 1px solid transparent;
    border-radius: 2px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    color: #d8d0c4;
    font-size: 13px;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .category-header:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #5a5040;
    color: #f0e8dc;
  }

  .category-header.collapsed {
    background: linear-gradient(180deg, #2a2520 0%, #1a1510 100%);
    color: #a09888;
  }

  .category-icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
    color: #8a9c8a;
  }

  .category-section:nth-child(2) .category-icon {
    color: #9c7c8c;
  }

  .category-section:nth-child(3) .category-icon {
    color: #7c8c9c;
  }

  .category-section:nth-child(4) .category-icon {
    color: #9c9c7c;
  }

  .category-section:nth-child(5) .category-icon {
    color: #9c847c;
  }

  .category-label {
    flex: 1;
  }

  .category-count {
    color: #908070;
    font-size: 11px;
  }

  .expand-icon {
    font-size: 10px;
    color: #908070;
    transition: transform 0.2s;
  }

  .module-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 0 6px 8px;
    border-left: 1px solid #3a3025;
    margin-left: 8px;
  }

  .module-button {
    padding: 8px 12px;
    border: 1px solid #3a3025;
    border-radius: 2px;
    background: linear-gradient(180deg, #322820 0%, #242018 100%);
    color: #c8c0b4;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .module-button:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #5a5040;
    color: #f0e8dc;
  }

  .no-results {
    padding: 20px 10px;
    text-align: center;
    color: #908070;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .help-section {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #4a4035;
  }

  .help-button {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #5a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    color: #e8ddd0;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .help-button:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #6a6050;
    color: #f0e8dc;
  }

  .help-icon {
    font-size: 14px;
  }
</style>
