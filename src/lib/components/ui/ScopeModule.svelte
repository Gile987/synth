<script lang="ts">
  import { synthService } from '$stores';
  import type { ModuleInstance, ModuleDefinition, ParamValue } from '$types';
  import ModuleFrame from './ModuleFrame.svelte';
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
    offDataUpdate(): void;
  }

  // Type guard for scope module instance
  function isScopeInstance(instance: unknown): instance is ScopeModuleInstance {
    return instance !== null && 
           instance !== undefined &&
           typeof instance === 'object' &&
           'onDataUpdate' in instance &&
           typeof (instance as ScopeModuleInstance).onDataUpdate === 'function';
  }

  // Store module instance reference for cleanup
  let scopeModuleInstance: ScopeModuleInstance | null = null;

  interface Props {
    module: ModuleInstance;
    definition: ModuleDefinition;
    isDragging?: boolean;
    onDragStart: (e: MouseEvent) => void;
    onPortMouseDown: (portName: string, direction: 'input' | 'output') => void;
    onPortMouseUp: (portName: string, direction: 'input' | 'output') => void;
  }

  let { module, definition, isDragging = false, onDragStart, onPortMouseDown, onPortMouseUp }: Props = $props();

  // Canvas refs
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationId: number;
  let waveformData: Float32Array = new Float32Array(1024);

  function handleParamChange(name: string, value: ParamValue) {
    synthService.setModuleParam(module.id, name, value);
  }

  onMount(() => {
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const moduleInstance = synthService.getModuleInstance?.(module.id);
    if (isScopeInstance(moduleInstance)) {
      scopeModuleInstance = moduleInstance;
      moduleInstance.onDataUpdate((data) => {
        const freeze = getBooleanParam(module.params, 'freeze', false);
        if (!freeze) waveformData = data;
      });
    }

    draw();
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (scopeModuleInstance) {
      scopeModuleInstance.offDataUpdate();
      scopeModuleInstance = null;
    }
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

<ModuleFrame
  {module}
  {definition}
  {isDragging}
  shellClass="scope"
  {onDragStart}
  {onPortMouseDown}
  {onPortMouseUp}
>
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
</ModuleFrame>

<style>
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
    min-width: 0;
  }

  .slider-control input[type="range"] {
    flex: 1 1 auto;
    min-width: 0;
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
    min-width: 0;
    max-width: 64px;
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
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
