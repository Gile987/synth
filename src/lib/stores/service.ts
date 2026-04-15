import { ModuleRegistry } from '$core/registry';
import { PatchEngine } from '$core/patch-engine';
import { OscillatorModule, OSCILLATOR_DEFINITION } from '$modules/oscillator';
import { FilterModule, FILTER_DEFINITION } from '$modules/filter';
import { OutputModule, OUTPUT_DEFINITION } from '$modules/output';
import { modules, connections, moduleDefinitions } from './patch';
import type { ModuleInstance, Position, ParamValue } from '$types';

/**
 * SynthService - Bridge between audio engine and Svelte stores
 * 
 * This service initializes the modular synth system and provides
 * methods for manipulating the patch that automatically sync with stores.
 */
class SynthService {
  private registry: ModuleRegistry;
  private engine: PatchEngine;
  private modulesRegistered = false;
  private audioInitialized = false;

  constructor() {
    this.registry = ModuleRegistry.getInstance();
    this.engine = new PatchEngine(this.registry);
  }

  /**
   * Register all module types (no audio context needed)
   */
  public registerModules(): void {
    if (this.modulesRegistered) return;

    // Register all module types
    this.registry.register(OSCILLATOR_DEFINITION, (id) => new OscillatorModule(id));
    this.registry.register(FILTER_DEFINITION, (id) => new FilterModule(id));
    this.registry.register(OUTPUT_DEFINITION, (id) => new OutputModule(id));

    // Update stores with available modules
    moduleDefinitions.set(this.registry.getAllDefinitions());

    this.modulesRegistered = true;
    console.log(`[synth] Registered ${this.registry.size} module types`);
  }

  /**
   * Initialize audio engine (requires user gesture)
   */
  public async initializeAudio(): Promise<void> {
    if (!this.modulesRegistered) {
      throw new Error('Modules must be registered before initializing audio');
    }

    if (this.audioInitialized) return;

    // Initialize audio engine - this creates/resumes the AudioContext
    await this.engine.initialize();

    this.audioInitialized = true;
    console.log('[synth] Audio engine initialized');
  }

  /**
   * Check if modules are registered
   */
  public get isModulesRegistered(): boolean {
    return this.modulesRegistered;
  }

  /**
   * Check if audio is initialized
   */
  public get isAudioInitialized(): boolean {
    return this.audioInitialized;
  }

  /**
   * Add a module to the patch
   */
  public addModule(type: string, position: Position): ModuleInstance {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
    }

    const id = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const moduleState = this.engine.addModule(type, id, position);
    
    // Update store
    modules.add(moduleState);
    
    return moduleState;
  }

  /**
   * Remove a module from the patch
   */
  public removeModule(id: string): void {
    if (!this.audioInitialized) return;

    this.engine.removeModule(id);
    modules.remove(id);
  }

  /**
   * Connect two module ports
   */
  public connect(
    sourceModuleId: string,
    sourcePortName: string,
    targetModuleId: string,
    targetPortName: string
  ): void {
    if (!this.audioInitialized) return;

    const connection = this.engine.connect(
      sourceModuleId,
      sourcePortName,
      targetModuleId,
      targetPortName
    );
    
    connections.add(connection);
  }

  /**
   * Disconnect two module ports
   */
  public disconnect(connectionId: string): void {
    if (!this.audioInitialized) return;

    this.engine.disconnect(connectionId);
    connections.remove(connectionId);
  }

  /**
   * Update module position
   */
  public updateModulePosition(id: string, position: Position): void {
    if (!this.audioInitialized) return;

    this.engine.updateModulePosition(id, position);
    modules.updatePosition(id, position);
  }

  /**
   * Update module parameter
   */
  public setModuleParam(moduleId: string, paramName: string, value: ParamValue): void {
    if (!this.audioInitialized) return;

    this.engine.setModuleParam(moduleId, paramName, value);
  }

  /**
   * Get all connections (for initial sync)
   */
  public getConnections(): Map<string, import('$types').Connection> {
    return this.engine.getConnections();
  }

  /**
   * Clean up
   */
  public dispose(): void {
    this.engine.dispose();
    modules.clear();
    connections.clear();
    this.modulesRegistered = false;
    this.audioInitialized = false;
  }
}

export const synthService = new SynthService();
