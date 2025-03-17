// Initialize audio system with fallbacks
console.log("Initializing Aphex Soundscape...");

// Check if Web Audio API is supported
const AudioContext = window.AudioContext || window.webkitAudioContext;
if (!AudioContext) {
  alert("Your browser doesn't support Web Audio API. Please use Chrome, Firefox, or another modern browser.");
}

// Audio context variables
let audioCtx;
let analyser;

// Audio nodes container with defaults
const nodes = {
  oscillators: {},
  lfos: {},
  filter: null,
  delay: null,
  distortion: null,
  reverb: null,
  masterGain: null
};

// Create minimal error handling wrapper functions
const safeConnect = (source, destination) => {
  try {
    if (source && destination) source.connect(destination);
  } catch (e) {
    console.warn("Connection failed:", e);
  }
};

// State management
const state = {
  isInitialized: false,
  oscillators: {
    1: { freq: 110, waveform: 'sine', active: true, lfo1Target: true, lfo2Target: false },
    2: { freq: 220, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false },
    3: { freq: 440, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false }
  },
  lfos: {
    1: { freq: 1, depth: 50, active: true },
    2: { freq: 0.5, depth: 30, active: true }
  },
  effects: {
    delay: { time: 0.3, feedback: 0.4, active: true },
    filter: { freq: 2000, q: 5, active: true },
    distortion: { amount: 20, active: false },
    reverb: { amount: 0.3, active: true }
  },
  master: {
    volume: 0.7
  },
  chaosMatrix: Array(64).fill(false)
};

// Create and connect audio nodes
function initAudio() {
  if (state.isInitialized) return;

  try {
    // Create audio context
    audioCtx = new AudioContext();

    // Create master gain node
    nodes.masterGain = audioCtx.createGain();
    nodes.masterGain.gain.value = state.master.volume;

    // Create analyser node for visualization
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    // Create filter first (since LFOs will need it)
    nodes.filter = audioCtx.createBiquadFilter();
    nodes.filter.type = 'lowpass';
    nodes.filter.frequency.value = state.effects.filter.freq;
    nodes.filter.Q.value = state.effects.filter.q;

    // Create oscillators
    for (let i = 1; i <= 3; i++) {
      createOscillator(i);
    }

    // Create LFOs and store references
    const lfoNodes = [];
    for (let i = 1; i <= 2; i++) {
      lfoNodes.push(createLFO(i));
    }

    // Create delay
    nodes.delay = audioCtx.createDelay();
    nodes.delay.delayTime.value = state.effects.delay.time;

    const delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = state.effects.delay.feedback;
    nodes.delay.feedbackGain = delayFeedback;

    // Create distortion
    nodes.distortion = audioCtx.createWaveShaper();
    updateDistortionCurve();

    // Create reverb
    createReverb();

    // Connect oscillators to filter
    Object.values(nodes.oscillators).forEach(osc => {
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.33; // Equal mix of oscillators
      osc.connect(gainNode);
      gainNode.connect(nodes.filter);
      osc.gainNode = gainNode;
    });

    // Connect LFOs to their targets based on current state
    connectLFOs();

    // Set up effect chain routing
    setupEffectChain();

    // Connect master gain to analyser and destination
    nodes.masterGain.connect(analyser);
    nodes.masterGain.connect(audioCtx.destination);

    // Start oscillators and LFOs
    Object.values(nodes.oscillators).forEach(osc => osc.start());
    Object.values(nodes.lfos).forEach(lfo => lfo.start());

    // Enable/disable nodes based on initial state
    updateNodeConnections();

    // Initialize visualizer
    initVisualizer();

    state.isInitialized = true;

    console.log("Audio initialization completed successfully with improved effect chain");
  } catch (error) {
    console.error("Error initializing audio:", error);
  }
}

// Create oscillator node
function createOscillator(id) {
  const osc = audioCtx.createOscillator();
  osc.type = state.oscillators[id].waveform;
  osc.frequency.value = state.oscillators[id].freq;
  nodes.oscillators[id] = osc;
}

// Create LFO node
function createLFO(id) {
  // Create oscillator for the LFO
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = state.lfos[id].freq;

  // Create a central gain node that will be connected to individual target gains
  const lfoGain = audioCtx.createGain();

  // Set to a standard value - actual modulation depth will be set by individual connections
  lfoGain.gain.value = 1.0;

  // Connect the oscillator to its gain node
  lfo.connect(lfoGain);
  lfo.gainNode = lfoGain;

  // Store LFO for now, we'll connect it after all nodes are created
  nodes.lfos[id] = lfo;

  console.log(`Created LFO ${id} with frequency ${lfo.frequency.value} Hz`);

  return { lfo, lfoGain };
}

// Calculate LFO depth based on target
function calculateLFODepth(id) {
  const depth = state.lfos[id].depth / 100;

  if (id === 1) {
    // See if any oscillators are connected to LFO 1
    for (let i = 1; i <= 3; i++) {
      if (state.oscillators[i].lfo1Target) {
        return state.oscillators[i].freq * depth * 0.5;
      }
    }
    // Default to filter if no oscillator connected
    return state.effects.filter.freq * depth;
  } else if (id === 2) {
    // See if any oscillators are connected to LFO 2
    for (let i = 1; i <= 3; i++) {
      if (state.oscillators[i].lfo2Target) {
        return state.oscillators[i].freq * depth * 0.5;
      }
    }
    // Default to filter if no oscillator connected
    return state.effects.filter.freq * depth;
  }

  return 0;
}

// Store references to created gain nodes to avoid garbage collection
const gainNodeReferences = {
  lfo1: [],
  lfo2: []
};

