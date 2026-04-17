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

Click **Click to Start Audio**. Browser security requires a user gesture before audio can play.

### 2. Add Modules

Click any module button in the left sidebar:
- **Oscillator** - Sound source
- **Filter** - Shapes the sound
- **VCA** - Controls amplitude/loudness
- **LFO** - Low frequency modulation
- **ADSR** - Envelope generator for shaping dynamics
- **Sequencer** - Creates rhythmic patterns
- **Output** - Sends to speakers

**Get Help:** Click the **❓ How does this work?** button at the bottom of the sidebar for a comprehensive synthesis guide.

### 3. Connect Modules

1. Click and hold on an **output port** (right side of a module)
2. Drag to an **input port** (left side of another module)
3. Release to connect

Valid connections:
- Oscillator `output` → Filter `input`
- Filter `output` → VCA `input`
- VCA `output` → Output `input`
- Oscillator `output` → Output `input` (direct)
- LFO `output` → Filter `cutoff` (auto-wah effect)
- LFO `output` → Oscillator `frequency` (vibrato)
- ADSR `output` → VCA `cv` (shaped amplitude)
- ADSR `output` → Filter `cutoff` (envelope filter)
- Sequencer `gate` → ADSR `gate` (rhythmic triggering)
- Sequencer `gate` → Oscillator `frequency` (pitch sequences)

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
- **Gain** (-40 to +40 dB) - Boost/cut (only works with peaking, lowshelf, highshelf types!)
- **Type** (lowpass, highpass, bandpass, notch, allpass, peaking, lowshelf, highshelf)

**Ports:**
- **Input** (audio) - Sound to filter
- **Output** (audio) - Filtered sound
- **Cutoff** (control input) - Modulate cutoff frequency

### VCA

Voltage Controlled Amplifier - controls the loudness of audio signals.

**Parameters:**
- **Level** (0 - 1) - Base volume level

**Ports:**
- **Input** (audio) - Sound to control
- **Output** (audio) - Controlled sound
- **CV** (control input) - Modulation input for dynamic volume changes

**Usage:** Place between your sound source and output. Essential for using ADSR envelopes to shape amplitude. Connect ADSR `output` to VCA `cv` for shaped volume envelopes.

### LFO

Low Frequency Oscillator for modulation effects.

**Parameters:**
- **Rate** (0.1 - 20 Hz) - Speed of the modulation
- **Depth** (0 - 5000) - How far the parameter moves (in Hz for frequency params)
- **Waveform** (sine, square, sawtooth, triangle) - Shape of the modulation

**Ports:**
- **Output** (control) - Modulation signal to control other parameters
- **Rate** (control input) - Modulate the LFO speed from another source
- **Amplitude** (control input) - Modulate the modulation depth

**Usage:** Connect the LFO output to a control input (blue square port) on another module:
- LFO → Filter cutoff for auto-wah effects
- LFO → Oscillator frequency for vibrato
- LFO → Output gain for tremolo

### ADSR

Attack-Decay-Sustain-Release envelope generator shapes sound over time.

**Parameters:**
- **Attack** (0 - 5 sec) - Time to reach full volume
- **Decay** (0 - 5 sec) - Time to fall from peak to sustain level
- **Sustain** (0 - 1) - Level held while note is active
- **Release** (0 - 10 sec) - Time to fade to silence after note ends
- **Depth** (0 - 5000) - How far the target parameter moves (2000-3000 for filters, 10-100 for pitch)

**Ports:**
- **Gate** (gate input) - Triggers the envelope (can be connected from sequencer)
- **Output** (control) - Envelope signal (0-1 range)

**Usage:** The envelope auto-triggers in a continuous loop (attack → decay → sustain → release). For rhythmic patterns, connect a Sequencer `gate` to ADSR `gate`. Connect ADSR output to:
- VCA `cv` for shaped amplitude (most common)
- Filter `cutoff` for envelope filter effects (like wah-wah)
- Oscillator `frequency` for pitch sweeps

**Presets:**
- Percussive pluck: Attack 0.01, Decay 0.2, Sustain 0, Release 0.3
- Pad swell: Attack 0.5, Decay 0.5, Sustain 0.8, Release 2.0
- Punchy bass: Attack 0.01, Decay 0.1, Sustain 0.6, Release 0.2

### Sequencer

16-step sequencer that creates rhythmic gate patterns.

**Parameters:**
- **Steps** (8 or 16) - Number of steps in the sequence
- **Rate** (0.5 - 20 Hz) - Speed of the sequence (steps per second)
- **Playing** (toggle) - Start/stop the sequencer

**Ports:**
- **Gate** (gate output) - Sends gate signals on active steps
- **Trigger** (trigger output) - Short pulses for one-shot events
- **Rate** (control input) - Modulate sequencer speed
- **Reset** (gate input) - Restart sequence from step 1

**Usage:** Toggle steps ON/OFF to create patterns. Connect `gate` to ADSR `gate` for rhythmic envelope triggering. Classic patterns:
- 4-on-the-floor: Steps 1, 5, 9, 13
- Off-beats: Steps 3, 7, 11, 15

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
