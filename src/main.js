// src/main.js
import { AudioCore } from './modules/AudioCore.js';
import { OscillatorManager } from './modules/OscillatorManager.js';
import { ModulationManager } from './modules/ModulationManager.js';
import { EffectsChain } from './modules/EffectsChain.js';
import { VisualizerCore } from './modules/visualization/VisualizerCore.js';
import { ChaosMatrix } from './modules/ChaosMatrix.js';
import { UIController } from './modules/UIController.js';
import { StateManager } from './modules/StateManager.js';
import { VoiceSynth } from './modules/VoiceSynth.js';
import { DigitalCharacter } from './modules/DigitalCharacter.js'; // Import the new DigitalCharacter

// Create a global audio debug function
function addDebugFunction() {
  window.debugAudio = function() {
    const audioCore = window._audioCore;
    const oscillatorManager = window._oscillatorManager;
    const effectsChain = window._effectsChain;
    const digitalCharacter = window._digitalCharacter;

    console.log('--- DETAILED AUDIO DEBUG ---');

    // Check audio context
    const audioCtx = audioCore?.getAudioContext();
    console.log('Audio Context:', audioCtx ? 'Created' : 'Missing', audioCtx?.state);

    // Check master gain
    const masterGain = audioCore?.getMasterGain();
    console.log('Master Gain:', masterGain ? 'Created' : 'Missing', masterGain?.gain.value);

    // Check oscillators
    const oscillators = oscillatorManager?.getOscillators();
    console.log('Oscillators:', oscillators ? `${Object.keys(oscillators).length} created` : 'Missing');

    if (oscillators) {
      Object.entries(oscillators).forEach(([id, osc]) => {
        console.log(`- Oscillator ${id}: Frequency=${osc.frequency.value}Hz, Type=${osc.type}, Gain=${osc.gainNode?.gain.value}`);
      });
    }

    // Check filter
    const filter = effectsChain?.getFilter();
    console.log('Filter:', filter ? 'Created' : 'Missing', filter?.frequency.value);

    // Check voice synth
    const voiceSynth = window._voiceSynth;
    if (voiceSynth) {
      const voiceState = voiceSynth.getState();
      console.log('Voice Synth:', voiceState.active ? 'Active' : 'Inactive');
      console.log('- Voice Type:', voiceState.voiceType);
      console.log('- Vowel Sequence:', voiceState.vowelSequence.join(', '));
    }

    // Check digital character
    if (digitalCharacter) {
      console.log('Digital Character:', digitalCharacter);
      console.log('- Mood:', digitalCharacter.getCharacterMood());
      console.log('- Interaction History:', digitalCharacter.interactionHistory);
    }

    // Test simple beep
    if (audioCtx && audioCtx.state === 'running') {
      try {
        const testOsc = audioCtx.createOscillator();
        const testGain = audioCtx.createGain();
        testGain.gain.value = 0.2;
        testOsc.connect(testGain);
        testGain.connect(audioCtx.destination);
        testOsc.frequency.value = 440;
        testOsc.start();
        testOsc.stop(audioCtx.currentTime + 0.2);
        console.log('Test beep played directly to destination');

        // Now try through master gain
        const testOsc2 = audioCtx.createOscillator();
        const testGain2 = audioCtx.createGain();
        testGain2.gain.value = 0.2;
        testOsc2.connect(testGain2);
        if (masterGain) {
          testGain2.connect(masterGain);
          testOsc2.frequency.value = 880;
          testOsc2.start();
          testOsc2.stop(audioCtx.currentTime + 0.2);
          console.log('Test beep played through master gain');
        }
      } catch (e) {
        console.error('Test beep failed:', e);
      }
    }
  };
}

// Create debug button function
function createDebugButton() {
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

  return debugButton;
}