// Connect LFOs to their targets based on current state
function connectLFOs() {
  try {
    console.log("Connecting LFOs with state:",
        JSON.stringify({
          osc1: { lfo1: state.oscillators[1].lfo1Target, lfo2: state.oscillators[1].lfo2Target },
          osc2: { lfo1: state.oscillators[2].lfo1Target, lfo2: state.oscillators[2].lfo2Target },
          osc3: { lfo1: state.oscillators[3].lfo1Target, lfo2: state.oscillators[3].lfo2Target }
        }));

    // Clear previous gain node references
    gainNodeReferences.lfo1 = [];
    gainNodeReferences.lfo2 = [];

    // First disconnect any existing connections
    if (nodes.lfos[1] && nodes.lfos[1].gainNode) {
      try {
        nodes.lfos[1].gainNode.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    if (nodes.lfos[2] && nodes.lfos[2].gainNode) {
      try {
        nodes.lfos[2].gainNode.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    // Connect LFO 1 to its targets
    if (nodes.lfos[1] && nodes.lfos[1].gainNode) {
      let connectedLFO1 = false;

      // Check each oscillator to see if it's targeted by LFO 1
      for (let i = 1; i <= 3; i++) {
        if (state.oscillators[i].lfo1Target && nodes.oscillators[i]) {
          try {
            // Create a separate gain node for each oscillator connection
            // to properly scale the LFO modulation for each oscillator's frequency
            const lfoGain = audioCtx.createGain();
            const depth = state.lfos[1].depth / 100;

            // Adjust the gain value - reduce it to avoid too extreme pitch variations
            lfoGain.gain.value = state.oscillators[i].freq * depth * 0.25;

            // Store the gain node reference
            gainNodeReferences.lfo1.push(lfoGain);

            // Connect through the gain node
            nodes.lfos[1].gainNode.connect(lfoGain);
            lfoGain.connect(nodes.oscillators[i].frequency);

            connectedLFO1 = true;
            console.log(`LFO 1 connected to oscillator ${i} with depth ${lfoGain.gain.value}`);
          } catch (e) {
            console.warn(`Failed to connect LFO 1 to oscillator ${i}:`, e);
          }
        }
      }

      // Always connect to filter with a separate gain path
      if (nodes.filter) {
        try {
          const filterLfoGain = audioCtx.createGain();
          const depth = state.lfos[1].depth / 100;

          // If no oscillators are connected, use full LFO strength on filter
          // Otherwise use a reduced amount
          const filterDepth = connectedLFO1 ? 0.3 : 1.0;
          filterLfoGain.gain.value = state.effects.filter.freq * depth * filterDepth * 0.5;

          // Store the gain node reference
          gainNodeReferences.lfo1.push(filterLfoGain);

          nodes.lfos[1].gainNode.connect(filterLfoGain);
          filterLfoGain.connect(nodes.filter.frequency);
          console.log(`LFO 1 connected to filter with depth ${filterLfoGain.gain.value}`);
        } catch (e) {
          console.warn("Failed to connect LFO 1 to filter:", e);
        }
      }
    }

    // Connect LFO 2 to its targets
    if (nodes.lfos[2] && nodes.lfos[2].gainNode) {
      let connectedLFO2 = false;

      // Check each oscillator to see if it's targeted by LFO 2
      for (let i = 1; i <= 3; i++) {
        if (state.oscillators[i].lfo2Target && nodes.oscillators[i]) {
          try {
            // Create a separate gain node for each oscillator connection
            const lfoGain = audioCtx.createGain();
            const depth = state.lfos[2].depth / 100;

            // Adjust the gain value - reduce it to avoid too extreme pitch variations
            lfoGain.gain.value = state.oscillators[i].freq * depth * 0.25;

            // Store the gain node reference
            gainNodeReferences.lfo2.push(lfoGain);

            // Connect through the gain node
            nodes.lfos[2].gainNode.connect(lfoGain);
            lfoGain.connect(nodes.oscillators[i].frequency);

            connectedLFO2 = true;
            console.log(`LFO 2 connected to oscillator ${i} with depth ${lfoGain.gain.value}`);
          } catch (e) {
            console.warn(`Failed to connect LFO 2 to oscillator ${i}:`, e);
          }
        }
      }

      // Always connect to filter with a separate gain path
      if (nodes.filter) {
        try {
          const filterLfoGain = audioCtx.createGain();
          const depth = state.lfos[2].depth / 100;

          // If no oscillators are connected, use full LFO strength on filter
          // Otherwise use a reduced amount
          const filterDepth = connectedLFO2 ? 0.3 : 1.0;
          filterLfoGain.gain.value = state.effects.filter.freq * depth * filterDepth * 0.5;

          // Store the gain node reference
          gainNodeReferences.lfo2.push(filterLfoGain);

          nodes.lfos[2].gainNode.connect(filterLfoGain);
          filterLfoGain.connect(nodes.filter.frequency);
          console.log(`LFO 2 connected to filter with depth ${filterLfoGain.gain.value}`);
        } catch (e) {
          console.warn("Failed to connect LFO 2 to filter:", e);
        }
      }
    }
  } catch (e) {
    console.error("Error in connectLFOs:", e);
  }
}

// Create reverb impulse response with better quality
function createReverb() {
  try {
    // Create wet and dry gain nodes for reverb
    const wetGain = audioCtx.createGain();
    wetGain.gain.value = state.effects.reverb.amount;

    const dryGain = audioCtx.createGain();
    dryGain.gain.value = 1 - state.effects.reverb.amount;

    // Create convolver for reverb effect
    const convolver = audioCtx.createConvolver();

    // Improved impulse response with more natural decay
    const sampleRate = audioCtx.sampleRate;
    const duration = 3; // Longer for more spacious reverb
    const length = sampleRate * duration;
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Create a more natural sounding reverb
    for (let i = 0; i < length; i++) {
      // Use improved decay curve with initial delay
      const t = i / sampleRate;
      // More natural exponential decay with slight initial buildup
      const decay = t < 0.1 ? t / 0.1 : Math.pow(1 - ((t - 0.1) / (duration - 0.1)), 2);

      // Add some early reflections for more natural sound
      let earlyReflection = 0;
      if (t < 0.1) {
        // Add a few discrete early reflections
        const reflections = [0.03, 0.05, 0.07, 0.09];
        reflections.forEach(time => {
          if (Math.abs(t - time) < 0.001) {
            earlyReflection = 0.5;
          }
        });
      }

      // Smoother randomization with correlation between channels for stereo image
      const rand = Math.random() * 2 - 1;
      const randCorrelated = Math.random() * 2 - 1;
      left[i] = (rand * 0.8 + randCorrelated * 0.2) * decay + earlyReflection * decay;
      right[i] = (rand * 0.2 + randCorrelated * 0.8) * decay + earlyReflection * decay;
    }

    // Apply the impulse response to the convolver
    convolver.buffer = impulse;

    // Store nodes without connecting them yet
    nodes.reverb = {
      convolver: convolver,
      wetGain: wetGain,
      dryGain: dryGain
    };

    console.log("Reverb created successfully with enhanced impulse response");
  } catch (error) {
    console.error("Error creating reverb:", error);
    // Create simple gain node as fallback
    const fallbackGain = audioCtx.createGain();
    nodes.reverb = {
      convolver: fallbackGain,
      wetGain: fallbackGain,
      dryGain: fallbackGain
    };
  }
}

// Improved distortion curve calculation
function updateDistortionCurve() {
  const amount = state.effects.distortion.amount;
  const samples = 44100;
  const curve = new Float32Array(samples);

  // If distortion is disabled, create a linear curve (no distortion)
  if (!state.effects.distortion.active) {
    for (let i = 0; i < samples; ++i) {
      const x = i * 2 / samples - 1;
      curve[i] = x; // Linear mapping = no distortion
    }

    nodes.distortion.curve = curve;
    nodes.distortion.oversample = '4x';
    return;
  }

  // Improved distortion algorithm with better musical response
  // Use scaled amount parameter (0-100) for flexibility
  const k = amount / 100;

  for (let i = 0; i < samples; ++i) {
    const x = i * 2 / samples - 1;

    // Choose distortion algorithm based on amount for more versatile sounds
    if (amount < 33) {
      // Soft clipping for gentle overdrive at low amounts
      curve[i] = Math.tanh(x * (1 + k * 10));
    } else if (amount < 66) {
      // Cubic soft clipping for classic distortion sound at medium amounts
      const gain = 1 + k * 15;
      if (x < -0.08905) {
        curve[i] = -0.75;
      } else if (x > 0.08905) {
        curve[i] = 0.75;
      } else {
        curve[i] = gain * x - gain * x * x * x;
      }
    } else {
      // Harder waveshaping for aggressive distortion at high amounts
      const gain = 1 + k * 30;
      curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(gain * x)));
    }
  }

  nodes.distortion.curve = curve;
  nodes.distortion.oversample = '4x';

  console.log(`Updated distortion curve with improved algorithm, amount: ${amount}`);
}

// Improved audio node connections with proper effect chain routing
function setupEffectChain() {
  try {
    // Disconnect all existing connections between effects
    // (But keep oscillator connections to filter)
    if (nodes.filter) {
      try {
        nodes.filter.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    if (nodes.delay && nodes.delay.feedbackGain) {
      try {
        nodes.delay.disconnect();
        nodes.delay.feedbackGain.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    if (nodes.distortion) {
      try {
        nodes.distortion.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    if (nodes.reverb) {
      try {
        if (nodes.reverb.convolver) nodes.reverb.convolver.disconnect();
        if (nodes.reverb.wetGain) nodes.reverb.wetGain.disconnect();
        if (nodes.reverb.dryGain) nodes.reverb.dryGain.disconnect();
      } catch (e) {
        // Ignore disconnection errors
      }
    }

    // Create a proper effect chain with each effect getting the output of the previous one
    // This prevents phase issues and unintended gain boosts

    // Start with filter (first in chain)
    let currentOutput = nodes.filter;

    // Connect delay if active
    if (state.effects.delay.active && nodes.delay) {
      // Connect filter to delay
      safeConnect(currentOutput, nodes.delay);

      // Set up feedback loop
      safeConnect(nodes.delay, nodes.delay.feedbackGain);
      safeConnect(nodes.delay.feedbackGain, nodes.delay);

      // Update current output
      currentOutput = nodes.delay;
    }

    // Connect distortion if active
    if (state.effects.distortion.active && nodes.distortion) {
      safeConnect(currentOutput, nodes.distortion);
      currentOutput = nodes.distortion;
    }

    // Connect reverb if active
    if (state.effects.reverb.active && nodes.reverb) {
      try {
        // Split signal into wet and dry paths
        safeConnect(currentOutput, nodes.reverb.convolver);
        safeConnect(currentOutput, nodes.reverb.dryGain);

        // Connect convolver to wet gain
        safeConnect(nodes.reverb.convolver, nodes.reverb.wetGain);

        // Set reverb wet/dry mix
        nodes.reverb.wetGain.gain.setValueAtTime(
            state.effects.reverb.amount,
            audioCtx.currentTime
        );
        nodes.reverb.dryGain.gain.setValueAtTime(
            1 - state.effects.reverb.amount,
            audioCtx.currentTime
        );

        // Connect both wet and dry gains to master
        safeConnect(nodes.reverb.wetGain, nodes.masterGain);
        safeConnect(nodes.reverb.dryGain, nodes.masterGain);
      } catch (e) {
        console.error("Error connecting reverb:", e);
        // Connect current output directly to master if reverb fails
        safeConnect(currentOutput, nodes.masterGain);
      }
    } else {
      // No reverb, connect current output directly to master
      safeConnect(currentOutput, nodes.masterGain);
    }

    // Always ensure the filter is connected to the master gain directly
    // This provides a dry signal path when all effects are bypassed
    if (!state.effects.delay.active &&
        !state.effects.distortion.active &&
        !state.effects.reverb.active) {
      safeConnect(nodes.filter, nodes.masterGain);
    }

    console.log("Effect chain routing updated successfully");
  } catch (error) {
    console.error("Error in setupEffectChain:", error);
    // Fallback: direct connection to ensure audio keeps flowing
    try {
      safeConnect(nodes.filter, nodes.masterGain);
    } catch (e) {
      console.error("Critical error in effect chain setup:", e);
    }
  }
}

// Enhanced update function that properly adjusts effect parameters and routing
function updateNodeConnections() {
  try {
    // Oscillators - update gains with smoother transitions
    for (let i = 1; i <= 3; i++) {
      if (nodes.oscillators[i] && nodes.oscillators[i].gainNode) {
        // Use exponential ramp for smoother transitions
        const gainValue = state.oscillators[i].active ? 0.33 : 0;
        try {
          const currentTime = audioCtx.currentTime;
          nodes.oscillators[i].gainNode.gain.setValueAtTime(
              nodes.oscillators[i].gainNode.gain.value,
              currentTime
          );
          nodes.oscillators[i].gainNode.gain.exponentialRampToValueAtTime(
              Math.max(0.001, gainValue), // Avoid zero for exponential ramp
              currentTime + 0.01
          );

          if (gainValue === 0) {
            // Set to exactly zero after the ramp completes
            nodes.oscillators[i].gainNode.gain.setValueAtTime(0, currentTime + 0.011);
          }

          console.log(`Set oscillator ${i} gain to ${gainValue}`);
        } catch (e) {
          // Fall back to direct assignment if needed
          nodes.oscillators[i].gainNode.gain.value = gainValue;
        }
      }
    }

    // Update filter parameters
    if (nodes.filter) {
      try {
        const currentTime = audioCtx.currentTime;

        // Always ensure minimum frequency is above 20Hz
        const safeFreq = Math.max(20, state.effects.filter.freq);

        // Use exponential ramp for smoother filter transitions
        nodes.filter.frequency.setValueAtTime(
            nodes.filter.frequency.value,
            currentTime
        );

        if (state.effects.filter.active) {
          // Smooth transition to target frequency
          nodes.filter.frequency.exponentialRampToValueAtTime(
              safeFreq,
              currentTime + 0.05
          );

          // Update Q value with linear ramp
          nodes.filter.Q.setValueAtTime(
              nodes.filter.Q.value,
              currentTime
          );
          nodes.filter.Q.linearRampToValueAtTime(
              state.effects.filter.q,
              currentTime + 0.05
          );
        } else {
          // When filter is inactive, set it to pass all frequencies
          nodes.filter.frequency.exponentialRampToValueAtTime(
              20000,
              currentTime + 0.05
          );
          nodes.filter.Q.linearRampToValueAtTime(0.1, currentTime + 0.05);
        }
      } catch (e) {
        console.warn("Filter parameter update fallback:", e);
        // Fallback to direct value assignment
        if (state.effects.filter.active) {
          nodes.filter.frequency.value = Math.max(20, state.effects.filter.freq);
          nodes.filter.Q.value = state.effects.filter.q;
        } else {
          nodes.filter.frequency.value = 20000;
          nodes.filter.Q.value = 0.1;
        }
      }
    }

    // Update delay parameters
    if (nodes.delay) {
      try {
        const currentTime = audioCtx.currentTime;

        // Smoothly update delay time
        nodes.delay.delayTime.setValueAtTime(
            nodes.delay.delayTime.value,
            currentTime
        );
        nodes.delay.delayTime.linearRampToValueAtTime(
            state.effects.delay.time,
            currentTime + 0.1
        );

        // Update feedback gain smoothly
        if (nodes.delay.feedbackGain) {
          const feedbackValue = state.effects.delay.active ?
              state.effects.delay.feedback : 0;

          nodes.delay.feedbackGain.gain.setValueAtTime(
              nodes.delay.feedbackGain.gain.value,
              currentTime
          );
          nodes.delay.feedbackGain.gain.linearRampToValueAtTime(
              feedbackValue,
              currentTime + 0.1
          );
        }
      } catch (e) {
        console.warn("Delay parameter update fallback:", e);
        // Fallback to direct value assignment
        nodes.delay.delayTime.value = state.effects.delay.time;
        if (nodes.delay.feedbackGain) {
          nodes.delay.feedbackGain.gain.value = state.effects.delay.active ?
              state.effects.delay.feedback : 0;
        }
      }
    }

    // Update distortion
    if (nodes.distortion) {
      try {
        // Update the distortion curve with improved algorithm
        updateDistortionCurve();
      } catch (e) {
        console.warn("Error updating distortion:", e);
      }
    }

    // Update reverb parameters
    if (nodes.reverb && nodes.reverb.wetGain && nodes.reverb.dryGain) {
      try {
        const currentTime = audioCtx.currentTime;

        // Set wet/dry mix based on if reverb is active
        const wetAmount = state.effects.reverb.active ? state.effects.reverb.amount : 0;
        const dryAmount = state.effects.reverb.active ? (1 - state.effects.reverb.amount) : 1;

        // Smooth parameter changes
        nodes.reverb.wetGain.gain.setValueAtTime(
            nodes.reverb.wetGain.gain.value,
            currentTime
        );
        nodes.reverb.wetGain.gain.linearRampToValueAtTime(
            wetAmount,
            currentTime + 0.1
        );

        nodes.reverb.dryGain.gain.setValueAtTime(
            nodes.reverb.dryGain.gain.value,
            currentTime
        );
        nodes.reverb.dryGain.gain.linearRampToValueAtTime(
            dryAmount,
            currentTime + 0.1
        );
      } catch (e) {
        console.warn("Couldn't update reverb gains:", e);
        // Fallback to direct value assignment
        nodes.reverb.wetGain.gain.value = state.effects.reverb.active ?
            state.effects.reverb.amount : 0;
        nodes.reverb.dryGain.gain.value = state.effects.reverb.active ?
            (1 - state.effects.reverb.amount) : 1;
      }
    }

    // Update master volume with smooth transition
    if (nodes.masterGain) {
      try {
        const currentTime = audioCtx.currentTime;
        nodes.masterGain.gain.setValueAtTime(
            nodes.masterGain.gain.value,
            currentTime
        );
        nodes.masterGain.gain.linearRampToValueAtTime(
            state.master.volume,
            currentTime + 0.05
        );
      } catch (e) {
        console.warn("Master volume update fallback:", e);
        nodes.masterGain.gain.value = state.master.volume;
      }
    }

    // Reconnect LFOs to ensure correct routing
    connectLFOs();

    // Update the entire effect chain routing
    setupEffectChain();

  } catch (error) {
    console.error("Error in updateNodeConnections:", error);
  }
}

// Initialize chaos matrix grid
function initChaosMatrix() {
  const grid = document.getElementById('chaos-grid');

  // Create 8x8 grid
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.dataset.index = i;

    // Click handler for cells
    cell.addEventListener('click', () => {
      toggleChaosCell(i);
      cell.classList.toggle('active');
    });

    grid.appendChild(cell);
  }
}

// Toggle chaos matrix cell state
function toggleChaosCell(index) {
  state.chaosMatrix[index] = !state.chaosMatrix[index];
  applyChaosMatrixEffects();
}

// Apply effects based on chaos matrix state
function applyChaosMatrixEffects() {
  // Calculate how many cells are active
  const activeCount = state.chaosMatrix.filter(cell => cell).length;
  const randomFactor = activeCount / 64;

  // Apply chaos effects based on active cells
  // More active cells = more chaos

  // Apply micro-pitch variations to oscillators
  Object.values(nodes.oscillators).forEach(osc => {
    const variation = (Math.random() * 2 - 1) * randomFactor * 5;
    osc.detune.value = variation;
  });

  // Apply random filter modulation
  if (nodes.filter && randomFactor > 0.2) {
    const randomFilterMod = Math.random() * randomFactor * 2000;
    nodes.filter.frequency.setValueAtTime(
        state.effects.filter.freq + randomFilterMod,
        audioCtx.currentTime
    );
    nodes.filter.frequency.exponentialRampToValueAtTime(
        state.effects.filter.freq,
        audioCtx.currentTime + 0.2
    );
  }
}

// Initialize canvas visualizer
function initVisualizer() {
  try {
    const canvas = document.getElementById('visualizer');
    if (!canvas) {
      console.error('Visualizer canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');

    // Make sure canvas size is set properly
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = canvas.offsetHeight || 200;

    const width = canvas.width;
    const height = canvas.height;

    // Set up data arrays for analyzer
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Background animation variables
    let backgroundPhase = 0;
    let backgroundHue = 0;
    let backgroundSaturation = 20;
    let backgroundPattern = 0;

    // Drawing function
    function draw() {
      try {
        requestAnimationFrame(draw);

        if (!analyser) return;

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        // Calculate average frequency energy for background effects
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageEnergy = sum / bufferLength / 255;

        // Update background colors based on active controls
        backgroundPhase += 0.01 * (state.lfos[1].active ? state.lfos[1].freq : 0.5);

        // Update hue based on oscillator frequencies
        let activeOscCount = 0;
        let oscFreqSum = 0;
        for (let i = 1; i <= 3; i++) {
          if (state.oscillators[i].active) {
            activeOscCount++;
            oscFreqSum += state.oscillators[i].freq;
          }
        }

        if (activeOscCount > 0) {
          // Map average oscillator frequency to hue (20-880Hz to 0-360 degrees)
          const avgFreq = oscFreqSum / activeOscCount;
          backgroundHue = (avgFreq / 880 * 360) % 360;
        }

        // Update saturation based on filter frequency
        backgroundSaturation = 20 + (state.effects.filter.freq / 20000 * 80);

        // Use distortion for pattern intensity
        backgroundPattern = state.effects.distortion.active ?
            state.effects.distortion.amount / 100 : 0.1;

        // Draw dynamic background
        drawBackground(ctx, width, height, backgroundPhase, backgroundHue,
            backgroundSaturation, backgroundPattern, averageEnergy);

        // Draw frequency bars
        const barWidth = Math.max(1, width / (bufferLength / 16)); // Show fewer bars
        let x = 0;

        for (let i = 0; i < bufferLength; i += 16) { // Skip some values for performance
          const barHeight = dataArray[i] / 255 * height * 0.8;

          // Calculate color based on frequency and active oscillators
          let hue = (i / bufferLength) * 360;

          // Use chaos matrix to influence bar colors
          const chaosActiveCount = state.chaosMatrix.filter(cell => cell).length;
          if (chaosActiveCount > 0) {
            hue = (hue + backgroundHue + chaosActiveCount) % 360;
          }

          const saturation = 70 + Math.sin(i * 0.1 + backgroundPhase) * 30;
          const lightness = 50 + Math.cos(i * 0.05 + backgroundPhase) * 10;

          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
          if (x > width) break;
        }

        // Draw waveform
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;

        // Waveform color based on active LFOs
        const lfoInfluence = (state.lfos[1].active ? state.lfos[1].depth : 0) +
            (state.lfos[2].active ? state.lfos[2].depth : 0);

        const waveformHue = (backgroundHue + 180) % 360; // Complementary color
        const waveformSaturation = Math.min(100, 50 + lfoInfluence);

        ctx.strokeStyle = `hsla(${waveformHue}, ${waveformSaturation}%, 60%, 0.8)`;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * height / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();
      } catch (error) {
        console.error('Error in visualizer draw function:', error);
      }
    }

    // Draw dynamic background patterns based on audio settings
    function drawBackground(ctx, width, height, phase, hue, saturation, pattern, energy) {
      // Create gradient based on current settings
      const gradient = ctx.createLinearGradient(0, 0, width, height);

      // Base color from oscillator frequencies
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, 10%, 0.8)`);
      gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, ${saturation}%, 15%, 0.8)`);

      // Fill background with semi-transparent gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Create pattern overlay based on filter and distortion
      const patternIntensity = pattern * energy * 0.5;

      // Draw pattern based on reverb and delay settings
      if (state.effects.reverb.active || state.effects.delay.active) {
        // Calculate pattern parameters
        const xOffset = Math.sin(phase) * 20;
        const yOffset = Math.cos(phase * 0.7) * 20;
        const size = 40 + Math.sin(phase * 0.5) * 20;

        // Number of cells based on chaos matrix
        const chaosActiveCount = state.chaosMatrix.filter(cell => cell).length;
        const cellSize = 10 + (chaosActiveCount > 0 ? 50 / chaosActiveCount : 0);

        // Draw grid pattern
        ctx.fillStyle = `hsla(${(hue + 180) % 360}, ${saturation}%, 50%, ${patternIntensity})`;

        for (let x = -size; x < width + size; x += cellSize) {
          for (let y = -size; y < height + size; y += cellSize) {
            const sizeVar = size * (0.5 + Math.sin(x * 0.05 + phase) * 0.5) *
                (0.5 + Math.cos(y * 0.05 + phase) * 0.5);

            ctx.beginPath();

            // Use different patterns based on active effects
            if (state.effects.delay.active && state.effects.reverb.active) {
              // Diamond pattern
              ctx.moveTo(x + xOffset, y - sizeVar/2 + yOffset);
              ctx.lineTo(x + sizeVar/2 + xOffset, y + yOffset);
              ctx.lineTo(x + xOffset, y + sizeVar/2 + yOffset);
              ctx.lineTo(x - sizeVar/2 + xOffset, y + yOffset);
            } else if (state.effects.delay.active) {
              // Circle pattern
              ctx.arc(x + xOffset, y + yOffset, sizeVar/4, 0, Math.PI * 2);
            } else if (state.effects.reverb.active) {
              // Square pattern
              ctx.rect(x - sizeVar/4 + xOffset, y - sizeVar/4 + yOffset, sizeVar/2, sizeVar/2);
            }

            ctx.fill();
          }
        }
      }
    }

    // Start visualization
    draw();

  } catch (error) {
    console.error('Error initializing visualizer:', error);
  }
}

// Event listeners for UI controls
function setupEventListeners() {
  // Create control buttons container
  const container = document.querySelector('.container');
  const controlButtonsContainer = document.createElement('div');
  controlButtonsContainer.style.display = 'flex';
  controlButtonsContainer.style.justifyContent = 'center';
  controlButtonsContainer.style.gap = '15px';
  controlButtonsContainer.style.margin = '20px auto';

  // Create START button
  const startButton = document.createElement('button');
  startButton.id = 'start-audio-btn';
  startButton.textContent = 'START AUDIO';
  startButton.style.padding = '15px 30px';
  startButton.style.fontSize = '18px';
  startButton.style.backgroundColor = 'var(--accent-primary)';
  startButton.style.color = '#000';
  startButton.style.border = 'none';
  startButton.style.borderRadius = '4px';
  startButton.style.cursor = 'pointer';

  // Create STOP button
  const stopButton = document.createElement('button');
  stopButton.id = 'stop-audio-btn';
  stopButton.textContent = 'STOP AUDIO';
  stopButton.style.padding = '15px 30px';
  stopButton.style.fontSize = '18px';
  stopButton.style.backgroundColor = '#444';
  stopButton.style.color = 'var(--text-color)';
  stopButton.style.border = '1px solid var(--panel-border)';
  stopButton.style.borderRadius = '4px';
  stopButton.style.cursor = 'pointer';
  stopButton.style.display = 'none';

  // Create RESET button
  const resetButton = document.createElement('button');
  resetButton.id = 'reset-audio-btn';
  resetButton.textContent = 'RESET';
  resetButton.style.padding = '15px 30px';
  resetButton.style.fontSize = '18px';
  resetButton.style.backgroundColor = 'var(--accent-secondary)';
  resetButton.style.color = '#000';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '4px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.display = 'none';

  // Add buttons to container
  controlButtonsContainer.appendChild(startButton);
  controlButtonsContainer.appendChild(stopButton);
  controlButtonsContainer.appendChild(resetButton);

  if (container && container.firstChild) {
    container.insertBefore(controlButtonsContainer, container.firstChild);
  }

  // START button click handler
  startButton.addEventListener('click', () => {
    if (!state.isInitialized) {
      initAudio();
      startButton.style.display = 'none';
      stopButton.style.display = 'block';
      resetButton.style.display = 'block';
    } else if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      startButton.style.display = 'none';
      stopButton.style.display = 'block';
    }
  });

  // STOP button click handler
  stopButton.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
      stopButton.style.display = 'none';
      startButton.style.display = 'block';
      startButton.textContent = 'RESUME AUDIO';
    }
  });

  // RESET button click handler
  resetButton.addEventListener('click', () => {
    // Stop current audio context
    if (audioCtx) {
      try {
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      } catch (e) {
        console.warn("Error closing audio context:", e);
      }
    }

    // Reset state to defaults
    Object.assign(state, {
      isInitialized: false,
      oscillators: {
        1: { freq: 110, waveform: 'sine', active: true, lfo1Target: true, lfo2Target: false },
        2: { freq: 220, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false },
        3: { freq: 440, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false }
      },
      lfos: {
        1: { freq: 1, depth: 50, active: true },
        2: { freq: 0.5, depth: 30, active: true }
      },
      effects: {
        delay: { time: 0.3, feedback: 0.4, active: true },
        filter: { freq: 2000, q: 5, active: true },
        distortion: { amount: 20, active: false },
        reverb: { amount: 0.3, active: true }
      },
      master: {
        volume: 0.7
      },
      chaosMatrix: Array(64).fill(false)
    });

    // Clear nodes
    nodes.oscillators = {};
    nodes.lfos = {};
    nodes.filter = null;
    nodes.delay = null;
    nodes.distortion = null;
    nodes.reverb = null;
    nodes.masterGain = null;

    // Reset UI
    resetUIControls();

    // Update button states
    startButton.style.display = 'block';
    startButton.textContent = 'START AUDIO';
    stopButton.style.display = 'none';
    resetButton.style.display = 'none';
  });

  // Oscillator frequency sliders
  for (let i = 1; i <= 3; i++) {
    const freqSlider = document.getElementById(`osc${i}-freq`);
    const activeSwitch = document.getElementById(`osc${i}-active`);

    if (!freqSlider) {
      console.error(`Could not find frequency slider for oscillator ${i}`);
      continue;
    }

    const valueSpan = freqSlider.nextElementSibling;

    // Store oscillator index in a closure to avoid loop variable issues
    freqSlider.addEventListener('input', (function(oscIndex) {
      return function() {
        const freq = parseFloat(this.value);
        state.oscillators[oscIndex].freq = freq;
        valueSpan.textContent = `${freq.toFixed(0)} Hz`;

        if (nodes.oscillators[oscIndex]) {
          nodes.oscillators[oscIndex].frequency.setValueAtTime(freq, audioCtx.currentTime);
        }

        // If audio is initialized, update LFO connections for changed frequency
        if (state.isInitialized) {
          connectLFOs();
        }

        console.log(`Oscillator ${oscIndex} frequency set to ${freq} Hz`);
      };
    })(i));

    if (!activeSwitch) {
      console.error(`Could not find active switch for oscillator ${i}`);
      continue;
    }

    activeSwitch.addEventListener('change', (function(oscIndex) {
      return function() {
        state.oscillators[oscIndex].active = this.checked;
        updateNodeConnections();
        console.log(`Oscillator ${oscIndex} active state set to ${this.checked}`);
      };
    })(i));

    // Waveform selector buttons
    const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
    waveformButtons.forEach(button => {
      button.addEventListener('click', () => {
        const waveType = button.getAttribute('data-wave');

        // Update UI
        waveformButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update state and audio node
        state.oscillators[i].waveform = waveType;
        if (nodes.oscillators[i]) {
          nodes.oscillators[i].type = waveType;
        }
      });
    });
  }

  // LFO controls
  for (let i = 1; i <= 2; i++) {
    const freqSlider = document.getElementById(`lfo${i}-freq`);
    const depthSlider = document.getElementById(`lfo${i}-depth`);
    const activeSwitch = document.getElementById(`lfo${i}-active`);

    freqSlider.addEventListener('input', () => {
      const freq = parseFloat(freqSlider.value);
      state.lfos[i].freq = freq;
      freqSlider.nextElementSibling.textContent = `${freq.toFixed(1)} Hz`;

      if (nodes.lfos[i]) {
        nodes.lfos[i].frequency.setValueAtTime(freq, audioCtx.currentTime);
      }
    });

    depthSlider.addEventListener('input', () => {
      const depth = parseFloat(depthSlider.value);
      state.lfos[i].depth = depth;
      depthSlider.nextElementSibling.textContent = `${depth}%`;

      if (nodes.lfos[i] && nodes.lfos[i].gainNode) {
        nodes.lfos[i].gainNode.gain.setValueAtTime(
            calculateLFODepth(i),
            audioCtx.currentTime
        );
      }
    });

    activeSwitch.addEventListener('change', () => {
      state.lfos[i].active = activeSwitch.checked;

      if (nodes.lfos[i] && nodes.lfos[i].gainNode) {
        nodes.lfos[i].gainNode.gain.setValueAtTime(
            activeSwitch.checked ? calculateLFODepth(i) : 0,
            audioCtx.currentTime
        );
      }
    });
  }

  // Effects controls

  // Delay
  const delayTimeSlider = document.getElementById('delay-time');
  const delayFeedbackSlider = document.getElementById('delay-feedback');
  const delaySwitch = document.getElementById('delay-active');

  delayTimeSlider.addEventListener('input', () => {
    const time = parseFloat(delayTimeSlider.value);
    state.effects.delay.time = time;
    delayTimeSlider.nextElementSibling.textContent = `${time.toFixed(2)}s`;

    if (nodes.delay) {
      nodes.delay.delayTime.setValueAtTime(time, audioCtx.currentTime);
    }
  });

  delayFeedbackSlider.addEventListener('input', () => {
    const feedback = parseFloat(delayFeedbackSlider.value);
    state.effects.delay.feedback = feedback;
    delayFeedbackSlider.nextElementSibling.textContent = feedback.toFixed(2);

    if (nodes.delay && nodes.delay.feedbackGain) {
      nodes.delay.feedbackGain.gain.setValueAtTime(feedback, audioCtx.currentTime);
    }
  });

  delaySwitch.addEventListener('change', () => {
    state.effects.delay.active = delaySwitch.checked;
    updateNodeConnections();
  });

  // Filter
  const filterFreqSlider = document.getElementById('filter-freq');
  const filterQSlider = document.getElementById('filter-q');
  const filterSwitch = document.getElementById('filter-active');

  filterFreqSlider.addEventListener('input', () => {
    const freq = parseFloat(filterFreqSlider.value);
    state.effects.filter.freq = freq;
    filterFreqSlider.nextElementSibling.textContent = `${freq.toFixed(0)} Hz`;

    if (nodes.filter) {
      nodes.filter.frequency.setValueAtTime(freq, audioCtx.currentTime);
    }

    // Update LFO depth if it's targeting the filter
    if (nodes.lfos[2] && nodes.lfos[2].gainNode) {
      nodes.lfos[2].gainNode.gain.value = calculateLFODepth(2);
    }
  });

  filterQSlider.addEventListener('input', () => {
    const q = parseFloat(filterQSlider.value);
    state.effects.filter.q = q;
    filterQSlider.nextElementSibling.textContent = q.toFixed(1);

    if (nodes.filter) {
      nodes.filter.Q.setValueAtTime(q, audioCtx.currentTime);
    }
  });

  filterSwitch.addEventListener('change', () => {
    state.effects.filter.active = filterSwitch.checked;
    updateNodeConnections();
  });

  // Distortion
  const distortionSlider = document.getElementById('distortion-amount');
  const distortionSwitch = document.getElementById('distortion-active');

  distortionSlider.addEventListener('input', () => {
    const amount = parseFloat(distortionSlider.value);
    state.effects.distortion.amount = amount;
    distortionSlider.nextElementSibling.textContent = `${amount}%`;

    if (nodes.distortion) {
      updateDistortionCurve();
    }
  });

  distortionSwitch.addEventListener('change', () => {
    state.effects.distortion.active = distortionSwitch.checked;
    updateNodeConnections();
  });

  // Reverb
  const reverbSlider = document.getElementById('reverb-amount');
  const reverbSwitch = document.getElementById('reverb-active');

  reverbSlider.addEventListener('input', () => {
    const amount = parseFloat(reverbSlider.value);
    state.effects.reverb.amount = amount;
    reverbSlider.nextElementSibling.textContent = `${(amount * 100).toFixed(0)}%`;

    if (nodes.reverb) {
      nodes.reverb.wetGain.gain.setValueAtTime(amount, audioCtx.currentTime);
      nodes.reverb.dryGain.gain.setValueAtTime(1 - amount, audioCtx.currentTime);
    }
  });

  reverbSwitch.addEventListener('change', () => {
    state.effects.reverb.active = reverbSwitch.checked;
    updateNodeConnections();
  });

  // Master volume
  const volumeSlider = document.getElementById('master-volume');

  volumeSlider.addEventListener('input', () => {
    const volume = parseFloat(volumeSlider.value);
    state.master.volume = volume;
    volumeSlider.nextElementSibling.textContent = `${(volume * 100).toFixed(0)}%`;

    if (nodes.masterGain) {
      nodes.masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
  });

  // Chaos matrix buttons
  const randomizeBtn = document.getElementById('randomize-btn');
  const glitchBtn = document.getElementById('glitch-btn');
  const savePresetBtn = document.getElementById('save-preset-btn');

  randomizeBtn.addEventListener('click', () => {
    console.log("Randomizing settings...");

    // Randomize oscillator frequencies
    for (let i = 1; i <= 3; i++) {
      const minFreq = 20;
      const maxFreq = 880;
      const freqRange = maxFreq - minFreq;
      const randomFreq = Math.random() * freqRange + minFreq;

      state.oscillators[i].freq = randomFreq;

      const freqSlider = document.getElementById(`osc${i}-freq`);
      if (freqSlider) {
        freqSlider.value = randomFreq;
        if (freqSlider.nextElementSibling) {
          freqSlider.nextElementSibling.textContent = `${randomFreq.toFixed(0)} Hz`;
        }
      }

      if (nodes.oscillators[i]) {
        try {
          nodes.oscillators[i].frequency.setValueAtTime(randomFreq, audioCtx.currentTime);
        } catch (e) {
          nodes.oscillators[i].frequency.value = randomFreq;
        }
      }

      // Randomly select waveform
      const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
      const randomWaveIndex = Math.floor(Math.random() * waveforms.length);
      const randomWave = waveforms[randomWaveIndex];

      state.oscillators[i].waveform = randomWave;

      if (nodes.oscillators[i]) {
        nodes.oscillators[i].type = randomWave;
      }

      // Randomly assign LFO targets
      state.oscillators[i].lfo1Target = Math.random() > 0.6;
      state.oscillators[i].lfo2Target = Math.random() > 0.7;

      // Update LFO button states
      const lfo1Button = document.getElementById(`osc${i}-lfo1-btn`);
      const lfo2Button = document.getElementById(`osc${i}-lfo2-btn`);

      updateLFOButtonState(lfo1Button, state.oscillators[i].lfo1Target, 'primary');
      updateLFOButtonState(lfo2Button, state.oscillators[i].lfo2Target, 'secondary');

      // Update UI
      const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
      waveformButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-wave') === randomWave);
      });
    }

    // Randomize LFO parameters
    for (let i = 1; i <= 2; i++) {
      // Random LFO frequency between 0.1 and 10 Hz
      const randomFreq = Math.random() * 9.9 + 0.1;
      state.lfos[i].freq = randomFreq;

      // Random depth between 20 and 70%
      const randomDepth = Math.floor(Math.random() * 50) + 20;
      state.lfos[i].depth = randomDepth;

      // Update UI
      const freqSlider = document.getElementById(`lfo${i}-freq`);
      const depthSlider = document.getElementById(`lfo${i}-depth`);

      if (freqSlider) {
        freqSlider.value = randomFreq;
        if (freqSlider.nextElementSibling) {
          freqSlider.nextElementSibling.textContent = `${randomFreq.toFixed(1)} Hz`;
        }

        // Update the actual LFO
        if (nodes.lfos[i]) {
          try {
            nodes.lfos[i].frequency.setValueAtTime(randomFreq, audioCtx.currentTime);
          } catch (e) {
            nodes.lfos[i].frequency.value = randomFreq;
          }
        }
      }

      if (depthSlider) {
        depthSlider.value = randomDepth;
        if (depthSlider.nextElementSibling) {
          depthSlider.nextElementSibling.textContent = `${randomDepth}%`;
        }
      }
    }

    console.log("LFO state after randomize:",
        JSON.stringify({
          lfo1: { freq: state.lfos[1].freq, depth: state.lfos[1].depth },
          lfo2: { freq: state.lfos[2].freq, depth: state.lfos[2].depth },
          osc_targets: {
            osc1: { lfo1: state.oscillators[1].lfo1Target, lfo2: state.oscillators[1].lfo2Target },
            osc2: { lfo1: state.oscillators[2].lfo1Target, lfo2: state.oscillators[2].lfo2Target },
            osc3: { lfo1: state.oscillators[3].lfo1Target, lfo2: state.oscillators[3].lfo2Target }
          }
        })
    );

    // Ensure all audio connections are updated
    if (state.isInitialized) {
      updateNodeConnections();
    }

    // Randomize filter
    const randomFilterFreq = Math.random() * 10000 + 100;
    state.effects.filter.freq = randomFilterFreq;

    const filterFreqSlider = document.getElementById('filter-freq');
    filterFreqSlider.value = randomFilterFreq;
    filterFreqSlider.nextElementSibling.textContent = `${randomFilterFreq.toFixed(0)} Hz`;

    if (nodes.filter) {
      nodes.filter.frequency.setValueAtTime(randomFilterFreq, audioCtx.currentTime);
    }

    // Randomize chaos matrix
    state.chaosMatrix = Array(64).fill(false).map(() => Math.random() > 0.7);

    // Update chaos matrix UI
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach((cell, index) => {
      cell.classList.toggle('active', state.chaosMatrix[index]);
    });

    applyChaosMatrixEffects();
  });

  glitchBtn.addEventListener('click', () => {
    // Apply rapid random changes for a glitch effect
    const glitchDuration = 1000; // 1 second of glitching
    const glitchInterval = 50; // Changes every 50ms
    let glitchCount = 0;

    const glitchEffect = setInterval(() => {
      // Random filter frequency jumps
      if (nodes.filter) {
        const jumpFreq = Math.random() * 5000 + 200;
        nodes.filter.frequency.setValueAtTime(jumpFreq, audioCtx.currentTime);
      }

      // Random oscillator detune
      Object.values(nodes.oscillators).forEach(osc => {
        const detune = (Math.random() * 2 - 1) * 100;
        osc.detune.setValueAtTime(detune, audioCtx.currentTime);
      });

      // Distortion amount
      if (nodes.distortion) {
        state.effects.distortion.amount = Math.random() * 100;
        updateDistortionCurve();
      }

      glitchCount++;

      if (glitchCount * glitchInterval >= glitchDuration) {
        clearInterval(glitchEffect);

        // Reset parameters to original values
        if (nodes.filter) {
          nodes.filter.frequency.setValueAtTime(state.effects.filter.freq, audioCtx.currentTime);
        }

        Object.values(nodes.oscillators).forEach(osc => {
          osc.detune.setValueAtTime(0, audioCtx.currentTime);
        });

        if (nodes.distortion) {
          state.effects.distortion.amount = parseInt(distortionSlider.value);
          updateDistortionCurve();
        }
      }
    }, glitchInterval);
  });

  savePresetBtn.addEventListener('click', () => {
    // Save current state as JSON
    const preset = JSON.stringify(state);

    // Create a Blob with the data
    const blob = new Blob([preset], { type: 'application/json' });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aphex-soundscape-preset.json';
    a.click();

    // Clean up by revoking the URL
    URL.revokeObjectURL(url);
  });
}

// Reset UI controls to match state values
function resetUIControls() {
  try {
    // Reset oscillator controls
    for (let i = 1; i <= 3; i++) {
      const freqSlider = document.getElementById(`osc${i}-freq`);
      const activeSwitch = document.getElementById(`osc${i}-active`);
      const lfo1Button = document.getElementById(`osc${i}-lfo1-btn`);
      const lfo2Button = document.getElementById(`osc${i}-lfo2-btn`);

      if (freqSlider) {
        freqSlider.value = state.oscillators[i].freq;
        freqSlider.nextElementSibling.textContent = `${state.oscillators[i].freq.toFixed(0)} Hz`;
      }

      if (activeSwitch) {
        activeSwitch.checked = state.oscillators[i].active;
      }

      // Reset LFO buttons using our helper function
      updateLFOButtonState(lfo1Button, state.oscillators[i].lfo1Target, 'primary');
      updateLFOButtonState(lfo2Button, state.oscillators[i].lfo2Target, 'secondary');

      // Reset waveform buttons
      const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
      waveformButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-wave') === state.oscillators[i].waveform);
      });
    }

    // Reset LFO controls
    for (let i = 1; i <= 2; i++) {
      const freqSlider = document.getElementById(`lfo${i}-freq`);
      const depthSlider = document.getElementById(`lfo${i}-depth`);
      const activeSwitch = document.getElementById(`lfo${i}-active`);

      if (freqSlider) {
        freqSlider.value = state.lfos[i].freq;
        freqSlider.nextElementSibling.textContent = `${state.lfos[i].freq.toFixed(1)} Hz`;
      }

      if (depthSlider) {
        depthSlider.value = state.lfos[i].depth;
        depthSlider.nextElementSibling.textContent = `${state.lfos[i].depth}%`;
      }

      if (activeSwitch) {
        activeSwitch.checked = state.lfos[i].active;
      }
    }

    // Reset effect controls

    // Delay
    const delayTimeSlider = document.getElementById('delay-time');
    const delayFeedbackSlider = document.getElementById('delay-feedback');
    const delaySwitch = document.getElementById('delay-active');

    if (delayTimeSlider) {
      delayTimeSlider.value = state.effects.delay.time;
      delayTimeSlider.nextElementSibling.textContent = `${state.effects.delay.time.toFixed(2)}s`;
    }

    if (delayFeedbackSlider) {
      delayFeedbackSlider.value = state.effects.delay.feedback;
      delayFeedbackSlider.nextElementSibling.textContent = state.effects.delay.feedback.toFixed(2);
    }

    if (delaySwitch) {
      delaySwitch.checked = state.effects.delay.active;
    }

    // Filter
    const filterFreqSlider = document.getElementById('filter-freq');
    const filterQSlider = document.getElementById('filter-q');
    const filterSwitch = document.getElementById('filter-active');

    if (filterFreqSlider) {
      filterFreqSlider.value = state.effects.filter.freq;
      filterFreqSlider.nextElementSibling.textContent = `${state.effects.filter.freq.toFixed(0)} Hz`;
    }

    if (filterQSlider) {
      filterQSlider.value = state.effects.filter.q;
      filterQSlider.nextElementSibling.textContent = state.effects.filter.q.toFixed(1);
    }

    if (filterSwitch) {
      filterSwitch.checked = state.effects.filter.active;
    }

    // Distortion
    const distortionSlider = document.getElementById('distortion-amount');
    const distortionSwitch = document.getElementById('distortion-active');

    if (distortionSlider) {
      distortionSlider.value = state.effects.distortion.amount;
      distortionSlider.nextElementSibling.textContent = `${state.effects.distortion.amount}%`;
    }

    if (distortionSwitch) {
      distortionSwitch.checked = state.effects.distortion.active;
    }

    // Reverb
    const reverbSlider = document.getElementById('reverb-amount');
    const reverbSwitch = document.getElementById('reverb-active');

    if (reverbSlider) {
      reverbSlider.value = state.effects.reverb.amount;
      reverbSlider.nextElementSibling.textContent = `${(state.effects.reverb.amount * 100).toFixed(0)}%`;
    }

    if (reverbSwitch) {
      reverbSwitch.checked = state.effects.reverb.active;
    }

    // Master volume
    const volumeSlider = document.getElementById('master-volume');

    if (volumeSlider) {
      volumeSlider.value = state.master.volume;
      volumeSlider.nextElementSibling.textContent = `${(state.master.volume * 100).toFixed(0)}%`;
    }

    // Reset chaos matrix
    const gridCells = document.querySelectorAll('.grid-cell');
    gridCells.forEach((cell, index) => {
      cell.classList.toggle('active', state.chaosMatrix[index]);
    });

  } catch (e) {
    console.error("Error in resetUIControls:", e);
  }
}

