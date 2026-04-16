import type { Port, PortDefinition } from '$types';

/**
 * Create a port from its definition and audio node
 */
export function createPort(
  definition: PortDefinition,
  node: AudioNode | AudioParam
): Port {
  return {
    name: definition.name,
    type: definition.type,
    direction: definition.direction,
    node,
  };
}

/**
 * Type guard for AudioParam
 */
export function isAudioParam(node: AudioNode | AudioParam): node is AudioParam {
  return 'value' in node && typeof node.value === 'number';
}
