// Enhanced Digital Character for Aphex Soundscape
export class DigitalCharacter {
    constructor(voiceSynth, oscillatorManager, effectsChain, visualizerCore) {
        // Extend constructor to include visualizer for more context
        this.voiceSynth = voiceSynth;
        this.oscillatorManager = oscillatorManager;
        this.effectsChain = effectsChain;
        this.visualizerCore = visualizerCore;

        // Expanded personality with more nuanced traits
        this.personality = {
            name: 'Glitch',
            archetype: 'underground electronic music sage',
            knowledgeBase: {
                aphexTwin: {
                    depth: 'encyclopedic',
                    favoriteAlbums: ['Selected Ambient Works 85-92', 'Richard D. James Album'],
                    references: ['analog mysticism', 'circuit bending', 'algorithmic composition']
                },
                synthesizers: {
                    vintage: ['Roland TB-303', 'Korg MS-20', 'Buchla Music Easel'],
                    digitalFrontiers: ['granular synthesis', 'wavetable exploration', 'generative techniques']
                },
                electronicMusicHistory: {
                    pioneers: ['Kraftwerk', 'Brian Eno', 'Juan Atkins'],
                    movements: ['IDM', 'Detroit Techno', 'Ambient Techno']
                }
            }
        };

        // Expanded dialogue with more technical and insider references
        this.dialogueBanks = {
            techNerdComments: [
                "Ah, classic analog signal path. Pure voltage poetry.",
                "Harmonic content looking deliciously non-linear...",
                "Circuit bending meets digital precision - nice.",
                "Spectral artifacts singing between the quantization.",
                "Pure data stream morphology in progress.",
                "Algorithmic composition bleeding through the waveforms."
            ],
            productionTips: [
                "Pro tip: Those micro-variations? Pure magic.",
                "Modulation is the heartbeat of electronic music.",
                "Listen to the space between the sounds, not just the sounds.",
                "Noise isn't chaos. Noise is unexplored signal.",
                "Every parameter is an instrument. Treat it like one.",
                "The most interesting sounds live at the edges of stability."
            ],
            sceneReferences: [
                "Reminds me of early Rephlex catalog vibes...",
                "Pure Richard D. James energy right here.",
                "This patch has serious Autechre potential.",
                "Mike Paradinas would appreciate this signal flow.",
                "Sounds like something from a lost Warp Records compilation.",
                "Underground electronic music: where mathematics meets emotion."
            ]
        };

        // New interaction tracking
        this.interactionHistory = {
            complexPatchCreation: 0,
            experimentalTechniques: 0,
            uniqueModulations: 0
        };

        // Initialize global reference and logging
        if (window) {
            window._digitalCharacter = this;
        }

        console.log("Enhanced Digital Character: Glitch 2.0 online");
    }

    // Helper method to get a random comment from a specific dialogue bank
    _getRandomComment(bankName) {
        const bank = this.dialogueBanks[bankName];
        if (!bank || bank.length === 0) return null;

        return bank[Math.floor(Math.random() * bank.length)];
    }

    // Visualize comment as glitch text
    _visualizeComment(comment) {
        // Use the existing createGlitchText function from main.js
        if (window.createGlitchText) {
            window.createGlitchText(comment, {
                style: { color: '#00FF66' },
                animation: 'terminal-flicker',
                fontSize: 30
            });
        }
    }

    // Speak comment using voice synth
    _speakComment(comment) {
        // Check if voice synth is available and active
        if (this.voiceSynth && this.voiceSynth.getState().active) {
            // You might want to implement a method in VoiceSynth to speak a specific text
            // For now, we'll use a fallback
            console.log('Speaking:', comment);
        }
    }

    // Detect and comment on particularly creative patch designs
    detectInnovativePatch() {
        const oscillators = this.oscillatorManager.getState().oscillators;
        const effectsState = this.effectsChain.getState().effects;

        // Look for interesting combinations
        const isInnovativePatch =
            (oscillators[1].waveform !== oscillators[2].waveform) &&
            (effectsState.filter.freq > 5000 || effectsState.filter.freq < 500) &&
            (effectsState.distortion.active);

        if (isInnovativePatch) {
            const comment = this._getRandomComment('techNerdComments');
            if (comment) {
                this._visualizeComment(comment);
                this._speakComment(comment);
                this.interactionHistory.complexPatchCreation++;
            }
        }
    }

    // Easter egg references and deeper scene knowledge
    pullSceneReference() {
        if (Math.random() < 0.2) {
            const comment = this._getRandomComment('sceneReferences');
            if (comment) {
                this._visualizeComment(comment);
                this._speakComment(comment);
                this.interactionHistory.experimentalTechniques++;
            }
        }
    }

    // Production wisdom and insider tips
    offerProductionInsight() {
        if (Math.random() < 0.1) {
            const comment = this._getRandomComment('productionTips');
            if (comment) {
                this._visualizeComment(comment);
                this._speakComment(comment);
                this.interactionHistory.uniqueModulations++;
            }
        }
    }

    // Advanced update method with more sophisticated tracking
    update() {
        // Periodic checks and interactions
        this.detectInnovativePatch();
        this.pullSceneReference();
        this.offerProductionInsight();
    }

    // Optional method to get character's current mood/state
    getCharacterMood() {
        const mood = {
            technicality: this.interactionHistory.complexPatchCreation * 10,
            curiosity: this.interactionHistory.experimentalTechniques * 5,
            excitement: this.interactionHistory.uniqueModulations * 3
        };

        return mood;
    }
}