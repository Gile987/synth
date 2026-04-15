import type { 
  ModuleState,
  ParamValue,
  Port,
  ModuleDefinition 
} from '$types';

/**
 * SynthModule interface - contract for all audio modules
 * 
 * Every module in the system must implement this interface.
 * It defines the lifecycle and interaction contract.
 */
export interface SynthModule {
  readonly id: string;
  readonly definition: ModuleDefinition;
  readonly state: ModuleState;

  /**
   * Initialize the module with an audio context
   * Creates all internal audio nodes
   */
  initialize(context: AudioContext): void;

  /**
   * Dispose of the module and clean up resources
   */
  dispose(): void;

  /**
   * Get all available ports for this module
   */
  getPorts(): ReadonlyMap<string, Port>;

  /**
   * Get a specific port by name
   */
  getPort(name: string): Port | undefined;

  /**
   * Set a parameter value
   */
  setParam(name: string, value: ParamValue): void;

  /**
   * Get a parameter value
   */
  getParam(name: string): ParamValue | undefined;

  /**
   * Get all parameter values as a map
   */
  getAllParams(): ReadonlyMap<string, ParamValue>;
}
