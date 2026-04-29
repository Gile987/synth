# Architecture

## Overview

This is a modular synthesizer built with a clear separation between the **UI layer** (Svelte) and the **audio engine** (Web Audio API). State flows one-way: UI → Stores → SynthService → PatchEngine → AudioNodes.

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
├── App.svelte           # Root: handles audio initialization gate
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
    ├── modules/         # Concrete module implementations (15 total)
    │   ├── oscillator.ts    # OscillatorModule - sound source with multiple waveforms
    │   ├── noise.ts        # NoiseModule - white, pink, brown noise generator
    │   ├── filter.ts       # FilterModule - frequency shaping with modulation
    │   ├── vca.ts          # VCAModule - amplitude control
    │   ├── reverb.ts       # ReverbModule - convolution reverb
    │   ├── delay.ts        # DelayModule - echo effect
    │   ├── distortion.ts   # DistortionModule - wave shaping distortion
    │   ├── multi-fx.ts     # MultiFxModule - ring mod, bit crush, wave folder, tremolo
    │   ├── lfo.ts          # LFOModule - low frequency modulation
    │   ├── adsr.ts         # ADSRModule - envelope generator with gate detection
    │   ├── sequencer.ts    # SequencerModule - step sequencer with scheduler
    │   ├── attenuverter.ts # AttenuverterModule - signal attenuator/inverter
    │   ├── mixer.ts        # MixerModule - 4-channel audio mixer
    │   ├── mult.ts         # MultModule - signal splitter (1 input → 4 outputs)
    │   └── output.ts       # OutputModule - master output
    │
    ├── components/ui/   # Svelte UI components
    │   ├── PatchBoard.svelte      # Main canvas with grid snapping and auto-expansion
    │   ├── Module.svelte          # Standard module UI
    │   ├── SequencerModule.svelte # Custom sequencer UI with step grid
    │   ├── ModulePalette.svelte   # Add modules sidebar with categories and search
    │   ├── CableLayer.svelte      # SVG cable overlay with repatching support
    │   ├── HelpModal.svelte       # Module help overlay
    │   ├── HelpIcon.svelte        # Help trigger button
    │   ├── SynthHelpModal.svelte  # Synthesis guide modal
    │   ├── PresetBrowser.svelte   # Save/load/export presets
    │   └── AutosaveStatus.svelte  # Auto-save toggle and status display
    │
    ├── stores/          # State management
    │   ├── patch.ts      # Svelte stores
    │   ├── service.ts    # SynthService bridge
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
- Connection management
- Parameter updates

```typescript
class PatchEngine {
  private context: AudioContext
  private modules: Map<string, BaseModule>
  private connections: Map<string, Connection>
  
  addModule(type, id, position): ModuleState
  connect(sourceId, sourcePort, targetId, targetPort): Connection
  updateModulePosition(id, position): void
  setModuleParam(moduleId, paramName, value): void
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
}
```

### ModuleRegistry

Singleton at `/src/lib/core/registry.ts`.

Maps module types to factory functions:

```typescript
class ModuleRegistry {
  register(definition, factory): void
  create(type, id): BaseModule
  getDefinition(type): ModuleDefinition
}
```

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
modules.add(moduleState)   // updates store
    ↓
Svelte reactivity re-renders → Module.svelte appears
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
connections.add(connection)  // updates store
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
Svelte reactivity → Module.svelte position updates
```

## Stores

All stores in `/src/lib/stores/patch.ts`:

| Store | Type | Purpose |
|-------|------|---------|
| `modules` | `Writable<Map<string, ModuleInstance>>` | All module instances |
| `connections` | `Writable<Map<string, Connection>>` | All cable connections |
| `selectedModuleId` | `Writable<string \| null>` | Currently selected module |
| `dragState` | `Writable<DragState \| null>` | Module being dragged |
| `cableState` | `Writable<CableState \| null>` | Cable being drawn |
| `moduleDefinitions` | `Writable<readonly ModuleDefinition[]>` | Available module types |
| `helpModal` | `Writable<HelpModalState>` | Help overlay state |

## Current Module Set

- **Source (2)**: Oscillator, Noise
- **Effect (6)**: Filter, VCA, Reverb, Delay, Distortion, Multi-FX
- **Modulation (4)**: LFO, ADSR, Sequencer, Attenuverter
- **Utility (2)**: Mixer, Mult
- **Output (1)**: Output

## Module Definition

Each module has a definition object:

```typescript
interface ModuleDefinition {
  type: string              // unique identifier
  label: string            // display name
  category: 'source' | 'effect' | 'modulation' | 'utility' | 'output'
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
    
    // Register ports
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
    if (this.yourNode) {
      this.yourNode.disconnect()
      this.yourNode = undefined
    }
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

2. **Register in service** at `/src/lib/stores/service.ts`:

```typescript
import { YourModule, YOUR_MODULE_DEFINITION } from '$modules/your-module'

// In registerModules():
this.registry.register(YOUR_MODULE_DEFINITION, (id) => new YourModule(id))
```

The module will automatically appear in the ModulePalette sidebar.

## Web Audio API Notes

- **AudioContext** must be created/resumed after user gesture
- **OscillatorNode** must call `.start()` after creation
- **AudioParams** (like frequency) can be scheduled or connected to other nodes
- Always call `.disconnect()` before dropping references to prevent memory leaks

## Build Configuration

**Vite aliases** (from `vite.config.ts`):

```typescript
'$lib': 'src/lib'
'$core': 'src/lib/core'
'$modules': 'src/lib/modules'
'$components': 'src/lib/components'
'$stores': 'src/lib/stores'
'$types': 'src/lib/types'
```

TypeScript path mapping matches these aliases.