// Modify the existing createGlitchText function to expose it globally
function createGlitchText(text, options = {}) {
  const overlay = document.getElementById('glitch-overlay');
  if (!overlay) return;

  const createGlitchElement = () => {
    const glitchText = document.createElement('div');
    glitchText.classList.add('glitch-text');

    // If a specific style is passed, apply it
    if (options.style) {
      Object.keys(options.style).forEach(prop => {
        glitchText.style[prop] = options.style[prop];
      });
    }

    glitchText.textContent = text;

    // Random positioning with optional constraints
    glitchText.style.left = options.left || `${Math.random() * 90}%`;
    glitchText.style.top = options.top || `${Math.random() * 90}%`;

    // Random sizing
    const fontSize = options.fontSize || Math.floor(Math.random() * 20 + 10);
    glitchText.style.fontSize = `${fontSize}px`;

    // Random animations
    const animations = [
      'glitch-animation-1',
      'glitch-animation-2',
      'glitch-flicker',
      'terminal-flicker',
      'glitch-skew'
    ];

    const randomAnimation = options.animation ||
        animations[Math.floor(Math.random() * animations.length)];

    const animationDuration = options.animationDuration ||
        (Math.random() * 0.5 + 0.5);

    glitchText.style.animation = `${randomAnimation} ${animationDuration}s infinite`;

    overlay.appendChild(glitchText);

    // Remove after a short time
    setTimeout(() => {
      overlay.removeChild(glitchText);
    }, options.duration || 2000);
  };
}

// Expose createGlitchText globally
if (window) {
  window.createGlitchText = createGlitchText;
}

