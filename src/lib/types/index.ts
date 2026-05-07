/**
 * Help content structure for documentation
 */
export interface HelpContent {
  readonly title: string;
  readonly description: string;
  readonly usage?: string;
  readonly tips?: readonly string[];
  readonly related?: readonly string[];
}

/**
 * Parameter value types
 */
export type ParamValue = number | string | boolean;

/**
 * Parameter definition for module metadata
 */
export interface ParamDefinition {
  readonly name: string;
  readonly label: string;
  readonly controlType: 'knob' | 'slider' | 'select' | 'toggle' | 'number';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly defaultValue: ParamValue;
  readonly options?: readonly string[];
  readonly scale?: 'linear' | 'log'; // For logarithmic parameter scaling (e.g., frequency)
}

/**
 * Port direction - input or output
 */
export type PortDirection = 'input' | 'output';

/**
 * Port types for different signal types
 */
export type PortType = 'audio' | 'control' | 'gate' | 'trigger';

/**
 * Port definition for module metadata
 */
export interface PortDefinition {
  readonly name: string;
  readonly type: PortType;
  readonly direction: PortDirection;
}

/**
 * Live port with actual audio node
 */
export interface Port {
  readonly name: string;
  readonly type: PortType;
  readonly direction: PortDirection;
  readonly node: AudioNode | AudioParam;
}

/**
 * Module categories for organization
 */
export type ModuleCategory = 'source' | 'effect' | 'modulation' | 'utility' | 'output';

/**
 * Module lifecycle states
 */
export type ModuleState = 'created' | 'initialized' | 'disposed';

/**
 * Module definition - static metadata about a module type
 */
export interface ModuleDefinition {
  readonly type: string;
  readonly label: string;
  readonly category: ModuleCategory;
  readonly version: string;
  readonly ports: readonly PortDefinition[];
  readonly params: readonly ParamDefinition[];
  readonly help: HelpContent;
}

/**
 * Position on the patch board
 */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/**
 * Module instance data for UI state
 */
export interface ModuleInstance {
  readonly id: string;
  readonly type: string;
  position: Position;
  params: Map<string, ParamValue>;
}

/**
 * Connection between two module ports
 */
export interface Connection {
  readonly id: string;
  readonly sourceModuleId: string;
  readonly sourcePortName: string;
  readonly targetModuleId: string;
  readonly targetPortName: string;
}

/**
 * Complete patch state for serialization
 */
export interface Patch {
  readonly modules: readonly ModuleInstance[];
  readonly connections: readonly Connection[];
}

/**
 * Serializable module instance for preset storage
 */
export interface SerializableModuleInstance {
  readonly id: string;
  readonly type: string;
  position: Position;
  params: Record<string, ParamValue>;
}

/**
 * Serializable patch state for preset storage
 */
export interface PatchState {
  readonly modules: readonly SerializableModuleInstance[];
  readonly connections: readonly Connection[];
  readonly version: string;
}

/**
 * Port reference for connection operations
 */
export interface PortRef {
  readonly moduleId: string;
  readonly portName: string;
}

