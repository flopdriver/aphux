// src/modules/VoiceSynth.js
export class VoiceSynth {
    constructor(audioCore, oscillatorManager, modulationManager) {
        this.audioCore = audioCore;
        this.oscillatorManager = oscillatorManager;
        this.modulationManager = modulationManager;

        // Voice synth nodes
        this.nodes = {
            formants: [],
            vocoder: null,
            voiceGain: null,
            vowelFilter: null
        };

        // Voice synth state
        this.state = {
            active: false,
            vowel: 'a',
            formantFreqs: {
                'a': [800, 1150, 2900, 3900, 4950],
                'e': [350, 2000, 2800, 3600, 4950],
                'i': [270, 2140, 2950, 3900, 4950],
                'o': [450, 800, 2830, 3500, 4950],
                'u': [325, 700, 2700, 3800, 4950]
            },
            formantGains: {
                'a': [1.0, 0.5, 0.25, 0.1, 0.05],
                'e': [1.0, 0.6, 0.25, 0.1, 0.05],
                'i': [1.0, 0.3, 0.4, 0.2, 0.1],
                'o': [1.0, 0.4, 0.2, 0.1, 0.05],
                'u': [1.0, 0.3, 0.1, 0.1, 0.05]
            },
            formantQ: {
                'a': [10, 12, 15, 18, 20],
                'e': [12, 10, 15, 18, 20],
                'i': [15, 12, 15, 18, 20],
                'o': [10, 8, 15, 18, 20],
                'u': [12, 10, 15, 18, 20]
            },
            volume: 0.8, // Increased from 0.5 for better audibility
            vowelSequence: ['a', 'e', 'i', 'o', 'u'],
            currentVowelIndex: 0,
            autoVowelChange: true,
            vowelChangeRate: 3.0, // seconds per vowel
            lastVowelChangeTime: 0,
            vibratoRate: 6, // Hz
            vibratoDepth: 0.2, // percentage of formant frequency
            voiceType: 'soprano' // soprano, alto, tenor, bass
        };

        // Voice modification factors for different voice types
        this.voiceTypes = {
            soprano: { pitch: 1.4, formantFactor: 1.2 },  // Higher pitch, brighter formants
            alto: { pitch: 1.1, formantFactor: 1.0 },     // Slightly higher pitch, neutral formants
            tenor: { pitch: 0.8, formantFactor: 0.9 },    // Lower pitch, slightly darker formants
            bass: { pitch: 0.6, formantFactor: 0.8 }      // Much lower pitch, darker formants
        };

        // Add global helper to activate voice synth
        if (window) {
            window.activateVoice = () => {
                return this.activateVoiceWithSettings();
            };
        }

        console.log("VoiceSynth initialized");
    }

    // Initialize voice synth
    initVoiceSynth() {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) {
            console.error("Failed to initialize voice synth: Audio context not available");
            return false;
        }

