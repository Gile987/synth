# Modular Synth

A browser-based modular synthesizer built with Svelte 5 and the Web Audio API.

## What Is This?

A virtual modular synthesizer where you can:
- Add oscillator, noise, filter, VCA, envelope, LFO, sequencer, and output modules
- Connect modules with virtual cables
- Create rhythmic patterns with the step sequencer
- Shape sounds with ADSR envelopes and filters
- Adjust parameters in real-time
- Move modules around the workspace with grid snapping
- Get help with the built-in synthesis guide

## Tech Stack

- **Svelte 5** - UI framework with runes-based reactivity
- **TypeScript** - Strict type safety
- **Vite** - Build tool and dev server
- **Web Audio API** - Real-time audio synthesis

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 (or the port shown), click "Start Audio", then add modules from the sidebar.

## Current Modules

| Module | Category | Description |
|--------|----------|-------------|
| **Oscillator** | Source | Generates sine, square, sawtooth, triangle waveforms |
| **Noise** | Source | Generates white, pink, and brown noise for percussion and textures |
| **Filter** | Effect | Biquad filter (lowpass, highpass, bandpass, etc.) with modulation input |
| **VCA** | Effect | Voltage Controlled Amplifier for amplitude shaping |
| **LFO** | Modulation | Low frequency oscillator for modulation effects |
| **ADSR** | Modulation | Envelope generator with gate input and auto-trigger |
| **Sequencer** | Modulation | 16-step sequencer with gate/trigger outputs |
| **Output** | Output | Master gain with mute to speakers |

## Project Structure

```
src/
├── main.ts              # Entry point
├── App.svelte           # Root component
└── lib/
    ├── content/         # Educational content (synthesis help guide)
    ├── core/            # Audio engine (registry, patch-engine, base-module)
    ├── modules/         # Synth modules (oscillator, noise, filter, vca, lfo, adsr, sequencer, output)
    ├── components/ui/   # Svelte UI components (Module, PatchBoard, SequencerModule, SynthHelpModal, etc.)
    ├── stores/          # State management
    └── types/           # TypeScript definitions
```

## Notable UX Features

- Built-in synthesis guide modal from the left sidebar help button
- Per-module contextual help via the header help icon
- 20px grid snapping while dragging modules
- Sequencer step playback indicator
- Browser-safe audio initialization gate before the patching UI appears
- Auto-save with visual feedback ("Auto-saving..." and "Saved" indicators in the toolbar)
- Preset browser for saving, loading, and managing patches
- Session restore on app startup from auto-saved state

## Preset System

The synth includes a preset system for saving and loading patches:

- **Save patches** to browser localStorage with custom names
- **Load patches** from the saved presets list
- **Export/Import** patches as JSON files for backup or sharing
- **Auto-save** saves your work to localStorage every 5 seconds (toggle on/off)
- **Clear Session** removes all modules and auto-saved state, returning to the start screen
- **Session restore** reloads your previous patch when you refresh or reopen the app

No default presets are bundled. You create and save your own patches.

## Documentation

- [Getting Started](./GETTING_STARTED.md) - User guide
- [Architecture](./ARCHITECTURE.md) - Technical details

## Browser Requirements

- Modern browser with Web Audio API support
- Chrome, Firefox, Safari, Edge

## License

MIT
