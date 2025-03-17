// src/modules/EffectsChain.js
export class EffectsChain {
    constructor(audioCore) {
        this.audioCore = audioCore;

        // Effects nodes
        this.nodes = {
            filter: null,
            delay: null,
            distortion: null,
            reverb: null
        };

        // Effects state
        this.state = {
            effects: {
                delay: { time: 0.3, feedback: 0.4, active: true },
                filter: { freq: 2000, q: 5, active: true },
                distortion: { amount: 20, active: false },
                reverb: { amount: 0.3, active: true }
            }
        };

        console.log("EffectsChain initialized");
    }

    // Initialize all effects
    initEffects() {
        this.createFilter();
        this.createDelay();
        this.createDistortion();
        this.createReverb();
    }

    // Create filter
    createFilter() {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return null;

        // Create filter
        this.nodes.filter = audioCtx.createBiquadFilter();
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = this.state.effects.filter.freq;
        this.nodes.filter.Q.value = this.state.effects.filter.q;

        return this.nodes.filter;
    }

    // Create delay
    createDelay() {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return null;

        // Create delay
        this.nodes.delay = audioCtx.createDelay();
        this.nodes.delay.delayTime.value = this.state.effects.delay.time;

        const delayFeedback = audioCtx.createGain();
        delayFeedback.gain.value = this.state.effects.delay.feedback;
        this.nodes.delay.feedbackGain = delayFeedback;

        return this.nodes.delay;
    }

    // Create distortion
    createDistortion() {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return null;

        // Create distortion
        this.nodes.distortion = audioCtx.createWaveShaper();
        this.updateDistortionCurve();

        return this.nodes.distortion;
    }

    // Create reverb impulse response
    createReverb() {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return null;

        try {
            // Create wet and dry gain nodes for reverb
            const wetGain = audioCtx.createGain();
            wetGain.gain.value = this.state.effects.reverb.amount;

            const dryGain = audioCtx.createGain();
            dryGain.gain.value = 1 - this.state.effects.reverb.amount;

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
            this.nodes.reverb = {
                convolver: convolver,
                wetGain: wetGain,
                dryGain: dryGain
            };

            console.log("Reverb created successfully with enhanced impulse response");
            return this.nodes.reverb;
        } catch (error) {
            console.error("Error creating reverb:", error);
            // Create simple gain node as fallback
            const fallbackGain = audioCtx.createGain();
            this.nodes.reverb = {
                convolver: fallbackGain,
                wetGain: fallbackGain,
                dryGain: fallbackGain
            };
            return this.nodes.reverb;
        }
    }

