export interface HelpSection {
  title: string;
  content: string;
  items?: string[];
}

export const SYNTH_HELP_CONTENT: HelpSection[] = [
  {
    title: "🎵 Modular Synthesis Basics",
    content: "A modular synthesizer works by connecting different modules (building blocks) together to create sound. Think of it like a pipeline where audio flows from left to right.",
    items: [
      "Oscillators generate raw sound waves",
      "Filters shape the tone by removing/boosting frequencies", 
      "Envelopes (ADSR) control how sound changes over time",
      "VCAs control the loudness/amplitude",
      "Effects add character and space",
      "Output sends sound to your speakers"
    ]
  },
  {
    title: "📶 Signal Types",
    content: "Different ports accept different types of signals. Understanding these is key to patching correctly.",
    items: [
      "🔴 Audio - The actual sound you hear (oscillator output, filter output)",
      "🟢 Gate - A binary on/off signal (triggers ADSR, 0V = off, 1V = on)",
      "🔵 Control - A continuous voltage (modulates parameters, 0-1 range)",
      "🟡 Trigger - A very short pulse (used for one-shot events)"
    ]
  },
  {
    title: "🎹 Gate Signal Explained",
    content: "A gate signal is like a light switch - it's either ON (1) or OFF (0). When you connect a sequencer to an ADSR's gate input, each step sends a brief ON signal that tells the ADSR to start its envelope.",
    items: [
      "Gate ON → ADSR starts attack phase",
      "Gate stays ON → ADSR holds at sustain level",
      "Gate OFF → ADSR enters release phase",
      "Duration matters: longer gates = longer sustain"
    ]
  },
  {
    title: "📊 Amplitude & Volume",
    content: "Amplitude is the loudness of a signal. In this synth, amplitude is normalized to a 0-1 range where 0 = silence and 1 = maximum volume.",
    items: [
      "0.0 = Complete silence",
      "0.5 = Half volume",
      "1.0 = Maximum volume",
      "Values above 1.0 may cause distortion/clipping",
      "VCA (Voltage Controlled Amplifier) modulates amplitude"
    ]
  },
  {
    title: "🌊 Waveform Types",
    content: "Oscillators generate different waveforms, each with its own unique sound character.",
    items: [
      "Sine - Pure tone, no harmonics (smooth, flute-like)",
      "Sawtooth - Bright and buzzy, rich in harmonics (string-like)",
      "Square - Hollow sound, odd harmonics only (clarinet-like)",
      "Triangle - Softer than square, odd harmonics (softer, mellow)"
    ]
  },
  {
    title: "🎛️ Filter Types",
    content: "Filters shape your sound by removing or boosting specific frequencies.",
    items: [
      "Lowpass - Removes high frequencies, keeps lows (warm, muffled)",
      "Highpass - Removes low frequencies, keeps highs (thin, airy)",
      "Bandpass - Keeps only a band of frequencies (telephone effect)",
      "Notch - Removes a specific frequency (phasey effect)",
      "Cutoff - The frequency where filtering begins",
      "Resonance (Q) - Boosts frequencies near the cutoff"
    ]
  },
  {
    title: "📈 ADSR Envelope",
    content: "ADSR (Attack, Decay, Sustain, Release) shapes a sound over time. It's essential for creating dynamic, interesting sounds.",
    items: [
      "Attack - Time to go from 0 to full volume (0.01s = punchy, 1s = swelling)",
      "Decay - Time to fall from peak to sustain level",
      "Sustain - Volume level held while gate is on (0-1)",
      "Release - Time to fade to silence after gate ends",
      "Depth - How much the envelope affects the target (use 1000-3000 for filters)"
    ]
  },
  {
    title: "🥁 Creating Rhythms",
    content: "The sequencer creates rhythmic patterns by sending gate signals at specific intervals.",
    items: [
      "Toggle steps ON/OFF to create patterns",
      "Rate controls speed (4 Hz = 4 steps per second)",
      "Gate output triggers ADSR for shaped percussion",
      "Trigger output for sharp, immediate sounds",
      "Connect to oscillator pitch for arpeggios",
      "Classic patterns: 4-on-floor (1,5,9,13), Off-beats (3,7,11,15)"
    ]
  },
  {
    title: "🔗 How to Patch",
    content: "Click and drag between ports to create connections. Audio flows from output (right side) to input (left side).",
    items: [
      "Drag from output port to input port",
      "Red ports = audio, Green = gate, Blue = control",
      "Click a cable to select it, press Delete to remove",
      "Multiple inputs can connect to one output",
      "Only one connection per input port allowed"
    ]
  },
  {
    title: "💡 Quick Tips",
    content: "Practical advice to get great sounds quickly.",
    items: [
      "Start simple: Oscillator → Filter → Output",
      "Always include an Output module to hear sound",
      "Use headphones and start with low volume",
      "Watch for clipping - lower gain if sound distorts",
      "Experiment! There are no wrong connections, only unexpected sounds",
      "Save patches by noting module settings and connections"
    ]
  }
];

export const GETTING_STARTED_STEPS = [
  {
    title: "Step 1: Your First Sound",
    description: "Create a basic sound",
    patch: [
      "Add Oscillator module",
      "Add Output module",
      "Connect Oscillator 'output' → Output 'input'",
      "You should hear sound immediately",
      "Adjust Oscillator frequency knob to change pitch",
      "Try different waveforms: sine, sawtooth, square, triangle"
    ]
  },
  {
    title: "Step 2: Add a Filter",
    description: "Shape the tone with frequency filtering",
    patch: [
      "Add Filter module",
      "Disconnect Oscillator from Output (click the cable, press Delete)",
      "Connect Oscillator 'output' → Filter 'input'",
      "Connect Filter 'output' → Output 'input'",
      "Adjust Filter cutoff knob to hear tone changes",
      "Try different filter types (lowpass, highpass, bandpass)",
      "Increase Resonance for more character"
    ]
  },
  {
    title: "Step 3: Add an Envelope",
    description: "Control volume over time with ADSR",
    patch: [
      "Add ADSR module",
      "Add VCA module",
      "Insert VCA between Filter and Output",
      "Connect Filter 'output' → VCA 'input'",
      "Connect VCA 'output' → Output 'input'",
      "Connect ADSR 'output' → VCA 'cv'",
      "ADSR auto-triggers - you should hear pulsing volume",
      "Adjust Attack: short = punchy, long = swelling",
      "Set Sustain to 0 for percussive sounds"
    ]
  },
  {
    title: "Step 4: Create a Sequencer",
    description: "Make rhythmic patterns",
    patch: [
      "Add Sequencer module",
      "Connect Sequencer 'gate' → ADSR 'gate'",
      "Click steps 1, 5, 9, 13 to turn them ON (green)",
      "Adjust Sequencer rate slider for tempo",
      "Try connecting Sequencer 'gate' → Oscillator 'frequency' for pitch sequences"
    ]
  }
];
