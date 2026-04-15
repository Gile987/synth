import type { 
  ModuleInstance,
  Connection,
  Position,
  ParamValue,
  Port
} from '$types';
import type { SynthModule } from './module';
import { ModuleRegistry } from './registry';

/**
 * PatchEngine - Manages the runtime state of the synth patch
 * 
 * Responsible for:
 * - Module lifecycle management
 * - Connection graph
 * - Audio routing
 * - Serialization/deserialization
 */
export class PatchEngine {
  private readonly modules = new Map<string, ModuleInstance>();
  private readonly moduleInstances = new Map<string, SynthModule>();
  private readonly connections = new Map<string, Connection>();
  private readonly registry: ModuleRegistry;
  private audioContext: AudioContext | null = null;

  constructor(registry: ModuleRegistry = ModuleRegistry.getInstance()) {
    this.registry = registry;
  }

  /**
   * Initialize the audio engine
   */
  public async initialize(): Promise<void> {
    if (this.audioContext === null) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Get the audio context
   */
  public getContext(): AudioContext {
    if (this.audioContext === null) {
      throw new Error('PatchEngine has not been initialized');
    }
    return this.audioContext;
  }

  /**
   * Add a module to the patch
   */
  public addModule(type: string, id: string, position: Position): ModuleInstance {
    if (this.modules.has(id)) {
      throw new Error(`Module with id '${id}' already exists`);
    }

    const definition = this.registry.getDefinition(type);
    if (definition === undefined) {
      throw new Error(`Unknown module type: ${type}`);
    }

    // Create the audio module instance
    const moduleInstance = this.registry.create(type, id);
    moduleInstance.initialize(this.getContext());

    // Create the module state
    const moduleState: ModuleInstance = {
      id,
      type,
      position: { ...position },
      params: new Map<string, ParamValue>(
        definition.params.map(p => [p.name, p.defaultValue])
      ),
    };

    this.modules.set(id, moduleState);
    this.moduleInstances.set(id, moduleInstance);

    return moduleState;
  }

  /**
   * Remove a module and all its connections
   */
  public removeModule(id: string): void {
    // Disconnect all connections involving this module first
    // This ensures AudioParams are reset and audio nodes are properly disconnected
    const connectionsToRemove: string[] = [];
    for (const [connId, conn] of this.connections) {
      if (conn.sourceModuleId === id || conn.targetModuleId === id) {
        connectionsToRemove.push(connId);
      }
    }
    
    // Disconnect each connection (this resets AudioParams if needed)
    for (const connId of connectionsToRemove) {
      this.disconnect(connId);
    }

    // Now dispose the module itself
    const moduleInstance = this.moduleInstances.get(id);
    if (moduleInstance !== undefined) {
      moduleInstance.dispose();
    }

    this.modules.delete(id);
    this.moduleInstances.delete(id);
  }

  /**
   * Connect two module ports
   */
  public connect(
    sourceModuleId: string,
    sourcePortName: string,
    targetModuleId: string,
    targetPortName: string
  ): Connection {
    const sourceModule = this.moduleInstances.get(sourceModuleId);
    const targetModule = this.moduleInstances.get(targetModuleId);

    if (sourceModule === undefined) {
      throw new Error(`Source module not found: ${sourceModuleId}`);
    }
    if (targetModule === undefined) {
      throw new Error(`Target module not found: ${targetModuleId}`);
    }

    const sourcePort = sourceModule.getPort(sourcePortName);
    const targetPort = targetModule.getPort(targetPortName);

    if (sourcePort === undefined) {
      throw new Error(`Source port not found: ${sourcePortName}`);
    }
    if (targetPort === undefined) {
      throw new Error(`Target port not found: ${targetPortName}`);
    }

    // Create audio connection
    if (sourcePort.node instanceof AudioNode && targetPort.node instanceof AudioNode) {
      sourcePort.node.connect(targetPort.node);
    } else if (sourcePort.node instanceof AudioNode && targetPort.node instanceof AudioParam) {
      sourcePort.node.connect(targetPort.node);
    }

    const connection: Connection = {
      id: `${sourceModuleId}:${sourcePortName}-${targetModuleId}:${targetPortName}`,
      sourceModuleId,
      sourcePortName,
      targetModuleId,
      targetPortName,
    };

    this.connections.set(connection.id, connection);
    return connection;
  }

  /**
   * Disconnect two module ports
   */
  public disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection === undefined) {
      return;
    }

    const sourceModule = this.moduleInstances.get(connection.sourceModuleId);
    const targetModule = this.moduleInstances.get(connection.targetModuleId);
    const targetModuleState = this.modules.get(connection.targetModuleId);

    if (sourceModule !== undefined && targetModule !== undefined) {
      const sourcePort = sourceModule.getPort(connection.sourcePortName);
      const targetPort = targetModule.getPort(connection.targetPortName);

      if (sourcePort !== undefined && targetPort !== undefined) {
        if (sourcePort.node instanceof AudioNode) {
          if (targetPort.node instanceof AudioNode) {
            sourcePort.node.disconnect(targetPort.node);
          } else if (targetPort.node instanceof AudioParam) {
            sourcePort.node.disconnect(targetPort.node);
            // Reset the AudioParam to its stored parameter value
            // since Web Audio doesn't automatically revert it
            if (targetModuleState !== undefined) {
              const paramValue = targetModuleState.params.get(connection.targetPortName);
              if (paramValue !== undefined) {
                targetPort.node.value = paramValue as number;
              }
            }
          }
        }
      }
    }

    this.connections.delete(connectionId);
  }

  /**
   * Update module position
   */
  public updateModulePosition(id: string, position: Position): void {
    const moduleState = this.modules.get(id);
    if (moduleState !== undefined) {
      moduleState.position = { ...position };
    }
  }

  /**
   * Update module parameter
   */
  public setModuleParam(id: string, paramName: string, value: ParamValue): void {
    const moduleState = this.modules.get(id);
    const moduleInstance = this.moduleInstances.get(id);

    if (moduleState !== undefined && moduleInstance !== undefined) {
      moduleState.params.set(paramName, value);
      moduleInstance.setParam(paramName, value);
    }
  }

  /**
   * Get all modules
   */
  public getModules(): ReadonlyMap<string, ModuleInstance> {
    return new Map(this.modules);
  }

  /**
   * Get all connections
   */
  public getConnections(): ReadonlyMap<string, Connection> {
    return new Map(this.connections);
  }

  /**
   * Get a module instance
   */
  public getModuleInstance(id: string): SynthModule | undefined {
    return this.moduleInstances.get(id);
  }

  /**
   * Dispose of all modules and clean up
   */
  public dispose(): void {
    for (const moduleInstance of this.moduleInstances.values()) {
      moduleInstance.dispose();
    }
    
    this.modules.clear();
    this.moduleInstances.clear();
    this.connections.clear();
    
    if (this.audioContext !== null) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
