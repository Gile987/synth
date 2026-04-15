# Modular Synth

A browser-based modular synthesizer built with Svelte 5 and the Web Audio API.

## What Is This?

A virtual modular synthesizer where you can:
- Add oscillator, filter, and output modules
- Connect modules with virtual cables
- Adjust parameters in real-time
- Move modules around the workspace

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
| **Filter** | Effect | Biquad filter (lowpass, highpass, bandpass, etc.) |
| **LFO** | Modulation | Low frequency oscillator for modulation effects |
| **Output** | Output | Master gain with mute to speakers |

## Project Structure

```
src/
├── main.ts              # Entry point
├── App.svelte           # Root component
└── lib/
    ├── core/            # Audio engine (registry, patch-engine, base-module)
    ├── modules/         # Synth modules (oscillator, filter, output)
    ├── components/ui/   # Svelte UI components
    ├── stores/          # State management
    └── types/           # TypeScript definitions
```

## Documentation

- [Getting Started](./GETTING_STARTED.md) - User guide
- [Architecture](./ARCHITECTURE.md) - Technical details

## Browser Requirements

- Modern browser with Web Audio API support
- Chrome, Firefox, Safari, Edge

## License

MIT
