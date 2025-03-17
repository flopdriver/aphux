// src/modules/ModulationManager.js
export class ModulationManager {
    constructor(audioCore, oscillatorManager) {
        this.audioCore = audioCore;
        this.oscillatorManager = oscillatorManager;

        // LFO nodes
        this.nodes = {
            lfos: {}
        };

        // Store references to created gain nodes to avoid garbage collection
        this.gainNodeReferences = {
            lfo1: [],
            lfo2: []
        };

        // LFO state
        this.state = {
            lfos: {
                1: { freq: 1, depth: 50, active: true },
                2: { freq: 0.5, depth: 30, active: true }
            }
        };

        console.log("ModulationManager initialized");
    }

    // Create LFO node
    createLFO(id) {
        const audioCtx = this.audioCore.getAudioContext();
        if (!audioCtx) return null;

        // Create oscillator for the LFO
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = this.state.lfos[id].freq;

        // Create a central gain node that will be connected to individual target gains
        const lfoGain = audioCtx.createGain();

        // Set to a standard value - actual modulation depth will be set by individual connections
        lfoGain.gain.value = 1.0;

        // Connect the oscillator to its gain node
        lfo.connect(lfoGain);
        lfo.gainNode = lfoGain;

        // Store LFO for now, we'll connect it after all nodes are created
        this.nodes.lfos[id] = lfo;

        console.log(`Created LFO ${id} with frequency ${lfo.frequency.value} Hz`);

        return lfo;
    }

    // Initialize all LFOs
    initLFOs() {
        for (let i = 1; i <= 2; i++) {
            this.createLFO(i);
        }
    }

    // Start all LFOs
    startLFOs() {
        Object.values(this.nodes.lfos).forEach(lfo => {
            if (lfo) {
                try {
                    lfo.start();
                } catch (e) {
                    console.warn("LFO already started:", e);
                }
            }
        });
    }

    // Calculate LFO depth based on target
    calculateLFODepth(id, targetFilter = null) {
        const depth = this.state.lfos[id].depth / 100;
        const oscillatorState = this.oscillatorManager.getState().oscillators;

        if (id === 1) {
            // See if any oscillators are connected to LFO 1
            for (let i = 1; i <= 3; i++) {
                if (oscillatorState[i].lfo1Target) {
                    return oscillatorState[i].freq * depth * 0.5;
                }
            }
            // Default to filter if no oscillator connected and filter is provided
            if (targetFilter) {
                return targetFilter.frequency.value * depth;
            }
        } else if (id === 2) {
            // See if any oscillators are connected to LFO 2
            for (let i = 1; i <= 3; i++) {
                if (oscillatorState[i].lfo2Target) {
                    return oscillatorState[i].freq * depth * 0.5;
                }
            }
            // Default to filter if no oscillator connected and filter is provided
            if (targetFilter) {
                return targetFilter.frequency.value * depth;
            }
        }

        return 0;
    }

