<script lang="ts">
  import type { Connection, Position, ModuleInstance, PortType } from '$types';
  import { selectedConnectionId } from '$stores';

  interface Props {
    connectionList: Connection[];
    moduleList: ModuleInstance[];
    getPortPosition: (moduleId: string, portName: string) => Position | null;
    getPortType: (moduleId: string, portName: string) => PortType | null;
    onSelectConnection: (id: string | null) => void;
    onDeleteConnection: (id: string) => void;
    tempCable: { sourceModuleId: string; sourcePortName: string; currentX: number; currentY: number } | null;
  }

  let { connectionList, moduleList, getPortPosition, getPortType, onSelectConnection, onDeleteConnection, tempCable }: Props = $props();

  // Create a derived value that depends on module positions to trigger re-renders
  let positionKey = $derived(moduleList.map(m => `${m.id}:${m.position.x},${m.position.y}`).join('|'));
  
  // Compute cable paths with port types - will re-run when positionKey changes
  let cablePaths = $derived.by(() => {
    // Access positionKey to establish dependency
    void positionKey;
    return connectionList.map(conn => ({
      id: conn.id,
      start: getPortPosition(conn.sourceModuleId, conn.sourcePortName),
      end: getPortPosition(conn.targetModuleId, conn.targetPortName),
      type: getPortType(conn.sourceModuleId, conn.sourcePortName)
    })).filter(path => path.start && path.end);
  });

  function getCablePath(start: Position, end: Position): string {
    const dx = end.x - start.x;
    const tension = Math.min(Math.abs(dx) * 0.5, 100);
    
    return `M ${start.x} ${start.y} 
            C ${start.x + tension} ${start.y},
              ${end.x - tension} ${end.y},
              ${end.x} ${end.y}`;
  }

  function getCableColor(type: PortType | null): string {
    switch (type) {
      case 'audio': return '#d28b82';
      case 'control': return '#87a5c7';
      case 'gate': return '#8fc78f';
      case 'trigger': return '#e0bc77';
      default: return '#9a8a7a';
    }
  }

  function getCableGlow(type: PortType | null): string {
    switch (type) {
      case 'audio': return 'rgba(210, 139, 130, 0.32)';
      case 'control': return 'rgba(135, 165, 199, 0.32)';
      case 'gate': return 'rgba(143, 199, 143, 0.32)';
      case 'trigger': return 'rgba(224, 188, 119, 0.36)';
      default: return 'rgba(154, 138, 122, 0.24)';
    }
  }

  function handleCableClick(connId: string, e: MouseEvent) {
    e.stopPropagation();
    if ($selectedConnectionId === connId) {
      // Already selected, delete it
      onDeleteConnection(connId);
      onSelectConnection(null);
    } else {
      // Select it
      onSelectConnection(connId);
    }
  }

  // Unused function - reserved for future use
  // function handleBoardClick() {
  //   onSelectConnection(null);
  // }
</script>

<svg class="cable-layer" role="presentation">
  <!-- Permanent connections -->
  {#each cablePaths as path (path.id)}
    {@const isSelected = $selectedConnectionId === path.id}
    {@const color = getCableColor(path.type)}
    {@const glow = getCableGlow(path.type)}
    {@const d = getCablePath(path.start!, path.end!)}
    
    <!-- Invisible hit area for easier clicking -->
    <path
      class="cable-hit"
      {d}
      onclick={(e) => handleCableClick(path.id, e)}
      role="button"
      tabindex="0"
      aria-label="Connection {path.id}"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCableClick(path.id, e as unknown as MouseEvent);
        }
      }}
    />

    <path
      class="cable-glow type-{path.type || 'default'}"
      class:selected={isSelected}
      {d}
      style="stroke: {glow}"
    />
    
    <!-- Visible cable -->
    <path
      class="cable type-{path.type || 'default'}"
      class:selected={isSelected}
      {d}
      style="stroke: {color}; --cable-glow: {glow};"
    />
  {/each}

  <!-- Temporary cable being dragged -->
  {#if tempCable}
    {@const start = getPortPosition(tempCable.sourceModuleId, tempCable.sourcePortName)}
    {@const type = getPortType(tempCable.sourceModuleId, tempCable.sourcePortName)}
    {#if start}
      {@const tempGlow = getCableGlow(type)}
      <path
        class="cable-glow temp type-{type || 'default'}"
        d={getCablePath(start, { x: tempCable.currentX, y: tempCable.currentY })}
        style="stroke: {tempGlow}"
      />
      <path
        class="cable temp type-{type || 'default'}"
        d={getCablePath(start, { x: tempCable.currentX, y: tempCable.currentY })}
        style="stroke: {getCableColor(type)}; --cable-glow: {tempGlow};"
      />
    {/if}
  {/if}
</svg>

<style>
  .cable-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    pointer-events: none;
  }

  .cable {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    pointer-events: none;
    opacity: 0.96;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.4));
  }

  .cable-glow {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    pointer-events: none;
    opacity: 0.5;
    filter: blur(2.5px);
  }

  .cable.selected {
    stroke-width: 4.5;
    opacity: 1;
    filter:
      drop-shadow(0 0 6px var(--cable-glow))
      drop-shadow(0 0 2px rgba(255, 255, 255, 0.18));
  }

  .cable-glow.selected {
    stroke-width: 11;
    opacity: 0.82;
  }

  .cable-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 18;
    stroke-linecap: round;
    cursor: pointer;
    pointer-events: stroke;
  }

  .cable-hit:hover + .cable-glow,
  .cable-hit:focus + .cable-glow {
    opacity: 0.9;
    stroke-width: 10;
  }

  .cable-hit:hover + .cable-glow + .cable,
  .cable-hit:focus + .cable-glow + .cable {
    stroke-width: 4;
    opacity: 1;
    filter:
      drop-shadow(0 0 5px var(--cable-glow))
      drop-shadow(0 0 2px rgba(255, 255, 255, 0.12));
  }

  .cable-hit:focus {
    outline: none;
  }

  .cable.temp {
    stroke-dasharray: 8 5;
    opacity: 0.88;
    pointer-events: none;
  }

  .cable-glow.temp {
    opacity: 0.7;
  }

  /* Signal flow animations - glow layer only, cables stay static */
  @keyframes audio-pulse {
    0%, 100% { opacity: 0.5; filter: blur(2.5px); }
    50% { opacity: 0.9; filter: blur(4px); }
  }

  @keyframes gate-flash {
    0%, 100% { opacity: 0.5; filter: blur(2.5px); }
    10% { opacity: 1; filter: blur(5px); }
    20% { opacity: 0.5; filter: blur(2.5px); }
  }

  @keyframes trigger-flash {
    0%, 100% { opacity: 0.5; filter: blur(2.5px); }
    5% { opacity: 1; filter: blur(6px); }
    15% { opacity: 0.5; filter: blur(2.5px); }
  }

  @keyframes control-pulse {
    0%, 100% { opacity: 0.5; filter: blur(2.5px); }
    50% { opacity: 0.9; filter: blur(5px); }
  }

  .cable-glow.type-audio {
    animation: audio-pulse 1.5s ease-in-out infinite;
  }

  .cable-glow.type-gate {
    animation: gate-flash 2s ease-out infinite;
  }

  .cable-glow.type-trigger {
    animation: trigger-flash 1.8s ease-out infinite;
  }

  .cable-glow.type-control {
    animation: control-pulse 2.5s ease-in-out infinite;
  }

  .cable-glow.selected {
    animation-play-state: paused;
  }
</style>
