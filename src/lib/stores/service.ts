import { ModuleRegistry } from '$core/registry';
import { PatchEngine } from '$core/patch-engine';
import { MODULE_DESCRIPTORS } from './module-registry';
import { modules, connections, moduleDefinitions } from './patch';
import type { Connection, ModuleDefinition, ModuleInstance, Position, PortDefinition, ParamValue, PatchState, SerializableModuleInstance } from '$types';

class SynthService {
  private registry: ModuleRegistry;
  private engine: PatchEngine;
  private modulesRegistered = false;
  private audioInitialized = false;

  constructor() {
    this.registry = ModuleRegistry.getInstance();
    this.engine = new PatchEngine(this.registry);
  }

  public registerModules(): void {
    if (this.modulesRegistered) return;

    // Register all modules from the declarative descriptor list
    MODULE_DESCRIPTORS.forEach(({ definition, factory }) => {
      this.registry.register(definition, factory);
    });

    moduleDefinitions.set(this.registry.getAllDefinitions());

    this.modulesRegistered = true;
    console.log(`[synth] Registered ${this.registry.size} module types`);
  }

  public async initializeAudio(): Promise<void> {
    if (!this.modulesRegistered) {
      throw new Error('Modules must be registered before initializing audio');
    }

    if (this.audioInitialized) return;

    await this.engine.initialize();

    this.audioInitialized = true;
    console.log('[synth] Audio engine initialized');
  }

  public get isModulesRegistered(): boolean {
    return this.modulesRegistered;
  }

  public get isAudioInitialized(): boolean {
    return this.audioInitialized;
  }

  public addModule(type: string, position: Position): ModuleInstance {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    const id = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const moduleState = this.engine.addModule(type, id, position);

    modules.add(moduleState);

    return moduleState;
  }

  public removeModule(id: string): void {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    this.engine.removeModule(id);
    modules.remove(id);
  }

  public connect(
    sourceModuleId: string,
    sourcePortName: string,
    targetModuleId: string,
    targetPortName: string
  ): void {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    const connection = this.engine.connect(
      sourceModuleId,
      sourcePortName,
      targetModuleId,
      targetPortName
    );

    connections.add(connection);
  }

  public disconnect(connectionId: string): void {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    this.engine.disconnect(connectionId);
    connections.remove(connectionId);
  }

  public updateModulePosition(id: string, position: Position): void {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    this.engine.updateModulePosition(id, position);
    modules.updatePosition(id, position);
  }

  public setModuleParam(moduleId: string, paramName: string, value: ParamValue): void {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    this.engine.setModuleParam(moduleId, paramName, value);
    // Emit store update to trigger autosave and UI reactivity
    modules.updateParam(moduleId, paramName, value);
  }

