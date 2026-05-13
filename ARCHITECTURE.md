# Architecture

## Overview

A modular synthesizer built with a clear separation between the **UI layer** (Svelte) and the **audio engine** (Web Audio API). State flows one-way: UI → Stores → SynthService → PatchEngine → AudioNodes.

Module registration, UI routing, and width metadata are all driven by a centralized descriptor list. The `PatchBoard` resolves which component to render for each module type at runtime via `getModuleComponent()`, so there are no hard-coded if/else chains for routing.

## Core Concepts

### Module System

Every audio module follows this lifecycle:

```
Created → Initialized → Running → Disposed
```

- **Created**: Module instance exists but has no audio nodes
- **Initialized**: `initialize(context)` called, audio nodes created via `createNodes()`
- **Running**: Audio processing active
- **Disposed**: `dispose()` called, nodes disconnected and destroyed

### Audio Graph

The Web Audio API manages a directed graph of audio nodes:

```
OscillatorNode/BufferSourceNode → BiquadFilterNode → GainNode → destination
     ↑                    ↑
   (modulation)      (modulation)
     ↑                    ↑
AudioParam(frequency)  AudioParam(frequency)
```

Ports can connect:
- **AudioNode → AudioNode** (audio signal flow)
- **AudioNode → AudioParam** (control voltage/modulation)

## Project Structure

```
src/
├── main.ts              # Bootstrap: mounts App to DOM
├── App.svelte           # Root: audio init gate, autosave, session restore
└── lib/
    ├── content/         # Educational content
    │   └── synth-help.ts    # Synthesis guide content
    │
    ├── core/            # Audio engine (no UI)
    │   ├── registry.ts      # ModuleRegistry singleton
    │   ├── patch-engine.ts  # PatchEngine class
    │   ├── base-module.ts   # BaseModule abstract class
    │   ├── module.ts        # SynthModule interface
    │   ├── port.ts          # Port creation helpers
    │   └── constants.ts     # Audio constants
    │
    ├── modules/         # Concrete module implementations (17 total)
    │   ├── oscillator.ts    # OscillatorModule - sound source with multiple waveforms
    │   ├── noise.ts        # NoiseModule - white, pink, brown noise generator
    │   ├── filter.ts       # FilterModule - frequency shaping with modulation
    │   ├── vca.ts          # VCAModule - amplitude control
    │   ├── reverb.ts       # ReverbModule - convolution reverb
    │   ├── delay.ts        # DelayModule - echo effect
    │   ├── chorus-flanger.ts # ChorusFlangerModule - modulated delay for chorus and flanger tones
    │   ├── distortion.ts   # DistortionModule - wave shaping distortion
    │   ├── multi-fx.ts     # MultiFxModule - ring mod, bit crush, wave folder, tremolo
    │   ├── lfo.ts          # LFOModule - low frequency modulation
    │   ├── adsr.ts         # ADSRModule - envelope generator with AudioWorklet gate detection
    │   ├── adsr-gate-monitor.worklet.js # AudioWorklet processor for ADSR gate threshold detection
    │   ├── sequencer.ts    # SequencerModule - step sequencer with scheduler
    │   ├── attenuverter.ts # AttenuverterModule - signal attenuator/inverter
    │   ├── mixer.ts        # MixerModule - 4-channel audio mixer
    │   ├── mult.ts         # MultModule - signal splitter (1 input → 4 outputs)
    │   ├── scope.ts        # ScopeModule - AnalyserNode-based oscilloscope
    │   └── output.ts       # OutputModule - master output
    │
    ├── components/ui/   # Svelte UI components
    │   ├── PatchBoard.svelte      # Main canvas with grid snapping and auto-expansion
    │   ├── Module.svelte          # Standard module UI (generic controls)
    │   ├── ModuleFrame.svelte     # Shared content wrapper (header, ports, controls layout)
    │   ├── ModuleShell.svelte     # Shared module chrome (drag, select, delete, port rendering)
    │   ├── Port.svelte            # Shared port primitive (input/output jacks with LED indicators)
    │   ├── SequencerModule.svelte # Custom sequencer UI with step grid
    │   ├── ScopeModule.svelte     # Custom scope UI with canvas waveform display
    │   ├── ModulePalette.svelte   # Add modules sidebar with categories and search
    │   ├── CableLayer.svelte      # SVG cable overlay with repatching support
    │   ├── HelpModal.svelte       # Module help overlay
    │   ├── HelpIcon.svelte        # Help trigger button
    │   ├── SynthHelpModal.svelte  # Synthesis guide modal
    │   ├── PresetBrowser.svelte   # Save/load/export presets
    │   └── AutosaveStatus.svelte  # Auto-save toggle and status display
    │
    ├── stores/          # State management
    │   ├── patch.ts      # Svelte stores (modules, connections, drag/cable state)
    │   ├── service.ts    # SynthService bridge (validation, patch loading, audio lifecycle)
    │   ├── module-registry.ts # Declarative module descriptors and UI routing helpers
    │   ├── presets.ts    # PresetManager (save/load/clear, version validation, autosave)
    │   └── index.ts
    │
    └── types/           # TypeScript definitions
        └── index.ts
```

