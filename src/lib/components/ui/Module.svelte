<script lang="ts">
  import './module-controls.css';
  import { synthService } from '$stores';
  import type { ModuleInstance, ModuleDefinition, ParamValue } from '$types';
  import ModuleFrame from './ModuleFrame.svelte';

  interface Props {
    module: ModuleInstance;
    definition: ModuleDefinition;
    isDragging?: boolean;
    onDragStart: (e: MouseEvent) => void;
    onPortMouseDown: (portName: string, direction: 'input' | 'output') => void;
    onPortMouseUp: (portName: string, direction: 'input' | 'output') => void;
  }

  let { module, definition, isDragging = false, onDragStart, onPortMouseDown, onPortMouseUp }: Props = $props();

  function handleParamChange(name: string, value: ParamValue) {
    synthService.setModuleParam(module.id, name, value);
  }

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

<ModuleFrame
  {module}
  {definition}
  {isDragging}
  {onDragStart}
  {onPortMouseDown}
  {onPortMouseUp}
>
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
            <div class="mc-control-row mc-slider-control">
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
              <span class="param-value mc-value-badge">
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
            <label class="mc-control-row mc-toggle-control" for={paramId}>
              <input
                id={paramId}
                type="checkbox"
                checked={typeof currentValue === 'boolean' ? currentValue : false}
                onchange={(e) => handleParamChange(param.name, e.currentTarget.checked)}
              />
              <span class="mc-toggle-track">
                <span class="mc-toggle-thumb"></span>
              </span>
              <span class="mc-toggle-label">{typeof currentValue === 'boolean' && currentValue ? 'ON' : 'OFF'}</span>
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
</ModuleFrame>

<style>
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

  .param-value {
    width: 70px;
    flex: 0 0 70px;
  }
</style>
