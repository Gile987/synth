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

  .category-source { background: linear-gradient(135deg, #2a4a6e, #1a3a5e); }
  .category-effect { background: linear-gradient(135deg, #4a2a6e, #3a1a5e); }
  .category-output { background: linear-gradient(135deg, #6e2a2a, #5e1a1a); }
  .category-modulation { background: linear-gradient(135deg, #2a6e4a, #1a5e3a); }

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

  .type-audio { background: #e74c3c; }
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
  .type-trigger { background: #f39c12; }

  .port-label {
    font-size: 11px;
    color: #aaa;
    text-transform: capitalize;
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
    font-size: 11px;
    color: #888;
    text-transform: capitalize;
  }

  .param input,
  .param select {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #1a1a2e;
    color: #fff;
    font-size: 12px;
  }

  .param input[type="range"] {
    padding: 0;
    height: 20px;
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
    color: #aaa;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
