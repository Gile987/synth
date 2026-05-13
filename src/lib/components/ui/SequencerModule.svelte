<script lang="ts">
  import { synthService } from '$stores';
  import type { ModuleInstance, ModuleDefinition, ParamValue } from '$types';
  import ModuleFrame from './ModuleFrame.svelte';

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

  function toggleStep(index: number) {
    stepPattern[index] = !stepPattern[index];
    
    // Update the module instance and persist the pattern
    const moduleInstance = synthService.getModuleInstance?.(module.id);
    if (isSequencerInstance(moduleInstance)) {
      moduleInstance.setStep(index, stepPattern[index]);
    }
    
    // Calculate bitfield for persistence
    let bitfield = 0;
    for (let i = 0; i < 16; i++) {
      if (stepPattern[i]) {
        bitfield |= (1 << i);
      }
    }
    handleParamChange('stepPattern', bitfield);
  }

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
  let isVisible = $state(true);
  
  // Track visibility changes
  $effect(() => {
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
  
  // Poll for current step at 60fps only when playing and visible
  $effect(() => {
    // Don't poll if not playing or tab is hidden
    if (!playingValue || !isVisible) return;
    
    const interval = setInterval(() => {
      const moduleInstance = synthService.getModuleInstance?.(module.id);
      if (isSequencerInstance(moduleInstance)) {
        currentStep = moduleInstance.getCurrentStep();
      }
    }, 16); // ~60fps
    
    return () => clearInterval(interval);
  });
</script>

<ModuleFrame
  {module}
  {definition}
  {isDragging}
  shellClass="sequencer"
  portVariant="cool"
  {onDragStart}
  {onPortMouseDown}
  {onPortMouseUp}
>
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
      <div class="control-row rate-row">
        <div class="rate-header">
          <label for="{module.id}-rate">Rate</label>
          <span class="rate-value">{localRateValue.toFixed(1)} Hz</span>
        </div>
        <div class="slider-shell">
          <input
            id="{module.id}-rate"
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            bind:value={localRateValue}
            oninput={() => handleParamChange('rate', localRateValue)}
          />
        </div>
      </div>
      
      <div class="control-row">
        <label for="{module.id}-playing">Playing</label>
        <label class="toggle-control" for="{module.id}-playing">
          <input
            id="{module.id}-playing"
            type="checkbox"
            checked={playingValue}
            onchange={(e) => handleParamChange('playing', e.currentTarget.checked)}
          />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-label">{playingValue ? 'RUN' : 'STOP'}</span>
        </label>
      </div>
      
      <div class="control-row">
        <label for="{module.id}-steps">Steps</label>
        <div class="select-shell">
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
</ModuleFrame>

<style>
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
    gap: 10px;
    padding: 6px 8px;
    border: 1px solid rgba(86, 97, 110, 0.5);
    border-radius: 6px;
    background: linear-gradient(180deg, rgba(27, 29, 44, 0.96) 0%, rgba(18, 20, 31, 0.98) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 1px 0 rgba(0, 0, 0, 0.2);
    min-width: 0;
  }

  .control-row label {
    font-size: 11px;
    color: #aeb7c7;
    text-transform: uppercase;
    letter-spacing: 1px;
    min-width: 54px;
    font-family: 'Inter', sans-serif;
    flex-shrink: 0;
  }

  .rate-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .rate-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    min-width: 0;
  }

  .rate-row label {
    min-width: 0;
  }

  .slider-shell {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .rate-row .slider-shell {
    width: 100%;
  }

  .control-row input[type="range"] {
    flex: 1;
    height: 18px;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
  }

  .control-row input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    border: 1px solid #455061;
    background: linear-gradient(180deg, #161b27 0%, #2a3145 100%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.65);
  }

  .control-row input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border-radius: 50%;
    border: 1px solid #50627d;
    background: radial-gradient(circle at 35% 30%, #eef4ff 0%, #9ab5db 40%, #536985 100%);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
    cursor: pointer;
  }

  .control-row input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    border: 1px solid #455061;
    background: linear-gradient(180deg, #161b27 0%, #2a3145 100%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.65);
  }

  .control-row input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #50627d;
    background: radial-gradient(circle at 35% 30%, #eef4ff 0%, #9ab5db 40%, #536985 100%);
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
    cursor: pointer;
  }

  .control-row input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .toggle-control {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    min-width: 0;
  }

  .toggle-track {
    position: relative;
    width: 34px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid #455061;
    background: linear-gradient(180deg, #161b27 0%, #101521 100%);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
  }

  .toggle-thumb {
    position: absolute;
    top: 1px;
    left: 1px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #50627d;
    background: radial-gradient(circle at 35% 30%, #eef4ff 0%, #9ab5db 40%, #536985 100%);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.22);
    transition: transform 0.16s ease, background 0.16s ease;
  }

  .toggle-control input:checked + .toggle-track {
    border-color: #5a8d66;
    background: linear-gradient(180deg, #203624 0%, #162718 100%);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.55),
      0 0 8px rgba(143, 199, 143, 0.15);
  }

  .toggle-control input:checked + .toggle-track .toggle-thumb {
    transform: translateX(16px);
    background: radial-gradient(circle at 35% 30%, #e3f7d7 0%, #9dce8f 38%, #547148 100%);
    border-color: #5a8d66;
  }

  .toggle-label {
    min-width: 34px;
    color: #d8e4d1;
    font-size: 11px;
    letter-spacing: 0.8px;
    font-family: 'JetBrains Mono', monospace;
  }

  .select-shell {
    position: relative;
    min-width: 0;
  }

  .select-shell::after {
    content: '▾';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #d8c4a0;
    font-size: 12px;
    pointer-events: none;
  }

  .control-row select {
    min-width: 72px;
    padding: 7px 28px 7px 10px;
    border: 1px solid #455061;
    border-radius: 4px;
    background: linear-gradient(180deg, #1a2030 0%, #111622 100%);
    color: #f1f4fb;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    appearance: none;
    -webkit-appearance: none;
  }

  .rate-value {
    font-size: 11px;
    color: #e4efdb;
    min-width: 0;
    width: 64px;
    flex-shrink: 0;
    text-align: right;
    padding: 4px 7px;
    border: 1px solid rgba(112, 136, 98, 0.38);
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(33, 48, 27, 0.9) 0%, rgba(24, 34, 20, 0.95) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 1px 0 rgba(0, 0, 0, 0.12);
    font-family: 'JetBrains Mono', monospace;
    box-sizing: border-box;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }

  .rate-row .rate-value {
    width: auto;
    margin-left: 2px;
  }
</style>
