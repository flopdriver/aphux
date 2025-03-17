// src/modules/ChaosMatrix.js
export class ChaosMatrix {
    constructor(audioCore, oscillatorManager, effectsChain) {
        this.audioCore = audioCore;
        this.oscillatorManager = oscillatorManager;
        this.effectsChain = effectsChain;

        // Chaos matrix state
        this.state = {
            chaosMatrix: Array(64).fill(false)
        };

        console.log("ChaosMatrix initialized");
    }

    // Initialize chaos matrix grid
    initChaosMatrix() {
        const grid = document.getElementById('chaos-grid');
        if (!grid) {
            console.error('Chaos grid element not found');
            return;
        }

        // Create 8x8 grid
        for (let i = 0; i < 64; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;

            // Click handler for cells
            cell.addEventListener('click', () => {
                this.toggleChaosCell(i);
                cell.classList.toggle('active');
            });

            grid.appendChild(cell);
        }

        console.log('Chaos matrix grid initialized');
    }

    // Toggle chaos matrix cell state
    toggleChaosCell(index) {
        this.state.chaosMatrix[index] = !this.state.chaosMatrix[index];
        this.applyChaosMatrixEffects();
    }

    // Apply effects based on chaos matrix state
    applyChaosMatrixEffects() {
        // Calculate how many cells are active
        const activeCount = this.state.chaosMatrix.filter(cell => cell).length;
        const randomFactor = activeCount / 64;

        // Apply chaos effects based on active cells
        // More active cells = more chaos
        const oscillators = this.oscillatorManager.getOscillators();

        // Apply micro-pitch variations to oscillators
        Object.values(oscillators).forEach(osc => {
            const variation = (Math.random() * 2 - 1) * randomFactor * 5;
            osc.detune.value = variation;
        });

        // Apply random filter modulation
        const filter = this.effectsChain.getFilter();
        if (filter && randomFactor > 0.2) {
            const audioCtx = this.audioCore.getAudioContext();
            const effectsState = this.effectsChain.getState().effects;
            const randomFilterMod = Math.random() * randomFactor * 2000;

            filter.frequency.setValueAtTime(
                effectsState.filter.freq + randomFilterMod,
                audioCtx.currentTime
            );
            filter.frequency.exponentialRampToValueAtTime(
                effectsState.filter.freq,
                audioCtx.currentTime + 0.2
            );
        }
    }

    // Randomize settings
    randomizeSettings() {
        console.log("Randomizing settings...");
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return;

        const oscillators = this.oscillatorManager.getOscillators();
        const oscillatorState = this.oscillatorManager.getState().oscillators;

        // Randomize oscillator frequencies
        for (let i = 1; i <= 3; i++) {
            const minFreq = 20;
            const maxFreq = 880;
            const freqRange = maxFreq - minFreq;
            const randomFreq = Math.random() * freqRange + minFreq;

            // Update state
            this.oscillatorManager.updateFrequency(i, randomFreq);

            // Randomly select waveform
            const waveforms = ['sine', 'square', 'sawtooth', 'triangle'];
            const randomWaveIndex = Math.floor(Math.random() * waveforms.length);
            const randomWave = waveforms[randomWaveIndex];

            this.oscillatorManager.updateWaveform(i, randomWave);

            // Randomly assign LFO targets
            const lfo1Target = Math.random() > 0.6;
            const lfo2Target = Math.random() > 0.7;

            this.oscillatorManager.setLfoTarget(i, 1, lfo1Target);
            this.oscillatorManager.setLfoTarget(i, 2, lfo2Target);

            // Update UI
            const waveformButtons = document.querySelectorAll(`button[data-osc="${i}"]`);
            waveformButtons.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-wave') === randomWave);
            });

            // Update UI for LFO targets
            const lfo1Button = document.getElementById(`osc${i}-lfo1-btn`);
            const lfo2Button = document.getElementById(`osc${i}-lfo2-btn`);

