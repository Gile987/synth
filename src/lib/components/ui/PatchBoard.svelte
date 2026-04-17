<script lang="ts">
  import { modules, connections, moduleDefinitions, dragState, cableState, selectedModuleId, selectedConnectionId, synthService } from '$stores';
  import Module from './Module.svelte';
  import SequencerModule from './SequencerModule.svelte';
  import CableLayer from './CableLayer.svelte';
  import type { Position, PortType, ModuleDefinition, ModuleInstance, Connection } from '$types';

  let boardElement: HTMLDivElement;
  let moduleList: ModuleInstance[] = $derived(Array.from($modules.values()));
  let connectionList: Connection[] = $derived(Array.from($connections.values()));
  
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
  class="patch-board"
  bind:this={boardElement}
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

<style>
  .patch-board {
    flex: 1;
    position: relative;
    background: 
      radial-gradient(circle at 1px 1px, #333 1px, transparent 1px);
    background-size: 20px 20px;
    background-color: #1a1a2e;
    overflow: hidden;
  }
</style>
