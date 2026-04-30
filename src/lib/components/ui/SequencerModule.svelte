<script lang="ts">
  import { synthService, selectedModuleId, selectedConnectionId } from '$stores';
  import type { ModuleInstance, ModuleDefinition, PortDefinition, ParamValue } from '$types';
  import HelpIcon from './HelpIcon.svelte';

  // Type guard for number params
  function getNumberParam(params: Map<string, ParamValue>, name: string, defaultValue: number): number {
    const value = params.get(name);
    return typeof value === 'number' ? value : defaultValue;
  }

  // Type guard for boolean params
  function getBooleanParam(params: Map<string, ParamValue>, name: string, defaultValue: boolean): boolean {
    const value = params.get(name);
    return typeof value === 'boolean' ? value : defaultValue;
  }

  // Interface for sequencer module instance methods
  interface SequencerModuleInstance {
    getStepPattern(): readonly boolean[];
    setStep(index: number, value: boolean): void;
    getCurrentStep(): number;
  }

  // Type guard for sequencer module instance
  function isSequencerInstance(instance: unknown): instance is SequencerModuleInstance {
    return instance !== null && 
           instance !== undefined &&
           typeof instance === 'object' &&
           'getStepPattern' in instance &&
           'setStep' in instance &&
           'getCurrentStep' in instance;
  }

  interface Props {
    module: ModuleInstance;
    definition: ModuleDefinition;
    isDragging?: boolean;
    onDragStart: (e: MouseEvent) => void;
    onPortMouseDown: (portName: string, direction: 'input' | 'output') => void;
    onPortMouseUp: (portName: string, direction: 'input' | 'output') => void;
  }

  let { module, definition, isDragging = false, onDragStart, onPortMouseDown, onPortMouseUp }: Props = $props();

  let isSelected = $derived($selectedModuleId === module.id);
  let position = $derived(module.position);
  let steps = $derived(getNumberParam(module.params, 'steps', 16));
  
  // Step pattern - sync with module instance on mount/update
  let stepPattern = $state<boolean[]>(new Array(16).fill(false));
  
  // Initialize pattern from module instance or use default
  $effect(() => {
    const moduleInstance = synthService.getModuleInstance?.(module.id);
    if (isSequencerInstance(moduleInstance)) {
      const pattern = moduleInstance.getStepPattern();
      if (pattern.length > 0 && stepPattern.every((v, i) => v === pattern[i])) {
        // Pattern already matches, no need to update
      } else {
        stepPattern = [...pattern];
      }
    } else {
      // Default pattern: 4-on-the-floor
      stepPattern[0] = true;
      stepPattern[4] = true;
      stepPattern[8] = true;
      stepPattern[12] = true;
    }
  });

  function handleParamChange(name: string, value: boolean | number | string) {
    synthService.setModuleParam(module.id, name, value);
  }

  function handleDelete() {
    synthService.removeModule(module.id);
  }

  function handleSelect() {
    $selectedModuleId = module.id;
    $selectedConnectionId = null;
  }

  function toggleStep(index: number) {
    stepPattern[index] = !stepPattern[index];
    
    // Update the module instance directly
    const moduleInstance = synthService.getModuleInstance?.(module.id);
    if (isSequencerInstance(moduleInstance)) {
      moduleInstance.setStep(index, stepPattern[index]);
    }
  }

  const inputPorts = $derived(definition.ports.filter((p: PortDefinition) => p.direction === 'input'));
  const outputPorts = $derived(definition.ports.filter((p: PortDefinition) => p.direction === 'output'));

  // Reactive params that update when module changes
  let rateValue = $derived(getNumberParam(module.params, 'rate', 4));
  let playingValue = $derived(getBooleanParam(module.params, 'playing', true));
  
  // Local state for the slider that updates immediately
  let localRateValue = $state(4);
  
  // Keep local rate in sync with module
  $effect(() => {
    localRateValue = rateValue;
  });
  
  // Track current playing step
  let currentStep = $state(0);
  
  // Poll for current step at 60fps
  $effect(() => {
    const interval = setInterval(() => {
      const moduleInstance = synthService.getModuleInstance?.(module.id);
      if (isSequencerInstance(moduleInstance)) {
        currentStep = moduleInstance.getCurrentStep();
      }
    }, 16); // ~60fps
    
    return () => clearInterval(interval);
  });
</script>

