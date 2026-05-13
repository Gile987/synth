<script lang="ts">
  import type { PortDefinition } from '$types';

  interface Props {
    port: PortDefinition;
    isConnected?: boolean;
    variant?: 'warm' | 'cool';
    onMouseDown: (portName: string, direction: 'input' | 'output') => void;
    onMouseUp: (portName: string, direction: 'input' | 'output') => void;
  }

  let { port, isConnected = false, variant = 'warm', onMouseDown, onMouseUp }: Props = $props();

  function getTitle() {
    if (port.direction !== 'input') return undefined;
    return port.type === 'control'
      ? 'Modulation input: connect an output here to modulate this parameter'
      : `Input: ${port.name}`;
  }

  function handleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    onMouseDown(port.name, port.direction);
  }

  function handleMouseUp(event: MouseEvent) {
    event.stopPropagation();
    onMouseUp(port.name, port.direction);
  }
</script>

<div class={`port ${variant} ${port.direction}`}>
  {#if port.direction === 'input'}
    <div
      class={`port-circle type-${port.type}`}
      class:input-port={port.direction === 'input'}
      class:output-port={port.direction === 'output'}
      data-port-name={port.name}
      title={getTitle()}
      onmousedown={handleMouseDown}
      onmouseup={handleMouseUp}
      role="button"
      tabindex="0"
    >
      <span class={`port-led type-${port.type}`} class:active={isConnected}></span>
    </div>
    <span class="port-label">{port.name}</span>
  {:else}
    <span class="port-label">{port.name}</span>
    <div
      class={`port-circle type-${port.type}`}
      class:input-port={port.direction === 'input'}
      class:output-port={port.direction === 'output'}
      data-port-name={port.name}
      onmousedown={handleMouseDown}
      onmouseup={handleMouseUp}
      role="button"
      tabindex="0"
    ></div>
  {/if}
</div>

<style>
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

  .port-led {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(40, 40, 40, 0.8);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: all 0.15s ease;
    z-index: 12;
    opacity: 0.6;
  }

  .port-led.active.type-audio {
    background: #ff9999;
    box-shadow:
      0 0 4px #ff6666,
      0 0 8px #ff4444,
      inset 0 -1px 1px rgba(0, 0, 0, 0.2);
    opacity: 1;
  }

  .port-led.active.type-control {
    background: #99ccff;
    box-shadow:
      0 0 4px #66b3ff,
      0 0 8px #3399ff,
      inset 0 -1px 1px rgba(0, 0, 0, 0.2);
    opacity: 1;
  }

  .port-led.active.type-gate {
    background: #99ff99;
    box-shadow:
      0 0 4px #66ff66,
      0 0 8px #33ff33,
      inset 0 -1px 1px rgba(0, 0, 0, 0.2);
    opacity: 1;
  }

  .port-led.active.type-trigger {
    background: #ffee99;
    box-shadow:
      0 0 4px #ffdd66,
      0 0 8px #ffcc33,
      inset 0 -1px 1px rgba(0, 0, 0, 0.2);
    opacity: 1;
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

  .cool .port-circle {
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .cool .port-circle::before {
    background: rgba(10, 12, 18, 0.6);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7);
  }

  .cool .port-circle:hover {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 0 12px rgba(0, 0, 0, 0.36),
      0 0 12px currentColor;
  }

  .cool .type-control {
    background: linear-gradient(180deg, rgba(135, 165, 199, 0.18) 0%, rgba(25, 31, 49, 0.82) 100%);
  }

  .cool .type-control:hover {
    background: linear-gradient(180deg, rgba(135, 165, 199, 0.32) 0%, rgba(25, 31, 49, 0.88) 100%);
  }

  .cool .port-label {
    font-size: 11px;
    color: #d0d4df;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
  }
</style>