  public getModuleInstance(moduleId: string) {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }
    return this.engine.getModuleInstance(moduleId);
  }

  public getConnections(): ReadonlyMap<string, Connection> {
    return this.engine.getConnections();
  }

  public dispose(): void {
    this.engine.dispose();
    modules.clear();
    connections.clear();
    // modulesRegistered is NOT reset: the singleton ModuleRegistry retains all
    // type registrations and has no clear() method. Resetting this flag would
    // cause initializeAudio() to throw "Modules must be registered" after a
    // clear-session → restart flow, while re-registering would hit the
    // registry's duplicate-guard throw. Only the audio engine and stores need clearing.
    this.audioInitialized = false;
  }

  /**
   * Validate patch state semantically before loading
   * Checks module types, param validity, and connection integrity
   */
  private validatePatchSemantics(state: PatchState): string[] {
    const errors: string[] = [];
    const savedModulesById = new Map<string, SerializableModuleInstance>();
    const savedDefinitionsByModuleId = new Map<string, ModuleDefinition>();

    for (const savedModule of state.modules) {
      savedModulesById.set(savedModule.id, savedModule);
    }

    // Check module types exist in registry
    for (const savedModule of state.modules) {
      const definition = this.registry.getDefinition(savedModule.type);
      if (!definition) {
        errors.push(`Unknown module type: ${savedModule.type}`);
        continue;
      }

      savedDefinitionsByModuleId.set(savedModule.id, definition);
    }

    // Validate params against module definitions
    for (const savedModule of state.modules) {
      const definition = savedDefinitionsByModuleId.get(savedModule.id);
      if (!definition) continue;

      const validParamNames = new Set(definition.params.map((p: { name: string }) => p.name));

      for (const [paramName, paramValue] of Object.entries(savedModule.params)) {
        // Check param name is valid for this module type
        if (!validParamNames.has(paramName)) {
          errors.push(`Invalid param '${paramName}' for module type '${savedModule.type}'`);
          continue;
        }

        // Check param value type
        const paramDef = definition.params.find((p: { name: string }) => p.name === paramName);
        if (paramDef) {
          const valueType = typeof paramValue;
          const expectedType = typeof paramDef.defaultValue;
          if (valueType !== expectedType) {
            errors.push(`Type mismatch for param '${paramName}' in '${savedModule.type}': expected ${expectedType}, got ${valueType}`);
          }
        }
      }
    }

    // Validate connections reference existing modules
    const moduleIds = new Set(state.modules.map((m: { id: string }) => m.id));
    for (const savedConnection of state.connections) {
      if (!moduleIds.has(savedConnection.sourceModuleId)) {
        errors.push(`Connection references unknown source module: ${savedConnection.sourceModuleId}`);
      }
      if (!moduleIds.has(savedConnection.targetModuleId)) {
        errors.push(`Connection references unknown target module: ${savedConnection.targetModuleId}`);
      }

      const sourceModule = savedModulesById.get(savedConnection.sourceModuleId);
      const targetModule = savedModulesById.get(savedConnection.targetModuleId);
      const sourceDefinition = savedDefinitionsByModuleId.get(savedConnection.sourceModuleId);
      const targetDefinition = savedDefinitionsByModuleId.get(savedConnection.targetModuleId);

      if (!sourceModule || !targetModule || !sourceDefinition || !targetDefinition) {
        continue;
      }

      const sourcePort = sourceDefinition.ports.find((port: PortDefinition) => port.name === savedConnection.sourcePortName);
      if (!sourcePort) {
        errors.push(`Invalid source port '${savedConnection.sourcePortName}' for module type '${sourceModule.type}'`);
      } else if (sourcePort.direction !== 'output') {
        errors.push(`Invalid source port direction for '${savedConnection.sourcePortName}' on module type '${sourceModule.type}': expected output, got ${sourcePort.direction}`);
      }

      const targetPort = targetDefinition.ports.find((port: PortDefinition) => port.name === savedConnection.targetPortName);
      if (!targetPort) {
        errors.push(`Invalid target port '${savedConnection.targetPortName}' for module type '${targetModule.type}'`);
      } else if (targetPort.direction !== 'input') {
        errors.push(`Invalid target port direction for '${savedConnection.targetPortName}' on module type '${targetModule.type}': expected input, got ${targetPort.direction}`);
      }
    }

    return errors;
  }

  /**
   * Load a patch from a PatchState object
   * Clears existing patch and reconstructs from saved state
   */
  public async loadPatch(state: PatchState): Promise<void> {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    // Semantic validation before destructive clear
    const validationErrors = this.validatePatchSemantics(state);
    if (validationErrors.length > 0) {
      console.error('[synth] Patch validation failed:', validationErrors);
      throw new Error(`Patch validation failed: ${validationErrors.join(', ')}`);
    }

    // Clear existing patch
    this.engine.dispose();
    modules.clear();
    connections.clear();

    // Re-initialize the engine
    await this.engine.initialize();

    // Create modules
    const moduleIdMap = new Map<string, string>();
    
    for (const savedModule of state.modules) {
      try {
        const newModule = this.addModule(savedModule.type, savedModule.position);
        moduleIdMap.set(savedModule.id, newModule.id);

        // Set module parameters
        for (const [paramName, paramValue] of Object.entries(savedModule.params)) {
          this.setModuleParam(newModule.id, paramName, paramValue);
        }
      } catch (err) {
        console.error(`[synth] Failed to create module ${savedModule.type}:`, err);
      }
    }

    // Create connections
    for (const savedConnection of state.connections) {
      try {
        const newSourceId = moduleIdMap.get(savedConnection.sourceModuleId);
        const newTargetId = moduleIdMap.get(savedConnection.targetModuleId);

        if (newSourceId && newTargetId) {
          this.connect(
            newSourceId,
            savedConnection.sourcePortName,
            newTargetId,
            savedConnection.targetPortName
          );
        } else {
          console.warn(`[synth] Could not recreate connection: module not found`);
        }
      } catch (err) {
        console.error(`[synth] Failed to create connection:`, err);
      }
    }

    console.log(`[synth] Loaded patch with ${state.modules.length} modules and ${state.connections.length} connections`);
  }
}

export const synthService = new SynthService();
