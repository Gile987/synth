<script lang="ts">
  import { onMount } from 'svelte';
  import ModulePalette from '$components/ui/ModulePalette.svelte';
  import PatchBoard from '$components/ui/PatchBoard.svelte';
  import HelpModal from '$components/ui/HelpModal.svelte';
  import { synthService } from '$stores';

  let audioStarted = $state(false);
  let modulesRegistered = $state(false);
  let error = $state<string | null>(null);

  onMount(() => {
    try {
      // Register modules first (doesn't need audio context)
      synthService.registerModules();
      modulesRegistered = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to register modules';
      console.error('[app] Registration failed:', err);
    }

    return () => {
      synthService.dispose();
    };
  });

  async function startAudio() {
    try {
      await synthService.initializeAudio();
      audioStarted = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to start audio';
      console.error('[app] Audio initialization failed:', err);
    }
  }
</script>

<div class="app">
  <header class="toolbar">
    <h1>Modular Synth</h1>
    {#if error}
      <div class="error">Error: {error}</div>
    {/if}
  </header>

  <main class="main-content">
    {#if !modulesRegistered}
      <div class="loading">Loading modules...</div>
    {:else if !audioStarted}
      <div class="start-screen">
        <button class="start-btn" onclick={startAudio}>
          Click to Start Audio
        </button>
        <p class="hint">Browser requires user interaction before audio can play</p>
      </div>
    {:else}
      <ModulePalette />
      <PatchBoard />
    {/if}
  </main>

  <HelpModal />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #252542;
    border-bottom: 1px solid #333;
  }

  .toolbar h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .error {
    color: #ff6b6b;
    font-size: 14px;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    font-size: 16px;
    color: #888;
  }

  .start-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 16px;
  }

  .start-btn {
    padding: 16px 32px;
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(135deg, #4a9eff, #2980b9);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
  }

  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(74, 158, 255, 0.4);
  }

  .hint {
    color: #888;
    font-size: 14px;
    margin: 0;
  }
</style>
