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
