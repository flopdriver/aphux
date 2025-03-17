// src/utils/audioUtils.js

/**
 * Safe connection between Web Audio nodes
 * @param {AudioNode} source - Source audio node
 * @param {AudioNode} destination - Destination audio node
 * @returns {boolean} - Whether the connection was successful
 */
export function safeConnect(source, destination) {
    try {
        if (source && destination) {
            source.connect(destination);
            return true;
        }
        return false;
    } catch (e) {
        console.warn("Connection failed:", e);
        return false;
    }
}

/**
 * Create a distortion curve for a WaveShaper node
 * @param {number} amount - Amount of distortion (0-100)
 * @param {boolean} active - Whether distortion is active
 * @returns {Float32Array} - Distortion curve
 */
export function createDistortionCurve(amount, active) {
    const samples = 44100;
    const curve = new Float32Array(samples);

    // If distortion is disabled, create a linear curve (no distortion)
    if (!active) {
        for (let i = 0; i < samples; ++i) {
            const x = i * 2 / samples - 1;
            curve[i] = x; // Linear mapping = no distortion
        }
        return curve;
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

    return curve;
}

/**
 * Create an impulse response buffer for a convolver node (reverb)
 * @param {AudioContext} audioCtx - Audio context
 * @param {number} duration - Duration of impulse in seconds
 * @returns {AudioBuffer} - Impulse response buffer
 */
export function createReverbImpulse(audioCtx, duration = 3) {
    // Improved impulse response with more natural decay
    const sampleRate = audioCtx.sampleRate;
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

    return impulse;
}

/**
 * Calculate the frequency for a musical note
 * @param {number|string} note - MIDI note number or note name (e.g., "A4")
 * @returns {number} - Frequency in Hz
 */
export function noteToFrequency(note) {
    // If note is already a number, assume it's a MIDI note number
    if (typeof note === 'number') {
        // A4 = MIDI note 69 = 440Hz
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // If note is a string, parse it as a note name
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Parse note name and octave (e.g., "A4")
    const noteName = note.slice(0, -1);
    const octave = parseInt(note.slice(-1));

    // Calculate MIDI note number
    const noteIndex = noteNames.indexOf(noteName);
    if (noteIndex === -1) return null; // Invalid note name

    const midiNote = (octave + 1) * 12 + noteIndex;

    // A4 = MIDI note 69 = 440Hz
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Get a random value within a range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random value within the range
 */
export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}