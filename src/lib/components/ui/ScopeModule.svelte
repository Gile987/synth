<script lang="ts">
  import './module-controls.css';
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
            <div class="mc-control-row mc-slider-control">
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
              <span class="param-value mc-value-badge">{currentValue}{getUnit(param.name)}</span>
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

  .param-value {
    min-width: 0;
    max-width: 64px;
    flex-shrink: 0;
  }
</style>
