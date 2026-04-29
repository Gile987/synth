<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { SYNTH_HELP_CONTENT, GETTING_STARTED_STEPS } from '../../content/synth-help';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let activeTab = $state<'concepts' | 'getting-started'>('concepts');
  let expandedSection: number | null = $state(null);

  function toggleSection(index: number) {
    expandedSection = expandedSection === index ? null : index;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-backdrop"
    onclick={onClose}
    onkeydown={handleKeydown}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <header class="modal-header">
        <h2>🎹 Synthesis Guide</h2>
        <button class="close-btn" onclick={onClose}>×</button>
      </header>

      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === 'concepts'}
          onclick={() => activeTab = 'concepts'}
        >
          Core Concepts
        </button>
        <button
          class="tab"
          class:active={activeTab === 'getting-started'}
          onclick={() => activeTab = 'getting-started'}
        >
          Getting Started
        </button>
      </div>

      <div class="modal-body">
        {#if activeTab === 'concepts'}
          <div class="help-sections">
            {#each SYNTH_HELP_CONTENT as section, index}
              <div class="section-card">
                <button
                  class="section-header"
                  onclick={() => toggleSection(index)}
                >
                  <span class="section-title">{section.title}</span>
                  <span class="expand-icon">{expandedSection === index ? '−' : '+'}</span>
                </button>
                
                {#if expandedSection === index}
                  <div class="section-content" transition:fade={{ duration: 150 }}>
                    <p class="section-description">{section.content}</p>
                    {#if section.items}
                      <ul class="section-list">
                        {#each section.items as item}
                          <li>{item}</li>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="getting-started">
            {#each GETTING_STARTED_STEPS as step, index}
              <div class="step-card">
                <div class="step-number">{index + 1}</div>
                <div class="step-content">
                  <h3>{step.title}</h3>
                  <p class="step-description">{step.description}</p>
                  <ol class="step-list">
                    {#each step.patch as instruction}
                      <li>{instruction}</li>
                    {/each}
                  </ol>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 14, 12, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: linear-gradient(180deg, #3a3530 0%, #2a2520 100%);
    border: 2px solid #4a4035;
    border-radius: 3px;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
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
    color: #f0e8dc;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 500;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #5a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #5a4035 0%, #4a3025 100%);
    color: #e8ddd0;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
  }

  .close-btn:hover {
    background: linear-gradient(180deg, #6a5045 0%, #5a4035 100%);
    border-color: #7a6050;
    color: #f0e8dc;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #4a4035;
    background: linear-gradient(180deg, #3a3530 0%, #2a2520 100%);
  }

  .tab {
    flex: 1;
    padding: 14px 20px;
    border: none;
    background: transparent;
    color: #b0a090;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .tab:hover {
    color: #e8ddd0;
    background: rgba(255, 255, 255, 0.02);
  }

  .tab.active {
    color: #c8d8e8;
    border-bottom: 2px solid #5a5040;
    background: rgba(74, 84, 94, 0.1);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    font-family: 'Inter', sans-serif;
  }

  .help-sections {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-card {
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    border: 1px solid #4a4035;
    border-radius: 2px;
    overflow: hidden;
  }

  .section-header {
    width: 100%;
    padding: 14px 18px;
    border: none;
    background: transparent;
    color: #f0e8dc;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'Inter', sans-serif;
  }

  .section-header:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .expand-icon {
    font-size: 18px;
    color: #a09080;
    font-family: 'JetBrains Mono', monospace;
  }

  .section-content {
    padding: 0 18px 18px;
    border-top: 1px solid #3a3530;
  }

  .section-description {
    color: #d8d0c4;
    font-size: 13px;
    line-height: 1.6;
    margin: 14px 0;
  }

  .section-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .section-list li {
    padding: 6px 0;
    padding-left: 20px;
    position: relative;
    color: #e8ddd0;
    font-size: 12px;
    line-height: 1.5;
    border-bottom: 1px solid #3a3530;
  }

  .section-list li:last-child {
    border-bottom: none;
  }

  .section-list li::before {
    content: '>';
    position: absolute;
    left: 0;
    color: #a09080;
    font-family: 'JetBrains Mono', monospace;
  }

  .getting-started {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .step-card {
    display: flex;
    gap: 14px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    border: 1px solid #4a4035;
    border-radius: 2px;
    padding: 16px;
  }

  .step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    color: #f0e8dc;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid #5a5040;
    font-family: 'JetBrains Mono', monospace;
  }

  .step-content {
    flex: 1;
  }

  .step-content h3 {
    margin: 0 0 6px 0;
    color: #f0e8dc;
    font-size: 16px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }

  .step-description {
    color: #b0a090;
    font-size: 12px;
    margin: 0 0 10px 0;
    line-height: 1.5;
  }

  .step-list {
    margin: 0;
    padding-left: 18px;
  }

  .step-list li {
    color: #d8d0c4;
    font-size: 12px;
    padding: 3px 0;
    line-height: 1.5;
  }

  /* Scrollbar styling */
  .modal-body::-webkit-scrollbar {
    width: 10px;
  }

  .modal-body::-webkit-scrollbar-track {
    background: #2a2520;
  }

  .modal-body::-webkit-scrollbar-thumb {
    background: #4a4035;
    border-radius: 0;
    border: 1px solid #5a5040;
  }

  .modal-body::-webkit-scrollbar-thumb:hover {
    background: #5a5040;
  }
</style>
