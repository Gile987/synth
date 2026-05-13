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

**Sources:**
- **Oscillator** - Sound source with multiple waveforms
- **Noise** - White, pink, or brown noise for percussion and textures

**Effects:**
- **Filter** - Shapes the sound with various filter types
- **VCA** - Controls amplitude/loudness
- **Reverb** - Convolution reverb with programmable impulse responses
- **Delay** - Echo effect with time, feedback, and mix controls
- **Chorus/Flanger** - Modulated delay for wide chorus thickening and jet-like flanger sweeps
- **Distortion** - Wave shaping distortion with drive and mix
- **Multi-FX** - Ring modulator, bit crusher, wave folder, and tremolo

**Modulation:**
- **LFO** - Low frequency oscillator for modulation effects
- **ADSR** - Envelope generator for shaping dynamics
- **Sequencer** - 16-step sequencer for rhythmic patterns
- **Attenuverter** - Signal attenuator and inverter for modulation depth

**Utilities:**
- **Mixer** - 4-channel audio mixer with individual levels and master
- **Mult** - Signal splitter (duplicates one input to four outputs)
- **Scope** - Real-time oscilloscope for visualizing waveforms

**Output:**
- **Output** - Master gain and mute to speakers

**Get Help:** Click the **❓ How does this work?** button at the bottom of the sidebar for a comprehensive synthesis guide.

### 3. Connect Modules

1. Click and hold on an **output port** (right side of a module)
2. Drag to an **input port** (left side of another module)
3. Release to connect

Valid connections:
- Oscillator `output` → Filter `input`
- Noise `output` → Filter `input`
- Filter `output` → VCA `input`
- VCA `output` → Output `input`
- Oscillator `output` → Output `input` (direct)
- LFO `output` → Filter `cutoff` (auto-wah effect)
- LFO `output` → Oscillator `frequency` (vibrato)
- ADSR `output` → VCA `cv` (shaped amplitude)
- ADSR `output` → Filter `cutoff` (envelope filter)
- Sequencer `gate` → ADSR `gate` (rhythmic triggering)
- Oscillator `output` → Scope `input` (visualize the waveform)

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

**Typical uses:**
- Oscillator/Noise → Filter → VCA → Output
- ADSR/LFO → Filter `cutoff` for timbral motion

### Noise

Generates noise for percussion, textures, and sound design.

**Parameters:**
- **Type** (`white`, `pink`, `brown`) - Character of the noise source
- **Level** (0 - 1) - Output level

**Ports:**
- **Output** (audio) - The generated noise signal
- **Level** (control input) - Modulate output volume from another source

**Usage:**
- White noise + highpass filter + short ADSR = hi-hat
- White noise + bandpass filter + short ADSR = snare-like burst
- Brown noise + lowpass filter = deep rumble / wind-like texture

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
- Noise `level` for pulsing or swelling noise textures
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

**Visual feedback:** The yellow step highlight shows the step currently being played.

### Reverb

Convolution reverb with programmable impulse responses for adding space and depth.

**Parameters:**
- **Type** (hall, room, plate, spring, cathedral) - Reverb algorithm
- **Decay** (0.1 - 10 sec) - How long the reverb tail lasts
- **Mix** (0 - 1) - Balance between dry and wet signal

**Ports:**
- **Input** (audio) - Sound to add reverb to
- **Output** (audio) - Reverberated sound

**Usage:** Place at the end of your signal chain before Output for ambient space effects.

### Delay

Echo effect with adjustable time, feedback, and mix.

**Parameters:**
- **Time** (0.01 - 2 sec) - Delay time between echoes
- **Feedback** (0 - 0.95) - How much of the delayed signal feeds back (higher = more echoes)
- **Mix** (0 - 1) - Balance between dry and wet signal

**Ports:**
- **Input** (audio) - Sound to delay
- **Output** (audio) - Delayed sound with echoes

**Usage:** Create rhythmic echoes, slapback effects, or ambient washes.

### Chorus/Flanger

Modulated delay effect for thick chorus sounds and jet-like flanger sweeps.

**Parameters:**
- **Rate** (0.1 - 20 Hz) - Speed of the modulation
- **Depth** (0 - 1) - How far the delayed signal is modulated
- **Delay** (0 - 20 ms) - Base delay time (short for flanger, longer for chorus)
- **Feedback** (0 - 0.95) - How much of the modulated signal feeds back
- **Mix** (0 - 1) - Balance between dry and wet signal

**Ports:**
- **Input** (audio) - Sound to process
- **Output** (audio) - Processed sound

**Usage:** For chorus, use longer delay times with low feedback for a wide, thickening effect. For flanger, use very short delay times with higher feedback for sweeping jet-plane tones.

### Distortion

Wave shaping distortion for adding grit and harmonics.

**Parameters:**
- **Drive** (0 - 1) - Amount of distortion
- **Mix** (0 - 1) - Balance between clean and distorted signal

**Ports:**
- **Input** (audio) - Sound to distort
- **Output** (audio) - Distorted sound

**Usage:** Add warmth, aggression, or fuzz to any sound source.

### Multi-FX

Four different effects in one module: ring modulator, bit crusher, wave folder, and tremolo.

