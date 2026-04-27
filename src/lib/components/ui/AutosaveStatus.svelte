<script lang="ts">
  let {
    status = 'idle',
    enabled = true,
    lastSavedTime = null,
    onToggle,
    onClearSession
  }: {
    status?: 'idle' | 'saving' | 'saved';
    enabled?: boolean;
    lastSavedTime?: Date | null;
    onToggle: (enabled: boolean) => void;
    onClearSession: () => void;
  } = $props();

  let timeAgo = $state('');

  $effect(() => {
    if (!lastSavedTime) {
      timeAgo = '';
      return;
    }

    const updateTimeAgo = () => {
      const diff = Math.floor((Date.now() - lastSavedTime!.getTime()) / 1000);
      if (diff < 60) timeAgo = 'just now';
      else if (diff < 3600) timeAgo = `${Math.floor(diff / 60)} min ago`;
      else timeAgo = `${Math.floor(diff / 3600)} hr ago`;
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);

    return () => clearInterval(interval);
  });

  function handleToggle(e: Event) {
    const target = e.target as HTMLInputElement;
    onToggle(target.checked);
  }

  function handleClear() {
    if (confirm('Delete all modules? This cannot be undone.')) {
      onClearSession();
    }
  }
</script>

<div class="autosave-status">
  <div class="control-group">
    <span class="group-label">Auto-save</span>
    <div class="group-controls">
      <label class="toggle-switch">
        <input type="checkbox" checked={enabled} onchange={handleToggle} />
        <span class="toggle-slider"></span>
      </label>
      {#if status === 'saving'}
        <span class="status-text saving">Saving...</span>
      {:else if status === 'saved' && lastSavedTime}
        <span class="status-text saved">Saved {timeAgo}</span>
      {:else}
        <span class="status-text idle">{enabled ? 'On' : 'Off'}</span>
      {/if}
    </div>
  </div>
  
  <button class="clear-btn" onclick={handleClear}>Clear</button>
</div>

<style>
  .autosave-status {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .group-label {
    font-size: 10px;
    color: #7a6a5a;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-family: 'Space Mono', monospace;
  }

  .group-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, #2a2520 0%, #1a1815 100%);
    border: 1px solid #4a4035;
    transition: 0.3s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background: #8a7a6a;
    transition: 0.3s;
  }

  input:checked + .toggle-slider {
    background: linear-gradient(180deg, #3a4538 0%, #2a3528 100%);
    border-color: #4a5548;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(20px);
    background: #a8d4a8;
  }

  .status-text {
    font-size: 11px;
    font-family: 'IBM Plex Mono', monospace;
    min-width: 70px;
    text-align: left;
  }

  .status-text.saving {
    color: #a8b8c4;
  }

  .status-text.saved {
    color: #8cb484;
  }

  .status-text.idle {
    color: #9a8a7a;
  }

  .clear-btn {
    background: linear-gradient(180deg, #5a4035 0%, #4a3025 100%);
    border: 1px solid #6a5040;
    color: #d4a8a8;
    border-radius: 2px;
    padding: 6px 10px;
    font-size: 11px;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .clear-btn:hover {
    background: linear-gradient(180deg, #6a5045 0%, #5a4035 100%);
    border-color: #8a6050;
    color: #e4c4c4;
  }
</style>
