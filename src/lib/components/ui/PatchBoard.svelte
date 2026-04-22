<script lang="ts">
  import { modules, connections, moduleDefinitions, dragState, cableState, selectedModuleId, selectedConnectionId, synthService } from '$stores';
  import Module from './Module.svelte';
  import SequencerModule from './SequencerModule.svelte';
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
    
    const portEl = moduleEl.querySelector(`[data-port-name="${portName}"]`) as HTMLElement;
    if (!portEl) return null;
    
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
    const moduleEl = boardElement.querySelector(`[data-module-id="${moduleId}"]`) as HTMLElement;
    const rect = moduleEl.getBoundingClientRect();
    $dragState = {
      moduleId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
  }

  function handlePortMouseDown(moduleId: string, portName: string, direction: 'input' | 'output') {
    if (direction === 'output') {
      const pos = getPortPosition(moduleId, portName);
      if (pos) {
        $cableState = {
          sourceModuleId: moduleId,
          sourcePortName: portName,
          currentX: pos.x,
          currentY: pos.y
        };
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
            onDragStart={(e) => handleModuleDragStart(module.id, e)}
            onPortMouseDown={(name, dir) => handlePortMouseDown(module.id, name, dir)}
            onPortMouseUp={(name, dir) => handlePortMouseUp(module.id, name, dir)}
          />
        {:else}
          <Module
            {module}
            definition={def}
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
    background-color: #0f0f1a;
  }

  .patch-board {
    position: relative;
    background: 
      radial-gradient(circle at 1px 1px, #333 1px, transparent 1px);
    background-size: 20px 20px;
    background-color: #1a1a2e;
    transition: width 0.2s ease, height 0.2s ease;
    min-width: 100%;
    min-height: 100%;
  }

  /* Custom Scrollbar Styling */
  .board-container::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  .board-container::-webkit-scrollbar-track {
    background: #0f0f1a;
    border-radius: 6px;
  }

  .board-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #4a5568 0%, #2d3748 100%);
    border-radius: 6px;
    border: 2px solid #0f0f1a;
  }

  .board-container::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #5a6578 0%, #3d4758 100%);
  }

  .board-container::-webkit-scrollbar-corner {
    background: #0f0f1a;
  }

  /* Firefox Scrollbar */
  .board-container {
    scrollbar-width: thin;
    scrollbar-color: #4a5568 #0f0f1a;
  }
</style>
