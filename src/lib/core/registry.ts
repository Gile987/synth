import type { ModuleDefinition } from '$types';
import type { SynthModule } from './module';

/**
 * Registry entry containing definition and factory function
 */
interface RegistryEntry {
  readonly definition: ModuleDefinition;
  readonly factory: (id: string) => SynthModule;
}

/**
 * ModuleRegistry - Singleton service for managing available module types
 * 
 * This class maintains a catalog of all available module types and provides
 * factory methods for creating module instances. It's the source of truth
 * for what modules exist in the system.
 */
export class ModuleRegistry {
  private static instance: ModuleRegistry | null = null;
  private readonly modules = new Map<string, RegistryEntry>();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ModuleRegistry {
    if (ModuleRegistry.instance === null) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  /**
   * Register a new module type
   */
  public register(
    definition: ModuleDefinition,
    factory: (id: string) => SynthModule
  ): void {
    if (this.modules.has(definition.type)) {
      throw new Error(`Module type '${definition.type}' is already registered`);
    }

    this.modules.set(definition.type, { definition, factory });
  }

  /**
   * Get a module's definition by type
   */
  public getDefinition(type: string): ModuleDefinition | undefined {
    return this.modules.get(type)?.definition;
  }

  /**
   * Create a new module instance
   */
  public create(type: string, id: string): SynthModule {
    const entry = this.modules.get(type);
    if (entry === undefined) {
      throw new Error(`Unknown module type: ${type}`);
    }

    return entry.factory(id);
  }

  /**
   * Get all registered module definitions
   */
  public getAllDefinitions(): readonly ModuleDefinition[] {
    return Array.from(this.modules.values()).map(entry => entry.definition);
  }

  /**
   * Check if a module type is registered
   */
  public has(type: string): boolean {
    return this.modules.has(type);
  }

  /**
   * Get the number of registered module types
   */
  public get size(): number {
    return this.modules.size;
  }
}
