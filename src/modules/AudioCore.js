// src/modules/AudioCore.js
export class AudioCore {
    constructor() {
        // Check if Web Audio API is supported
        this.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!this.AudioContext) {
            alert("Your browser doesn't support Web Audio API. Please use Chrome, Firefox, or another modern browser.");
        }

        // Audio context variables
        this.audioCtx = null;
        this.analyser = null;

        // Audio nodes container
        this.nodes = {
            masterGain: null
        };

        // State management
        this.state = {
            isInitialized: false,
            master: {
                volume: 0.7
            }
        };

        console.log("AudioCore initialized");
    }

    // Create minimal error handling wrapper functions
    safeConnect(source, destination) {
        try {
            if (source && destination) source.connect(destination);
        } catch (e) {
            console.warn("Connection failed:", e);
        }
    }

    initAudio() {
        if (this.state.isInitialized) return;

        try {
            // Create audio context
            this.audioCtx = new this.AudioContext();

            // Create master gain node
            this.nodes.masterGain = this.audioCtx.createGain();
            this.nodes.masterGain.gain.value = this.state.master.volume;

            // Create analyser node for visualization
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 2048;

            // Connect master gain to analyser and destination
            this.nodes.masterGain.connect(this.analyser);
            this.nodes.masterGain.connect(this.audioCtx.destination);

            this.state.isInitialized = true;
            console.log("Audio core initialization completed successfully");
            return true;
        } catch (error) {
            console.error("Error initializing audio core:", error);
            return false;
        }
    }

    // Get audio context
    getAudioContext() {
        return this.audioCtx;
    }

    // Get analyser node
    getAnalyser() {
        return this.analyser;
    }

    // Get master gain node
    getMasterGain() {
        return this.nodes.masterGain;
    }

    // Update master volume
    updateMasterVolume(value) {
        this.state.master.volume = value;
        if (this.nodes.masterGain) {
            try {
                const currentTime = this.audioCtx.currentTime;
                this.nodes.masterGain.gain.setValueAtTime(
                    this.nodes.masterGain.gain.value,
                    currentTime
                );
                this.nodes.masterGain.gain.linearRampToValueAtTime(
                    value,
                    currentTime + 0.05
                );
            } catch (e) {
                console.warn("Master volume update fallback:", e);
                this.nodes.masterGain.gain.value = value;
            }
        }
    }

    // Suspend audio context
    suspend() {
        if (this.audioCtx && this.audioCtx.state === 'running') {
            return this.audioCtx.suspend();
        }
        return Promise.resolve();
    }

    // Resume audio context
    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            return this.audioCtx.resume();
        }
        return Promise.resolve();
    }

    // Close audio context
    close() {
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            return this.audioCtx.close().catch(e => {
                console.warn("Error closing audio context:", e);
            });
        }
        return Promise.resolve();
    }

    // Get current state
    getState() {
        return {
            isInitialized: this.state.isInitialized,
            master: { ...this.state.master }
        };
    }
}