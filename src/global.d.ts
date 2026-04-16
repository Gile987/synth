/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '$types' {
  export type { HelpContent } from './lib/types/index';
  export type { ParamValue } from './lib/types/index';
  export type { ParamDefinition } from './lib/types/index';
  export type { PortDirection } from './lib/types/index';
  export type { PortType } from './lib/types/index';
  export type { PortDefinition } from './lib/types/index';
  export type { Port } from './lib/types/index';
  export type { ModuleCategory } from './lib/types/index';
  export type { ModuleState } from './lib/types/index';
  export type { ModuleDefinition } from './lib/types/index';
  export type { Position } from './lib/types/index';
  export type { ModuleInstance } from './lib/types/index';
  export type { Connection } from './lib/types/index';
  export type { Patch } from './lib/types/index';
  export type { PortRef } from './lib/types/index';
}

declare module '$stores' {
  import type { Writable } from 'svelte/store';
  import type { ModuleInstance, Connection, Position, ModuleDefinition, ParamValue } from '$types';
  
  export const modules: {
    subscribe: Writable<Map<string, ModuleInstance>>['subscribe'];
    add: (module: ModuleInstance) => void;
    remove: (id: string) => void;
    updatePosition: (id: string, position: Position) => void;
    clear: () => void;
  };
  
  export const connections: {
    subscribe: Writable<Map<string, Connection>>['subscribe'];
    add: (connection: Connection) => void;
    remove: (id: string) => void;
    clear: () => void;
  };
  
  export const selectedModuleId: Writable<string | null>;
  export const selectedConnectionId: Writable<string | null>;
  
  interface DragState {
    moduleId: string;
    offsetX: number;
    offsetY: number;
  }
  export const dragState: Writable<DragState | null>;
  
  interface CableState {
    sourceModuleId: string;
    sourcePortName: string;
    currentX: number;
    currentY: number;
  }
  export const cableState: Writable<CableState | null>;
  
  export const moduleDefinitions: Writable<readonly ModuleDefinition[]>;
  
  interface HelpModalState {
    isOpen: boolean;
    title: string;
    description: string;
    usage?: string;
    tips?: readonly string[];
    related?: readonly string[];
  }
  
  export const helpModal: {
    subscribe: Writable<HelpModalState>['subscribe'];
    open: (content: { title: string; description: string; usage?: string; tips?: readonly string[]; related?: readonly string[] }) => void;
    close: () => void;
  };
  
  export class SynthService {
    registerModules(): void;
    initializeAudio(): Promise<void>;
    addModule(type: string, position: Position): ModuleInstance;
    removeModule(id: string): void;
    updateModulePosition(id: string, position: Position): void;
    setModuleParam(id: string, name: string, value: ParamValue): void;
    connect(sourceModuleId: string, sourcePortName: string, targetModuleId: string, targetPortName: string): Connection;
    disconnect(connectionId: string): void;
    dispose(): void;
  }
  
  export const synthService: SynthService;
}

declare module '$core/*' {
  const mod: any;
  export = mod;
}

declare module '$modules/*' {
  const mod: any;
  export = mod;
}

declare module '$components/*' {
  const mod: any;
  export = mod;
}

declare module '$lib/*' {
  const mod: any;
  export = mod;
}