        try {
            console.log("VoiceSynth: Creating voice gain node");
            // Create master gain for voice
            this.nodes.voiceGain = audioCtx.createGain();
            this.nodes.voiceGain.gain.value = this.state.volume;

            console.log("VoiceSynth: Creating formant filters");
            // Create formant filters
            this.createFormantFilters();

            console.log("VoiceSynth: Creating noise source");
            // Create noise generator for breath/consonant sounds
            this.createNoiseSource();

            // Connect to audio core master gain
            const masterGain = this.audioCore.getMasterGain();
            if (!masterGain) {
                console.error("Failed to connect voice synth: Master gain not available");
                return false;
            }

            console.log("VoiceSynth: Connecting to master gain");
            this.nodes.voiceGain.connect(masterGain);

            // Test tone to verify audio path
            this.playTestTone();

            // Boost gains for more volume
            this.boostFormantGains();

            if (this.audioCore.getState().isInitialized) {
                console.log("VoiceSynth: Audio system is initialized, auto-activating voice");
                setTimeout(() => {
                    this.start();
                    // Also make sure the UI switch reflects this
                    const voiceActiveSwitch = document.getElementById('voice-active');
                    if (voiceActiveSwitch) {
                        voiceActiveSwitch.checked = true;
                    }
                }, 100); // Small delay to ensure everything is ready
            }

            console.log("VoiceSynth initialized successfully");
            return true;
        } catch (error) {
            console.error("Error initializing voice synth:", error);
            return false;
        }
    }

    // Create formant filters for vowel sounds
    createFormantFilters() {
        const audioCtx = this.audioCore.getAudioContext();
        const formantCount = 5; // Number of formant filters per vowel
        this.nodes.formants = [];

        console.log("VoiceSynth: Creating carrier from oscillators");

        // Create carrier source - derived from oscillators
        const carrier = audioCtx.createGain();
        carrier.gain.value = 2.0; // Increase carrier gain for more pronounced formants

        // Add direct white noise to carrier for better articulation
        const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.value = 0.05; // Add a small amount of noise

        noiseSource.connect(noiseGain);
        noiseGain.connect(carrier);
        noiseSource.start();

        this.nodes.noiseSource = noiseSource;

        // Connect from each oscillator to the carrier
        const oscillators = this.oscillatorManager.getOscillators();
        let connectedOscs = 0;

        Object.entries(oscillators).forEach(([id, osc]) => {
            if (osc.gainNode) {
                try {
                    // Create a separate gain node to not affect the main output
                    const oscToVoiceGain = audioCtx.createGain();
                    oscToVoiceGain.gain.value = 0.6; // Increased gain for more signal

                    // Log the connection
                    console.log(`VoiceSynth: Connecting oscillator ${id} (${osc.frequency.value}Hz) to carrier`);

                    osc.gainNode.connect(oscToVoiceGain);
                    oscToVoiceGain.connect(carrier);
                    connectedOscs++;
                } catch (e) {
                    console.error(`VoiceSynth: Failed to connect oscillator ${id}:`, e);
                }
            }
        });

        // Create a simple direct oscillator for a guaranteed sound source
        const directOsc = audioCtx.createOscillator();
        directOsc.frequency.value = 110; // Low fundamental
        directOsc.type = 'sawtooth'; // Rich in harmonics

        const directOscGain = audioCtx.createGain();
        directOscGain.gain.value = 0.3; // Moderate level

        directOsc.connect(directOscGain);
        directOscGain.connect(carrier);
        directOsc.start();

        // Store for cleanup
        this.nodes.directOsc = directOsc;

        if (connectedOscs === 0) {
            console.warn("VoiceSynth: No oscillators connected to carrier. Using direct oscillator instead.");
        } else {
            console.log(`VoiceSynth: Connected ${connectedOscs} oscillators to carrier`);
        }

        this.nodes.carrier = carrier;

        // Create formant filters with wider bandwidth and more prominent peaks
        const vowel = this.state.vowel;
        const voiceFactors = this.voiceTypes[this.state.voiceType];

        for (let i = 0; i < formantCount; i++) {
            const formantFilter = audioCtx.createBiquadFilter();
            formantFilter.type = 'bandpass';

            // Make sure frequency is within audible range and prominent
            const baseFreq = this.state.formantFreqs[vowel][i];
            formantFilter.frequency.value = Math.max(80, Math.min(12000, baseFreq * voiceFactors.formantFactor));

            // Lower Q for wider bandwidth
            formantFilter.Q.value = Math.max(5, this.state.formantQ[vowel][i] * 0.7);

            const formantGain = audioCtx.createGain();
            formantGain.gain.value = this.state.formantGains[vowel][i] * 0.6; // Increased gain

            // Make first formant (fundamental) stronger
            if (i === 0) {
                formantGain.gain.value *= 1.5;
            }

            // Add a slight frequency randomization for a more natural sound
            this.addFormantJitter(formantFilter);

            // Connect carrier to filter and then to gain
            carrier.connect(formantFilter);
            formantFilter.connect(formantGain);
            formantGain.connect(this.nodes.voiceGain);

            // Also add a bit of direct carrier for better articulation
            if (i === 0) {
                const directCarrierGain = audioCtx.createGain();
                directCarrierGain.gain.value = 0.1;
                carrier.connect(directCarrierGain);
                directCarrierGain.connect(this.nodes.voiceGain);
                this.nodes.directCarrierGain = directCarrierGain;
            }

            // Store filter and gain together
            this.nodes.formants.push({
                filter: formantFilter,
                gain: formantGain
            });

            console.log(`VoiceSynth: Created formant ${i} at ${formantFilter.frequency.value}Hz with Q=${formantFilter.Q.value} and gain=${formantGain.gain.value}`);
        }

        // Create vowel transition filter for smooth vowel changes
        this.nodes.vowelFilter = audioCtx.createBiquadFilter();
        this.nodes.vowelFilter.type = 'lowpass';
        this.nodes.vowelFilter.frequency.value = 10; // Very slow transitions
        this.nodes.vowelFilter.Q.value = 0.7;

        console.log(`VoiceSynth: Created ${formantCount} formant filters for vowel '${vowel}'`);
    }

    // Create noise source for breath and consonant sounds
    createNoiseSource() {
        const audioCtx = this.audioCore.getAudioContext();

        // Create noise source (white noise)
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        // Create noise source node
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        // Create filter for noise to shape it
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 2000;
        noiseFilter.Q.value = 0.5;

        // Create gain for noise
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.value = 0.01; // Very subtle breath noise

        // Connect nodes
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.nodes.voiceGain);

        noiseSource.start();

        // Store nodes
        this.nodes.noiseSource = noiseSource;
        this.nodes.noiseFilter = noiseFilter;
        this.nodes.noiseGain = noiseGain;
    }

    // Play a test tone through the voice synth path
    playTestTone() {
        try {
            const audioCtx = this.audioCore.getAudioContext();
            if (!audioCtx || !this.nodes.voiceGain) return;

            console.log("VoiceSynth: Playing test tone");

            // Create a test oscillator
            const testOsc = audioCtx.createOscillator();
            testOsc.frequency.value = 440;
            testOsc.type = 'sine';

            // Create a gain for the test tone
            const testGain = audioCtx.createGain();
            testGain.gain.value = 0.5; // Keep it moderately loud

            // Connect the test oscillator to our voice path
            testOsc.connect(testGain);
            testGain.connect(this.nodes.voiceGain);

            // Play a short beep
            testOsc.start();
            testOsc.stop(audioCtx.currentTime + 0.3);

            console.log("VoiceSynth: Test tone should be audible");
        } catch (e) {
            console.error("VoiceSynth: Test tone failed:", e);
        }
    }

    // Add subtle jitter to formant frequencies for more natural sound
    addFormantJitter(formantFilter) {
        if (!formantFilter) return;

        const audioCtx = this.audioCore.getAudioContext();
        const baseFreq = formantFilter.frequency.value;

        // Create very slow LFO for gentle frequency movement
        const jitterOsc = audioCtx.createOscillator();
        jitterOsc.type = 'sine';
        jitterOsc.frequency.value = 0.1 + Math.random() * 0.1; // 0.1-0.2 Hz

        const jitterGain = audioCtx.createGain();
        jitterGain.gain.value = baseFreq * 0.01; // 1% variation

        jitterOsc.connect(jitterGain);
        jitterGain.connect(formantFilter.frequency);

        jitterOsc.start();

        // Store for cleanup
        if (!this.nodes.jitterOscs) {
            this.nodes.jitterOscs = [];
        }

        this.nodes.jitterOscs.push({
            osc: jitterOsc,
            gain: jitterGain
        });
    }

    // Change to a specific vowel sound
    changeVowel(vowel, transitionTime = 0.5) {
        if (!this.nodes.formants || this.nodes.formants.length === 0) return;
        if (!this.state.formantFreqs[vowel]) return;

        const audioCtx = this.audioCore.getAudioContext();
        const currentTime = audioCtx.currentTime;
        const voiceFactors = this.voiceTypes[this.state.voiceType];

        // Update current vowel
        this.state.vowel = vowel;

        // Smoothly transition each formant filter
        for (let i = 0; i < this.nodes.formants.length; i++) {
            const formant = this.nodes.formants[i];
            if (!formant || !formant.filter || !formant.gain) continue;

            const targetFreq = this.state.formantFreqs[vowel][i] * voiceFactors.formantFactor;
            const targetQ = this.state.formantQ[vowel][i];
            const targetGain = this.state.formantGains[vowel][i] * 0.6; // Increased gain

            // Make first formant stronger
            const finalGain = i === 0 ? targetGain * 1.5 : targetGain;

            try {
                // Smooth transition to new formant frequency
                formant.filter.frequency.cancelScheduledValues(currentTime);
                formant.filter.frequency.setValueAtTime(formant.filter.frequency.value, currentTime);
                formant.filter.frequency.exponentialRampToValueAtTime(
                    Math.max(targetFreq, 20), // Ensure minimum value for exponentialRamp
                    currentTime + transitionTime
                );

                // Smooth transition to new Q
                formant.filter.Q.cancelScheduledValues(currentTime);
                formant.filter.Q.setValueAtTime(formant.filter.Q.value, currentTime);
                formant.filter.Q.linearRampToValueAtTime(
                    targetQ,
                    currentTime + transitionTime
                );

                // Smooth transition to new gain
                formant.gain.gain.cancelScheduledValues(currentTime);
                formant.gain.gain.setValueAtTime(formant.gain.gain.value, currentTime);
                formant.gain.gain.linearRampToValueAtTime(
                    finalGain,
                    currentTime + transitionTime
                );
            } catch (e) {
                console.warn("Error transitioning formant:", e);
                // Fallback to direct assignment
                formant.filter.frequency.value = targetFreq;
                formant.filter.Q.value = targetQ;
                formant.gain.gain.value = finalGain;
            }
        }

        console.log(`Changed vowel to '${vowel}' with ${transitionTime}s transition`);
    }

    // Add vibrato to the voice
    addVibrato(rate = 6, depth = 0.2) {
        if (!this.nodes.formants || this.nodes.formants.length === 0) return;

        const audioCtx = this.audioCore.getAudioContext();
        this.state.vibratoRate = rate;
        this.state.vibratoDepth = depth;

        // Stop any existing vibrato
        if (this.nodes.vibratoOsc) {
            try {
                this.nodes.vibratoOsc.stop();
            } catch (e) {
                // Ignore errors
            }
        }

        // Create vibrato LFO
        const vibratoOsc = audioCtx.createOscillator();
        vibratoOsc.type = 'sine';
        vibratoOsc.frequency.value = rate;

        // Disconnect existing vibrato gains
        if (this.nodes.vibratoGains) {
            this.nodes.vibratoGains.forEach(gain => {
                try {
                    gain.disconnect();
                } catch (e) {
                    // Ignore errors
                }
            });
        }

        // Create new array for vibrato gains
        this.nodes.vibratoGains = [];

        // Apply vibrato to each formant
        this.nodes.formants.forEach((formant, i) => {
            if (!formant || !formant.filter) return;

            const formantVibratoGain = audioCtx.createGain();
            const baseFreq = formant.filter.frequency.value;
            formantVibratoGain.gain.value = baseFreq * depth;

            vibratoOsc.connect(formantVibratoGain);
            formantVibratoGain.connect(formant.filter.frequency);

            this.nodes.vibratoGains.push(formantVibratoGain);
        });

        vibratoOsc.start();
        this.nodes.vibratoOsc = vibratoOsc;

        console.log(`Added vibrato at ${rate}Hz with depth ${depth}`);
    }

    // Change the voice type (soprano, alto, tenor, bass)
    changeVoiceType(voiceType) {
        if (!this.voiceTypes[voiceType]) return;

        this.state.voiceType = voiceType;
        const voiceFactors = this.voiceTypes[voiceType];
        const vowel = this.state.vowel;

        // Update all formants for the new voice type
        if (this.nodes.formants && this.nodes.formants.length > 0) {
            const audioCtx = this.audioCore.getAudioContext();
            const currentTime = audioCtx.currentTime;

            // Apply voice type changes to all formants
            for (let i = 0; i < this.nodes.formants.length; i++) {
                const formant = this.nodes.formants[i];
                if (!formant || !formant.filter) continue;

                const targetFreq = this.state.formantFreqs[vowel][i] * voiceFactors.formantFactor;

                try {
                    // Smooth transition to new formant frequency
                    formant.filter.frequency.cancelScheduledValues(currentTime);
                    formant.filter.frequency.setValueAtTime(formant.filter.frequency.value, currentTime);
                    formant.filter.frequency.exponentialRampToValueAtTime(
                        Math.max(targetFreq, 20), // Ensure minimum value
                        currentTime + 0.5
                    );
                } catch (e) {
                    console.warn("Error changing voice type:", e);
                    formant.filter.frequency.value = targetFreq;
                }
            }
        }

        console.log(`Changed voice type to ${voiceType}`);
    }

    // Start the voice synth
    start() {
        if (this.state.active) {
            console.log("VoiceSynth: Already active, ignoring start request");
            return;
        }

        console.log("VoiceSynth: Starting");
        this.state.active = true;

        // Make sure voice gain is properly set
        if (this.nodes.voiceGain) {
            const audioCtx = this.audioCore.getAudioContext();
            const currentTime = audioCtx.currentTime;

            try {
                console.log(`VoiceSynth: Setting voice gain to ${this.state.volume}`);
                this.nodes.voiceGain.gain.cancelScheduledValues(currentTime);
                this.nodes.voiceGain.gain.setValueAtTime(0, currentTime);
                this.nodes.voiceGain.gain.linearRampToValueAtTime(
                    this.state.volume,
                    currentTime + 0.5
                );
            } catch (e) {
                console.warn("VoiceSynth: Error starting voice:", e);
                this.nodes.voiceGain.gain.value = this.state.volume;
            }
        } else {
            console.error("VoiceSynth: Voice gain node is missing! Voice won't be audible.");
        }

        // Add vibrato
        console.log("VoiceSynth: Adding vibrato");
        this.addVibrato(this.state.vibratoRate, this.state.vibratoDepth);

        // Start vowel sequence if enabled
        if (this.state.autoVowelChange) {
            console.log("VoiceSynth: Starting auto vowel changes");
            this.autoChangeVowel();
        }

        // Set initial vowel to make sure there's sound
        this.changeVowel(this.state.vowel, 0.1);

        console.log("VoiceSynth: Started successfully");
    }

    // Stop the voice synth
    stop() {
        if (!this.state.active) return;

        this.state.active = false;

        // Fade out voice gain
        if (this.nodes.voiceGain) {
            const audioCtx = this.audioCore.getAudioContext();
            const currentTime = audioCtx.currentTime;

            try {
                this.nodes.voiceGain.gain.cancelScheduledValues(currentTime);
                this.nodes.voiceGain.gain.setValueAtTime(this.nodes.voiceGain.gain.value, currentTime);
                this.nodes.voiceGain.gain.linearRampToValueAtTime(
                    0,
                    currentTime + 0.5
                );
            } catch (e) {
                console.warn("Error stopping voice:", e);
                this.nodes.voiceGain.gain.value = 0;
            }
        }

        console.log("Voice synth stopped");
    }

    // Set voice volume
    setVolume(volume) {
        this.state.volume = volume;

        if (this.nodes.voiceGain && this.state.active) {
            const audioCtx = this.audioCore.getAudioContext();
            const currentTime = audioCtx.currentTime;

            try {
                this.nodes.voiceGain.gain.cancelScheduledValues(currentTime);
                this.nodes.voiceGain.gain.setValueAtTime(this.nodes.voiceGain.gain.value, currentTime);
                this.nodes.voiceGain.gain.linearRampToValueAtTime(
                    volume,
                    currentTime + 0.2
                );
            } catch (e) {
                console.warn("Error setting voice volume:", e);
                this.nodes.voiceGain.gain.value = volume;
            }
        }
    }

    // Set vowel sequence
    setVowelSequence(sequence) {
        if (!Array.isArray(sequence) || sequence.length === 0) return;

        // Validate all vowels in sequence
        for (const vowel of sequence) {
            if (!this.state.formantFreqs[vowel]) {
                console.warn(`Invalid vowel in sequence: ${vowel}`);
                return;
            }
        }

        this.state.vowelSequence = sequence;
        this.state.currentVowelIndex = 0;

        // If active, immediately change to the first vowel in the sequence
        if (this.state.active && this.state.autoVowelChange) {
            this.changeVowel(sequence[0]);
        }

        console.log(`Set vowel sequence to [${sequence.join(', ')}]`);
    }

    // Enable/disable automatic vowel changes
    setAutoVowelChange(enable) {
        this.state.autoVowelChange = enable;

        if (enable && this.state.active) {
            // Start vowel sequence
            this.autoChangeVowel();
        }
    }

    // Set rate of vowel changes in seconds per vowel
    setVowelChangeRate(rate) {
        this.state.vowelChangeRate = rate;
    }

    // Automatically change vowels according to sequence
    autoChangeVowel() {
        if (!this.state.active || !this.state.autoVowelChange) return;

        const audioCtx = this.audioCore.getAudioContext();
        const currentTime = audioCtx.currentTime;

        // Check if it's time to change vowel
        if (currentTime - this.state.lastVowelChangeTime >= this.state.vowelChangeRate) {
            // Get next vowel in sequence
            this.state.currentVowelIndex = (this.state.currentVowelIndex + 1) % this.state.vowelSequence.length;
            const nextVowel = this.state.vowelSequence[this.state.currentVowelIndex];

            // Change to next vowel
            this.changeVowel(nextVowel, Math.min(this.state.vowelChangeRate * 0.5, 1.0));

            // Update last change time
            this.state.lastVowelChangeTime = currentTime;
        }

        // Schedule next check
        requestAnimationFrame(() => this.autoChangeVowel());
    }

    // Boost formant gains for more volume
    boostFormantGains() {
        // Increase all formant gains
        for (const vowel in this.state.formantGains) {
            for (let i = 0; i < this.state.formantGains[vowel].length; i++) {
                // Multiply all gains by 2 for more volume
                this.state.formantGains[vowel][i] *= 2;
            }
        }

        console.log("VoiceSynth: Formant gains boosted for more volume");

        // If formants are already created, update their gains
        if (this.nodes.formants && this.nodes.formants.length > 0) {
            const vowel = this.state.vowel;
            const voiceFactors = this.voiceTypes[this.state.voiceType];

            for (let i = 0; i < this.nodes.formants.length; i++) {
                const formant = this.nodes.formants[i];
                if (formant && formant.gain) {
                    const targetGain = this.state.formantGains[vowel][i] * 0.5;
                    formant.gain.gain.value = targetGain;
                }
            }
        }
    }

    // Harmonize with current oscillator frequencies
    harmonizeWithOscillators() {
        const oscillatorState = this.oscillatorManager.getState().oscillators;
        const activeFreqs = [];

        // Collect active oscillator frequencies
        for (let i = 1; i <= 3; i++) {
            if (oscillatorState[i] && oscillatorState[i].active) {
                activeFreqs.push(oscillatorState[i].freq);
            }
        }

        if (activeFreqs.length === 0) return;

        // Choose a custom vowel sequence based on oscillator frequencies
        // Different sequences for different frequency ranges
        let sequence;
        const avgFreq = activeFreqs.reduce((sum, freq) => sum + freq, 0) / activeFreqs.length;

        if (avgFreq < 150) {
            sequence = ['u', 'o', 'u', 'o', 'a'];  // Lower frequencies - deeper vowels
        } else if (avgFreq < 300) {
            sequence = ['o', 'a', 'o', 'e', 'a'];  // Mid-low frequencies
        } else if (avgFreq < 500) {
            sequence = ['a', 'e', 'a', 'i', 'e'];  // Mid frequencies
        } else {
            sequence = ['e', 'i', 'e', 'i', 'a'];  // Higher frequencies - brighter vowels
        }

        // Set new vowel sequence
        this.setVowelSequence(sequence);

        // Adjust voice type based on frequency range
        let voiceType;
        if (avgFreq < 150) {
            voiceType = 'bass';
        } else if (avgFreq < 300) {
            voiceType = 'tenor';
        } else if (avgFreq < 500) {
            voiceType = 'alto';
        } else {
            voiceType = 'soprano';
        }

        this.changeVoiceType(voiceType);

        // Set vowel change rate based on LFO 1 rate if active
        const lfoState = this.modulationManager.getState().lfos;
        if (lfoState[1] && lfoState[1].active) {
            const lfoRate = lfoState[1].freq;
            // Convert LFO Hz to seconds per vowel - slower LFO = slower vowel changes
            this.setVowelChangeRate(Math.max(1.0, 5.0 / lfoRate));
        }

        console.log(`Harmonized voice with oscillators (avg freq: ${avgFreq.toFixed(1)}Hz)`);
    }

    // Get state
    getState() {
        return {
            active: this.state.active,
            vowel: this.state.vowel,
            volume: this.state.volume,
            vowelSequence: [...this.state.vowelSequence],
            autoVowelChange: this.state.autoVowelChange,
            vowelChangeRate: this.state.vowelChangeRate,
            vibratoRate: this.state.vibratoRate,
            vibratoDepth: this.state.vibratoDepth,
            voiceType: this.state.voiceType
        };
    }

    // Clean up resources
    cleanup() {
        console.log("VoiceSynth: Cleaning up resources");

        // Stop all oscillators
        const nodesToStop = [
            'vibratoOsc',
            'directOsc',
            'noiseSource'
        ];

        nodesToStop.forEach(nodeKey => {
            if (this.nodes[nodeKey]) {
                try {
                    console.log(`VoiceSynth: Stopping ${nodeKey}`);
                    this.nodes[nodeKey].stop();
                } catch (e) {
                    console.warn(`VoiceSynth: Error stopping ${nodeKey}:`, e);
                }
            }
        });

        if (this.nodes.jitterOscs) {
            this.nodes.jitterOscs.forEach((jitter, index) => {
                try {
                    console.log(`VoiceSynth: Stopping jitter oscillator ${index}`);
                    jitter.osc.stop();
                } catch (e) {
                    console.warn(`VoiceSynth: Error stopping jitter oscillator:`, e);
                }
            });
        }

        // Disconnect all nodes
        const nodesToDisconnect = [
            'voiceGain',
            'carrier',
            'directCarrierGain',
            'noiseGain',
            'noiseFilter'
        ];

        nodesToDisconnect.forEach(nodeKey => {
            if (this.nodes[nodeKey]) {
                try {
                    console.log(`VoiceSynth: Disconnecting ${nodeKey}`);
                    this.nodes[nodeKey].disconnect();
                } catch (e) {
                    console.warn(`VoiceSynth: Error disconnecting ${nodeKey}:`, e);
                }
            }
        });

        // Disconnect all formant filters and gains
        if (this.nodes.formants) {
            this.nodes.formants.forEach((formant, index) => {
                try {
                    if (formant.filter) {
                        console.log(`VoiceSynth: Disconnecting formant filter ${index}`);
                        formant.filter.disconnect();
                    }
                    if (formant.gain) {
                        console.log(`VoiceSynth: Disconnecting formant gain ${index}`);
                        formant.gain.disconnect();
                    }
                } catch (e) {
                    console.warn(`VoiceSynth: Error disconnecting formant:`, e);
                }
            });
        }

        // Clear all node references
        this.nodes = {
            formants: [],
            vocoder: null,
            voiceGain: null,
            vowelFilter: null
        };

        // Reset state
        this.state.active = false;

        console.log("VoiceSynth: Resources cleaned up");
    }

    // Helper method for direct activation (for debugging)
    activateVoiceWithSettings() {
        console.log("VoiceSynth: Direct activation with default settings");

        // Make sure voice synth is initialized
        if (!this.nodes.voiceGain) {
            console.log("VoiceSynth: Not initialized, initializing now");
            this.initVoiceSynth();
        }

        // Set voice type to alto (usually most audible)
        this.changeVoiceType('alto');

        // Set volume to max
        this.setVolume(1.0);

        // Set vowel sequence to all vowels for clear testing
        this.setVowelSequence(['a', 'e', 'i', 'o', 'u']);

        // Enable auto vowel change
        this.setAutoVowelChange(true);

        // Set faster vowel change rate
        this.setVowelChangeRate(1.0);

        // Add vibrato
        this.addVibrato(6, 0.3);

        // Activate
        this.start();

        console.log("VoiceSynth: Directly activated with debug settings");

        // Play test tone after a brief delay
        setTimeout(() => {
            this.playTestTone();
        }, 500);

        return "Voice synth activated with debug settings. You should hear sound now.";
    }
}