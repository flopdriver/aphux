// src/modules/OscillatorManager.js
export class OscillatorManager {
    constructor(audioCore) {
        this.audioCore = audioCore;

        // Oscillator nodes
        this.nodes = {
            oscillators: {}
        };

        // Oscillator state
        this.state = {
            oscillators: {
                1: { freq: 110, waveform: 'sine', active: true, lfo1Target: true, lfo2Target: false },
                2: { freq: 220, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false },
                3: { freq: 440, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false }
            }
        };

        console.log("OscillatorManager initialized");
    }

    // Create oscillator node
    createOscillator(id) {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return null;

        const osc = audioCtx.createOscillator();
        osc.type = this.state.oscillators[id].waveform;
        osc.frequency.value = this.state.oscillators[id].freq;

        // Create gain node for this oscillator
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = this.state.oscillators[id].active ? 0.33 : 0; // Equal mix of oscillators when active

        // Connect oscillator to its gain node
        osc.connect(gainNode);
        osc.gainNode = gainNode;

        // Store oscillator
        this.nodes.oscillators[id] = osc;

        return osc;
    }

    // Initialize all oscillators
    initOscillators() {
        for (let i = 1; i <= 3; i++) {
            this.createOscillator(i);
        }
    }

    // Start all oscillators
    startOscillators() {
        Object.values(this.nodes.oscillators).forEach(osc => {
            if (osc && osc.start) {
                try {
                    osc.start();
                } catch (e) {
                    console.warn("Oscillator already started:", e);
                }
            }
        });
    }

    // Connect oscillators to a destination node
    connectOscillatorsTo(destination) {
        if (!destination) return;

        Object.values(this.nodes.oscillators).forEach(osc => {
            if (osc && osc.gainNode) {
                this.audioCore.safeConnect(osc.gainNode, destination);
            }
        });
    }

    // Update oscillator frequency
    updateFrequency(id, freq) {
        this.state.oscillators[id].freq = freq;

        if (this.nodes.oscillators[id]) {
            const audioCtx = this.audioCore.getAudioContext();
            this.nodes.oscillators[id].frequency.setValueAtTime(freq, audioCtx.currentTime);
        }
    }

    // Update oscillator waveform
    updateWaveform(id, waveform) {
        this.state.oscillators[id].waveform = waveform;

        if (this.nodes.oscillators[id]) {
            this.nodes.oscillators[id].type = waveform;
        }
    }

    // Toggle oscillator active state
    toggleActive(id, isActive) {
        this.state.oscillators[id].active = isActive;
        this.updateGain(id);
    }

    // Update oscillator gain based on active state
    updateGain(id) {
        if (this.nodes.oscillators[id] && this.nodes.oscillators[id].gainNode) {
            const audioCtx = this.audioCore.getAudioContext();
            const gainValue = this.state.oscillators[id].active ? 0.33 : 0;

            try {
                const currentTime = audioCtx.currentTime;
                this.nodes.oscillators[id].gainNode.gain.setValueAtTime(
                    this.nodes.oscillators[id].gainNode.gain.value,
                    currentTime
                );
                this.nodes.oscillators[id].gainNode.gain.exponentialRampToValueAtTime(
                    Math.max(0.001, gainValue), // Avoid zero for exponential ramp
                    currentTime + 0.01
                );

                if (gainValue === 0) {
                    // Set to exactly zero after the ramp completes
                    this.nodes.oscillators[id].gainNode.gain.setValueAtTime(0, currentTime + 0.011);
                }

                console.log(`Set oscillator ${id} gain to ${gainValue}`);
            } catch (e) {
                // Fall back to direct assignment if needed
                this.nodes.oscillators[id].gainNode.gain.value = gainValue;
            }
        }
    }

    // Get oscillator nodes
    getOscillators() {
        return this.nodes.oscillators;
    }

    // Get oscillator gain node
    getOscillatorGain(id) {
        return this.nodes.oscillators[id]?.gainNode || null;
    }

    // Set LFO target
    setLfoTarget(id, lfoId, isTarget) {
        if (lfoId === 1) {
            this.state.oscillators[id].lfo1Target = isTarget;
        } else if (lfoId === 2) {
            this.state.oscillators[id].lfo2Target = isTarget;
        }
    }

    // Get state
    getState() {
        return {
            oscillators: { ...this.state.oscillators }
        };
    }
}