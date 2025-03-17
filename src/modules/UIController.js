// src/modules/UIController.js
export class UIController {
    constructor(audioCore, oscillatorManager, modulationManager, effectsChain, chaosMatrix) {
        this.audioCore = audioCore;
        this.oscillatorManager = oscillatorManager;
        this.modulationManager = modulationManager;
        this.effectsChain = effectsChain;
        this.chaosMatrix = chaosMatrix;

        console.log("UIController initialized");
    }

    // Set up all event listeners
    setupEventListeners() {
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
            const audioState = this.audioCore.getState();

            if (!audioState.isInitialized) {
                // Initialize the audio system
                if (this.audioCore.initAudio()) {
                    console.log("Audio initialized successfully, setting up modules...");

                    // Initialize all modules
                    this.oscillatorManager.initOscillators();
                    this.modulationManager.initLFOs();
                    this.effectsChain.initEffects();

                    // Connect oscillators to filter
                    console.log("Connecting oscillators to filter...");
                    this.oscillatorManager.connectOscillatorsTo(this.effectsChain.getFilter());

                    // Connect LFOs to their targets
                    console.log("Connecting LFOs to targets...");
                    this.modulationManager.connectLFOs(this.effectsChain.getFilter());

                    // Set up effect chain routing
                    console.log("Setting up effect chain routing...");
                    this.effectsChain.setupEffectChain(this.effectsChain.getFilter());

                    // Make sure we have proper master volume
                    this.audioCore.updateMasterVolume(0.7);

                    // Start oscillators and LFOs
                    console.log("Starting oscillators and LFOs...");
                    this.oscillatorManager.startOscillators();
                    this.modulationManager.startLFOs();

                    // Log connection status
                    console.log({
                        oscillators: this.oscillatorManager.getOscillators(),
                        filter: this.effectsChain.getFilter(),
                        masterGain: this.audioCore.getMasterGain()
                    });
                } else {
                    console.error("Failed to initialize audio");
                }

                startButton.style.display = 'none';
                stopButton.style.display = 'block';
                resetButton.style.display = 'block';
            } else if (this.audioCore.getAudioContext().state === 'suspended') {
                this.audioCore.resume();
                startButton.style.display = 'none';
                stopButton.style.display = 'block';
            }
        });

        // STOP button click handler
        stopButton.addEventListener('click', () => {
            const audioCtx = this.audioCore.getAudioContext();

            if (audioCtx && audioCtx.state === 'running') {
                this.audioCore.suspend();
                stopButton.style.display = 'none';
                startButton.style.display = 'block';
                startButton.textContent = 'RESUME AUDIO';
            }
        });

        // RESET button click handler
        resetButton.addEventListener('click', async () => {
            // Stop current audio context
            await this.audioCore.close();

            // Reset UI
            this.resetUIControls();

            // Update button states
            startButton.style.display = 'block';
            startButton.textContent = 'START AUDIO';
            stopButton.style.display = 'none';
            resetButton.style.display = 'none';

            // Reinitialize the modules
            location.reload(); // For simplicity, just reload the page
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
            freqSlider.addEventListener('input', (event) => {
                const freq = parseFloat(event.target.value);
                this.oscillatorManager.updateFrequency(i, freq);

                if (valueSpan) {
                    valueSpan.textContent = `${freq.toFixed(0)} Hz`;
                }

                // Update LFO connections for changed frequency
                if (this.audioCore.getState().isInitialized) {
                    this.modulationManager.connectLFOs(this.effectsChain.getFilter());
                }

                console.log(`Oscillator ${i} frequency set to ${freq} Hz`);
            });

            if (!activeSwitch) {
                console.error(`Could not find active switch for oscillator ${i}`);
                continue;
            }

            activeSwitch.addEventListener('change', (event) => {
                this.oscillatorManager.toggleActive(i, event.target.checked);
                console.log(`Oscillator ${i} active state set to ${event.target.checked}`);
            });

            // Waveform selector buttons
            const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
            waveformButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const waveType = button.getAttribute('data-wave');

                    // Update UI
                    waveformButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Update oscillator
                    this.oscillatorManager.updateWaveform(i, waveType);
                });
            });
        }

        // LFO controls
        for (let i = 1; i <= 2; i++) {
            const freqSlider = document.getElementById(`lfo${i}-freq`);
            const depthSlider = document.getElementById(`lfo${i}-depth`);
            const activeSwitch = document.getElementById(`lfo${i}-active`);

            if (freqSlider) {
                freqSlider.addEventListener('input', (event) => {
                    const freq = parseFloat(event.target.value);
                    this.modulationManager.updateLfoFrequency(i, freq);

                    if (freqSlider.nextElementSibling) {
                        freqSlider.nextElementSibling.textContent = `${freq.toFixed(1)} Hz`;
                    }
                });
            }

            if (depthSlider) {
                depthSlider.addEventListener('input', (event) => {
                    const depth = parseFloat(event.target.value);
                    this.modulationManager.updateLfoDepth(i, depth, this.effectsChain.getFilter());

                    if (depthSlider.nextElementSibling) {
                        depthSlider.nextElementSibling.textContent = `${depth}%`;
                    }
                });
            }

            if (activeSwitch) {
                activeSwitch.addEventListener('change', (event) => {
                    this.modulationManager.toggleLfoActive(i, event.target.checked, this.effectsChain.getFilter());
                });
            }
        }

        // Effects controls

        // Delay
        const delayTimeSlider = document.getElementById('delay-time');
        const delayFeedbackSlider = document.getElementById('delay-feedback');
        const delaySwitch = document.getElementById('delay-active');

        if (delayTimeSlider && delayFeedbackSlider && delaySwitch) {
            const updateDelay = () => {
                const time = parseFloat(delayTimeSlider.value);
                const feedback = parseFloat(delayFeedbackSlider.value);
                const isActive = delaySwitch.checked;

                this.effectsChain.updateDelay(time, feedback, isActive);

                // Update effect chain routing
                if (this.audioCore.getState().isInitialized) {
                    this.effectsChain.setupEffectChain(this.effectsChain.getFilter());
                }
            };

            delayTimeSlider.addEventListener('input', (event) => {
                if (delayTimeSlider.nextElementSibling) {
                    delayTimeSlider.nextElementSibling.textContent = `${parseFloat(event.target.value).toFixed(2)}s`;
                }
                updateDelay();
            });

            delayFeedbackSlider.addEventListener('input', (event) => {
                if (delayFeedbackSlider.nextElementSibling) {
                    delayFeedbackSlider.nextElementSibling.textContent = parseFloat(event.target.value).toFixed(2);
                }
                updateDelay();
            });

            delaySwitch.addEventListener('change', updateDelay);
        }

        // Filter
        const filterFreqSlider = document.getElementById('filter-freq');
        const filterQSlider = document.getElementById('filter-q');
        const filterSwitch = document.getElementById('filter-active');

        if (filterFreqSlider && filterQSlider && filterSwitch) {
            const updateFilter = () => {
                const freq = parseFloat(filterFreqSlider.value);
                const q = parseFloat(filterQSlider.value);
                const isActive = filterSwitch.checked;

                this.effectsChain.updateFilter(freq, q, isActive);

                // If audio is initialized, update LFO connections for changed frequency
                if (this.audioCore.getState().isInitialized) {
                    this.modulationManager.connectLFOs(this.effectsChain.getFilter());
                }
            };

            filterFreqSlider.addEventListener('input', (event) => {
                if (filterFreqSlider.nextElementSibling) {
                    filterFreqSlider.nextElementSibling.textContent = `${parseFloat(event.target.value).toFixed(0)} Hz`;
                }
                updateFilter();
            });

            filterQSlider.addEventListener('input', (event) => {
                if (filterQSlider.nextElementSibling) {
                    filterQSlider.nextElementSibling.textContent = parseFloat(event.target.value).toFixed(1);
                }
                updateFilter();
            });

            filterSwitch.addEventListener('change', updateFilter);
        }

        // Distortion
        const distortionSlider = document.getElementById('distortion-amount');
        const distortionSwitch = document.getElementById('distortion-active');

        if (distortionSlider && distortionSwitch) {
            const updateDistortion = () => {
                const amount = parseFloat(distortionSlider.value);
                const isActive = distortionSwitch.checked;

                this.effectsChain.updateDistortion(amount, isActive);

                // Update effect chain routing
                if (this.audioCore.getState().isInitialized) {
                    this.effectsChain.setupEffectChain(this.effectsChain.getFilter());
                }
            };

            distortionSlider.addEventListener('input', (event) => {
                if (distortionSlider.nextElementSibling) {
                    distortionSlider.nextElementSibling.textContent = `${parseFloat(event.target.value)}%`;
                }
                updateDistortion();
            });

            distortionSwitch.addEventListener('change', updateDistortion);
        }

        // Reverb
        const reverbSlider = document.getElementById('reverb-amount');
        const reverbSwitch = document.getElementById('reverb-active');

        if (reverbSlider && reverbSwitch) {
            const updateReverb = () => {
                const amount = parseFloat(reverbSlider.value);
                const isActive = reverbSwitch.checked;

                this.effectsChain.updateReverb(amount, isActive);

                // Update effect chain routing
                if (this.audioCore.getState().isInitialized) {
                    this.effectsChain.setupEffectChain(this.effectsChain.getFilter());
                }
            };

            reverbSlider.addEventListener('input', (event) => {
                if (reverbSlider.nextElementSibling) {
                    reverbSlider.nextElementSibling.textContent = `${(parseFloat(event.target.value) * 100).toFixed(0)}%`;
                }
                updateReverb();
            });

            reverbSwitch.addEventListener('change', updateReverb);
        }

        // Master volume
        const volumeSlider = document.getElementById('master-volume');

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (event) => {
                const volume = parseFloat(event.target.value);
                this.audioCore.updateMasterVolume(volume);

                if (volumeSlider.nextElementSibling) {
                    volumeSlider.nextElementSibling.textContent = `${(volume * 100).toFixed(0)}%`;
                }
            });
        }

        // Chaos matrix buttons
        const randomizeBtn = document.getElementById('randomize-btn');
        const glitchBtn = document.getElementById('glitch-btn');
        const savePresetBtn = document.getElementById('save-preset-btn');

        if (randomizeBtn) {
            randomizeBtn.addEventListener('click', () => {
                this.chaosMatrix.randomizeSettings();
            });
        }

        if (glitchBtn) {
            glitchBtn.addEventListener('click', () => {
                this.chaosMatrix.glitchEffect();
            });
        }

        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => {
                this.chaosMatrix.savePreset();
            });
        }
    }

    // Reset UI controls to match state values
    resetUIControls() {
        try {
            // Reset oscillator controls
            const oscillatorState = this.oscillatorManager.getState().oscillators;

            for (let i = 1; i <= 3; i++) {
                const freqSlider = document.getElementById(`osc${i}-freq`);
                const activeSwitch = document.getElementById(`osc${i}-active`);
                const lfo1Button = document.getElementById(`osc${i}-lfo1-btn`);
                const lfo2Button = document.getElementById(`osc${i}-lfo2-btn`);

                if (freqSlider && oscillatorState[i]) {
                    freqSlider.value = oscillatorState[i].freq;
                    if (freqSlider.nextElementSibling) {
                        freqSlider.nextElementSibling.textContent = `${oscillatorState[i].freq.toFixed(0)} Hz`;
                    }
                }

                if (activeSwitch && oscillatorState[i]) {
                    activeSwitch.checked = oscillatorState[i].active;
                }

                // Reset LFO buttons using our helper function
                this.updateLFOButtonState(lfo1Button, oscillatorState[i]?.lfo1Target, 'primary');
                this.updateLFOButtonState(lfo2Button, oscillatorState[i]?.lfo2Target, 'secondary');

                // Reset waveform buttons
                const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
                waveformButtons.forEach(btn => {
                    if (oscillatorState[i]) {
                        btn.classList.toggle('active', btn.getAttribute('data-wave') === oscillatorState[i].waveform);
                    }
                });
            }

            // Reset LFO controls
            const lfoState = this.modulationManager.getState().lfos;

            for (let i = 1; i <= 2; i++) {
                const freqSlider = document.getElementById(`lfo${i}-freq`);
                const depthSlider = document.getElementById(`lfo${i}-depth`);
                const activeSwitch = document.getElementById(`lfo${i}-active`);

                if (freqSlider && lfoState[i]) {
                    freqSlider.value = lfoState[i].freq;
                    if (freqSlider.nextElementSibling) {
                        freqSlider.nextElementSibling.textContent = `${lfoState[i].freq.toFixed(1)} Hz`;
                    }
                }

                if (depthSlider && lfoState[i]) {
                    depthSlider.value = lfoState[i].depth;
                    if (depthSlider.nextElementSibling) {
                        depthSlider.nextElementSibling.textContent = `${lfoState[i].depth}%`;
                    }
                }

                if (activeSwitch && lfoState[i]) {
                    activeSwitch.checked = lfoState[i].active;
                }
            }

            // Reset effect controls
            const effectsState = this.effectsChain.getState().effects;

            // Delay
            const delayTimeSlider = document.getElementById('delay-time');
            const delayFeedbackSlider = document.getElementById('delay-feedback');
            const delaySwitch = document.getElementById('delay-active');

            if (delayTimeSlider && effectsState.delay) {
                delayTimeSlider.value = effectsState.delay.time;
                if (delayTimeSlider.nextElementSibling) {
                    delayTimeSlider.nextElementSibling.textContent = `${effectsState.delay.time.toFixed(2)}s`;
                }
            }

            if (delayFeedbackSlider && effectsState.delay) {
                delayFeedbackSlider.value = effectsState.delay.feedback;
                if (delayFeedbackSlider.nextElementSibling) {
                    delayFeedbackSlider.nextElementSibling.textContent = effectsState.delay.feedback.toFixed(2);
                }
            }

            if (delaySwitch && effectsState.delay) {
                delaySwitch.checked = effectsState.delay.active;
            }

            // Filter
            const filterFreqSlider = document.getElementById('filter-freq');
            const filterQSlider = document.getElementById('filter-q');
            const filterSwitch = document.getElementById('filter-active');

            if (filterFreqSlider && effectsState.filter) {
                filterFreqSlider.value = effectsState.filter.freq;
                if (filterFreqSlider.nextElementSibling) {
                    filterFreqSlider.nextElementSibling.textContent = `${effectsState.filter.freq.toFixed(0)} Hz`;
                }
            }

            if (filterQSlider && effectsState.filter) {
                filterQSlider.value = effectsState.filter.q;
                if (filterQSlider.nextElementSibling) {
                    filterQSlider.nextElementSibling.textContent = effectsState.filter.q.toFixed(1);
                }
            }

            if (filterSwitch && effectsState.filter) {
                filterSwitch.checked = effectsState.filter.active;
            }

            // Distortion
            const distortionSlider = document.getElementById('distortion-amount');
            const distortionSwitch = document.getElementById('distortion-active');

            if (distortionSlider && effectsState.distortion) {
                distortionSlider.value = effectsState.distortion.amount;
                if (distortionSlider.nextElementSibling) {
                    distortionSlider.nextElementSibling.textContent = `${effectsState.distortion.amount}%`;
                }
            }

            if (distortionSwitch && effectsState.distortion) {
                distortionSwitch.checked = effectsState.distortion.active;
            }

            // Reverb
            const reverbSlider = document.getElementById('reverb-amount');
            const reverbSwitch = document.getElementById('reverb-active');

            if (reverbSlider && effectsState.reverb) {
                reverbSlider.value = effectsState.reverb.amount;
                if (reverbSlider.nextElementSibling) {
                    reverbSlider.nextElementSibling.textContent = `${(effectsState.reverb.amount * 100).toFixed(0)}%`;
                }
            }

            if (reverbSwitch && effectsState.reverb) {
                reverbSwitch.checked = effectsState.reverb.active;
            }

            // Master volume
            const volumeSlider = document.getElementById('master-volume');
            const masterState = this.audioCore.getState().master;

            if (volumeSlider && masterState) {
                volumeSlider.value = masterState.volume;
                if (volumeSlider.nextElementSibling) {
                    volumeSlider.nextElementSibling.textContent = `${(masterState.volume * 100).toFixed(0)}%`;
                }
            }

            // Reset chaos matrix
            const chaosState = this.chaosMatrix.getState();
            const gridCells = document.querySelectorAll('.grid-cell');

            gridCells.forEach((cell, index) => {
                cell.classList.toggle('active', chaosState.chaosMatrix[index]);
            });
        } catch (e) {
            console.error("Error in resetUIControls:", e);
        }
    }

    // Create LFO Target buttons for each oscillator
    createLFOTargetSelectors() {
        console.log("Creating LFO target buttons");

        // First clear any existing LFO target buttons to avoid duplicates
        document.querySelectorAll('.lfo-target-container').forEach(el => el.remove());

        // Create for each oscillator
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

            const oscillatorState = this.oscillatorManager.getState().oscillators;

            // Set initial state
            this.updateLFOButtonState(lfo1Button, oscillatorState[i]?.lfo1Target, 'primary');

            // Create LFO 2 button
            const lfo2Button = document.createElement('button');
            lfo2Button.textContent = 'LFO 2';
            lfo2Button.id = `osc${i}-lfo2-btn`;
            lfo2Button.style.padding = '4px 8px';
            lfo2Button.style.borderRadius = '4px';
            lfo2Button.style.fontSize = '12px';

            // Set initial state
            this.updateLFOButtonState(lfo2Button, oscillatorState[i]?.lfo2Target, 'secondary');

            // Add event listeners
            lfo1Button.addEventListener('click', () => {
                // Toggle LFO 1 target in oscillator manager
                const newState = !oscillatorState[i]?.lfo1Target;
                this.oscillatorManager.setLfoTarget(i, 1, newState);

                // Update button style
                this.updateLFOButtonState(lfo1Button, newState, 'primary');

                // Update connections if audio is initialized
                if (this.audioCore.getState().isInitialized) {
                    this.modulationManager.connectLFOs(this.effectsChain.getFilter());
                }

                console.log(`LFO1 for osc${i} set to ${newState}`);
            });

            lfo2Button.addEventListener('click', () => {
                // Toggle LFO 2 target in oscillator manager
                const newState = !oscillatorState[i]?.lfo2Target;
                this.oscillatorManager.setLfoTarget(i, 2, newState);

                // Update button style
                this.updateLFOButtonState(lfo2Button, newState, 'secondary');

                // Update connections if audio is initialized
                if (this.audioCore.getState().isInitialized) {
                    this.modulationManager.connectLFOs(this.effectsChain.getFilter());
                }

                console.log(`LFO2 for osc${i} set to ${newState}`);
            });

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
    updateLFOButtonState(button, isActive, accentType) {
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
}