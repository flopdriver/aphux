// src/modules/StateManager.js
export class StateManager {
    constructor() {
        // Initial state
        this.state = {
            isInitialized: false,
            oscillators: {
                1: { freq: 110, waveform: 'sine', active: true, lfo1Target: true, lfo2Target: false },
                2: { freq: 220, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false },
                3: { freq: 440, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false }
            },
            lfos: {
                1: { freq: 1, depth: 50, active: true },
                2: { freq: 0.5, depth: 30, active: true }
            },
            effects: {
                delay: { time: 0.3, feedback: 0.4, active: true },
                filter: { freq: 2000, q: 5, active: true },
                distortion: { amount: 20, active: false },
                reverb: { amount: 0.3, active: true }
            },
            master: {
                volume: 0.7
            },
            chaosMatrix: Array(64).fill(false)
        };

        // Module references
        this.modules = {
            audioCore: null,
            oscillatorManager: null,
            modulationManager: null,
            effectsChain: null,
            visualizer: null,
            chaosMatrix: null,
            uiController: null
        };

        console.log("StateManager initialized");
    }

    // Register a module
    registerModule(name, module) {
        if (this.modules.hasOwnProperty(name)) {
            this.modules[name] = module;
            console.log(`Module '${name}' registered with StateManager`);
        } else {
            console.warn(`Unknown module name: ${name}`);
        }
    }

    // Get state for a specific module or the entire state
    getState(moduleName = null) {
        if (moduleName) {
            switch (moduleName) {
                case 'audioCore':
                    return {
                        isInitialized: this.state.isInitialized,
                        master: { ...this.state.master }
                    };
                case 'oscillatorManager':
                    return {
                        oscillators: { ...this.state.oscillators }
                    };
                case 'modulationManager':
                    return {
                        lfos: { ...this.state.lfos }
                    };
                case 'effectsChain':
                    return {
                        effects: { ...this.state.effects }
                    };
                case 'chaosMatrix':
                    return {
                        chaosMatrix: [...this.state.chaosMatrix]
                    };
                default:
                    console.warn(`Unknown module name: ${moduleName}`);
                    return null;
            }
        }

        // Return the entire state
        return this.getFullState();
    }

    // Get a copy of the full state
    getFullState() {
        return {
            isInitialized: this.state.isInitialized,
            oscillators: JSON.parse(JSON.stringify(this.state.oscillators)),
            lfos: JSON.parse(JSON.stringify(this.state.lfos)),
            effects: JSON.parse(JSON.stringify(this.state.effects)),
            master: { ...this.state.master },
            chaosMatrix: [...this.state.chaosMatrix]
        };
    }

    // Update a specific part of the state
    updateState(path, value) {
        const parts = path.split('.');
        let current = this.state;

        // Navigate to the parent of the final property
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                console.warn(`Path ${path} does not exist in state`);
                return false;
            }
            current = current[parts[i]];
        }

        // Set the final property
        const finalProp = parts[parts.length - 1];
        if (current[finalProp] !== undefined) {
            current[finalProp] = value;
            this.notifyStateChange(path, value);
            return true;
        }

        console.warn(`Cannot update state: ${path} does not exist`);
        return false;
    }

    // Notify all modules of state change
    notifyStateChange(path, value) {
        // Determine which module should handle this state change
        if (path.startsWith('isInitialized') || path.startsWith('master')) {
            if (this.modules.audioCore) {
                this.modules.audioCore.onStateChange(path, value);
            }
        } else if (path.startsWith('oscillators')) {
            if (this.modules.oscillatorManager) {
                this.modules.oscillatorManager.onStateChange(path, value);
            }
        } else if (path.startsWith('lfos')) {
            if (this.modules.modulationManager) {
                this.modules.modulationManager.onStateChange(path, value);
            }
        } else if (path.startsWith('effects')) {
            if (this.modules.effectsChain) {
                this.modules.effectsChain.onStateChange(path, value);
            }
        } else if (path.startsWith('chaosMatrix')) {
            if (this.modules.chaosMatrix) {
                this.modules.chaosMatrix.onStateChange(path, value);
            }
        }
    }

    // Save current state as a preset
    savePreset() {
        try {
            // Save current state as JSON
            const preset = JSON.stringify(this.getFullState());

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

            console.log("Preset saved successfully");
            return true;
        } catch (e) {
            console.error("Error saving preset:", e);
            return false;
        }
    }

    // Load preset from a JSON string
    loadPreset(presetJson) {
        try {
            const preset = JSON.parse(presetJson);

            // Validate preset data
            if (!preset.oscillators || !preset.lfos || !preset.effects || !preset.master) {
                console.error("Invalid preset format");
                return false;
            }

            // Update state
            this.state = {
                ...this.state,
                ...preset
            };

            // Notify all modules
            this.notifyAllModules();

            console.log("Preset loaded successfully");
            return true;
        } catch (e) {
            console.error("Error loading preset:", e);
            return false;
        }
    }

    // Notify all modules to update from the current state
    notifyAllModules() {
        if (this.modules.audioCore) {
            this.modules.audioCore.onStateChange('master', this.state.master);
            this.modules.audioCore.onStateChange('isInitialized', this.state.isInitialized);
        }

        if (this.modules.oscillatorManager) {
            this.modules.oscillatorManager.onStateChange('oscillators', this.state.oscillators);
        }

        if (this.modules.modulationManager) {
            this.modules.modulationManager.onStateChange('lfos', this.state.lfos);
        }

        if (this.modules.effectsChain) {
            this.modules.effectsChain.onStateChange('effects', this.state.effects);
        }

        if (this.modules.chaosMatrix) {
            this.modules.chaosMatrix.onStateChange('chaosMatrix', this.state.chaosMatrix);
        }

        // UI controller should update all UI elements
        if (this.modules.uiController) {
            this.modules.uiController.resetUIControls();
        }
    }

    // Reset state to defaults
    resetToDefaults() {
        this.state = {
            isInitialized: false,
            oscillators: {
                1: { freq: 110, waveform: 'sine', active: true, lfo1Target: true, lfo2Target: false },
                2: { freq: 220, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false },
                3: { freq: 440, waveform: 'sine', active: true, lfo1Target: false, lfo2Target: false }
            },
            lfos: {
                1: { freq: 1, depth: 50, active: true },
                2: { freq: 0.5, depth: 30, active: true }
            },
            effects: {
                delay: { time: 0.3, feedback: 0.4, active: true },
                filter: { freq: 2000, q: 5, active: true },
                distortion: { amount: 20, active: false },
                reverb: { amount: 0.3, active: true }
            },
            master: {
                volume: 0.7
            },
            chaosMatrix: Array(64).fill(false)
        };

        this.notifyAllModules();
        console.log("State reset to defaults");
        return true;
    }
}