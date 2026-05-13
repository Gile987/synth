<script lang="ts">
  import type { Snippet } from 'svelte';
  import { synthService, selectedModuleId, selectedConnectionId, connections } from '$stores';
  import type { ModuleDefinition, ModuleInstance, PortDefinition } from '$types';
  import ModuleShell from './ModuleShell.svelte';

  interface Props {
    module: ModuleInstance;
    definition: ModuleDefinition;
    isDragging?: boolean;
    shellClass?: string;
    portVariant?: 'warm' | 'cool';
    children?: Snippet;
    onDragStart: (event: MouseEvent) => void;
    onPortMouseDown: (portName: string, direction: 'input' | 'output') => void;
    onPortMouseUp: (portName: string, direction: 'input' | 'output') => void;
  }

  let {
    module,
    definition,
    isDragging = false,
    shellClass = '',
    portVariant = 'warm',
    children,
    onDragStart,
    onPortMouseDown,
    onPortMouseUp
  }: Props = $props();

  const isSelected = $derived($selectedModuleId === module.id);
  const position = $derived(module.position);
  const inputPorts = $derived(definition.ports.filter((port: PortDefinition) => port.direction === 'input'));
  const outputPorts = $derived(definition.ports.filter((port: PortDefinition) => port.direction === 'output'));

  const connectedInputs = $derived.by(() => {
    const connected = new Set<string>();
    for (const connection of $connections.values()) {
      if (connection.targetModuleId === module.id) {
        connected.add(connection.targetPortName);
      }
    }
    return connected;
  });

  function handleDelete() {
    synthService.removeModule(module.id);
  }

  function handleSelect() {
    $selectedModuleId = module.id;
    $selectedConnectionId = null;
  }
</script>

<ModuleShell
  moduleId={module.id}
  label={definition.label}
  helpContent={definition.help}
  category={definition.category}
  {position}
  {inputPorts}
  {outputPorts}
  {connectedInputs}
  {isSelected}
  {isDragging}
  {shellClass}
  {portVariant}
  onSelect={handleSelect}
  onDelete={handleDelete}
  {onDragStart}
  {onPortMouseDown}
  {onPortMouseUp}
>
  {@render children?.()}
</ModuleShell>
