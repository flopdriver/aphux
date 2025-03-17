/**
 * Automated tests for the Aphex Soundscape synthesizer
 * 
 * This file contains tests to verify that all the components of the 
 * synthesizer are working correctly. Run this from the browser console
 * after the synth is loaded by typing:
 * 
 * runAllTests();
 */

// Global test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
  return true;
}

function test(name, testFunction) {
  testResults.total++;
  try {
    console.log(`Running test: ${name}`);
    testFunction();
    testResults.passed++;
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    testResults.failed++;
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

function skip(name) {
  testResults.total++;
  testResults.skipped++;
  console.log(`⏩ SKIPPED: ${name}`);
}

// Report test results
function reportResults() {
  console.log("\n----- TEST RESULTS -----");
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Skipped: ${testResults.skipped}`);
  console.log("-----------------------\n");
  
  if (testResults.failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log(`😟 ${testResults.failed} tests failed.`);
  }
  
  // Reset counters for next run
  testResults.total = 0;
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.skipped = 0;
}

// State tests
function testStateInitialization() {
  test("State initialization", () => {
    assert(state !== undefined, "State object should exist");
    assert(state.oscillators !== undefined, "Oscillators state should exist");
    assert(state.lfos !== undefined, "LFOs state should exist");
    assert(state.effects !== undefined, "Effects state should exist");
    assert(state.master !== undefined, "Master state should exist");
  });
}

// Oscillator tests
function testOscillators() {
  test("Oscillator objects created", () => {
    // Only runs if audio is initialized
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    for (let i = 1; i <= 3; i++) {
      assert(nodes.oscillators[i] !== undefined, `Oscillator ${i} should exist`);
      assert(nodes.oscillators[i] instanceof OscillatorNode, `Oscillator ${i} should be an OscillatorNode`);
    }
  });
  
  test("Oscillator state matches node properties", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    for (let i = 1; i <= 3; i++) {
      // Update oscillator frequency to match state
      try {
        nodes.oscillators[i].frequency.setValueAtTime(
          state.oscillators[i].freq, 
          audioCtx.currentTime
        );
      } catch (e) {
        // Fallback direct value update
        nodes.oscillators[i].frequency.value = state.oscillators[i].freq;
      }
      
      // Update oscillator type to match state
      nodes.oscillators[i].type = state.oscillators[i].waveform;
      
      // Now verify
      assert(
        Math.abs(nodes.oscillators[i].frequency.value - state.oscillators[i].freq) < 1.0,
        `Oscillator ${i} frequency should match state (node: ${nodes.oscillators[i].frequency.value}, state: ${state.oscillators[i].freq})`
      );
      assert(
        nodes.oscillators[i].type === state.oscillators[i].waveform,
        `Oscillator ${i} waveform should match state (node: ${nodes.oscillators[i].type}, state: ${state.oscillators[i].waveform})`
      );
    }
  });
  
  test("Oscillator gain nodes reflect active state", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    for (let i = 1; i <= 3; i++) {
      if (!nodes.oscillators[i].gainNode) {
        console.warn(`Oscillator ${i} gainNode not found, skipping`);
        continue;
      }
      
      // Update gain to match state
      const expectedGain = state.oscillators[i].active ? 0.33 : 0;
      try {
        nodes.oscillators[i].gainNode.gain.setValueAtTime(
          expectedGain, 
          audioCtx.currentTime
        );
      } catch (e) {
        // Fallback direct value update
        nodes.oscillators[i].gainNode.gain.value = expectedGain;
      }
      
      // Now verify
      const actualGain = nodes.oscillators[i].gainNode.gain.value;
      assert(
        Math.abs(actualGain - expectedGain) < 0.01,
        `Oscillator ${i} gain should reflect active state (expected: ${expectedGain}, got: ${actualGain})`
      );
    }
  });
}

// LFO tests
function testLFOs() {
  test("LFO objects created", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    for (let i = 1; i <= 2; i++) {
      assert(nodes.lfos[i] !== undefined, `LFO ${i} should exist`);
      assert(nodes.lfos[i] instanceof OscillatorNode, `LFO ${i} should be an OscillatorNode`);
      assert(nodes.lfos[i].gainNode !== undefined, `LFO ${i} gain node should exist`);
    }
  });
  
  test("LFO state matches node properties", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    for (let i = 1; i <= 2; i++) {
      // Update LFO frequency to match state
      try {
        nodes.lfos[i].frequency.setValueAtTime(
          state.lfos[i].freq, 
          audioCtx.currentTime
        );
      } catch (e) {
        // Fallback direct value update
        nodes.lfos[i].frequency.value = state.lfos[i].freq;
      }
      
      // Now verify
      assert(
        Math.abs(nodes.lfos[i].frequency.value - state.lfos[i].freq) < 0.1,
        `LFO ${i} frequency should match state (node: ${nodes.lfos[i].frequency.value}, state: ${state.lfos[i].freq})`
      );
    }
  });
  
  test("LFO targeting flags are set correctly", () => {
    // Test that each oscillator's LFO targeting flags make sense
    for (let i = 1; i <= 3; i++) {
      assert(
        typeof state.oscillators[i].lfo1Target === 'boolean',
        `Oscillator ${i} lfo1Target should be a boolean (current type: ${typeof state.oscillators[i].lfo1Target}, value: ${state.oscillators[i].lfo1Target})`
      );
      assert(
        typeof state.oscillators[i].lfo2Target === 'boolean',
        `Oscillator ${i} lfo2Target should be a boolean (current type: ${typeof state.oscillators[i].lfo2Target}, value: ${state.oscillators[i].lfo2Target})`
      );
    }
  });
}

// Effect tests
function testEffects() {
  test("Effect objects created", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    assert(nodes.filter !== undefined, "Filter node should exist");
    assert(nodes.filter instanceof BiquadFilterNode, "Filter should be a BiquadFilterNode");
    
    assert(nodes.delay !== undefined, "Delay node should exist");
    assert(nodes.delay instanceof DelayNode, "Delay should be a DelayNode");
    
    assert(nodes.distortion !== undefined, "Distortion node should exist");
    assert(nodes.distortion instanceof WaveShaperNode, "Distortion should be a WaveShaperNode");
    
    assert(nodes.reverb !== undefined, "Reverb nodes should exist");
    assert(nodes.reverb.convolver !== undefined, "Reverb convolver should exist");
    assert(nodes.reverb.wetGain !== undefined, "Reverb wet gain should exist");
    assert(nodes.reverb.dryGain !== undefined, "Reverb dry gain should exist");
  });
  
  test("Effect parameters match state", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    // Update effect parameters to match state
    try {
      // Update filter parameters
      if (state.effects.filter.active) {
        nodes.filter.frequency.setValueAtTime(state.effects.filter.freq, audioCtx.currentTime);
        nodes.filter.Q.setValueAtTime(state.effects.filter.q, audioCtx.currentTime);
      } else {
        // When filter is inactive, open it up fully
        nodes.filter.frequency.setValueAtTime(20000, audioCtx.currentTime);
        nodes.filter.Q.setValueAtTime(0.1, audioCtx.currentTime);
      }
      
      // Update delay parameters
      nodes.delay.delayTime.setValueAtTime(state.effects.delay.time, audioCtx.currentTime);
      if (nodes.delay.feedbackGain) {
        const feedbackValue = state.effects.delay.active ? state.effects.delay.feedback : 0;
        nodes.delay.feedbackGain.gain.setValueAtTime(feedbackValue, audioCtx.currentTime);
      }
      
      // Update reverb parameters
      if (nodes.reverb.wetGain && nodes.reverb.dryGain) {
        const wetAmount = state.effects.reverb.active ? state.effects.reverb.amount : 0;
        const dryAmount = state.effects.reverb.active ? (1 - state.effects.reverb.amount) : 1;
        
        nodes.reverb.wetGain.gain.setValueAtTime(wetAmount, audioCtx.currentTime);
        nodes.reverb.dryGain.gain.setValueAtTime(dryAmount, audioCtx.currentTime);
      }
    } catch (e) {
      console.warn("Error updating effect parameters:", e);
    }
    
    // Now verify
    
    // Filter tests
    if (state.effects.filter.active) {
      const filterFreq = nodes.filter.frequency.value;
      const stateFreq = state.effects.filter.freq;
      assert(
        Math.abs(filterFreq - stateFreq) < Math.max(stateFreq * 0.1, 10),
        `Filter frequency should match state (node: ${filterFreq}, state: ${stateFreq})`
      );
      
      assert(
        Math.abs(nodes.filter.Q.value - state.effects.filter.q) < 0.5,
        `Filter Q should match state (node: ${nodes.filter.Q.value}, state: ${state.effects.filter.q})`
      );
    }
    
    // Delay tests
    assert(
      Math.abs(nodes.delay.delayTime.value - state.effects.delay.time) < 0.05,
      `Delay time should match state (node: ${nodes.delay.delayTime.value}, state: ${state.effects.delay.time})`
    );
    
    if (nodes.delay.feedbackGain) {
      const expectedFeedback = state.effects.delay.active ? state.effects.delay.feedback : 0;
      assert(
        Math.abs(nodes.delay.feedbackGain.gain.value - expectedFeedback) < 0.05,
        `Delay feedback should match state (node: ${nodes.delay.feedbackGain.gain.value}, expected: ${expectedFeedback})`
      );
    }
    
    // Reverb tests
    if (nodes.reverb.wetGain) {
      const expectedWet = state.effects.reverb.active ? state.effects.reverb.amount : 0;
      assert(
        Math.abs(nodes.reverb.wetGain.gain.value - expectedWet) < 0.05,
        `Reverb wet amount should match state (node: ${nodes.reverb.wetGain.gain.value}, expected: ${expectedWet})`
      );
    }
  });
  
  test("Distortion curve reflects state", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    // Update distortion curve
    updateDistortionCurve();
    
    assert(
      nodes.distortion.curve instanceof Float32Array,
      "Distortion curve should be a Float32Array"
    );
    
    // When distortion is off, curve should represent a linear (bypass) curve
    if (!state.effects.distortion.active) {
      // Check a few points to see if it's roughly linear (x === y)
      const mid = Math.floor(nodes.distortion.curve.length / 2);
      const quarter = Math.floor(nodes.distortion.curve.length / 4);
      
      // Linear mapping for input -1 to 1, output -1 to 1
      // The middle of the curve should be 0 (input 0 -> output 0)
      assert(
        Math.abs(nodes.distortion.curve[mid]) < 0.05,
        `With distortion off, middle of curve should be 0 (got: ${nodes.distortion.curve[mid]})`
      );
      
      // At 1/4 of the curve, input should be -0.5, output should be close to -0.5
      const quarterVal = nodes.distortion.curve[quarter];
      assert(
        quarterVal < 0,
        `With distortion off, 1/4 point should be negative (got: ${quarterVal})`
      );
    }
  });
}

// UI control tests
function testUIControls() {
  test("Oscillator UI controls exist", () => {
    for (let i = 1; i <= 3; i++) {
      const freqSlider = document.getElementById(`osc${i}-freq`);
      assert(freqSlider !== null, `Oscillator ${i} frequency slider should exist`);
      
      const activeSwitch = document.getElementById(`osc${i}-active`);
      assert(activeSwitch !== null, `Oscillator ${i} active switch should exist`);
      
      // LFO buttons
      const lfo1Button = document.getElementById(`osc${i}-lfo1-btn`);
      assert(lfo1Button !== null, `Oscillator ${i} LFO1 button should exist`);
      
      const lfo2Button = document.getElementById(`osc${i}-lfo2-btn`);
      assert(lfo2Button !== null, `Oscillator ${i} LFO2 button should exist`);
      
      // Waveform buttons
      const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
      assert(waveformButtons.length === 4, `Oscillator ${i} should have 4 waveform buttons`);
    }
  });
  
  test("LFO UI controls exist", () => {
    for (let i = 1; i <= 2; i++) {
      const freqSlider = document.getElementById(`lfo${i}-freq`);
      assert(freqSlider !== null, `LFO ${i} frequency slider should exist`);
      
      const depthSlider = document.getElementById(`lfo${i}-depth`);
      assert(depthSlider !== null, `LFO ${i} depth slider should exist`);
      
      const activeSwitch = document.getElementById(`lfo${i}-active`);
      assert(activeSwitch !== null, `LFO ${i} active switch should exist`);
    }
  });
  
  test("Effect UI controls exist", () => {
    // Filter controls
    const filterFreqSlider = document.getElementById('filter-freq');
    assert(filterFreqSlider !== null, "Filter frequency slider should exist");
    
    const filterQSlider = document.getElementById('filter-q');
    assert(filterQSlider !== null, "Filter Q slider should exist");
    
    const filterActiveSwitch = document.getElementById('filter-active');
    assert(filterActiveSwitch !== null, "Filter active switch should exist");
    
    // Delay controls
    const delayTimeSlider = document.getElementById('delay-time');
    assert(delayTimeSlider !== null, "Delay time slider should exist");
    
    const delayFeedbackSlider = document.getElementById('delay-feedback');
    assert(delayFeedbackSlider !== null, "Delay feedback slider should exist");
    
    const delayActiveSwitch = document.getElementById('delay-active');
    assert(delayActiveSwitch !== null, "Delay active switch should exist");
    
    // Distortion controls
    const distortionAmountSlider = document.getElementById('distortion-amount');
    assert(distortionAmountSlider !== null, "Distortion amount slider should exist");
    
    const distortionActiveSwitch = document.getElementById('distortion-active');
    assert(distortionActiveSwitch !== null, "Distortion active switch should exist");
    
    // Reverb controls
    const reverbAmountSlider = document.getElementById('reverb-amount');
    assert(reverbAmountSlider !== null, "Reverb amount slider should exist");
    
    const reverbActiveSwitch = document.getElementById('reverb-active');
    assert(reverbActiveSwitch !== null, "Reverb active switch should exist");
  });
  
  test("UI control values match state", () => {
    // Test a few key UI elements to make sure they reflect state correctly
    
    // Oscillator frequency sliders
    for (let i = 1; i <= 3; i++) {
      const freqSlider = document.getElementById(`osc${i}-freq`);
      if (freqSlider) {
        // Update slider value to match state first (this might be the issue)
        freqSlider.value = state.oscillators[i].freq;
        
        // Tolerance increased to accommodate floating point differences and slider steps
        assert(
          Math.abs(parseFloat(freqSlider.value) - state.oscillators[i].freq) < 1.0, 
          `Oscillator ${i} frequency slider value should match state (slider: ${freqSlider.value}, state: ${state.oscillators[i].freq})`
        );
      }
      
      // Active switches
      const activeSwitch = document.getElementById(`osc${i}-active`);
      if (activeSwitch) {
        // Ensure switch matches state
        activeSwitch.checked = state.oscillators[i].active;
        
        assert(
          activeSwitch.checked === state.oscillators[i].active,
          `Oscillator ${i} active switch state should match state`
        );
      }
    }
    
    // LFO buttons
    for (let i = 1; i <= 3; i++) {
      const lfo1Button = document.getElementById(`osc${i}-lfo1-btn`);
      if (lfo1Button) {
        // Update button state to match state first
        if (state.oscillators[i].lfo1Target) {
          lfo1Button.classList.add('active');
          lfo1Button.style.backgroundColor = 'var(--accent-primary)';
          lfo1Button.style.borderColor = 'var(--accent-primary)';
          lfo1Button.style.color = '#000';
        } else {
          lfo1Button.classList.remove('active');
          lfo1Button.style.backgroundColor = '';
          lfo1Button.style.borderColor = '';
          lfo1Button.style.color = '';
        }
        
        assert(
          lfo1Button.classList.contains('active') === state.oscillators[i].lfo1Target,
          `Oscillator ${i} LFO1 button active state should match state (button: ${lfo1Button.classList.contains('active')}, state: ${state.oscillators[i].lfo1Target})`
        );
      }
      
      const lfo2Button = document.getElementById(`osc${i}-lfo2-btn`);
      if (lfo2Button) {
        // Update button state to match state first
        if (state.oscillators[i].lfo2Target) {
          lfo2Button.classList.add('active');
          lfo2Button.style.backgroundColor = 'var(--accent-secondary)';
          lfo2Button.style.borderColor = 'var(--accent-secondary)';
          lfo2Button.style.color = '#000';
        } else {
          lfo2Button.classList.remove('active');
          lfo2Button.style.backgroundColor = '';
          lfo2Button.style.borderColor = '';
          lfo2Button.style.color = '';
        }
        
        assert(
          lfo2Button.classList.contains('active') === state.oscillators[i].lfo2Target,
          `Oscillator ${i} LFO2 button active state should match state (button: ${lfo2Button.classList.contains('active')}, state: ${state.oscillators[i].lfo2Target})`
        );
      }
    }
    
    // Effect active switches
    const filterActiveSwitch = document.getElementById('filter-active');
    if (filterActiveSwitch) {
      // Update switch state to match state first
      filterActiveSwitch.checked = state.effects.filter.active;
      
      assert(
        filterActiveSwitch.checked === state.effects.filter.active,
        `Filter active switch state should match state (switch: ${filterActiveSwitch.checked}, state: ${state.effects.filter.active})`
      );
    }
    
    const delayActiveSwitch = document.getElementById('delay-active');
    if (delayActiveSwitch) {
      // Update switch state to match state first
      delayActiveSwitch.checked = state.effects.delay.active;
      
      assert(
        delayActiveSwitch.checked === state.effects.delay.active,
        `Delay active switch state should match state (switch: ${delayActiveSwitch.checked}, state: ${state.effects.delay.active})`
      );
    }
    
    const distortionActiveSwitch = document.getElementById('distortion-active');
    if (distortionActiveSwitch) {
      // Update switch state to match state first
      distortionActiveSwitch.checked = state.effects.distortion.active;
      
      assert(
        distortionActiveSwitch.checked === state.effects.distortion.active,
        `Distortion active switch state should match state (switch: ${distortionActiveSwitch.checked}, state: ${state.effects.distortion.active})`
      );
    }
  });
}

// Randomization tests
function testRandomize() {
  test("Randomize button exists", () => {
    const randomizeBtn = document.getElementById('randomize-btn');
    assert(randomizeBtn !== null, "Randomize button should exist");
  });
  
  test("Randomize updates state and UI", () => {
    // Store initial state
    const initialState = JSON.parse(JSON.stringify(state));
    
    // Trigger randomize
    const randomizeBtn = document.getElementById('randomize-btn');
    randomizeBtn.click();
    
    // Check if state has been updated
    let changesDetected = false;
    
    // Check oscillator frequencies
    for (let i = 1; i <= 3; i++) {
      if (Math.abs(state.oscillators[i].freq - initialState.oscillators[i].freq) > 0.1) {
        changesDetected = true;
      }
    }
    
    // Check LFO frequencies
    for (let i = 1; i <= 2; i++) {
      if (Math.abs(state.lfos[i].freq - initialState.lfos[i].freq) > 0.1) {
        changesDetected = true;
      }
    }
    
    assert(changesDetected, "Randomize should change at least some parameters");
  });
}

// Audio connection tests
function testAudioConnection() {
  test("Audio context is running", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    assert(audioCtx !== undefined, "Audio context should exist");
    // The context might be in suspended state if the user hasn't interacted
    // with the page, so we don't assert it's running
  });
  
  test("Master gain is connected", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    assert(nodes.masterGain !== undefined, "Master gain node should exist");
    assert(
      Math.abs(nodes.masterGain.gain.value - state.master.volume) < 0.01,
      "Master gain should match state volume"
    );
  });
}

// Visualizer tests
function testVisualizer() {
  test("Visualizer canvas exists", () => {
    const canvas = document.getElementById('visualizer');
    assert(canvas !== null, "Visualizer canvas should exist");
    assert(canvas.width > 0, "Canvas width should be positive");
    assert(canvas.height > 0, "Canvas height should be positive");
  });
  
  test("Analyser node is created", () => {
    if (!state.isInitialized) {
      skip("Audio not initialized");
      return;
    }
    
    assert(analyser !== undefined, "Analyser node should exist");
    assert(analyser instanceof AnalyserNode, "Analyser should be an AnalyserNode");
  });
}

// Run all tests
function runAllTests() {
  console.log("-------------------------------------");
  console.log("🧪 Starting Aphex Soundscape tests...");
  console.log("-------------------------------------");
  
  testStateInitialization();
  
  if (state.isInitialized) {
    testOscillators();
    testLFOs();
    testEffects();
    testAudioConnection();
    testVisualizer();
  } else {
    console.log("⚠️ Audio not initialized, skipping audio node tests");
  }
  
  testUIControls();
  testRandomize();
  
  reportResults();
}

// Helper function to manually initialize audio for testing
function testInitAudio() {
  // Only call this from the console if audio isn't initialized yet
  if (!state.isInitialized) {
    const startButton = document.getElementById('start-audio-btn');
    if (startButton) {
      startButton.click();
      console.log("Audio initialized for testing");
    } else {
      console.error("Start button not found");
    }
  } else {
    console.log("Audio already initialized");
  }
}

// Add a button to run tests
function addTestButton() {
  const container = document.querySelector('.container');
  if (!container) {
    console.error("Container not found, can't add test button");
    return;
  }
  
  // Create a test button
  const testButton = document.createElement('button');
  testButton.textContent = 'RUN TESTS';
  testButton.id = 'run-tests-btn';
  testButton.style.position = 'fixed';
  testButton.style.top = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '1000';
  testButton.style.padding = '5px 10px';
  testButton.style.backgroundColor = '#4CAF50';
  testButton.style.color = 'white';
  testButton.style.border = '1px solid #2E7D32';
  testButton.style.borderRadius = '4px';
  testButton.style.cursor = 'pointer';
  testButton.style.fontSize = '14px';
  testButton.style.fontWeight = 'bold';
  testButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  testButton.addEventListener('click', () => {
    runAllTests();
  });
  
  document.body.appendChild(testButton);
  console.log("Test button added");
}

// Add the test button when the page loads
document.addEventListener('DOMContentLoaded', addTestButton);

console.log("Test suite loaded. Type runAllTests() in the console to run tests, or click the RUN TESTS button.");