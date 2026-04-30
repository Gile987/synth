<script lang="ts">
  import { onMount } from 'svelte';
  import ModulePalette from '$components/ui/ModulePalette.svelte';
  import PatchBoard from '$components/ui/PatchBoard.svelte';
  import HelpModal from '$components/ui/HelpModal.svelte';
  import PresetBrowser from '$components/ui/PresetBrowser.svelte';
  import AutosaveStatus from '$components/ui/AutosaveStatus.svelte';
  import { get } from 'svelte/store';
  import { synthService, presetManager, modules, connections } from '$stores';

  let audioStarted = $state(false);
  let modulesRegistered = $state(false);
  let error = $state<string | null>(null);
  let presetBrowserOpen = $state(false);

  let autosaveEnabled = $state(true);
  let autosaveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
  let lastSavedTime = $state<Date | null>(null);
  let showRestoreNotification = $state(false);
  let userClearedSession = false;
  let autosaveCleanup: (() => void) | null = null;

  onMount(() => {
    try {
      // Register modules first (doesn't need audio context)
      synthService.registerModules();
      modulesRegistered = true;
      autosaveEnabled = presetManager.getAutosavePreference();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to register modules';
      console.error('[app] Registration failed:', err);
    }

    return () => {
      if (autosaveCleanup) {
        autosaveCleanup();
      }
      synthService.dispose();
    };
  });

  async function startAudio() {
    try {
      await synthService.initializeAudio();
      audioStarted = true;
      
      // Load autosave if exists and has modules
      const autosave = presetManager.loadAutosave();
      if (autosave && autosave.modules.length > 0 && !userClearedSession && autosaveEnabled) {
        try {
          await synthService.loadPatch(autosave);
          console.log('[app] Restored previous session');
          showRestoreNotification = true;
          setTimeout(() => {
            showRestoreNotification = false;
          }, 3000);
        } catch (err) {
          console.error('[app] Failed to restore autosave:', err);
        }
      } else if (autosave && (autosave.modules.length === 0 || userClearedSession)) {
        // Autosave exists but is empty or user cleared it, clean it up
        presetManager.clearAutosave();
      }
      
      // Start auto-save subscription
      autosaveCleanup = setupAutosave();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to start audio';
      console.error('[app] Audio initialization failed:', err);
    }
  }
  
  function setupAutosave() {
    // Subscribe to module and connection changes for auto-save
    let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
    let savedTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const triggerAutosave = () => {
      if (!autosaveEnabled) return;

      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
      }

      autosaveTimeout = setTimeout(() => {
        const currentModules = get(modules);
        if (currentModules.size === 0) {
          presetManager.clearAutosave();
          return;
        }

        autosaveStatus = 'saving';
        
        // Wait a tiny bit for visual feedback
        setTimeout(() => {
          presetManager.saveToLocalStorage('autosave');
          autosaveStatus = 'saved';
          lastSavedTime = new Date();
          
          if (savedTimeout) clearTimeout(savedTimeout);
          savedTimeout = setTimeout(() => {
            if (autosaveStatus === 'saved') autosaveStatus = 'idle';
          }, 3000);
        }, 300);
      }, 5000);
    };
    
    // Subscribe to changes
    const unsubModules = modules.subscribe(triggerAutosave);
    const unsubConnections = connections.subscribe(triggerAutosave);
    
    return () => {
      unsubModules();
      unsubConnections();
      if (autosaveTimeout) clearTimeout(autosaveTimeout);
      if (savedTimeout) clearTimeout(savedTimeout);
    };
  }
  
  function handleToggleAutosave(enabled: boolean) {
    autosaveEnabled = enabled;
    presetManager.setAutosavePreference(enabled);
  }

  function handleClearSession() {
    userClearedSession = true;
    if (autosaveCleanup) {
      autosaveCleanup();
      autosaveCleanup = null;
    }
    presetManager.clearSession();
    audioStarted = false; // Reset to start screen
    autosaveStatus = 'idle';
  }


  function openPresetBrowser() {
    presetBrowserOpen = true;
  }
  
  function closePresetBrowser() {
    presetBrowserOpen = false;
  }
</script>

<div class="app">
  <header class="toolbar">
    <h1>Modular Synth</h1>
    {#if audioStarted}
      <div class="toolbar-controls">
        <AutosaveStatus 
          status={autosaveStatus} 
          enabled={autosaveEnabled} 
          {lastSavedTime} 
          onToggle={handleToggleAutosave} 
          onClearSession={handleClearSession} 
        />
        <button class="preset-btn" onclick={openPresetBrowser}>
          Presets
        </button>
      </div>
    {/if}
    {#if error}
      <div class="error">Error: {error}</div>
    {/if}
  </header>

  {#if showRestoreNotification}
    <div class="toast">Session restored</div>
  {/if}

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
  <PresetBrowser isOpen={presetBrowserOpen} onClose={closePresetBrowser} />
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :global(body) {
    margin: 0;
    padding: 0;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: 
      /* VHS static noise */
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
      /* Worn tape background */
      linear-gradient(180deg, #2a2520 0%, #1a1815 50%, #0f0e0c 100%);
    background-size: 200px 200px, 100% 100%;
    background-blend-mode: overlay, normal;
    color: #e8ddd0;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: #2a2720;
    border-bottom: 2px solid #3a3630;
    position: relative;
    z-index: 100;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .toolbar h1 {
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 24px;
    font-weight: 600;
    color: #f0e8dc;
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .toast {
    position: absolute;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: #3a3025;
    color: #a8d4a8;
    padding: 10px 20px;
    border: 1px solid #5a5040;
    font-weight: 400;
    font-size: 14px;
    z-index: 1000;
    font-family: 'JetBrains Mono', monospace;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  }

  .error {
    color: #d4a8a8;
    font-size: 13px;
    font-family: 'Inter', sans-serif;
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
    color: #606080;
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
    color: #8a7a6a;
    font-family: 'Inter', sans-serif;
  }

  .start-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 20px;
  }

  .start-btn {
    padding: 20px 48px;
    font-size: 20px;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 4px;
    background: 
      linear-gradient(180deg, #4a4035 0%, #3a3025 50%, #2a2018 100%);
    color: #d4c4a8;
    border: 3px solid #5a5040;
    border-radius: 2px;
    cursor: pointer;
    position: relative;
    box-shadow: 
      0 4px 15px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    filter: blur(0.2px);
  }

  .start-btn::before {
    content: '▶';
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #a8d4a8;
    font-size: 14px;
  }

  .start-btn:hover {
    background: 
      linear-gradient(180deg, #5a5045 0%, #4a4035 50%, #3a3028 100%);
    border-color: #6a6050;
    color: #e4d4b8;
  }

  .start-btn:active {
    background: 
      linear-gradient(180deg, #3a3025 0%, #2a2018 50%, #1a1008 100%);
    box-shadow: 
      inset 0 2px 5px rgba(0, 0, 0, 0.5);
  }

  .hint {
    color: #7a6a5a;
    font-size: 14px;
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    opacity: 0.8;
  }

  .preset-btn {
    padding: 8px 16px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 2px;
    background: linear-gradient(180deg, #3a3025 0%, #2a2018 100%);
    color: #c4b8a8;
    border: 2px solid #4a4035;
    border-radius: 2px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .preset-btn:hover {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 100%);
    border-color: #5a5040;
    color: #d4c4a8;
  }
</style>