    // Update distortion curve
    updateDistortionCurve() {
        if (!this.nodes.distortion) return;

        const amount = this.state.effects.distortion.amount;
        const samples = 44100;
        const curve = new Float32Array(samples);

        // If distortion is disabled, create a linear curve (no distortion)
        if (!this.state.effects.distortion.active) {
            for (let i = 0; i < samples; ++i) {
                const x = i * 2 / samples - 1;
                curve[i] = x; // Linear mapping = no distortion
            }

            this.nodes.distortion.curve = curve;
            this.nodes.distortion.oversample = '4x';
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

        this.nodes.distortion.curve = curve;
        this.nodes.distortion.oversample = '4x';

        console.log(`Updated distortion curve with improved algorithm, amount: ${amount}`);
    }

    // Set up effect chain routing
    setupEffectChain(inputNode) {
        try {
            const audioCtx = this.audioCore.getAudioContext();
            if (!audioCtx) return;

            const masterGain = this.audioCore.getMasterGain();
            if (!masterGain) return;

            // Skip the input connection if inputNode is null, undefined, or is the filter itself
            const skipInputConnection = !inputNode || inputNode === this.nodes.filter;

            // Disconnect all existing connections between effects
            // (But keep oscillator connections to filter)
            if (this.nodes.filter) {
                try {
                    this.nodes.filter.disconnect();
                } catch (e) {
                    // Ignore disconnection errors
                }
            }

            if (this.nodes.delay && this.nodes.delay.feedbackGain) {
                try {
                    this.nodes.delay.disconnect();
                    this.nodes.delay.feedbackGain.disconnect();
                } catch (e) {
                    // Ignore disconnection errors
                }
            }

            if (this.nodes.distortion) {
                try {
                    this.nodes.distortion.disconnect();
                } catch (e) {
                    // Ignore disconnection errors
                }
            }

            if (this.nodes.reverb) {
                try {
                    if (this.nodes.reverb.convolver) this.nodes.reverb.convolver.disconnect();
                    if (this.nodes.reverb.wetGain) this.nodes.reverb.wetGain.disconnect();
                    if (this.nodes.reverb.dryGain) this.nodes.reverb.dryGain.disconnect();
                } catch (e) {
                    // Ignore disconnection errors
                }
            }

            // Connect input to filter only if we're not skipping the input connection
            if (!skipInputConnection && inputNode) {
                this.audioCore.safeConnect(inputNode, this.nodes.filter);
            }

            // Create a proper effect chain with each effect getting the output of the previous one
            // This prevents phase issues and unintended gain boosts

            // Start with filter (first in chain)
            let currentOutput = this.nodes.filter;

            // Connect delay if active
            if (this.state.effects.delay.active && this.nodes.delay) {
                // Connect filter to delay
                this.audioCore.safeConnect(currentOutput, this.nodes.delay);

                // Set up feedback loop
                this.audioCore.safeConnect(this.nodes.delay, this.nodes.delay.feedbackGain);
                this.audioCore.safeConnect(this.nodes.delay.feedbackGain, this.nodes.delay);

                // Update current output
                currentOutput = this.nodes.delay;
            }

            // Connect distortion if active
            if (this.state.effects.distortion.active && this.nodes.distortion) {
                this.audioCore.safeConnect(currentOutput, this.nodes.distortion);
                currentOutput = this.nodes.distortion;
            }

            // Connect reverb if active
            if (this.state.effects.reverb.active && this.nodes.reverb) {
                try {
                    // Split signal into wet and dry paths
                    this.audioCore.safeConnect(currentOutput, this.nodes.reverb.convolver);
                    this.audioCore.safeConnect(currentOutput, this.nodes.reverb.dryGain);

                    // Connect convolver to wet gain
                    this.audioCore.safeConnect(this.nodes.reverb.convolver, this.nodes.reverb.wetGain);

                    // Set reverb wet/dry mix
                    this.nodes.reverb.wetGain.gain.setValueAtTime(
                        this.state.effects.reverb.amount,
                        audioCtx.currentTime
                    );
                    this.nodes.reverb.dryGain.gain.setValueAtTime(
                        1 - this.state.effects.reverb.amount,
                        audioCtx.currentTime
                    );

                    // Connect both wet and dry gains to master
                    this.audioCore.safeConnect(this.nodes.reverb.wetGain, masterGain);
                    this.audioCore.safeConnect(this.nodes.reverb.dryGain, masterGain);
                } catch (e) {
                    console.error("Error connecting reverb:", e);
                    // Connect current output directly to master if reverb fails
                    this.audioCore.safeConnect(currentOutput, masterGain);
                }
            } else {
                // No reverb, connect current output directly to master
                this.audioCore.safeConnect(currentOutput, masterGain);
            }

            // Always ensure the filter is connected to the master gain directly
            // This provides a dry signal path when all effects are bypassed
            if (!this.state.effects.delay.active &&
                !this.state.effects.distortion.active &&
                !this.state.effects.reverb.active) {
                this.audioCore.safeConnect(this.nodes.filter, masterGain);
            }

            console.log("Effect chain routing updated successfully");
        } catch (error) {
            console.error("Error in setupEffectChain:", error);
            // Fallback: direct connection to ensure audio keeps flowing
            try {
                this.audioCore.safeConnect(this.nodes.filter, this.audioCore.getMasterGain());
            } catch (e) {
                console.error("Critical error in effect chain setup:", e);
            }
        }
    }

    // Update filter parameters
    updateFilter(freq, q, isActive) {
        this.state.effects.filter.freq = freq;
        this.state.effects.filter.q = q;
        this.state.effects.filter.active = isActive;

        if (this.nodes.filter) {
            try {
                const audioCtx = this.audioCore.getAudioContext();
                const currentTime = audioCtx.currentTime;

                // Always ensure minimum frequency is above 20Hz
                const safeFreq = Math.max(20, freq);

                // Use exponential ramp for smoother filter transitions
                this.nodes.filter.frequency.setValueAtTime(
                    this.nodes.filter.frequency.value,
                    currentTime
                );

                if (isActive) {
                    // Smooth transition to target frequency
                    this.nodes.filter.frequency.exponentialRampToValueAtTime(
                        safeFreq,
                        currentTime + 0.05
                    );

                    // Update Q value with linear ramp
                    this.nodes.filter.Q.setValueAtTime(
                        this.nodes.filter.Q.value,
                        currentTime
                    );
                    this.nodes.filter.Q.linearRampToValueAtTime(
                        q,
                        currentTime + 0.05
                    );
                } else {
                    // When filter is inactive, set it to pass all frequencies
                    this.nodes.filter.frequency.exponentialRampToValueAtTime(
                        20000,
                        currentTime + 0.05
                    );
                    this.nodes.filter.Q.linearRampToValueAtTime(0.1, currentTime + 0.05);
                }
            } catch (e) {
                console.warn("Filter parameter update fallback:", e);
                // Fallback to direct value assignment
                if (isActive) {
                    this.nodes.filter.frequency.value = Math.max(20, freq);
                    this.nodes.filter.Q.value = q;
                } else {
                    this.nodes.filter.frequency.value = 20000;
                    this.nodes.filter.Q.value = 0.1;
                }
            }
        }
    }

    // Update delay parameters
    updateDelay(time, feedback, isActive) {
        this.state.effects.delay.time = time;
        this.state.effects.delay.feedback = feedback;
        this.state.effects.delay.active = isActive;

        if (this.nodes.delay) {
            try {
                const audioCtx = this.audioCore.getAudioContext();
                const currentTime = audioCtx.currentTime;

                // Smoothly update delay time
                this.nodes.delay.delayTime.setValueAtTime(
                    this.nodes.delay.delayTime.value,
                    currentTime
                );
                this.nodes.delay.delayTime.linearRampToValueAtTime(
                    time,
                    currentTime + 0.1
                );

                // Update feedback gain smoothly
                if (this.nodes.delay.feedbackGain) {
                    const feedbackValue = isActive ? feedback : 0;

                    this.nodes.delay.feedbackGain.gain.setValueAtTime(
                        this.nodes.delay.feedbackGain.gain.value,
                        currentTime
                    );
                    this.nodes.delay.feedbackGain.gain.linearRampToValueAtTime(
                        feedbackValue,
                        currentTime + 0.1
                    );
                }
            } catch (e) {
                console.warn("Delay parameter update fallback:", e);
                // Fallback to direct value assignment
                this.nodes.delay.delayTime.value = time;
                if (this.nodes.delay.feedbackGain) {
                    this.nodes.delay.feedbackGain.gain.value = isActive ? feedback : 0;
                }
            }
        }
    }

    // Update distortion parameters
    updateDistortion(amount, isActive) {
        this.state.effects.distortion.amount = amount;
        this.state.effects.distortion.active = isActive;

        if (this.nodes.distortion) {
            try {
                // Update the distortion curve with improved algorithm
                this.updateDistortionCurve();
            } catch (e) {
                console.warn("Error updating distortion:", e);
            }
        }
    }

    // Update reverb parameters
    updateReverb(amount, isActive) {
        this.state.effects.reverb.amount = amount;
        this.state.effects.reverb.active = isActive;

        if (this.nodes.reverb && this.nodes.reverb.wetGain && this.nodes.reverb.dryGain) {
            try {
                const audioCtx = this.audioCore.getAudioContext();
                const currentTime = audioCtx.currentTime;

                // Set wet/dry mix based on if reverb is active
                const wetAmount = isActive ? amount : 0;
                const dryAmount = isActive ? (1 - amount) : 1;

                // Smooth parameter changes
                this.nodes.reverb.wetGain.gain.setValueAtTime(
                    this.nodes.reverb.wetGain.gain.value,
                    currentTime
                );
                this.nodes.reverb.wetGain.gain.linearRampToValueAtTime(
                    wetAmount,
                    currentTime + 0.1
                );

                this.nodes.reverb.dryGain.gain.setValueAtTime(
                    this.nodes.reverb.dryGain.gain.value,
                    currentTime
                );
                this.nodes.reverb.dryGain.gain.linearRampToValueAtTime(
                    dryAmount,
                    currentTime + 0.1
                );
            } catch (e) {
                console.warn("Couldn't update reverb gains:", e);
                // Fallback to direct value assignment
                this.nodes.reverb.wetGain.gain.value = isActive ? amount : 0;
                this.nodes.reverb.dryGain.gain.value = isActive ? (1 - amount) : 1;
            }
        }
    }

    // Get filter node
    getFilter() {
        return this.nodes.filter;
    }

    // Get state
    getState() {
        return {
            effects: { ...this.state.effects }
        };
    }
}