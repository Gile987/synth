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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: #1a1a2e;
    border: 1px solid #444;
    border-radius: 12px;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, #2a2a3e, #1a1a2e);
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
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(231, 76, 60, 0.8);
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #333;
    background: #1a1a2e;
  }

  .tab {
    flex: 1;
    padding: 16px 24px;
    border: none;
    background: transparent;
    color: #888;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tab:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  .tab.active {
    color: #4a9eff;
    border-bottom: 2px solid #4a9eff;
    background: rgba(74, 158, 255, 0.1);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .help-sections {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-card {
    background: #252538;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
  }

  .section-header {
    width: 100%;
    padding: 16px 20px;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 0.2s;
  }

  .section-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .expand-icon {
    font-size: 20px;
    color: #888;
  }

  .section-content {
    padding: 0 20px 20px;
    border-top: 1px solid #333;
  }

  .section-description {
    color: #aaa;
    font-size: 14px;
    line-height: 1.6;
    margin: 16px 0;
  }

  .section-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .section-list li {
    padding: 8px 0;
    padding-left: 24px;
    position: relative;
    color: #ccc;
    font-size: 14px;
    line-height: 1.5;
    border-bottom: 1px solid #333;
  }

  .section-list li:last-child {
    border-bottom: none;
  }

  .section-list li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: #4a9eff;
  }

  .getting-started {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .step-card {
    display: flex;
    gap: 16px;
    background: #252538;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 20px;
  }

  .step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4a9eff, #2a7acc);
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
  }

  .step-content h3 {
    margin: 0 0 8px 0;
    color: #fff;
    font-size: 18px;
  }

  .step-description {
    color: #888;
    font-size: 14px;
    margin: 0 0 12px 0;
  }

  .step-list {
    margin: 0;
    padding-left: 20px;
  }

  .step-list li {
    color: #ccc;
    font-size: 14px;
    padding: 4px 0;
    line-height: 1.5;
  }

  /* Scrollbar styling */
  .modal-body::-webkit-scrollbar {
    width: 8px;
  }

  .modal-body::-webkit-scrollbar-track {
    background: #1a1a2e;
  }

  .modal-body::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }

  .modal-body::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
