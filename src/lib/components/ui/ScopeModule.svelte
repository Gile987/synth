<script lang="ts">
  import { synthService, selectedModuleId, selectedConnectionId } from '$stores';
  import type { ModuleInstance, ModuleDefinition, ParamValue, PortDefinition } from '$types';
  import HelpIcon from './HelpIcon.svelte';
  import { onMount, onDestroy } from 'svelte';

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

  // Interface for scope module instance
  interface ScopeModuleInstance {
    onDataUpdate(callback: (data: Float32Array) => void): void;
  }

  // Type guard for scope module instance
  function isScopeInstance(instance: unknown): instance is ScopeModuleInstance {
    return instance !== null && 
           instance !== undefined &&
           typeof instance === 'object' &&
           'onDataUpdate' in instance &&
           typeof (instance as ScopeModuleInstance).onDataUpdate === 'function';
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

  // Canvas refs
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number;
  let waveformData: Float32Array = new Float32Array(1024);

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

  onMount(() => {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    const moduleInstance = synthService.getModuleInstance?.(module.id);
    if (isScopeInstance(moduleInstance)) {
      moduleInstance.onDataUpdate((data) => {
        const freeze = getBooleanParam(module.params, 'freeze', false);
        if (!freeze) waveformData = data;
      });
    }
    
    draw();
  });
  
  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
  });
  
  function draw() {
    if (!ctx || !canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a1510';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(139, 125, 107, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    const timeScale = getNumberParam(module.params, 'timeScale', 1);
    const gain = getNumberParam(module.params, 'gain', 1);
    const freeze = getBooleanParam(module.params, 'freeze', false);
    
    if (waveformData.length > 0) {
      ctx.strokeStyle = '#a8d4a8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const sliceWidth = width / (waveformData.length / timeScale);
      let x = 0;
      
      for (let i = 0; i < waveformData.length; i += Math.ceil(1 / timeScale)) {
        const sample = waveformData[i];
        if (sample === undefined) continue;
        const v = sample * gain;
        const y = (height / 2) + (v * height / 2 * 0.8);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        x += sliceWidth;
        if (x > width) break;
      }
      ctx.stroke();
    }
    
    if (freeze) {
      ctx.fillStyle = '#d4a8a8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('FROZEN', 5, 15);
    }
    
    animationId = requestAnimationFrame(draw);
  }

  function getUnit(paramName: string): string {
    return paramName === 'timeScale' || paramName === 'gain' ? 'x' : '';
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

    <!-- Scope Display -->
    <div class="scope-display">
      <canvas bind:this={canvas} width="196" height="80"></canvas>
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
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 15px;
    font-weight: 500;
  }

  .module-header:active {
    cursor: grabbing;
  }

  .category-utility {
    background: linear-gradient(180deg, #5a5045 0%, #4a4035 100%);
    color: #e8e0d8;
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
    font-family: 'JetBrains Mono', monospace;
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

  .scope-display {
    margin-bottom: 16px;
    background: #0f0e0c;
    border: 1px solid #3a3025;
    border-radius: 2px;
    padding: 4px;
  }

  .scope-display canvas {
    width: 100%;
    height: 80px;
    display: block;
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
    color: #b7a48f;
    text-transform: uppercase;
    letter-spacing: 1.15px;
    font-family: 'Inter', sans-serif;
  }

  .param input {
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

  .param input:focus {
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
  }

  .slider-control input[type="range"] {
    flex: 1;
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
    min-width: 72px;
    flex-shrink: 0;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
