<script lang="ts">
  import { synthService, selectedModuleId, selectedConnectionId } from '$stores';
  import type { ModuleInstance, ModuleDefinition, ParamValue, PortDefinition } from '$types';
  import HelpIcon from './HelpIcon.svelte';

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

  function handleParamChange(name: string, value: ParamValue) {
    synthService.setModuleParam(module.id, name, value);
  }

  function handleDelete() {
    synthService.removeModule(module.id);
  }

  function handleSelect() {
    $selectedModuleId = module.id;
    $selectedConnectionId = null;
  }

  const inputPorts = $derived(definition.ports.filter((p: PortDefinition) => p.direction === 'input'));
  const outputPorts = $derived(definition.ports.filter((p: PortDefinition) => p.direction === 'output'));

  function getUnit(paramName: string): string {
    switch (paramName) {
      case 'frequency':
        return ' Hz';
      case 'rate':
        return ' Hz';
      case 'cutoff':
        return ' Hz';
      case 'detune':
        return ' cents';
      case 'q':
      case 'resonance':
        return '';
      case 'gain':
        return ' dB';
      case 'amplitude':
        return '';
      default:
        return '';
    }
  }
</script>

<div
  class="module"
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

    <div class="params-section">
      {#each definition.params as param}
        {@const paramId = `${module.id}-${param.name}`}
        {@const currentValue = module.params.get(param.name) ?? param.defaultValue}
        <div class="param">
          <label for={paramId}>{param.label}</label>
          {#if param.controlType === 'knob' || param.controlType === 'slider'}
            <div class="slider-control">
              <input
                id={paramId}
                type="range"
                min={param.min}
                max={param.max}
                step={param.step || 1}
                value={currentValue}
                oninput={(e) => {
                  const newValue = parseFloat(e.currentTarget.value);
                  handleParamChange(param.name, newValue);
                  const display = e.currentTarget.nextElementSibling;
                  if (display) {
                    display.textContent = newValue + getUnit(param.name);
                  }
                }}
              />
              <span class="param-value">{currentValue}{getUnit(param.name)}</span>
            </div>
          {:else if param.controlType === 'select'}
            <select
              id={paramId}
              value={currentValue}
              onchange={(e) => handleParamChange(param.name, e.currentTarget.value)}
            >
              {#each param.options ?? [] as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          {:else if param.controlType === 'toggle'}
            <input
              id={paramId}
              type="checkbox"
              checked={currentValue as boolean}
              onchange={(e) => handleParamChange(param.name, e.currentTarget.checked)}
            />
          {:else if param.controlType === 'number'}
            <input
              id={paramId}
              type="number"
              min={param.min}
              max={param.max}
              step={param.step}
              value={currentValue}
              onchange={(e) => handleParamChange(param.name, parseFloat(e.currentTarget.value))}
            />
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .module {
    position: absolute;
    width: 220px;
    background: linear-gradient(180deg, #4a4035 0%, #3a3025 50%, #2a2018 100%);
    border: 2px solid #5a5040;
    border-radius: 3px;
    cursor: default;
    user-select: none;
    box-shadow: 
      0 4px 15px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
  }

  .module.selected {
    border-color: #7a6a58;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.7),
      0 0 0 2px rgba(200, 180, 140, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .module.dragging {
    z-index: 20;
    box-shadow: 
      0 8px 30px rgba(0, 0, 0, 0.7),
      0 0 20px rgba(200, 180, 140, 0.15);
  }

  .module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px 10px;
    border-radius: 3px 3px 0 0;
    cursor: grab;
    gap: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    font-family: 'Space Mono', 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-size: 16px;
  }

  .module-header:active {
    cursor: grabbing;
  }

  .category-source { 
    background: linear-gradient(180deg, #3a4538 0%, #2a3528 100%);
    color: #a8d4a8;
  }
  .category-effect { 
    background: linear-gradient(180deg, #453a40 0%, #352a30 100%);
    color: #d4a8b8;
  }
  .category-output { 
    background: linear-gradient(180deg, #453830 0%, #352820 100%);
    color: #d4b8a8;
  }
  .category-modulation { 
    background: linear-gradient(180deg, #3a4045 0%, #2a3035 100%);
    color: #a8b8d4;
  }

  .title {
    flex: 1;
    font-weight: 400;
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
    font-family: monospace;
  }

  .delete-btn:hover {
    background: linear-gradient(180deg, #6a5045 0%, #5a4035 100%);
    border-color: #8a6050;
  }

  .module-body {
    padding: 12px;
    background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 100%);
  }

  .ports-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
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
    width: 12px;
    height: 12px;
    border-radius: 50%;
    cursor: crosshair;
    border: 2px solid;
    transition: all 0.2s;
    position: relative;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .port-circle:hover {
    transform: scale(1.25);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
  }

  .type-audio { 
    background: #c4847c; 
    border-color: #8b5a52;
  }
  .type-control { 
    border-radius: 1px;
    width: 10px;
    height: 10px;
    border: 2px solid #7c8c9c;
    background: transparent;
  }
  .type-control:hover {
    background: rgba(124, 140, 156, 0.3);
  }
  .type-gate { 
    background: #8cb484; 
    border-color: #5a8452;
  }
  .type-trigger { 
    background: #d4b47c; 
    border-color: #9c7c44;
  }

  .port-label {
    font-size: 10px;
    color: #9a8a7a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
  }

  .params-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .param {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .param label {
    font-size: 10px;
    color: #7a6a5a;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: 'Space Mono', 'IBM Plex Mono', monospace;
  }

  .param input,
  .param select {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #5a5040;
    border-radius: 2px;
    background: linear-gradient(180deg, #2a2520 0%, #1a1815 100%);
    color: #c4b8a8;
    font-size: 11px;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
  }

  .param input[type="range"] {
    padding: 0;
    height: 4px;
    border: none;
    background: #3a3530;
    -webkit-appearance: none;
  }

  .param input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px;
    height: 10px;
    background: #8a7a6a;
    border: 1px solid #5a5040;
    cursor: pointer;
  }

  .param input[type="checkbox"] {
    width: auto;
    align-self: flex-start;
  }

  .slider-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slider-control input[type="range"] {
    flex: 1;
  }

  .param-value {
    width: 70px;
    flex-shrink: 0;
    text-align: right;
    font-size: 11px;
    color: #a8d4a8;
    font-family: 'IBM Plex Mono', 'Space Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
