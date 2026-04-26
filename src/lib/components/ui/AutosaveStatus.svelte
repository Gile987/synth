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
  <div class="controls">
    <label class="toggle-label">
      <input type="checkbox" checked={enabled} onchange={handleToggle} />
      <span class="toggle-text">Auto-save</span>
    </label>
    <button class="clear-btn" onclick={handleClear}>Clear Session</button>
  </div>

  <div class="status-indicator" class:visible={enabled}>
    {#if status === 'saving'}
      <span class="saving">Auto-saving...</span>
    {:else if status === 'saved' && lastSavedTime}
      <span class="saved">
        <svg class="check-icon" viewBox="0 0 24 24" width="14" height="14">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>
        </svg>
        Saved {timeAgo}
      </span>
    {/if}
  </div>
</div>

<style>
  .autosave-status {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: #9a8a7a;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .toggle-text {
    user-select: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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

  .status-indicator {
    display: flex;
    align-items: center;
    min-width: 120px;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .status-indicator.visible {
    opacity: 1;
  }

  .saving {
    color: #a8b8c4;
    animation: pulse 1.5s infinite;
  }

  .saved {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #8cb484;
  }

  .check-icon {
    display: inline-block;
  }

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
</style>