## Key Classes

### PatchEngine

Central audio manager at `/src/lib/core/patch-engine.ts`.

**Responsibilities:**
- AudioContext lifecycle
- Module instance management
- Connection management (including AudioParam reset on disconnect)
- Parameter updates

```typescript
class PatchEngine {
  private context: AudioContext
  private modules: Map<string, ModuleInstance>
  private moduleInstances: Map<string, SynthModule>
  private connections: Map<string, Connection>

  addModule(type, id, position): ModuleState
  connect(sourceId, sourcePort, targetId, targetPort): Connection
  disconnect(connectionId): void   // resets AudioParams to stored values
  updateModulePosition(id, position): void
  setModuleParam(moduleId, paramName, value): void
  dispose(): void                  // closes AudioContext
}
```

### BaseModule

Abstract base at `/src/lib/core/base-module.ts`.

**Lifecycle:**

```typescript
abstract class BaseModule {
  protected abstract createNodes(): void    // subclass implements
  protected abstract destroyNodes(): void   // subclass implements

  initialize(context): void {
    this.context = context
    this.createNodes()  // subclass creates AudioNodes here
  }

  dispose(): void {
    this.destroyNodes() // subclass disconnects AudioNodes here
  }

  // Helpers for safe cleanup
  protected safeDisconnect(node): void
  protected safeStopOscillator(node): void
}
```

### ModuleRegistry

Singleton at `/src/lib/core/registry.ts`. Persists for the app lifetime; there is no `clear()` method.

Maps module types to factory functions:

```typescript
class ModuleRegistry {
  register(definition, factory): void  // throws on duplicate
  create(type, id): SynthModule
  getDefinition(type): ModuleDefinition | undefined
  getAllDefinitions(): ModuleDefinition[]
}
```

### SynthService

Orchestrator at `/src/lib/stores/service.ts`. Bridges the UI layer to the engine.

```typescript
class SynthService {
  registerModules(): void            // once at startup, from MODULE_DESCRIPTORS
  initializeAudio(): Promise<void>   // creates AudioContext, loads autosave
  addModule(type, position): ModuleInstance
  loadPatch(state): Promise<void>    // validates before clearing current state
  dispose(): void                    // clears engine + stores; keeps registry
}
```

Key behavior of `dispose()`: resets `audioInitialized` to false and clears the engine, module store, and connection store. Does **not** reset `modulesRegistered`, because the singleton `ModuleRegistry` retains all type registrations and has no clear method. This means `startAudio()` can be called again after a clear session without re-registering.

### ModuleDescriptor and UI Routing

Module metadata is centralized in `/src/lib/stores/module-registry.ts`.

```typescript
interface ModuleDescriptor {
  type: string
  definition: ModuleDefinition
  factory: (id: string) => SynthModule
  component?: Component<ModuleComponentProps>  // custom UI, defaults to Module.svelte
  width?: number                               // custom width, defaults to 220px
}

const MODULE_DESCRIPTORS: readonly ModuleDescriptor[] = [ /* all 17 modules */ ]

// Routing helpers used by PatchBoard
getModuleComponent(type): Component   // descriptor.component ?? Module
getModuleWidth(type): number          // descriptor.width ?? 220
```

`PatchBoard.svelte` resolves the component at render time:

```svelte
{@const ModuleComponent = getModuleComponent(module.type)}
<ModuleComponent ...props />
```

This eliminates hard-coded if/else chains. To add a custom UI, set `component` and optionally `width` on the descriptor. No changes to `PatchBoard` are needed.

## Shared UI Primitives

Module UI rendering uses a layered component structure:

- **ModuleShell.svelte**: Outermost chrome. Handles drag, selection, delete button, and renders input/output ports using the shared `Port.svelte` primitive. Also renders the help icon.
- **ModuleFrame.svelte**: Content wrapper used inside ModuleShell. Provides the header and layout for controls, accepting children via Svelte snippets.
- **Port.svelte**: Shared port jack with LED connection indicator. Supports `warm` and `cool` color variants.
- **Module.svelte**: The default module UI. Uses ModuleFrame to render generic slider/select/toggle controls from the module definition.
- **SequencerModule.svelte** / **ScopeModule.svelte**: Custom UIs that also use ModuleFrame for consistent chrome.

