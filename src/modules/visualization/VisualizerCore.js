// src/modules/visualization/VisualizerCore.js
import { RendererManager } from './RendererManager.js';
import { EffectsManager } from './EffectsManager.js';

export class VisualizerCore {
    constructor(audioCore, oscillatorManager, modulationManager, effectsChain, chaosMatrix) {
        this.audioCore = audioCore;
        this.oscillatorManager = oscillatorManager;
        this.modulationManager = modulationManager;
        this.effectsChain = effectsChain;
        this.chaosMatrix = chaosMatrix;

        // Canvas elements
        this.canvas = null;
        this.ctx = null;

        // Animation state
        this.animationId = null;
        this.isRunning = false;

        // Create dependent managers
        this.rendererManager = new RendererManager(this);
        this.effectsManager = new EffectsManager(this);

        // Visualization toggles
        this.renderToggles = {
            drawBackground: true,
            drawSpectrum: true,
            drawWaveform: true,
            drawParticles: true,
            drawExoticPatterns: true,
            drawLogo: true
        };

        // Data management
        this.dataHistory = [];
        this.historyLength = 32;

        console.log("VisualizerCore initialized");
    }

    // Initialize canvas visualizer
    initVisualizer() {
        try {
            this.canvas = document.getElementById('visualizer');
            if (!this.canvas) {
                console.error('Visualizer canvas not found');
                return;
            }

            this.ctx = this.canvas.getContext('2d');

            // Make sure canvas size is set properly
            this.canvas.width = this.canvas.offsetWidth || 800;
            this.canvas.height = this.canvas.offsetHeight || 200;

            // Initialize managers
            this.rendererManager.init();
            this.effectsManager.initialize(); // Changed from init() to initialize()

            // Set up animation loop
            this.startDrawLoop();

            console.log('Visualizer initialized successfully');
        } catch (error) {
            console.error('Error initializing visualizer:', error);
        }
    }

    // Toggle visualizer elements on/off
    toggleVisualizerElement(elementName, isVisible) {
        if (this.renderToggles.hasOwnProperty(elementName)) {
            this.renderToggles[elementName] = isVisible;
        }
    }

    // Start drawing loop
    startDrawLoop() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.draw();
    }

    // Stop drawing loop
    stopDrawLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isRunning = false;
    }

    // Animation loop
    draw = () => {
        try {
            this.animationId = requestAnimationFrame(this.draw);

            const analyser = this.audioCore.getAnalyser();
            if (!analyser) return;

            const width = this.canvas.width;
            const height = this.canvas.height;
            const currentTime = performance.now();

            // Set up data arrays for analyzer
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const timeDataArray = new Uint8Array(bufferLength);

            // Get frequency data
            analyser.getByteFrequencyData(dataArray);

            // Get time domain data for waveform
            analyser.getByteTimeDomainData(timeDataArray);

            // Store frequency data history for complex effects
            this.dataHistory.unshift([...dataArray]);
            if (this.dataHistory.length > this.historyLength) {
                this.dataHistory.pop();
            }

            // Calculate average frequency energy and spectrum distribution
            let sum = 0;
            let lowFreqEnergy = 0; // Bass energy (0-100Hz)
            let midFreqEnergy = 0; // Mids energy (100Hz-2kHz)
            let highFreqEnergy = 0; // Highs energy (2kHz+)

            // Calculate how many bins represent specific frequency ranges
            // This is a rough approximation based on typical analyzer bin distribution
            const lowBinCount = Math.floor(bufferLength * 0.1); // ~10% of bins for lows
            const midBinCount = Math.floor(bufferLength * 0.4); // ~40% of bins for mids

            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];

                // Calculate energy in different frequency bands
                if (i < lowBinCount) {
                    lowFreqEnergy += dataArray[i];
                } else if (i < lowBinCount + midBinCount) {
                    midFreqEnergy += dataArray[i];
                } else {
                    highFreqEnergy += dataArray[i];
                }
            }

            // Normalize energy values
            const averageEnergy = sum / bufferLength / 255;
            lowFreqEnergy = lowFreqEnergy / (lowBinCount * 255);
            midFreqEnergy = midFreqEnergy / (midBinCount * 255);
            highFreqEnergy = highFreqEnergy / ((bufferLength - lowBinCount - midBinCount) * 255);

            // Calculate chaos factor from chaos matrix
            const chaosState = this.chaosMatrix?.getState();
            const chaosActiveCount = chaosState ?
                chaosState.chaosMatrix.filter(cell => cell).length : 0;
            const chaosFactor = chaosActiveCount / 64; // Normalized 0-1

            // Clear canvas
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.clearRect(0, 0, width, height);

            // Audio parameters for visualization
            const audioParams = {
                width,
                height,
                dataArray,
                timeDataArray,
                bufferLength,
                averageEnergy,
                lowFreqEnergy,
                midFreqEnergy,
                highFreqEnergy,
                chaosFactor,
                currentTime
            };

            // Draw visualization elements in specific order
            if (this.renderToggles.drawBackground) {
                this.rendererManager.drawBackground(this.ctx, audioParams);
            }

            // Apply glitch effects
            this.effectsManager.applyGlitch(this.ctx, audioParams);

            if (this.renderToggles.drawExoticPatterns) {
                this.rendererManager.drawExoticPatterns(this.ctx, audioParams);
            }

            if (this.renderToggles.drawSpectrum) {
                this.rendererManager.drawSpectrum(this.ctx, audioParams);
            }

            if (this.renderToggles.drawParticles) {
                this.rendererManager.drawParticles(this.ctx, audioParams);
            }

            if (this.renderToggles.drawWaveform) {
                this.rendererManager.drawWaveform(this.ctx, audioParams);
            }

            if (this.renderToggles.drawLogo) {
                this.rendererManager.drawAphexLogo(this.ctx, audioParams);
            }

            // Apply subliminal face effect
            this.effectsManager.drawSubliminalFace(this.ctx, audioParams);

            // Apply post-processing
            this.effectsManager.applyPostProcessing(this.ctx, audioParams);

        } catch (error) {
            console.error('Error in visualizer draw function:', error);
        }
    }

    // Handle window resize
    handleResize() {
        if (this.canvas) {
            this.canvas.width = this.canvas.offsetWidth || 800;
            this.canvas.height = this.canvas.offsetHeight || 200;

            // Re-initialize visualization components
            this.rendererManager.handleResize(this.canvas.width, this.canvas.height);
            this.effectsManager.handleResize(this.canvas.width, this.canvas.height);
        }
    }

    // Get modules
    getAudioCore() { return this.audioCore; }
    getOscillatorManager() { return this.oscillatorManager; }
    getModulationManager() { return this.modulationManager; }
    getEffectsChain() { return this.effectsChain; }
    getChaosMatrix() { return this.chaosMatrix; }
    getDataHistory() { return this.dataHistory; }
    getCanvas() { return this.canvas; }
}