<script lang="ts">
  import { helpModal } from '$stores';
  import type { HelpContent } from '$types';

  interface Props {
    content: HelpContent;
    size?: number;
  }

  let { content, size = 16 }: Props = $props();
  let isHovered = $state(false);

  function handleClick(e: Event) {
    e.stopPropagation();
    helpModal.open(content);
  }
</script>

<span
  class="help-icon"
  class:hovered={isHovered}
  style="width: {size}px; height: {size}px; font-size: {size * 0.6}px;"
  onclick={handleClick}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleClick(e)}
>
  ?
</span>

<style>
  .help-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #4a9eff;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
    flex-shrink: 0;
  }

  .help-icon.hovered {
    background: #6ab2ff;
    transform: scale(1.1);
  }
</style>