All three module UI components (Module, SequencerModule, ScopeModule) share the same ModuleShell/ModuleFrame/Port rendering path.

## State Flow

### Adding a Module

```
User clicks button in ModulePalette
    ↓
handleAddModule(def)
    ↓
synthService.addModule(type, position)
    ↓
engine.addModule(type, id, position)
    ↓
module.initialize(context)  // creates AudioNodes
    ↓
modules.add(moduleState)   // updates store (triggers autosave)
    ↓
Svelte reactivity → PatchBoard resolves getModuleComponent(type) → renders UI
```

### Connecting Ports

```
User mousedown on output port
    ↓
handlePortMouseDown() → cableState = {sourceModuleId, sourcePortName, ...}
    ↓
Mouse move → CableLayer renders temp cable
    ↓
User mouseup on input port
    ↓
handlePortMouseUp() → synthService.connect(sourceId, sourcePort, targetId, targetPort)
    ↓
engine.connect() → sourcePort.node.connect(targetPort.node)
    ↓
connections.add(connection)  // updates store (triggers autosave)
    ↓
CableLayer re-renders with permanent cable
```

### Moving a Module

```
User mousedown on module header
    ↓
handleModuleDragStart() → dragState = {moduleId, offsetX, offsetY}
    ↓
Mouse move on PatchBoard
    ↓
handleMouseMove() → calculate new position → snap to 20px grid
    ↓
synthService.updateModulePosition(id, position)
    ↓
engine.updateModulePosition() + modules.updatePosition()
    ↓
Svelte reactivity → Module position updates
```

## Stores

All reactive stores in `/src/lib/stores/patch.ts`:

| Store | Type | Purpose |
|-------|------|---------|
| `modules` | `Writable<Map<string, ModuleInstance>>` | All module instances |
| `connections` | `Writable<Map<string, Connection>>` | All cable connections |
| `selectedModuleId` | `Writable<string \| null>` | Currently selected module |
| `selectedConnectionId` | `Writable<string \| null>` | Currently selected connection |
| `dragState` | `Writable<DragState \| null>` | Module being dragged |
| `cableState` | `Writable<CableState \| null>` | Cable being drawn |
| `moduleDefinitions` | `Writable<readonly ModuleDefinition[]>` | Available module types |
| `helpModal` | `Writable<HelpModalState>` | Help overlay state |

Store mutations (updatePosition, updateParam) create new Map instances to preserve Svelte reactivity contracts.

## Persistence and Session Behavior

### Autosave

App.svelte owns autosave triggering. It subscribes to the `modules` and `connections` stores with a 5-second debounce timer. When the timer fires, it calls `presetManager.saveToLocalStorage('autosave')`.

Param-only edits trigger autosave because `synthService.setModuleParam()` calls `modules.updateParam()`, which emits a store update.

### Session Restore

On `startAudio()`, the app checks for an existing autosave. If one exists with modules, and the user didn't explicitly clear the session, the patch is loaded via `synthService.loadPatch()`. A "Session restored" toast appears for 3 seconds.

### Clear Session

`handleClearSession()` in App.svelte:
1. Stops autosave subscriptions
2. Calls `presetManager.clearSession()` (removes autosave from localStorage)
3. Calls `synthService.dispose()` (clears audio engine, module/connection stores; keeps ModuleRegistry)
4. Resets `audioStarted = false`, returning the UI to the start screen

The user can click "Start Audio" again. Since the registry is intact, no re-registration is needed; a fresh AudioContext is created and the patch starts from a clean state.

### Patch Validation

`synthService.loadPatch()` runs semantic validation **before** clearing the current state. It checks:

- Module types exist in the registry
- Param names and value types match the module definition
- Connection source/target module IDs exist
- Connection port names and directions are valid

If validation fails, the current patch is preserved and an error is thrown.

`presetManager.validatePatchState()` also checks structural validity (arrays, required fields, version compatibility against `SUPPORTED_VERSIONS`).

### Version Checking

Patches include a `version` field. `PresetManager` maintains a `SUPPORTED_VERSIONS` array and rejects patches with incompatible versions. A migration registry for schema evolution is not yet implemented; it will be built when a schema change actually lands.

## Current Module Set

- **Source (2)**: Oscillator, Noise
- **Effect (7)**: Filter, VCA, Reverb, Delay, Chorus/Flanger, Distortion, Multi-FX
- **Modulation (4)**: LFO, ADSR, Sequencer, Attenuverter
- **Utility (3)**: Mixer, Mult, Scope
- **Output (1)**: Output

## Module Definition

Each module has a definition object:

