<script lang="ts">
  import { helpModal } from '$stores';
  import { fade, scale } from 'svelte/transition';

  let modal = $derived($helpModal);

  function close() {
    helpModal.close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if modal.isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    onclick={close}
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
        <h2>{modal.title}</h2>
        <button class="close-btn" onclick={close}>×</button>
      </header>

      <div class="modal-body">
        <p class="description">{modal.description}</p>

        {#if modal.usage}
          <section>
            <h3>Usage</h3>
            <p>{modal.usage}</p>
          </section>
        {/if}

        {#if modal.tips && modal.tips.length > 0}
          <section>
            <h3>Tips</h3>
            <ul>
              {#each modal.tips as tip}
                <li>{tip}</li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if modal.related && modal.related.length > 0}
          <section>
            <h3>Related</h3>
            <p class="related">{modal.related.join(', ')}</p>
          </section>
        {/if}
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
    max-width: 500px;
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

  .description {
    margin: 0 0 20px 0;
    font-size: 16px;
  }

  section {
    margin-bottom: 20px;
  }

  section:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #4a9eff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  section p {
    margin: 0;
    font-size: 14px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 4px;
    font-size: 14px;
  }

  .related {
    color: #888;
  }
</style>