// Create LFO Target buttons for each oscillator
function createLFOTargetSelectors() {
  console.log("Creating LFO target buttons");

  // First clear any existing LFO target buttons to avoid duplicates
  document.querySelectorAll('.lfo-target-container').forEach(el => el.remove());

  // Use direct ID selectors for each oscillator to avoid nth-child issues
  for (let i = 1; i <= 3; i++) {
    // Use a more reliable selector directly by oscillator ID
    const freqControl = document.getElementById(`osc${i}-freq`);
    if (!freqControl) {
      console.error(`Could not find oscillator ${i} frequency control`);
      continue;
    }

    // Get the parent control div
    const oscControls = freqControl.closest('.control');

    if (!oscControls) {
      console.error(`Could not find control container for oscillator ${i}`);
      continue;
    }

    console.log(`Creating LFO buttons for oscillator ${i}`);

    // Create LFO target container
    const lfoTargetContainer = document.createElement('div');
    lfoTargetContainer.className = 'lfo-target-container'; // Add a class for easier selection/removal
    lfoTargetContainer.style.marginTop = '10px';
    lfoTargetContainer.style.display = 'flex';
    lfoTargetContainer.style.alignItems = 'center';
    lfoTargetContainer.style.justifyContent = 'space-between';

    const lfoTargetLabel = document.createElement('label');
    lfoTargetLabel.textContent = 'LFO:';
    lfoTargetLabel.style.marginRight = '8px';
    lfoTargetLabel.style.fontSize = '14px';
    lfoTargetLabel.style.color = 'var(--text-dark)';

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '5px';

    // Create LFO 1 button
    const lfo1Button = document.createElement('button');
    lfo1Button.textContent = 'LFO 1';
    lfo1Button.id = `osc${i}-lfo1-btn`;
    lfo1Button.style.padding = '4px 8px';
    lfo1Button.style.borderRadius = '4px';
    lfo1Button.style.fontSize = '12px';

    // Set initial state
    updateLFOButtonState(lfo1Button, state.oscillators[i].lfo1Target, 'primary');

    // Create LFO 2 button
    const lfo2Button = document.createElement('button');
    lfo2Button.textContent = 'LFO 2';
    lfo2Button.id = `osc${i}-lfo2-btn`;
    lfo2Button.style.padding = '4px 8px';
    lfo2Button.style.borderRadius = '4px';
    lfo2Button.style.fontSize = '12px';

    // Set initial state
    updateLFOButtonState(lfo2Button, state.oscillators[i].lfo2Target, 'secondary');

    // Add event listeners - use closure to capture the current i value
    lfo1Button.addEventListener('click', (function(oscIndex) {
      return function() {
        // Toggle LFO 1 target
        state.oscillators[oscIndex].lfo1Target = !state.oscillators[oscIndex].lfo1Target;

        // Update button style
        updateLFOButtonState(lfo1Button, state.oscillators[oscIndex].lfo1Target, 'primary');

        // Update connections if audio is initialized
        if (state.isInitialized) {
          connectLFOs();
        }

        console.log(`LFO1 for osc${oscIndex} set to ${state.oscillators[oscIndex].lfo1Target}`);
      };
    })(i));

    lfo2Button.addEventListener('click', (function(oscIndex) {
      return function() {
        // Toggle LFO 2 target
        state.oscillators[oscIndex].lfo2Target = !state.oscillators[oscIndex].lfo2Target;

        // Update button style
        updateLFOButtonState(lfo2Button, state.oscillators[oscIndex].lfo2Target, 'secondary');

        // Update connections if audio is initialized
        if (state.isInitialized) {
          connectLFOs();
        }

        console.log(`LFO2 for osc${oscIndex} set to ${state.oscillators[oscIndex].lfo2Target}`);
      };
    })(i));

    // Add buttons to container
    buttonsContainer.appendChild(lfo1Button);
    buttonsContainer.appendChild(lfo2Button);

    // Add to DOM
    lfoTargetContainer.appendChild(lfoTargetLabel);
    lfoTargetContainer.appendChild(buttonsContainer);
    oscControls.appendChild(lfoTargetContainer);

    console.log(`Added LFO buttons for oscillator ${i}`);
  }
}

