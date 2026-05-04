import { ModuleRegistry } from '$core/registry';
import { PatchEngine } from '$core/patch-engine';
import { OscillatorModule, OSCILLATOR_DEFINITION } from '$modules/oscillator';
import { FilterModule, FILTER_DEFINITION } from '$modules/filter';
import { OutputModule, OUTPUT_DEFINITION } from '$modules/output';
import { LFOModule, LFO_DEFINITION } from '$modules/lfo';
import { ADSRModule, ADSR_DEFINITION } from '$modules/adsr';
import { VCAModule, VCA_DEFINITION } from '$modules/vca';
import { SequencerModule, SEQUENCER_DEFINITION } from '$modules/sequencer';
import { NoiseModule, NOISE_DEFINITION } from '$modules/noise';
import { ReverbModule, REVERB_DEFINITION } from '$modules/reverb';
import { DelayModule, DELAY_DEFINITION } from '$modules/delay';
import { ChorusFlangerModule, CHORUS_FLANGER_DEFINITION } from '$modules/chorus-flanger';
import { MixerModule, MIXER_DEFINITION } from '$modules/mixer';
import { DistortionModule, DISTORTION_DEFINITION } from '$modules/distortion';
import { AttenuverterModule, ATTENUVERTER_DEFINITION } from '$modules/attenuverter';
import { MultiFxModule, MULTI_FX_DEFINITION } from '$modules/multi-fx';
import { MultModule, MULT_DEFINITION } from '$modules/mult';
import { ScopeModule, SCOPE_DEFINITION } from '$modules/scope';
import { modules, connections, moduleDefinitions } from './patch';
import type { Connection, ModuleInstance, Position, ParamValue, PatchState } from '$types';

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

    this.registry.register(OSCILLATOR_DEFINITION, (id) => new OscillatorModule(id));
    this.registry.register(FILTER_DEFINITION, (id) => new FilterModule(id));
    this.registry.register(OUTPUT_DEFINITION, (id) => new OutputModule(id));
    this.registry.register(LFO_DEFINITION, (id) => new LFOModule(id));
    this.registry.register(ADSR_DEFINITION, (id) => new ADSRModule(id));
    this.registry.register(VCA_DEFINITION, (id) => new VCAModule(id));
    this.registry.register(SEQUENCER_DEFINITION, (id) => new SequencerModule(id));
    this.registry.register(NOISE_DEFINITION, (id) => new NoiseModule(id));
    this.registry.register(REVERB_DEFINITION, (id) => new ReverbModule(id));
    this.registry.register(DELAY_DEFINITION, (id) => new DelayModule(id));
    this.registry.register(CHORUS_FLANGER_DEFINITION, (id) => new ChorusFlangerModule(id));
    this.registry.register(MIXER_DEFINITION, (id) => new MixerModule(id));
    this.registry.register(DISTORTION_DEFINITION, (id) => new DistortionModule(id));
    this.registry.register(ATTENUVERTER_DEFINITION, (id) => new AttenuverterModule(id));
    this.registry.register(MULTI_FX_DEFINITION, (id) => new MultiFxModule(id));
    this.registry.register(MULT_DEFINITION, (id) => new MultModule(id));
    this.registry.register(SCOPE_DEFINITION, (id) => new ScopeModule(id));

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
    this.modulesRegistered = false;
    this.audioInitialized = false;
  }

  /**
   * Load a patch from a PatchState object
   * Clears existing patch and reconstructs from saved state
   */
  public async loadPatch(state: PatchState): Promise<void> {
    if (!this.audioInitialized) {
      throw new Error('Audio engine not initialized');
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