            this.updateLFOButtonState(lfo1Button, lfo1Target, 'primary');
            this.updateLFOButtonState(lfo2Button, lfo2Target, 'secondary');
        }

        // Randomize LFOs
        for (let i = 1; i <= 2; i++) {
            // Random LFO frequency between 0.1 and 20 Hz
            const randomLfoFreq = Math.random() * 19.9 + 0.1;

            // Random LFO depth between 10 and 100%
            const randomLfoDepth = Math.floor(Math.random() * 90 + 10);

            // Update LFO parameters using global reference, but preserve active state
            if (window._modulationManager) {
                // Get current state to preserve active status
                const currentLfoState = window._modulationManager.getState().lfos[i];

                window._modulationManager.updateLfoFrequency(i, randomLfoFreq);
                window._modulationManager.updateLfoDepth(i, randomLfoDepth, this.effectsChain.getFilter());

                // Keep existing active state (don't change it during randomization)
            }

            // Update UI sliders but not switch
            const freqSlider = document.getElementById(`lfo${i}-freq`);
            const depthSlider = document.getElementById(`lfo${i}-depth`);

            if (freqSlider) {
                freqSlider.value = randomLfoFreq;
                if (freqSlider.nextElementSibling) {
                    freqSlider.nextElementSibling.textContent = `${randomLfoFreq.toFixed(1)} Hz`;
                }
            }

            if (depthSlider) {
                depthSlider.value = randomLfoDepth;
                if (depthSlider.nextElementSibling) {
                    depthSlider.nextElementSibling.textContent = `${randomLfoDepth}%`;
                }
            }

            // Don't touch the active switch - let it be controlled only by user
        }

        // Randomize filter
        const randomFilterFreq = Math.random() * 10000 + 100;
        const filterFreqSlider = document.getElementById('filter-freq');
        if (filterFreqSlider) {
            filterFreqSlider.value = randomFilterFreq;
            filterFreqSlider.nextElementSibling.textContent = `${randomFilterFreq.toFixed(0)} Hz`;
        }

        // Update filter state and node
        const effectsState = this.effectsChain.getState().effects;
        this.effectsChain.updateFilter(
            randomFilterFreq,
            effectsState.filter.q,
            effectsState.filter.active
        );

        // Randomize chaos matrix
        this.state.chaosMatrix = Array(64).fill(false).map(() => Math.random() > 0.7);

        // Update chaos matrix UI
        const gridCells = document.querySelectorAll('.grid-cell');
        gridCells.forEach((cell, index) => {
            cell.classList.toggle('active', this.state.chaosMatrix[index]);
        });

        this.applyChaosMatrixEffects();
    }

    // Apply glitch effect
    glitchEffect() {
        // Apply rapid random changes for a glitch effect
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return;

        const oscillators = this.oscillatorManager.getOscillators();
        const filter = this.effectsChain.getFilter();
        const effectsState = this.effectsChain.getState().effects;

        const glitchDuration = 1000; // 1 second of glitching
        const glitchInterval = 50; // Changes every 50ms
        let glitchCount = 0;

        const glitchEffect = setInterval(() => {
            // Random filter frequency jumps
            if (filter) {
                const jumpFreq = Math.random() * 5000 + 200;
                filter.frequency.setValueAtTime(jumpFreq, audioCtx.currentTime);
            }

            // Random oscillator detune
            Object.values(oscillators).forEach(osc => {
                const detune = (Math.random() * 2 - 1) * 100;
                osc.detune.setValueAtTime(detune, audioCtx.currentTime);
            });

            // Distortion amount
            if (effectsState.distortion) {
                const randomAmount = Math.random() * 100;
                this.effectsChain.updateDistortion(randomAmount, effectsState.distortion.active);
            }

            glitchCount++;

            if (glitchCount * glitchInterval >= glitchDuration) {
                clearInterval(glitchEffect);

                // Reset parameters to original values
                if (filter) {
                    filter.frequency.setValueAtTime(effectsState.filter.freq, audioCtx.currentTime);
                }

                Object.values(oscillators).forEach(osc => {
                    osc.detune.setValueAtTime(0, audioCtx.currentTime);
                });

                if (effectsState.distortion) {
                    const distortionSlider = document.getElementById('distortion-amount');
                    const amount = distortionSlider ? parseFloat(distortionSlider.value) : effectsState.distortion.amount;
                    this.effectsChain.updateDistortion(amount, effectsState.distortion.active);
                }
            }
        }, glitchInterval);
    }

    // Save preset
    savePreset() {
        // Gather state from all modules
        const state = {
            isInitialized: this.audioCore.getState().isInitialized,
            oscillators: this.oscillatorManager.getState().oscillators,
            lfos: this.effectsChain.getModulationManager?.getState().lfos || {},
            effects: this.effectsChain.getState().effects,
            master: this.audioCore.getState().master,
            chaosMatrix: this.state.chaosMatrix
        };

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

    // Get state
    getState() {
        return {
            chaosMatrix: [...this.state.chaosMatrix]
        };
    }
}