// Helper function to update LFO button state
function updateLFOButtonState(button, isActive, accentType) {
  if (!button) return;

  button.classList.toggle('active', isActive === true);

  if (isActive) {
    button.style.backgroundColor = `var(--accent-${accentType})`;
    button.style.borderColor = `var(--accent-${accentType})`;
    button.style.color = '#000';
  } else {
    button.style.backgroundColor = '';
    button.style.borderColor = '';
    button.style.color = '';
  }
}

// Initialize the chaos matrix grid
initChaosMatrix();

// Set up all event listeners
setupEventListeners();

// Create LFO target selectors (must be done after event listeners)
createLFOTargetSelectors();

console.log("All components initialized");

// Create and add debug button in development
const debugButton = document.createElement('button');
debugButton.textContent = 'DEBUG';
debugButton.style.position = 'fixed';
debugButton.style.bottom = '10px';
debugButton.style.right = '10px';
debugButton.style.zIndex = '1000';
debugButton.style.opacity = '0.7';
debugButton.style.padding = '5px 10px';
debugButton.style.background = '#333';
debugButton.style.color = '#fff';
debugButton.style.border = '1px solid #555';
debugButton.style.borderRadius = '4px';

debugButton.addEventListener('click', () => {
  console.log('--- DEBUG INFO ---');
  console.log('Audio Context:', audioCtx ? 'Created' : 'Not created');
  console.log('Initialized:', state.isInitialized);
  console.log('Nodes:', nodes);
  console.log('State:', state);

  // Check for LFO button elements
  console.log('LFO Buttons:');
  for (let i = 1; i <= 3; i++) {
    const lfo1 = document.getElementById(`osc${i}-lfo1-btn`);
    const lfo2 = document.getElementById(`osc${i}-lfo2-btn`);
    console.log(`OSC ${i} LFO1 button:`, lfo1 ? 'Found' : 'Missing');
    console.log(`OSC ${i} LFO2 button:`, lfo2 ? 'Found' : 'Missing');
  }

  // Check oscillator active states
  console.log('Oscillator active states:');
  for (let i = 1; i <= 3; i++) {
    const activeSwitch = document.getElementById(`osc${i}-active`);
    console.log(`OSC ${i}:`, {
      'active in state': state.oscillators[i].active,
      'switch checked': activeSwitch ? activeSwitch.checked : 'Switch not found'
    });
  }

  if (audioCtx) {
    console.log('Sample rate:', audioCtx.sampleRate);
    console.log('Current time:', audioCtx.currentTime);
    console.log('State:', audioCtx.state);
  }

  // Attempt a simple beep to test audio system
  try {
    if (audioCtx && audioCtx.state === 'running') {
      const testOsc = audioCtx.createOscillator();
      const testGain = audioCtx.createGain();
      testGain.gain.value = 0.1;
      testOsc.connect(testGain);
      testGain.connect(audioCtx.destination);
      testOsc.frequency.value = 440;
      testOsc.start();
      testOsc.stop(audioCtx.currentTime + 0.2);
      console.log('Test beep played');
    } else {
      console.log('Audio context not running for test beep');
    }
  } catch (e) {
    console.error('Test beep failed:', e);
  }
});

document.body.appendChild(debugButton);