// Rest of the main.js remains the same...

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing Aphex Soundscape...');

  // Initialize modules
  const audioCore = new AudioCore();
  const oscillatorManager = new OscillatorManager(audioCore);
  const modulationManager = new ModulationManager(audioCore, oscillatorManager);
  const effectsChain = new EffectsChain(audioCore);
  const chaosMatrix = new ChaosMatrix(audioCore, oscillatorManager, effectsChain);
  const stateManager = new StateManager();

  // Initialize voice synth module
  const voiceSynth = new VoiceSynth(audioCore, oscillatorManager, modulationManager);

  // Initialize visualizer
  const visualizerCore = new VisualizerCore(
      audioCore,
      oscillatorManager,
      modulationManager,
      effectsChain,
      chaosMatrix
  );

  // Initialize Digital Character with complete context
  const digitalCharacter = new DigitalCharacter(
      voiceSynth,
      oscillatorManager,
      effectsChain,
      visualizerCore
  );

  // Add periodic glitch text generation tied to digital character
  if (window._digitalCharacter) {
    const digitalCharacter = window._digitalCharacter;

    setInterval(() => {
      // Determine text source based on character's current state
      const mood = digitalCharacter.getCharacterMood();
      const interactionHistory = digitalCharacter.interactionHistory;

      let textSource;
      let textOptions = {};

      // Choose text based on interaction history and mood
      if (interactionHistory.complexPatchCreation > 5) {
        // Technical, nerdy comments
        textSource = digitalCharacter._getRandomComment('techNerdComments');
        textOptions = {
          style: { color: '#00FF66' },
          animation: 'terminal-flicker',
          fontSize: 14
        };
      } else if (interactionHistory.experimentalTechniques > 3) {
        // Scene references
        textSource = digitalCharacter._getRandomComment('sceneReferences');
        textOptions = {
          style: { color: '#00FFAA' },
          animation: 'glitch-animation-2',
          fontSize: 16
        };
      } else if (interactionHistory.uniqueModulations > 2) {
        // Production tips
        textSource = digitalCharacter._getRandomComment('productionTips');
        textOptions = {
          style: { color: '#33FF33' },
          animation: 'glitch-skew',
          fontSize: 12
        };
      } else {
        // Default to a random comment
        const commentTypes = [
          'techNerdComments',
          'sceneReferences',
          'productionTips'
        ];
        const randomType = commentTypes[Math.floor(Math.random() * commentTypes.length)];
        textSource = digitalCharacter._getRandomComment(randomType);
      }

      // If we have a text source, create glitch text
      if (textSource) {
        createGlitchText(textSource, textOptions);
      }
    }, 10000); // Every 10 seconds
  }

  // Add global references for debugging
  window._audioCore = audioCore;
  window._oscillatorManager = oscillatorManager;
  window._modulationManager = modulationManager;
  window._effectsChain = effectsChain;
  window._chaosMatrix = chaosMatrix;
  window._voiceSynth = voiceSynth;
  window._digitalCharacter = digitalCharacter;
  window._visualizerCore = visualizerCore;

  // Add debug function
  addDebugFunction();

  // Initialize UI controller after all other modules
  const uiController = new UIController(
      audioCore,
      oscillatorManager,
      modulationManager,
      effectsChain,
      chaosMatrix,
      voiceSynth
  );

  // Register modules with state manager
  stateManager.registerModule('audioCore', audioCore);
  stateManager.registerModule('oscillatorManager', oscillatorManager);
  stateManager.registerModule('modulationManager', modulationManager);
  stateManager.registerModule('effectsChain', effectsChain);
  stateManager.registerModule('visualizer', visualizerCore);
  stateManager.registerModule('chaosMatrix', chaosMatrix);
  stateManager.registerModule('uiController', uiController);
  stateManager.registerModule('voiceSynth', voiceSynth);
  stateManager.registerModule('digitalCharacter', digitalCharacter);

  // Setup visualization toggle buttons
  setupVisualizerToggles(visualizerCore);

  // Initialize UI components
  chaosMatrix.initChaosMatrix();
  visualizerCore.initVisualizer();
  uiController.createLFOTargetSelectors();
  uiController.setupEventListeners();

  // Handle window resize for visualization
  window.addEventListener('resize', () => {
    visualizerCore.handleResize();
  });

  // Create and add debug button in development mode
  const debugButton = createDebugButton();
  debugButton.addEventListener('click', () => {
    console.log('--- DEBUG INFO ---');
    console.log('Audio Core:', audioCore);
    console.log('Oscillator Manager:', oscillatorManager);
    console.log('Modulation Manager:', modulationManager);
    console.log('Effects Chain:', effectsChain);
    console.log('Chaos Matrix:', chaosMatrix);
    console.log('Voice Synth:', voiceSynth);
    console.log('UI Controller:', uiController);
    console.log('Visualizer:', visualizerCore);
    console.log('Digital Character:', digitalCharacter);
    console.log('State Manager:', stateManager);

    const audioCtx = audioCore.getAudioContext();
    if (audioCtx) {
      console.log('Audio Context State:', audioCtx.state);
      console.log('Sample Rate:', audioCtx.sampleRate);
      console.log('Current Time:', audioCtx.currentTime);
    }

    // Call the detailed debug function
    window.debugAudio();

    // Test beep
    if (audioCtx && audioCtx.state === 'running') {
      try {
        const testOsc = audioCtx.createOscillator();
        const testGain = audioCtx.createGain();
        testGain.gain.value = 0.1;
        testOsc.connect(testGain);
        testGain.connect(audioCtx.destination);
        testOsc.frequency.value = 440;
        testOsc.start();
        testOsc.stop(audioCtx.currentTime + 0.2);
        console.log('Test beep played');
      } catch (e) {
        console.error('Test beep failed:', e);
      }
    }
  });

  document.body.appendChild(debugButton);

  console.log('Aphex Soundscape initialization complete');
});

// Function to setup visualization toggle buttons
function setupVisualizerToggles(visualizer) {
  const toggles = {
    'toggle-background': 'drawBackground',
    'toggle-spectrum': 'drawSpectrum',
    'toggle-waveform': 'drawWaveform',
    'toggle-particles': 'drawParticles',
    'toggle-exotic-patterns': 'drawExoticPatterns',
    'toggle-aphex-logo': 'drawLogo'
  };

  Object.entries(toggles).forEach(([buttonId, methodName]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener('click', () => {
        // Toggle active class
        button.classList.toggle('active');

        // Update visualization visibility setting
        visualizer.toggleVisualizerElement(methodName, button.classList.contains('active'));
      });
    }
  });
}