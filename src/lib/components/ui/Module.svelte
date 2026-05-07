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

  // Logarithmic scaling helpers for frequency controls
  function valueToPosition(value: number, min: number, max: number): number {
    // Convert actual value to 0-1 slider position using log scale
    const minLog = Math.log(min);
    const maxLog = Math.log(max);
    const valueLog = Math.log(value);
    return (valueLog - minLog) / (maxLog - minLog);
  }

  function positionToValue(position: number, min: number, max: number): number {
    // Convert 0-1 slider position to actual value using log scale
    const minLog = Math.log(min);
    const maxLog = Math.log(max);
    const valueLog = minLog + position * (maxLog - minLog);
    return Math.exp(valueLog);
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
              class:input-port={port.direction === 'input'}
              class:output-port={port.direction === 'output'}
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
              class:input-port={port.direction === 'input'}
              class:output-port={port.direction === 'output'}
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
            {@const isLog = param.scale === 'log'}
            {@const min = param.min ?? 0}
            {@const max = param.max ?? 100}
            {@const sliderValue = isLog && typeof currentValue === 'number' 
              ? valueToPosition(currentValue as number, min, max) 
              : currentValue}
            <div class="slider-control">
              <input
                id={paramId}
                type="range"
                min={isLog ? 0 : min}
                max={isLog ? 1 : max}
                step={isLog ? 0.001 : (param.step || 1)}
                value={sliderValue}
                oninput={(e) => {
                  const sliderPos = parseFloat(e.currentTarget.value);
                  const newValue = isLog 
                    ? positionToValue(sliderPos, min, max)
                    : sliderPos;
                  handleParamChange(param.name, newValue);
                  const display = e.currentTarget.nextElementSibling;
                  if (display) {
                    // Determine decimals based on step size, not range
                    const step = param.step;
                    let decimals = 0;
                    if (step !== undefined && step > 0) {
                      if (step < 0.01) decimals = 3;
                      else if (step < 0.1) decimals = 2;
                      else if (step < 1) decimals = 1;
                    }
                    const displayValue = newValue.toFixed(decimals);
                    display.textContent = displayValue + getUnit(param.name);
                  }
                }}
              />
              <span class="param-value">
                {#if typeof currentValue === 'number'}
                  {@const step = param.step}
                  {@const decimals = step !== undefined && step > 0 
                    ? (step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0)
                    : 0}
                  {currentValue.toFixed(decimals)}{getUnit(param.name)}
                {:else}
                  {currentValue}{getUnit(param.name)}
                {/if}
              </span>
            </div>
          {:else if param.controlType === 'select'}
            <div class="select-control">
              <select
                id={paramId}
                value={currentValue}
                onchange={(e) => handleParamChange(param.name, e.currentTarget.value)}
              >
                {#each param.options ?? [] as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </div>
          {:else if param.controlType === 'toggle'}
            <label class="toggle-control" for={paramId}>
              <input
                id={paramId}
                type="checkbox"
                checked={typeof currentValue === 'boolean' ? currentValue : false}
                onchange={(e) => handleParamChange(param.name, e.currentTarget.checked)}
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">{typeof currentValue === 'boolean' && currentValue ? 'ON' : 'OFF'}</span>
            </label>
          {:else if param.controlType === 'number'}
            <div class="number-control">
              <input
                id={paramId}
                type="number"
                min={param.min}
                max={param.max}
                step={param.step}
                value={currentValue}
                onchange={(e) => handleParamChange(param.name, parseFloat(e.currentTarget.value))}
              />
            </div>
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

  .port {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ports-column.inputs .port {
    justify-content: flex-start;
  }

  .ports-column.outputs .port {
    justify-content: flex-end;
  }

  .port-circle {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    cursor: crosshair;
    border: 2px solid;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease;
    position: relative;
    z-index: 10;
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .port-circle::before {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: inherit;
    background: rgba(10, 10, 10, 0.55);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.65);
  }

  .port-circle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 4px;
    height: 4px;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0.35);
    opacity: 0.5;
  }

  .port-circle:hover {
    transform: scale(1.18);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 0 10px rgba(0, 0, 0, 0.4),
      0 0 12px currentColor;
  }

  .type-audio { 
    color: #d28b82;
    background: radial-gradient(circle at 35% 30%, #f1b0a5 0%, #d28b82 38%, #7f4a44 100%);
    border-color: #b96d65;
  }
  .type-control { 
    color: #87a5c7;
    border-radius: 3px;
    width: 13px;
    height: 13px;
    border: 2px solid #87a5c7;
    background: linear-gradient(180deg, rgba(135, 165, 199, 0.18) 0%, rgba(45, 56, 68, 0.7) 100%);
  }
  .type-control::before {
    inset: 1px;
    border-radius: 1px;
  }
  .type-control::after {
    border-radius: 1px;
  }
  .type-control:hover {
    background: linear-gradient(180deg, rgba(135, 165, 199, 0.32) 0%, rgba(45, 56, 68, 0.78) 100%);
  }
  .type-gate { 
    color: #8fc78f;
    background: radial-gradient(circle at 35% 30%, #c9f0be 0%, #8fc78f 42%, #50734a 100%);
    border-color: #77aa73;
  }
  .type-trigger { 
    color: #e0bc77;
    background: radial-gradient(circle at 35% 30%, #f7df9d 0%, #e0bc77 40%, #8a6830 100%);
    border-color: #c99d4e;
  }

  .input-port {
    margin-right: 2px;
  }

  .output-port {
    margin-left: 2px;
  }

  .port-label {
    font-size: 10px;
    color: #c7b8a8;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-family: 'JetBrains Mono', monospace;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  }

  .params-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    border: 1px solid rgba(108, 94, 77, 0.48);
    border-radius: 5px;
    background:
      linear-gradient(180deg, rgba(31, 25, 21, 0.9) 0%, rgba(20, 16, 13, 0.96) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }

  .param {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-bottom: 9px;
    border-bottom: 1px solid rgba(117, 98, 80, 0.26);
  }

  .param:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .param label {
    font-size: 10px;
    color: #b7a48f;
    text-transform: uppercase;
    letter-spacing: 1.15px;
    font-family: 'Inter', sans-serif;
  }

  .param input,
  .param select {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid #5a5040;
    border-radius: 3px;
    background: linear-gradient(180deg, #2b2520 0%, #191612 100%);
    color: #f0e6d8;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    box-sizing: border-box;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }

  .param input:focus,
  .param select:focus {
    outline: none;
    border-color: #8f7a62;
    box-shadow:
      0 0 0 1px rgba(208, 185, 143, 0.22),
      0 0 10px rgba(208, 185, 143, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .param input[type="range"] {
    padding: 0;
    height: 18px;
    border: none;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
    box-shadow: none;
  }

  .param input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    border: 1px solid #4b4137;
    background:
      linear-gradient(180deg, rgba(26, 23, 20, 0.95) 0%, rgba(53, 46, 40, 0.96) 100%);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.65),
      0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .param input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, #f2e7d4 0%, #bfaa88 36%, #7e6751 100%);
    border: 1px solid #5f4c3c;
    cursor: pointer;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
  }

  .param input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    border: 1px solid #4b4137;
    background:
      linear-gradient(180deg, rgba(26, 23, 20, 0.95) 0%, rgba(53, 46, 40, 0.96) 100%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.65);
  }

  .param input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, #f2e7d4 0%, #bfaa88 36%, #7e6751 100%);
    border: 1px solid #5f4c3c;
    cursor: pointer;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
  }

  .param input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .slider-control {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border: 1px solid rgba(96, 80, 64, 0.65);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(29, 24, 20, 0.94) 0%, rgba(20, 17, 14, 0.96) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 1px 0 rgba(0, 0, 0, 0.16);
    min-width: 0;
  }

  .slider-control input[type="range"] {
    flex: 1 1 auto;
    min-width: 0;
  }

  .select-control,
  .number-control {
    position: relative;
  }

  .select-control::after {
    content: '▾';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #d8c4a0;
    font-size: 12px;
    pointer-events: none;
  }

  .select-control select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 28px;
  }

  .toggle-control {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    padding: 6px 8px;
    border: 1px solid rgba(96, 80, 64, 0.65);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(29, 24, 20, 0.94) 0%, rgba(20, 17, 14, 0.96) 100%);
    cursor: pointer;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 1px 0 rgba(0, 0, 0, 0.16);
  }

  .toggle-track {
    position: relative;
    width: 34px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid #52473d;
    background: linear-gradient(180deg, #221d18 0%, #17130f 100%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
  }

  .toggle-thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #f1e6d3 0%, #bca788 38%, #7f6852 100%);
    border: 1px solid #5f4c3c;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
    transition: transform 0.16s ease, background 0.16s ease;
  }

  .toggle-control input:checked + .toggle-track {
    border-color: #5d7f56;
    background: linear-gradient(180deg, #243321 0%, #1a2617 100%);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.55),
      0 0 8px rgba(143, 199, 143, 0.15);
  }

  .toggle-control input:checked + .toggle-track .toggle-thumb {
    transform: translateX(16px);
    background: radial-gradient(circle at 35% 30%, #e3f7d7 0%, #9dce8f 38%, #547148 100%);
  }

  .toggle-label {
    min-width: 24px;
    color: #d9cdbb;
    font-size: 11px;
    letter-spacing: 0.8px;
    font-family: 'JetBrains Mono', monospace;
  }

  .param-value {
    width: 70px;
    flex: 0 0 70px;
    text-align: right;
    font-size: 11px;
    color: #dcedc9;
    font-family: 'JetBrains Mono', monospace;
    padding: 4px 7px;
    border: 1px solid rgba(112, 136, 98, 0.38);
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(33, 48, 27, 0.9) 0%, rgba(24, 34, 20, 0.95) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 1px 0 rgba(0, 0, 0, 0.12);
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
