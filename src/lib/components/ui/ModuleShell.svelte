<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ModuleDefinition, PortDefinition } from '$types';
  import HelpIcon from './HelpIcon.svelte';
  import Port from './Port.svelte';

  interface Position {
    x: number;
    y: number;
  }

  interface Props {
    moduleId: string;
    label: string;
    helpContent: ModuleDefinition['help'];
    category: ModuleDefinition['category'];
    position: Position;
    inputPorts: PortDefinition[];
    outputPorts: PortDefinition[];
    connectedInputs: Set<string>;
    isSelected?: boolean;
    isDragging?: boolean;
    shellClass?: string;
    portVariant?: 'warm' | 'cool';
    children?: Snippet;
    onSelect: () => void;
    onDelete: () => void;
    onDragStart: (event: MouseEvent) => void;
    onPortMouseDown: (portName: string, direction: 'input' | 'output') => void;
    onPortMouseUp: (portName: string, direction: 'input' | 'output') => void;
  }

  let {
    moduleId,
    label,
    helpContent,
    category,
    position,
    inputPorts,
    outputPorts,
    connectedInputs,
    isSelected = false,
    isDragging = false,
    shellClass = '',
    portVariant = 'warm',
    children,
    onSelect,
    onDelete,
    onDragStart,
    onPortMouseDown,
    onPortMouseUp
  }: Props = $props();
</script>