```typescript
interface ModuleDefinition {
  type: string              // unique identifier
  label: string            // display name
  category: 'source' | 'effect' | 'modulation' | 'utility' | 'output'
  version: string          // module definition version
  ports: PortDefinition[]
  params: ParamDefinition[]
  help: HelpContent
}

interface PortDefinition {
  name: string
  type: 'audio' | 'control' | 'gate' | 'trigger'
  direction: 'input' | 'output'
}

interface ParamDefinition {
  name: string
  label: string
  controlType: 'slider' | 'knob' | 'select' | 'toggle' | 'number'
  min?: number
  max?: number
  step?: number
  defaultValue: ParamValue
  options?: string[]  // for select type
  scale?: 'linear' | 'log'  // logarithmic scaling for frequency params
}
```

## Adding a New Module

1. **Create module file** at `/src/lib/modules/your-module.ts`:

```typescript
import { BaseModule } from '$core/base-module'
import type { ModuleDefinition, ParamValue } from '$types'

export const YOUR_MODULE_DEFINITION: ModuleDefinition = {
  type: 'yourmodule',
  label: 'Your Module',
  category: 'effect',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'output', type: 'audio', direction: 'output' },
  ],
  params: [
    {
      name: 'amount',
      label: 'Amount',
      controlType: 'slider',
      min: 0,
      max: 100,
      defaultValue: 50,
    },
  ],
  help: {
    title: 'Your Module',
    description: 'What it does',
    usage: 'How to use it',
    tips: ['Tip 1', 'Tip 2'],
  },
}

export class YourModule extends BaseModule {
  private yourNode: YourAudioNode | undefined

  constructor(id: string) {
    super(id, YOUR_MODULE_DEFINITION)
  }

  protected createNodes(): void {
    this.yourNode = this.context.createYourNode()

    this.registerPort({
      name: 'input',
      type: 'audio',
      direction: 'input',
      node: this.yourNode,
    })

    this.registerPort({
      name: 'output',
      type: 'audio',
      direction: 'output',
      node: this.yourNode,
    })
  }

  protected destroyNodes(): void {
    this.safeDisconnect(this.yourNode)
    this.yourNode = undefined
  }

  override setParam(name: string, value: ParamValue): void {
    super.setParam(name, value)
    if (!this.yourNode) return

    if (name === 'amount' && typeof value === 'number') {
      this.yourNode.amount.value = value
    }
  }
}
```

2. **Add a descriptor** in `/src/lib/stores/module-registry.ts`:

```typescript
import { YourModule, YOUR_MODULE_DEFINITION } from '$modules/your-module'

// Add to MODULE_DESCRIPTORS array:
{
  type: 'yourmodule',
  definition: YOUR_MODULE_DEFINITION,
  factory: (id) => new YourModule(id),
},
```

The module automatically appears in the ModulePalette sidebar.

For a custom UI, set `component` and `width` on the descriptor:

```typescript
{
  type: 'yourmodule',
  definition: YOUR_MODULE_DEFINITION,
  factory: (id) => new YourModule(id),
  component: YourModuleComponent,
  width: 300,
}
```

No changes to `PatchBoard.svelte` are needed. The routing is handled by `getModuleComponent()`.

## Audio Implementation Notes

### Scope (AnalyserNode)

The Scope module uses `AnalyserNode` with `requestAnimationFrame` for waveform visualization. It exposes `onDataUpdate(callback)` and `offDataUpdate()` for the UI component to subscribe to waveform data, with proper cleanup in `onDestroy`.

### ADSR (AudioWorklet)

The ADSR module monitors gate input using an `AudioWorkletNode` that loads from a separate file (`adsr-gate-monitor.worklet.js`). The worklet file is loaded via Vite's `?url` import suffix, which ensures it is emitted as a separate asset.

If the AudioWorklet API is unavailable, the module falls back to `AnalyserNode` polling for gate threshold detection.

### Sequencer

Step patterns are stored as a bitfield parameter, so they persist through save/load and autosave roundtrips.

## Web Audio API Notes

- **AudioContext** must be created/resumed after user gesture
- **OscillatorNode** must call `.start()` after creation
- **AudioParams** (like frequency) can be scheduled or connected to other nodes
- Always call `.disconnect()` before dropping references to prevent memory leaks
- When disconnecting from an AudioParam, the param value must be explicitly reset to its stored default

## Build Configuration

**Vite aliases** (from `vite.config.ts`):

```typescript
'$lib': 'src/lib'
'$core': 'src/lib/core'
'$modules': 'src/lib/modules'
'$components': 'src/lib/components'
'$stores': 'src/lib/stores'
'$types': 'src/lib/types'
'$content': 'src/lib/content'
```

TypeScript path mapping matches these aliases.

## Developer Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run `svelte-check` (type errors) |
| `npm run quality` | `npm run check && npm run build` |
| `npm run typecheck` | `svelte-check` with `--fail-on-warnings` |
