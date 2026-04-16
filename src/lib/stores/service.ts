import { ModuleRegistry } from '$core/registry';
import { PatchEngine } from '$core/patch-engine';
import { OscillatorModule, OSCILLATOR_DEFINITION } from '$modules/oscillator';
import { FilterModule, FILTER_DEFINITION } from '$modules/filter';
import { OutputModule, OUTPUT_DEFINITION } from '$modules/output';
import { LFOModule, LFO_DEFINITION } from '$modules/lfo';
import { ADSRModule, ADSR_DEFINITION } from '$modules/adsr';
import { VCAModule, VCA_DEFINITION } from '$modules/vca';
import { modules, connections, moduleDefinitions } from './patch';
import type { Connection, ModuleInstance, Position, ParamValue } from '$types';

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
    if (!this.audioInitialized) return;

    this.engine.removeModule(id);
    modules.remove(id);
  }

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

  public disconnect(connectionId: string): void {
    if (!this.audioInitialized) return;

    this.engine.disconnect(connectionId);
    connections.remove(connectionId);
  }

  public updateModulePosition(id: string, position: Position): void {
    if (!this.audioInitialized) return;

    this.engine.updateModulePosition(id, position);
    modules.updatePosition(id, position);
  }

  public setModuleParam(moduleId: string, paramName: string, value: ParamValue): void {
    if (!this.audioInitialized) return;

    this.engine.setModuleParam(moduleId, paramName, value);
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
}

export const synthService = new SynthService();