<div
  class="module sequencer-module"
  class:selected={isSelected}
  class:dragging={isDragging}
  style="left: {position.x}px; top: {position.y}px;"
  onclick={handleSelect}
  onkeydown={(e) => e.key === 'Delete' && handleDelete()}
  role="button"
  tabindex="0"
  data-module-id={module.id}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header
    class="module-header category-{definition.category}"
    onmousedown={onDragStart}
  >
    <span class="title">{definition.label}</span>
    <HelpIcon content={definition.help} size={14} />
    <button class="delete-btn" onclick={handleDelete}>×</button>
  </header>

  <div class="module-body">
    <div class="ports-section">
      <div class="ports-column inputs">
        {#each inputPorts as port}
          <div class="port">
            <div
              class="port-circle type-{port.type}"
              data-port-name={port.name}
              title={port.type === 'control' ? 'Modulation input: connect an output here to modulate this parameter' : `Input: ${port.name}`}
              onmousedown={(e) => { e.stopPropagation(); onPortMouseDown(port.name, port.direction); }}
              onmouseup={(e) => { e.stopPropagation(); onPortMouseUp(port.name, port.direction); }}
              role="button"
              tabindex="0"
            ></div>
            <span class="port-label">{port.name}</span>
          </div>
        {/each}
      </div>

      <div class="ports-column outputs">
        {#each outputPorts as port}
          <div class="port">
            <span class="port-label">{port.name}</span>
            <div
              class="port-circle type-{port.type}"
              data-port-name={port.name}
              onmousedown={(e) => { e.stopPropagation(); onPortMouseDown(port.name, port.direction); }}
              onmouseup={(e) => { e.stopPropagation(); onPortMouseUp(port.name, port.direction); }}
              role="button"
              tabindex="0"
            ></div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Step Grid -->
    <div class="step-grid">
      {#each stepPattern as isActive, i}
        <button
          class="step-button"
          class:active={isActive}
          class:playing={currentStep === i}
          onclick={() => toggleStep(i)}
          title="Step {i + 1}"
        >
          {i + 1}
        </button>
      {/each}
    </div>

    <!-- Controls -->
    <div class="sequencer-controls">
      <div class="control-row">
        <label for="{module.id}-rate">Rate</label>
        <input
          id="{module.id}-rate"
          type="range"
          min="0.5"
          max="20"
          step="0.5"
          bind:value={localRateValue}
          oninput={() => handleParamChange('rate', localRateValue)}
        />
        <span class="rate-value">{localRateValue.toFixed(1)} Hz</span>
      </div>
      
      <div class="control-row">
        <label for="{module.id}-playing">Playing</label>
        <input
          id="{module.id}-playing"
          type="checkbox"
          checked={playingValue}
          onchange={(e) => handleParamChange('playing', e.currentTarget.checked)}
        />
      </div>
      
      <div class="control-row">
        <label for="{module.id}-steps">Steps</label>
        <select
          id="{module.id}-steps"
          value={steps}
          onchange={(e) => handleParamChange('steps', parseInt(e.currentTarget.value))}
        >
          <option value={8}>8</option>
          <option value={16}>16</option>
        </select>
      </div>
    </div>
  </div>
</div>

<style>
  .module {
    position: absolute;
    width: 320px;
    background: #2a2a3e;
    border: 1px solid #444;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    cursor: default;
    user-select: none;
  }

  .module.selected {
    border-color: #4a9eff;
    box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.3);
  }

  .module.dragging {
    z-index: 20;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 8px 8px 0 0;
    cursor: grab;
    gap: 8px;
  }

  .module-header:active {
    cursor: grabbing;
  }

  .category-modulation { 
    background: linear-gradient(135deg, #2a6e4a, #1a5e3a); 
  }

  .title {
    flex: 1;
    font-weight: 600;
    font-size: 14px;
  }

  .delete-btn {
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
  }

  .delete-btn:hover {
    background: rgba(231, 76, 60, 0.8);
  }

  .module-body {
    padding: 12px;
  }

  .ports-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .ports-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .port {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .port-circle {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    cursor: crosshair;
    border: 2px solid #555;
    transition: all 0.2s;
    position: relative;
    z-index: 10;
  }

  .port-circle:hover {
    transform: scale(1.2);
    border-color: #fff;
  }

  .type-control { 
    background: #3498db;
    border-radius: 2px;
    width: 12px;
    height: 12px;
    border: 2px solid #3498db;
    background: transparent;
  }
  .type-control:hover {
    background: rgba(52, 152, 219, 0.3);
  }
  .type-gate { background: #2ecc71; }

  .port-label {
    font-size: 11px;
    color: #aaa;
    text-transform: capitalize;
  }

  .step-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    margin-bottom: 16px;
    padding: 8px;
    background: #1a1a2e;
    border-radius: 6px;
  }

  .step-button {
    aspect-ratio: 1;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2a2a3e;
    color: #666;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
    min-height: 24px;
  }

  .step-button:hover {
    border-color: #666;
    color: #999;
  }

  .step-button.active {
    background: #2ecc71;
    border-color: #2ecc71;
    color: #fff;
  }

  .step-button.active:hover {
    background: #27ae60;
  }

  .step-button.playing {
    box-shadow: 0 0 8px 2px #f1c40f;
    border-color: #f1c40f;
  }

  .step-button.playing.active {
    background: #f1c40f;
    border-color: #f1c40f;
    color: #000;
  }

  .sequencer-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-row label {
    font-size: 11px;
    color: #888;
    text-transform: capitalize;
    min-width: 50px;
  }

  .control-row input[type="range"] {
    flex: 1;
    height: 20px;
  }

  .control-row input[type="checkbox"] {
    width: auto;
  }

  .control-row select {
    padding: 4px 8px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a2e;
    color: #fff;
    font-size: 12px;
  }

  .rate-value {
    font-size: 11px;
    color: #aaa;
    min-width: 50px;
    text-align: right;
  }
</style>
