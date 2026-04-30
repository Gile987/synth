<script lang="ts">
  import { modules, connections, moduleDefinitions, dragState, cableState, selectedModuleId, selectedConnectionId, synthService } from '$stores';
  import Module from './Module.svelte';
  import SequencerModule from './SequencerModule.svelte';
  import ScopeModule from './ScopeModule.svelte';
  import CableLayer from './CableLayer.svelte';
  import type { Position, PortType, ModuleDefinition, ModuleInstance, Connection } from '$types';

  let boardElement: HTMLDivElement;
  let boardContainerElement: HTMLDivElement;
  let moduleList: ModuleInstance[] = $derived(Array.from($modules.values()));
  let connectionList: Connection[] = $derived(Array.from($connections.values()));
  
  // Board dimensions that grow automatically
  let boardWidth = $state(0);
  let boardHeight = $state(0);
  let containerWidth = $state(0);
  let containerHeight = $state(0);
  
  const PADDING = 400; // Space to keep around the rightmost/bottommost module
  const EXPANSION_THRESHOLD = 200; // Expand when module is this close to edge
  
  // Update board size based on container and modules
  function updateBoardSize() {
    if (!boardContainerElement) return;
    
    const containerRect = boardContainerElement.getBoundingClientRect();
    containerWidth = containerRect.width;
    containerHeight = containerRect.height;
    
    // Start with container size as minimum
    let minWidth = containerWidth;
    let minHeight = containerHeight;
    
    // Find the furthest module position
    moduleList.forEach(module => {
      // Standard module is ~220px wide, sequencer is ~320px
      const moduleWidth = module.type === 'sequencer' ? 320 : 220;
      const moduleHeight = 300; // Approximate module height
      
      const moduleRight = module.position.x + moduleWidth;
      const moduleBottom = module.position.y + moduleHeight;
      
      minWidth = Math.max(minWidth, moduleRight + PADDING);
      minHeight = Math.max(minHeight, moduleBottom + PADDING);
    });
    
    // Smooth transition to new size
    boardWidth = minWidth;
    boardHeight = minHeight;
  }
  
  // Watch for module changes and update size
  $effect(() => {
    // Access moduleList to trigger re-computation
    void moduleList.length;
    updateBoardSize();
  });
  
  // Initialize board size on mount
  $effect(() => {
    if (boardContainerElement) {
      updateBoardSize();
      
      // Handle window resize
      const handleResize = () => updateBoardSize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  });
  
  // Get port positions for cable rendering
  function getPortPosition(moduleId: string, portName: string): Position | null {
    const moduleEl = boardElement?.querySelector(`[data-module-id="${moduleId}"]`);
    if (!moduleEl) return null;
    
    const portEl = moduleEl.querySelector(`[data-port-name="${portName}"]`);
    if (!portEl || !(portEl instanceof HTMLElement)) return null;
    
    const boardRect = boardElement.getBoundingClientRect();
    const portRect = portEl.getBoundingClientRect();
    
    return {
      x: portRect.left - boardRect.left + portRect.width / 2,
      y: portRect.top - boardRect.top + portRect.height / 2
    };
  }

  function handleMouseMove(e: MouseEvent) {
    // Handle module dragging
    if ($dragState) {
      const rect = boardElement.getBoundingClientRect();
      const x = e.clientX - rect.left - $dragState.offsetX;
      const y = e.clientY - rect.top - $dragState.offsetY;
      
      // Snap to 20px grid
      const snappedX = Math.round(x / 20) * 20;
      const snappedY = Math.round(y / 20) * 20;
      
      synthService.updateModulePosition($dragState.moduleId, { x: snappedX, y: snappedY });
      
      // Check if we need to expand the board
      const module = $modules.get($dragState.moduleId);
      if (module) {
        const moduleWidth = module.type === 'sequencer' ? 320 : 220;
        const moduleHeight = 300;
        const moduleRight = snappedX + moduleWidth;
        const moduleBottom = snappedY + moduleHeight;
        
        // Expand if module is near the edge
        if (moduleRight > boardWidth - EXPANSION_THRESHOLD || 
            moduleBottom > boardHeight - EXPANSION_THRESHOLD) {
          updateBoardSize();
        }
      }
    }

    // Update cable drawing position
    if ($cableState) {
      const rect = boardElement.getBoundingClientRect();
      $cableState.currentX = e.clientX - rect.left;
      $cableState.currentY = e.clientY - rect.top;
    }
  }

  function handleMouseUp() {
    $dragState = null;
    $cableState = null;
  }

  function handleModuleDragStart(moduleId: string, e: MouseEvent) {
    const moduleEl = boardElement.querySelector(`[data-module-id="${moduleId}"]`);
    if (!moduleEl || !(moduleEl instanceof HTMLElement)) return;
    const rect = moduleEl.getBoundingClientRect();
    $dragState = {
      moduleId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
  }

  function handlePortMouseDown(moduleId: string, portName: string, direction: 'input' | 'output') {
    if (direction === 'output') {
      // Start new cable from output
      const pos = getPortPosition(moduleId, portName);
      if (pos) {
        $cableState = {
          sourceModuleId: moduleId,
          sourcePortName: portName,
          currentX: pos.x,
          currentY: pos.y
        };
      }
    } else {
      // Check if this input already has a connection
      // Use connectionList which is already derived from $connections
      const existingConnection = connectionList.find(
        conn => conn.targetModuleId === moduleId && conn.targetPortName === portName
      );
      
      if (existingConnection) {
        // Pick up existing cable: disconnect and start dragging from the source
        const pos = getPortPosition(existingConnection.sourceModuleId, existingConnection.sourcePortName);
        if (pos) {
          // Remove the existing connection
          synthService.disconnect(existingConnection.id);
          
          // Start dragging from the source (as if we clicked the output)
          $cableState = {
            sourceModuleId: existingConnection.sourceModuleId,
            sourcePortName: existingConnection.sourcePortName,
            currentX: pos.x,
            currentY: pos.y
          };
        }
      }
    }
  }

  function handlePortMouseUp(moduleId: string, portName: string, direction: 'input' | 'output') {
    if ($cableState && direction === 'input' && $cableState.sourceModuleId !== moduleId) {
      synthService.connect(
        $cableState.sourceModuleId,
        $cableState.sourcePortName,
        moduleId,
        portName
      );
    }
    $cableState = null;
  }

  function handleBoardClick() {
    $selectedModuleId = null;
  }

  function getModuleDefinition(type: string): ModuleDefinition | undefined {
    return $moduleDefinitions.find((d: ModuleDefinition) => d.type === type);
  }

  function getPortType(moduleId: string, portName: string): PortType | null {
    const module = $modules.get(moduleId);
    if (!module) return null;
    const def = getModuleDefinition(module.type);
    if (!def) return null;
    const port = def.ports.find((p: { name: string; type: PortType }) => p.name === portName);
    return port?.type ?? null;
  }

  function handleSelectConnection(id: string | null) {
    $selectedConnectionId = id;
    if (id) {
      $selectedModuleId = null;
    }
  }

  function handleDeleteConnection(id: string) {
    synthService.disconnect(id);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      $selectedModuleId = null;
      $selectedConnectionId = null;
    } else if (e.key === 'Delete') {
      if ($selectedConnectionId) {
        handleDeleteConnection($selectedConnectionId);
        $selectedConnectionId = null;
      } else if ($selectedModuleId) {
        synthService.removeModule($selectedModuleId);
        $selectedModuleId = null;
      }
    }
  }
</script>

<div
  class="board-container"
  bind:this={boardContainerElement}
>
  <div
    class="patch-board"
    bind:this={boardElement}
    style="width: {boardWidth}px; height: {boardHeight}px;"
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
    onclick={handleBoardClick}
    onkeydown={handleKeyDown}
    role="button"
    tabindex="-1"
  >
    <CableLayer
      {connectionList}
      {moduleList}
      {getPortPosition}
      {getPortType}
      onSelectConnection={handleSelectConnection}
      onDeleteConnection={handleDeleteConnection}
      tempCable={$cableState}
    />

    {#each moduleList as module (module.id)}
      {@const def = getModuleDefinition(module.type)}
      {#if def}
        {#if module.type === 'sequencer'}
          <SequencerModule
            {module}
            definition={def}
            isDragging={$dragState?.moduleId === module.id}
            onDragStart={(e) => handleModuleDragStart(module.id, e)}
            onPortMouseDown={(name, dir) => handlePortMouseDown(module.id, name, dir)}
            onPortMouseUp={(name, dir) => handlePortMouseUp(module.id, name, dir)}
          />
        {:else if module.type === 'scope'}
          <ScopeModule
            {module}
            definition={def}
            isDragging={$dragState?.moduleId === module.id}
            onDragStart={(e) => handleModuleDragStart(module.id, e)}
            onPortMouseDown={(name, dir) => handlePortMouseDown(module.id, name, dir)}
            onPortMouseUp={(name, dir) => handlePortMouseUp(module.id, name, dir)}
          />
        {:else}
          <Module
            {module}
            definition={def}
            isDragging={$dragState?.moduleId === module.id}
            onDragStart={(e) => handleModuleDragStart(module.id, e)}
            onPortMouseDown={(name, dir) => handlePortMouseDown(module.id, name, dir)}
            onPortMouseUp={(name, dir) => handlePortMouseUp(module.id, name, dir)}
          />
        {/if}
      {/if}
    {/each}
  </div>
</div>

<style>
  .board-container {
    flex: 1;
    overflow: auto;
    background-color: #1a1815;
  }

  .patch-board {
    position: relative;
    background: 
      /* Subtle grid like old engineering paper - tiles */
      linear-gradient(rgba(139, 125, 107, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139, 125, 107, 0.05) 1px, transparent 1px),
      /* Warm base color */
      #1a1815;
    background-size: 40px 40px, 40px 40px, 100% 100%;
    transition: width 0.2s ease, height 0.2s ease;
    min-width: 100%;
    min-height: 100%;
  }

  /* Old CRT scanline effect */
  .patch-board::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 3px,
        rgba(0, 0, 0, 0.02) 3px,
        rgba(0, 0, 0, 0.02) 6px
      );
    pointer-events: none;
  }

  /* Custom Scrollbar - like worn tape reels */
  .board-container::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  .board-container::-webkit-scrollbar-track {
    background: #2a2520;
    border-radius: 0;
    border: 1px solid #3a3530;
  }

  .board-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 50%, #2a2018 100%);
    border-radius: 0;
    border: 1px solid #5a5040;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .board-container::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #5a5045 0%, #4a4035 50%, #3a3028 100%);
  }

  .board-container::-webkit-scrollbar-corner {
    background: #2a2520;
    border: 1px solid #3a3530;
  }

  /* Firefox Scrollbar */
  .board-container {
    scrollbar-width: thin;
    scrollbar-color: #4a4035 #2a2520;
  }
</style>