<div
  class={`module ${shellClass}`}
  class:selected={isSelected}
  class:dragging={isDragging}
  style={`left: ${position.x}px; top: ${position.y}px;`}
  onclick={onSelect}
  onkeydown={(event) => event.key === 'Delete' && onDelete()}
  role="button"
  tabindex="0"
  data-module-id={moduleId}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header
    class={`module-header category-${category}`}
    onmousedown={onDragStart}
  >
    <span class="title">{label}</span>
    <HelpIcon content={helpContent} size={14} />
    <button class="delete-btn" onclick={onDelete}>×</button>
  </header>

  <div class="module-body">
    <div class="ports-section">
      <div class="ports-column inputs">
        {#each inputPorts as port}
          <Port
            {port}
            variant={portVariant}
            isConnected={connectedInputs.has(port.name)}
            onMouseDown={onPortMouseDown}
            onMouseUp={onPortMouseUp}
          />
        {/each}
      </div>

      <div class="ports-column outputs">
        {#each outputPorts as port}
          <Port
            {port}
            variant={portVariant}
            onMouseDown={onPortMouseDown}
            onMouseUp={onPortMouseUp}
          />
        {/each}
      </div>
    </div>

    {@render children?.()}
  </div>
</div>

<style>
  .module {
    position: absolute;
    width: 220px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 12%),
      linear-gradient(180deg, #4f4438 0%, #3a3025 46%, #261d16 100%);
    border: 1px solid #6a5c4d;
    border-radius: 6px;
    cursor: default;
    user-select: none;
    box-shadow:
      0 10px 24px rgba(0, 0, 0, 0.46),
      0 2px 0 rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .module::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 3px;
    background: #6a6050;
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
    opacity: 0.85;
  }

  .module::after {
    content: '';
    position: absolute;
    inset: 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.035);
    pointer-events: none;
    opacity: 0.7;
  }

  .module.selected {
    border-color: #97806a;
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.5),
      0 0 0 2px rgba(214, 186, 145, 0.24),
      0 0 18px rgba(214, 186, 145, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .module.dragging {
    z-index: 20;
    box-shadow:
      0 18px 36px rgba(0, 0, 0, 0.58),
      0 0 24px rgba(214, 186, 145, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px 11px;
    border-radius: 6px 6px 0 0;
    cursor: grab;
    gap: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.34);
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-size: 15px;
    font-weight: 500;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.18);
  }

  .module-header:active {
    cursor: grabbing;
  }

  .category-source {
    background: linear-gradient(180deg, #3a4538 0%, #2a3528 100%);
    color: #c8e8c8;
  }

  .category-effect {
    background: linear-gradient(180deg, #453a40 0%, #352a30 100%);
    color: #e8c8d0;
  }

  .category-output {
    background: linear-gradient(180deg, #453830 0%, #352820 100%);
    color: #f0e0d8;
  }

  .category-modulation {
    background: linear-gradient(180deg, #3a4045 0%, #2a3035 100%);
    color: #c8d8e8;
  }

  .category-utility {
    background: linear-gradient(180deg, #4a433a 0%, #393228 100%);
    color: #e8dccf;
  }

  .title {
    flex: 1;
    font-weight: 500;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.24);
  }

  .delete-btn {
    width: 18px;
    height: 18px;
    border: 1px solid #6a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #5a4035 0%, #4a3025 100%);
    color: #d4a8a8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
    font-family: 'JetBrains Mono', monospace;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 1px 0 rgba(0, 0, 0, 0.2);
  }

  .delete-btn:hover {
    background: linear-gradient(180deg, #6a5045 0%, #5a4035 100%);
    border-color: #8a6050;
  }

  .module-body {
    padding: 12px;
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, transparent 18%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0) 100%);
  }

  .ports-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    padding: 10px 10px 8px;
    border: 1px solid rgba(108, 94, 77, 0.55);
    border-radius: 5px;
    background:
      linear-gradient(180deg, rgba(30, 25, 21, 0.92) 0%, rgba(19, 16, 13, 0.96) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .ports-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ports-column.inputs :global(.port) {
    justify-content: flex-start;
  }

  .ports-column.outputs :global(.port) {
    justify-content: flex-end;
  }

  .module.scope {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 50%, #2a2018 100%);
    border: 2px solid #5a5040;
    border-radius: 3px;
    box-shadow:
      0 4px 15px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .module.scope::after {
    display: none;
  }

  .module.scope.selected {
    border-color: #7a6a58;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.7),
      0 0 0 2px rgba(200, 180, 140, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .module.scope.dragging {
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.7),
      0 0 20px rgba(200, 180, 140, 0.15);
  }

  .module.scope .module-header {
    padding: 14px 12px 10px;
    border-radius: 3px 3px 0 0;
    letter-spacing: 1px;
    box-shadow: none;
  }

  .module.scope .category-utility {
    background: linear-gradient(180deg, #5a5045 0%, #4a4035 100%);
    color: #e8e0d8;
  }

  .module.scope .title {
    font-weight: 400;
    text-shadow: none;
  }

  .module.scope .delete-btn {
    box-shadow: none;
  }

  .module.scope .module-body {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, transparent 100%);
  }

  .module.scope .ports-section {
    margin-bottom: 16px;
    padding: 0;
    border: none;
    border-radius: 0;
    background: none;
    box-shadow: none;
  }

  .module.sequencer {
    width: 320px;
    background: #2a2a3e;
    border: 1px solid #444;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .module.sequencer::before,
  .module.sequencer::after {
    display: none;
  }

  .module.sequencer.selected {
    border-color: #4a9eff;
    box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.3);
  }

  .module.sequencer.dragging {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .module.sequencer .module-header {
    padding: 10px 12px;
    border-radius: 8px 8px 0 0;
    border-bottom: none;
    font-family: inherit;
    text-transform: none;
    letter-spacing: normal;
    font-size: inherit;
    font-weight: inherit;
    box-shadow: none;
  }

  .module.sequencer .category-modulation {
    background: linear-gradient(135deg, #2a6e4a, #1a5e3a);
    color: #fff;
  }

  .module.sequencer .title {
    font-weight: 600;
    font-size: 14px;
    text-shadow: none;
  }

  .module.sequencer .delete-btn {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 16px;
    box-shadow: none;
  }

  .module.sequencer .delete-btn:hover {
    background: rgba(231, 76, 60, 0.8);
    border-color: transparent;
  }

  .module.sequencer .module-body {
    background: none;
  }

  .module.sequencer .ports-section {
    margin-bottom: 12px;
    padding: 0;
    border: none;
    border-radius: 0;
    background: none;
    box-shadow: none;
  }
</style>
