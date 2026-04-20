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
    font-size: 13px;
    color: #a0a0a0;
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
  }

  .clear-btn {
    background: transparent;
    border: 1px solid #ff4d4d;
    color: #ff4d4d;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: rgba(255, 77, 77, 0.1);
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
    color: #4a9eff;
    animation: pulse 1.5s infinite;
  }

  .saved {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #4ade80;
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
