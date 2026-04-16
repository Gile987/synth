import { writable, type Writable } from 'svelte/store';
import type { ModuleInstance, Connection, Position, ModuleDefinition } from '$types';

/**
 * Module store - manages all module instances
 */
function createModuleStore() {
  const { subscribe, set, update }: Writable<Map<string, ModuleInstance>> = writable(new Map());

  return {
    subscribe,
    add: (module: ModuleInstance) => update(modules => {
      modules.set(module.id, module);
      return modules;
    }),
    remove: (id: string) => update(modules => {
      modules.delete(id);
      return modules;
    }),
    updatePosition: (id: string, position: Position) => update(modules => {
      const module = modules.get(id);
      if (module) {
        // Create new module instance with updated position for reactivity
        const updatedModule: ModuleInstance = {
          ...module,
          position: { ...position }
        };
        modules.set(id, updatedModule);
      }
      return new Map(modules);
    }),
    clear: () => set(new Map()),
  };
}

export const modules = createModuleStore();

/**
 * Connection store - manages all connections
 */
function createConnectionStore() {
  const { subscribe, set, update }: Writable<Map<string, Connection>> = writable(new Map());

  return {
    subscribe,
    add: (connection: Connection) => update(connections => {
      connections.set(connection.id, connection);
      return connections;
    }),
    remove: (id: string) => update(connections => {
      connections.delete(id);
      return connections;
    }),
    clear: () => set(new Map()),
  };
}

export const connections = createConnectionStore();

/**
 * Selected module store - tracks which module is selected
 */
export const selectedModuleId = writable<string | null>(null);

/**
 * Selected connection store - tracks which connection is selected
 */
export const selectedConnectionId = writable<string | null>(null);

/**
 * Dragging state store
 */
interface DragState {
  moduleId: string;
  offsetX: number;
  offsetY: number;
}

export const dragState = writable<DragState | null>(null);

/**
 * Cable drawing state store
 */
interface CableState {
  sourceModuleId: string;
  sourcePortName: string;
  currentX: number;
  currentY: number;
}

export const cableState = writable<CableState | null>(null);

/**
 * Module definitions store - available module types
 */
export const moduleDefinitions = writable<readonly ModuleDefinition[]>([]);

/**
 * Help modal state store
 */
interface HelpModalState {
  isOpen: boolean;
  title: string;
  description: string;
  usage?: string;
  tips?: readonly string[];
  related?: readonly string[];
}

function createHelpModalStore() {
  const { subscribe, set, update }: Writable<HelpModalState> = writable({
    isOpen: false,
    title: '',
    description: '',
  });

  return {
    subscribe,
    open: (content: { 
      title: string; 
      description: string; 
      usage?: string; 
      tips?: readonly string[];
      related?: readonly string[];
    }) => set({
      isOpen: true,
      ...content,
    }),
    close: () => update(state => ({ ...state, isOpen: false })),
  };
}

export const helpModal = createHelpModalStore();