    // This updated connectLFOs method respects the active state of each LFO
    // Connect LFOs to their targets
    connectLFOs(filter) {
        try {
            const audioCtx = this.audioCore.getAudioContext();
            if (!audioCtx) return;

            const oscillatorState = this.oscillatorManager.getState().oscillators;
            const oscillators = this.oscillatorManager.getOscillators();

            console.log("Connecting LFOs with state:",
                JSON.stringify({
                    osc1: { lfo1: oscillatorState[1].lfo1Target, lfo2: oscillatorState[1].lfo2Target },
                    osc2: { lfo1: oscillatorState[2].lfo1Target, lfo2: oscillatorState[2].lfo2Target },
                    osc3: { lfo1: oscillatorState[3].lfo1Target, lfo2: oscillatorState[3].lfo2Target },
                    lfo1_active: this.state.lfos[1].active,
                    lfo2_active: this.state.lfos[2].active
                }));

            // Clear previous gain node references
            this.gainNodeReferences.lfo1 = [];
            this.gainNodeReferences.lfo2 = [];

            // First disconnect any existing connections
            if (this.nodes.lfos[1] && this.nodes.lfos[1].gainNode) {
                try {
                    this.nodes.lfos[1].gainNode.disconnect();
                } catch (e) {
                    // Ignore disconnection errors
                }
            }

            if (this.nodes.lfos[2] && this.nodes.lfos[2].gainNode) {
                try {
                    this.nodes.lfos[2].gainNode.disconnect();
                } catch (e) {
                    // Ignore disconnection errors
                }
            }

            // Connect LFO 1 to its targets, but ONLY if it's active
            if (this.nodes.lfos[1] && this.nodes.lfos[1].gainNode && this.state.lfos[1].active) {
                let connectedLFO1 = false;

                // Check each oscillator to see if it's targeted by LFO 1
                for (let i = 1; i <= 3; i++) {
                    if (oscillatorState[i].lfo1Target && oscillators[i]) {
                        try {
                            // Create a separate gain node for each oscillator connection
                            // to properly scale the LFO modulation for each oscillator's frequency
                            const lfoGain = audioCtx.createGain();
                            const depth = this.state.lfos[1].depth / 100;

                            // Adjust the gain value - reduce it to avoid too extreme pitch variations
                            lfoGain.gain.value = oscillatorState[i].freq * depth * 0.25;

                            // Store the gain node reference
                            this.gainNodeReferences.lfo1.push(lfoGain);

                            // Connect through the gain node
                            this.nodes.lfos[1].gainNode.connect(lfoGain);
                            lfoGain.connect(oscillators[i].frequency);

                            connectedLFO1 = true;
                            console.log(`LFO 1 connected to oscillator ${i} with depth ${lfoGain.gain.value}`);
                        } catch (e) {
                            console.warn(`Failed to connect LFO 1 to oscillator ${i}:`, e);
                        }
                    }
                }

                // Always connect to filter with a separate gain path if filter exists
                if (filter) {
                    try {
                        const filterLfoGain = audioCtx.createGain();
                        const depth = this.state.lfos[1].depth / 100;

                        // If no oscillators are connected, use full LFO strength on filter
                        // Otherwise use a reduced amount
                        const filterDepth = connectedLFO1 ? 0.3 : 1.0;
                        filterLfoGain.gain.value = filter.frequency.value * depth * filterDepth * 0.5;

                        // Store the gain node reference
                        this.gainNodeReferences.lfo1.push(filterLfoGain);

                        this.nodes.lfos[1].gainNode.connect(filterLfoGain);
                        filterLfoGain.connect(filter.frequency);
                        console.log(`LFO 1 connected to filter with depth ${filterLfoGain.gain.value}`);
                    } catch (e) {
                        console.warn("Failed to connect LFO 1 to filter:", e);
                    }
                }
            } else {
                console.log("LFO 1 is inactive, not connecting to targets");
            }

            // Connect LFO 2 to its targets, but ONLY if it's active
            if (this.nodes.lfos[2] && this.nodes.lfos[2].gainNode && this.state.lfos[2].active) {
                let connectedLFO2 = false;

                // Check each oscillator to see if it's targeted by LFO 2
                for (let i = 1; i <= 3; i++) {
                    if (oscillatorState[i].lfo2Target && oscillators[i]) {
                        try {
                            // Create a separate gain node for each oscillator connection
                            const lfoGain = audioCtx.createGain();
                            const depth = this.state.lfos[2].depth / 100;

                            // Adjust the gain value - reduce it to avoid too extreme pitch variations
                            lfoGain.gain.value = oscillatorState[i].freq * depth * 0.25;

                            // Store the gain node reference
                            this.gainNodeReferences.lfo2.push(lfoGain);

                            // Connect through the gain node
                            this.nodes.lfos[2].gainNode.connect(lfoGain);
                            lfoGain.connect(oscillators[i].frequency);

                            connectedLFO2 = true;
                            console.log(`LFO 2 connected to oscillator ${i} with depth ${lfoGain.gain.value}`);
                        } catch (e) {
                            console.warn(`Failed to connect LFO 2 to oscillator ${i}:`, e);
                        }
                    }
                }

                // Always connect to filter with a separate gain path if filter exists
                if (filter) {
                    try {
                        const filterLfoGain = audioCtx.createGain();
                        const depth = this.state.lfos[2].depth / 100;

                        // If no oscillators are connected, use full LFO strength on filter
                        // Otherwise use a reduced amount
                        const filterDepth = connectedLFO2 ? 0.3 : 1.0;
                        filterLfoGain.gain.value = filter.frequency.value * depth * filterDepth * 0.5;

                        // Store the gain node reference
                        this.gainNodeReferences.lfo2.push(filterLfoGain);

                        this.nodes.lfos[2].gainNode.connect(filterLfoGain);
                        filterLfoGain.connect(filter.frequency);
                        console.log(`LFO 2 connected to filter with depth ${filterLfoGain.gain.value}`);
                    } catch (e) {
                        console.warn("Failed to connect LFO 2 to filter:", e);
                    }
                }
            } else {
                console.log("LFO 2 is inactive, not connecting to targets");
            }
        } catch (e) {
            console.error("Error in connectLFOs:", e);
        }
    }

    // Update LFO frequency
    updateLfoFrequency(id, freq) {
        this.state.lfos[id].freq = freq;

        if (this.nodes.lfos[id]) {
            const audioCtx = this.audioCore.getAudioContext();
            this.nodes.lfos[id].frequency.setValueAtTime(freq, audioCtx.currentTime);
        }
    }

    // Update LFO depth
    updateLfoDepth(id, depth, filter) {
        this.state.lfos[id].depth = depth;

        // Reconnect LFOs to apply new depth values
        this.connectLFOs(filter);
    }

    // Toggle LFO active state
    toggleLfoActive(id, isActive, filter) {
        this.state.lfos[id].active = isActive;

        // If the LFO is deactivated, disconnect it
        if (!isActive && this.nodes.lfos[id] && this.nodes.lfos[id].gainNode) {
            try {
                this.nodes.lfos[id].gainNode.disconnect();
            } catch (e) {
                // Ignore disconnection errors
            }
        } else {
            // Reconnect LFOs
            this.connectLFOs(filter);
        }
    }

    // Get LFO nodes
    getLFOs() {
        return this.nodes.lfos;
    }

    // Get state
    getState() {
        return {
            lfos: { ...this.state.lfos }
        };
    }
}