**Parameters:**
- **Effect** (ring mod, bit crush, wave folder, tremolo) - Select which effect to use
- **Amount** (0 - 1) - Effect intensity
- **Rate** (0.1 - 20 Hz) - Speed for tremolo effect
- **Mix** (0 - 1) - Balance between dry and wet signal

**Ports:**
- **Input** (audio) - Sound to process
- **Output** (audio) - Processed sound

**Usage:** Experimental sound mangling and texture creation.

### Attenuverter

Attenuates (reduces) and/or inverts modulation signals. Essential for controlling modulation depth and polarity.

**Parameters:**
- **Amount** (-1 to +1) - Signal scaling factor
  - +1.0: Full signal passes through unchanged
  - +0.5: Signal reduced by half
  - 0.0: No signal (silence)
  - -0.5: Signal reduced and inverted
  - -1.0: Full inverted signal

**Ports:**
- **Input** (audio/control) - Signal to attenuate/invert
- **Output** (audio/control) - Scaled signal

**Usage:** Place between a modulation source (LFO, envelope) and destination to control how much effect the modulation has. Use negative values to invert the modulation direction.

### Mixer

4-channel audio mixer with individual level controls and master output.

**Parameters:**
- **Level 1-4** (0 - 1) - Individual channel volumes
- **Master** (0 - 1) - Overall output volume

**Ports:**
- **Input 1-4** (audio) - Up to four sound sources
- **Output** (audio) - Mixed output

**Usage:** Combine multiple oscillators for thick sounds, blend different effects, or create sub-mixes before the Output module.

### Mult

Signal splitter - duplicates one input to four identical outputs.

**Parameters:** None

**Ports:**
- **Input** (audio/control) - Signal to split
- **Out 1-4** (audio/control) - Four identical copies of the input

**Usage:** Send one LFO to multiple destinations simultaneously, or split an oscillator to multiple effects. All outputs carry the exact same signal with no degradation.

### Scope

Real-time oscilloscope for visualizing audio and modulation signals.

**Parameters:**
- **Time Scale** (0.1 - 5) - Zoom level for the waveform display
- **Gain** (0.1 - 5) - Vertical amplification of the signal
- **Freeze** (toggle) - Pause the display to examine a specific moment

**Ports:**
- **Input** (audio) - Signal to visualize

**Usage:** Connect any audio or modulation source to see the waveform in real-time. Use Time Scale to zoom in/out, Gain to adjust amplitude, and Freeze to pause on a specific waveform shape. Great for debugging patches, verifying LFO shapes, checking envelope timing, and seeing oscillator waveforms.

### Output

Sends audio to your speakers.

**Parameters:**
- **Gain** (0 - 1) - Master volume level
- **Mute** (toggle) - Silence without changing gain

**Ports:**
- **Input** (audio) - Sound to output

## Managing Patches

### Auto-save

Your work is automatically saved to browser storage every 5 seconds. The toolbar shows a status indicator when auto-save is active:

- **"Saving..."** appears while the patch is being written
- **"Saved just now"** (with a checkmark) confirms the save completed
- The timestamp updates to show how long ago the last save happened ("Saved 2 min ago")

Toggle auto-save on or off with the checkbox in the toolbar. Auto-save only triggers when something has changed, including parameter adjustments, module additions, and cable connections.

### Save and Load Presets

Click the **Presets** button in the toolbar to open the preset browser.

This build does not ship with factory presets, so the list starts empty until you save your own patch.

**Save a patch:**
1. Type a name in the "Save Current Patch" field
2. Click **Save** (or press Enter)
3. The patch is stored in your browser's localStorage

**Load a patch:**
1. Find the preset in the "Available Presets" list
2. Click **Load** next to its name
3. The current modules and connections are replaced with the saved patch

**Export/Import files:**
- **Save to File** downloads your current patch as a `.json` file
- **Load from File** opens a file picker to import a previously exported `.json` patch

Saved patches appear with a green "Saved" badge. You can delete any saved patch with the **Delete** button.

### Clear Session

Click the red **Clear** button in the toolbar to wipe everything:

1. A confirmation dialog asks "Delete all modules? This cannot be undone."
2. Clicking OK removes all modules, connections, and parameter values
3. The auto-saved state in localStorage is deleted
4. Autosave subscriptions stop
5. You return to the "Click to Start Audio" start screen

Clicking "Start Audio" again creates a fresh session with no leftover state.

### Session Restore

When you click "Start Audio" after refreshing or reopening the app, your previous session is restored automatically:

- A "Session restored" notification appears at the top of the screen
- All modules, connections, and parameter values (including sequencer step patterns) are reloaded from the last auto-save
- The patch is validated before loading; if it's corrupted or incompatible, the restore is skipped
- Session restore only happens if you didn't manually clear the session before closing

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
- Audio outputs should connect to audio inputs, control outputs to modulation inputs, and gate/trigger outputs to timing inputs like ADSR `gate` or Sequencer `reset`

### Modules Won't Move

Make sure you're dragging the **header** (colored top bar), not the body or ports.
Modules snap to a 20px grid, so movement is intentionally aligned.

## Building for Production

```bash
npm run build
```

Output goes to `dist/` folder.

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Type-check with svelte-check |
| `npm run quality` | Run check + build together |
| `npm run typecheck` | Strict check that fails on warnings |
