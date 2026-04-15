# Getting Started

## Installation

```bash
npm install
```

## Running the App

```bash
npm run dev
```

The dev server starts on http://localhost:3000 (or the next available port).

## Using the Synth

### 1. Start the Audio Engine

Click the **"Click to Start Audio"** button. Browser security requires a user gesture before audio can play.

### 2. Add Modules

Click any module button in the left sidebar:
- **Oscillator** - Sound source
- **Filter** - Shapes the sound
- **Output** - Sends to speakers

### 3. Connect Modules

1. Click and hold on an **output port** (right side of a module)
2. Drag to an **input port** (left side of another module)
3. Release to connect

Valid connections:
- Oscillator `output` → Filter `input`
- Filter `output` → Output `input`
- Oscillator `output` → Output `input` (direct)
- Oscillator `output` → Filter `cutoff` (frequency modulation)

### 4. Adjust Parameters

Each module shows its parameters:
- **Sliders** - Drag or click to change values
- **Number inputs** - Type exact values
- **Dropdowns** - Select from options
- **Toggles** - Click to enable/disable

### 5. Move Modules

Drag the **module header** (the colored bar at the top) to reposition modules on the board.

### 6. Delete Modules

- Click the **×** button in the module header, OR
- Select the module (click it) and press **Delete** key

### 7. Get Help

Click the **?** icon in any module header to see:
- What the module does
- Usage tips
- Related modules

Press **Escape** to close the help modal.

## Module Details

### Oscillator

Generates continuous audio waveforms.

**Parameters:**
- **Frequency** (20Hz - 20kHz) - Pitch of the sound
- **Detune** (-1200 to +1200 cents) - Fine pitch adjustment (100 cents = 1 semitone)
- **Waveform** (sine, square, sawtooth, triangle) - Timbre of the sound

**Ports:**
- **Output** (audio) - The generated sound
- **Frequency** (control input) - Modulate pitch from another source

### Filter

Shapes timbre by filtering frequencies.

**Parameters:**
- **Cutoff** (20Hz - 20kHz) - Frequency where filtering begins
- **Resonance** (0.1 - 20) - Emphasis at the cutoff frequency
- **Gain** (-40 to +40 dB) - Boost/cut for certain filter types
- **Type** (lowpass, highpass, bandpass, notch, allpass, peaking, lowshelf, highshelf)

**Ports:**
- **Input** (audio) - Sound to filter
- **Output** (audio) - Filtered sound
- **Cutoff** (control input) - Modulate cutoff frequency

### Output

Sends audio to your speakers.

**Parameters:**
- **Gain** (0 - 1) - Master volume level
- **Mute** (toggle) - Silence without changing gain

**Ports:**
- **Input** (audio) - Sound to output

## Keyboard Shortcuts

- **Delete** - Remove selected module
- **Escape** - Deselect module / Close help modal

## Troubleshooting

### No Sound

1. Did you click "Start Audio"?
2. Is an Output module connected?
3. Check Output module's Gain (not at 0) and Mute (should be off)
4. Check your computer's volume

### Can't Connect Ports

- You can only drag from **outputs** (right side) to **inputs** (left side)
- You cannot connect a module to itself
- Audio ports connect to audio ports, control to control

### Modules Won't Move

Make sure you're dragging the **header** (colored top bar), not the body or ports.

## Building for Production

```bash
npm run build
```

Output goes to `dist/` folder.
