import type { 
  ModuleDefinition,
  ModuleState,
  ParamValue,
  Port
} from '$types';
import type { SynthModule } from './module';

/**
 * BaseModule - Abstract base class for all synth modules
 * 
 * Provides common functionality and state management.
 * All concrete modules should extend this class.
 */
export abstract class BaseModule implements SynthModule {
  public readonly id: string;
  public readonly definition: ModuleDefinition;
  
  private _state: ModuleState = 'created';
  private _context: AudioContext | null = null;
  private readonly _ports = new Map<string, Port>();
  private readonly _params = new Map<string, ParamValue>();

  constructor(id: string, definition: ModuleDefinition) {
    this.id = id;
    this.definition = definition;
    
    // Initialize params with defaults
    for (const param of definition.params) {
      this._params.set(param.name, param.defaultValue);
    }
  }

  public get state(): ModuleState {
    return this._state;
  }

  protected get context(): AudioContext {
    if (this._context === null) {
      throw new Error(`Module ${this.id} has not been initialized`);
    }
    return this._context;
  }

  /**
   * Initialize the module
   */
  public initialize(context: AudioContext): void {
    if (this._state === 'disposed') {
      throw new Error(`Cannot initialize disposed module ${this.id}`);
    }

    if (this._state === 'initialized') {
      return;
    }

    this._context = context;
    this._ports.clear();
    
    // Create audio nodes - implemented by subclass
    this.createNodes();
    
    this._state = 'initialized';
  }

  /**
   * Dispose of the module
   */
  public dispose(): void {
    if (this._state === 'disposed') {
      return;
    }

    this.destroyNodes();
    this._ports.clear();
    this._context = null;
    this._state = 'disposed';
  }

  /**
   * Get all ports
   */
  public getPorts(): ReadonlyMap<string, Port> {
    return new Map(this._ports);
  }

  /**
   * Get a specific port
   */
  public getPort(name: string): Port | undefined {
    return this._ports.get(name);
  }

  /**
   * Set a parameter value
   */
  public setParam(name: string, value: ParamValue): void {
    this.setParamValue(name, value);
  }

  /**
   * Get a parameter value
   */
  public getParam(name: string): ParamValue | undefined {
    return this._params.get(name);
  }

  /**
   * Get a parameter value as number
   */
  public getNumberParam(name: string): number | undefined {
    const value = this._params.get(name);
    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Get a parameter value as boolean
   */
  public getBooleanParam(name: string): boolean | undefined {
    const value = this._params.get(name);
    return typeof value === 'boolean' ? value : undefined;
  }

  /**
   * Get a parameter value as string
   */
  public getStringParam(name: string): string | undefined {
    const value = this._params.get(name);
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Get all parameter values
   */
  public getAllParams(): ReadonlyMap<string, ParamValue> {
    return new Map(this._params);
  }

  /**
   * Register a port - called by subclasses during node creation
   */
  protected registerPort(port: Port): void {
    this._ports.set(port.name, port);
  }

  /**
   * Set parameter value - subclasses can override for custom behavior
   */
  protected setParamValue(name: string, value: ParamValue): void {
    if (!this._params.has(name)) {
      throw new Error(`Unknown parameter: ${name}`);
    }
    
    this._params.set(name, value);
  }

  /**
   * Create audio nodes - must be implemented by subclasses
   */
  protected abstract createNodes(): void;

  /**
   * Destroy audio nodes - must be implemented by subclasses
   */
  protected abstract destroyNodes(): void;

  /**
   * Safely disconnect and cleanup an audio node
   * Helper method to reduce duplication in destroyNodes() implementations
   */
  protected safeDisconnect(node: AudioNode | undefined): void {
    if (node !== undefined) {
      try {
        node.disconnect();
      } catch {
        // Node might already be disconnected, ignore
      }
    }
  }

  /**
   * Safely stop, disconnect and cleanup an audio buffer source node
   */
  protected safeStopAndDisconnect(node: AudioBufferSourceNode | undefined): void {
    if (node !== undefined) {
      try {
        node.stop();
      } catch {
        // Node might not be playing, ignore
      }
      this.safeDisconnect(node);
    }
  }

  /**
   * Safely stop, disconnect and cleanup an oscillator node
   */
  protected safeStopOscillator(node: OscillatorNode | undefined): void {
    if (node !== undefined) {
      try {
        node.stop();
      } catch {
        // Node might not be playing, ignore
      }
      this.safeDisconnect(node);
    }
  }
}
