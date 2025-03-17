// src/main.js
import { AudioCore } from './modules/AudioCore.js';
import { OscillatorManager } from './modules/OscillatorManager.js';
import { ModulationManager } from './modules/ModulationManager.js';
import { EffectsChain } from './modules/EffectsChain.js';
import { VisualizerCore } from './modules/visualization/VisualizerCore.js';
import { ChaosMatrix } from './modules/ChaosMatrix.js';
import { UIController } from './modules/UIController.js';
import { StateManager } from './modules/StateManager.js';

// Create a global audio debug function
function addDebugFunction() {
  window.debugAudio = function() {
    const audioCore = window._audioCore;
    const oscillatorManager = window._oscillatorManager;
    const effectsChain = window._effectsChain;

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

  // Add global references for debugging
  window._audioCore = audioCore;
  window._oscillatorManager = oscillatorManager;
  window._modulationManager = modulationManager;
  window._effectsChain = effectsChain;
  window._chaosMatrix = chaosMatrix;

  // Add debug function
  addDebugFunction();

  // Initialize UI controller after all other modules
  const uiController = new UIController(
      audioCore,
      oscillatorManager,
      modulationManager,
      effectsChain,
      chaosMatrix
  );

  // Initialize visualization after all modules
  const visualizer = new VisualizerCore(audioCore, oscillatorManager, modulationManager, effectsChain, chaosMatrix);

  // Register modules with state manager (optional for future enhancements)
  stateManager.registerModule('audioCore', audioCore);
  stateManager.registerModule('oscillatorManager', oscillatorManager);
  stateManager.registerModule('modulationManager', modulationManager);
  stateManager.registerModule('effectsChain', effectsChain);
  stateManager.registerModule('visualizer', visualizer);
  stateManager.registerModule('chaosMatrix', chaosMatrix);
  stateManager.registerModule('uiController', uiController);

  // Setup visualization toggle buttons
  setupVisualizerToggles(visualizer);

  // Initialize UI components
  chaosMatrix.initChaosMatrix();
  visualizer.initVisualizer();
  uiController.createLFOTargetSelectors();
  uiController.setupEventListeners();

  // Handle window resize for visualization
  window.addEventListener('resize', () => {
    visualizer.handleResize();
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
    console.log('UI Controller:', uiController);
    console.log('Visualizer:', visualizer);
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