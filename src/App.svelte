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
      setupAutosave();
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
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: system-ui, -apple-system, sans-serif;
    position: relative;
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

  .toolbar-controls {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .toast {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(74, 222, 128, 0.9);
    color: #0f172a;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { transform: translate(-50%, -20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
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

  .preset-btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    background: transparent;
    color: #e0e0e0;
    border: 1px solid #4a9eff;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .preset-btn:hover {
    background: rgba(74, 158, 255, 0.1);
    border-color: #6ab2ff;
  }
</style>
