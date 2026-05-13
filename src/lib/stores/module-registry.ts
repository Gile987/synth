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
import Module from '$components/ui/Module.svelte';
import SequencerModuleComponent from '$components/ui/SequencerModule.svelte';
import ScopeModuleComponent from '$components/ui/ScopeModule.svelte';
import type { ModuleDefinition } from '$types';
import type { SynthModule } from '$core/module';
import type { Component } from 'svelte';

/**
 * Module props interface for custom UI components
 */
export interface ModuleComponentProps {
  module: { id: string; type: string; position: { x: number; y: number }; state: Record<string, unknown> };
  definition: ModuleDefinition;
  isDragging: boolean;
  onDragStart: (e: MouseEvent) => void;
  onPortMouseDown: (name: string, direction: 'input' | 'output') => void;
  onPortMouseUp: (name: string, direction: 'input' | 'output') => void;
}

/**
 * Module descriptor - declarative registration data for a synth module
 */
export interface ModuleDescriptor {
  /** Module type identifier (matches definition.type) */
  readonly type: string;
  /** Module definition (metadata, ports, params, help) */
  readonly definition: ModuleDefinition;
  /** Factory function to create module instance */
  readonly factory: (id: string) => SynthModule;
  /** Custom UI component for rendering (defaults to generic Module) */
  readonly component?: Component<ModuleComponentProps>;
  /** Custom width in pixels (defaults to 220) */
  readonly width?: number;
}

/**
 * Default module width in pixels
 */
export const DEFAULT_MODULE_WIDTH = 220;

/**
 * Declarative list of all available module types.
 *
 * To add a new module:
 * 1. Create the module file in $modules/
 * 2. Export DEFINITION and Module class from it
 * 3. Import them here
 * 4. Add a new descriptor to this array
 *
 * The service layer will automatically register all modules from this list.
 *
 * For custom UI components:
 * - Add 'component' field with the Svelte component
 * - Add 'width' field if different from DEFAULT_MODULE_WIDTH
 */
export const MODULE_DESCRIPTORS: readonly ModuleDescriptor[] = [
  {
    type: 'oscillator',
    definition: OSCILLATOR_DEFINITION,
    factory: (id) => new OscillatorModule(id),
  },
  {
    type: 'filter',
    definition: FILTER_DEFINITION,
    factory: (id) => new FilterModule(id),
  },
  {
    type: 'output',
    definition: OUTPUT_DEFINITION,
    factory: (id) => new OutputModule(id),
  },
  {
    type: 'lfo',
    definition: LFO_DEFINITION,
    factory: (id) => new LFOModule(id),
  },
  {
    type: 'adsr',
    definition: ADSR_DEFINITION,
    factory: (id) => new ADSRModule(id),
  },
  {
    type: 'vca',
    definition: VCA_DEFINITION,
    factory: (id) => new VCAModule(id),
  },
  {
    type: 'sequencer',
    definition: SEQUENCER_DEFINITION,
    factory: (id) => new SequencerModule(id),
    component: SequencerModuleComponent,
    width: 320,
  },
  {
    type: 'noise',
    definition: NOISE_DEFINITION,
    factory: (id) => new NoiseModule(id),
  },
  {
    type: 'reverb',
    definition: REVERB_DEFINITION,
    factory: (id) => new ReverbModule(id),
  },
  {
    type: 'delay',
    definition: DELAY_DEFINITION,
    factory: (id) => new DelayModule(id),
  },
  {
    type: 'chorus-flanger',
    definition: CHORUS_FLANGER_DEFINITION,
    factory: (id) => new ChorusFlangerModule(id),
  },
  {
    type: 'mixer',
    definition: MIXER_DEFINITION,
    factory: (id) => new MixerModule(id),
  },
  {
    type: 'distortion',
    definition: DISTORTION_DEFINITION,
    factory: (id) => new DistortionModule(id),
  },
  {
    type: 'attenuverter',
    definition: ATTENUVERTER_DEFINITION,
    factory: (id) => new AttenuverterModule(id),
  },
  {
    type: 'multi-fx',
    definition: MULTI_FX_DEFINITION,
    factory: (id) => new MultiFxModule(id),
  },
  {
    type: 'mult',
    definition: MULT_DEFINITION,
    factory: (id) => new MultModule(id),
  },
  {
    type: 'scope',
    definition: SCOPE_DEFINITION,
    factory: (id) => new ScopeModule(id),
    component: ScopeModuleComponent,
  },
] as const;

/**
 * Total number of registered module types
 */
export const MODULE_COUNT = MODULE_DESCRIPTORS.length;

/**
 * Get all module definitions
 */
export function getAllModuleDefinitions(): readonly ModuleDefinition[] {
  return MODULE_DESCRIPTORS.map(desc => desc.definition);
}

/**
 * Get a module descriptor by type
 */
export function getModuleDescriptor(type: string): ModuleDescriptor | undefined {
  return MODULE_DESCRIPTORS.find(desc => desc.type === type);
}

/**
 * Get the UI component for a module type.
 * Returns the custom component if defined, otherwise the generic Module component.
 */
export function getModuleComponent(type: string): Component<ModuleComponentProps> {
  const descriptor = getModuleDescriptor(type);
  return descriptor?.component ?? Module;
}

/**
 * Get the width for a module type.
 * Returns the custom width if defined, otherwise DEFAULT_MODULE_WIDTH.
 */
export function getModuleWidth(type: string): number {
  const descriptor = getModuleDescriptor(type);
  return descriptor?.width ?? DEFAULT_MODULE_WIDTH;
}
