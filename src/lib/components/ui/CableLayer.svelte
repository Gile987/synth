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
    const dy = end.y - start.y;
    const tension = Math.min(Math.abs(dx) * 0.5, 100);
    
    return `M ${start.x} ${start.y} 
            C ${start.x + tension} ${start.y},
              ${end.x - tension} ${end.y},
              ${end.x} ${end.y}`;
  }

  function getCableColor(type: PortType | null): string {
    switch (type) {
      case 'audio': return '#e74c3c';     // Red
      case 'control': return '#3498db';   // Blue  
      case 'gate': return '#2ecc71';      // Green
      case 'trigger': return '#f39c12';   // Orange
      default: return '#95a5a6';          // Gray
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

  function handleBoardClick() {
    onSelectConnection(null);
  }
</script>

<svg class="cable-layer" role="presentation">
  <!-- Permanent connections -->
  {#each cablePaths as path (path.id)}
    {@const isSelected = $selectedConnectionId === path.id}
    {@const color = getCableColor(path.type)}
    {@const d = getCablePath(path.start!, path.end!)}
    
    <!-- Invisible hit area for easier clicking -->
    <path
      class="cable-hit"
      {d}
      onclick={(e) => handleCableClick(path.id, e)}
    />
    
    <!-- Visible cable -->
    <path
      class="cable"
      class:selected={isSelected}
      {d}
      style="stroke: {color}"
    />
  {/each}

  <!-- Temporary cable being dragged -->
  {#if tempCable}
    {@const start = getPortPosition(tempCable.sourceModuleId, tempCable.sourcePortName)}
    {@const type = getPortType(tempCable.sourceModuleId, tempCable.sourcePortName)}
    {#if start}
      <path
        class="cable temp"
        d={getCablePath(start, { x: tempCable.currentX, y: tempCable.currentY })}
        style="stroke: {getCableColor(type)}"
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
    z-index: 1;
    pointer-events: none;
  }

  .cable {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    pointer-events: none;
  }

  .cable.selected {
    stroke-width: 5;
    filter: drop-shadow(0 0 4px currentColor);
  }

  .cable-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 15;
    stroke-linecap: round;
    cursor: pointer;
    pointer-events: stroke;
  }

  .cable-hit:hover + .cable {
    stroke-width: 4;
  }

  .cable.temp {
    stroke-dasharray: 8 4;
    opacity: 0.7;
    pointer-events: none;
  }
</style>
