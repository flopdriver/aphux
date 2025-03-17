// src/modules/Visualizer.js
export class Visualizer {
    constructor(audioCore, oscillatorManager, modulationManager, effectsChain, chaosMatrix) {
        this.audioCore = audioCore;
        this.oscillatorManager = oscillatorManager;
        this.modulationManager = modulationManager;
        this.effectsChain = effectsChain;
        this.chaosMatrix = chaosMatrix;

        // Canvas elements
        this.canvas = null;
        this.ctx = null;

        // Background animation variables
        this.backgroundPhase = 0;
        this.backgroundHue = 0;
        this.backgroundSaturation = 20;
        this.backgroundPattern = 0;

        console.log("Visualizer initialized");
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

            // Set up animation loop
            this.draw();

            console.log('Visualizer initialized successfully');
        } catch (error) {
            console.error('Error initializing visualizer:', error);
        }
    }

    // Animation loop
    draw = () => {
        try {
            requestAnimationFrame(this.draw);

            const analyser = this.audioCore.getAnalyser();
            if (!analyser) return;

            const width = this.canvas.width;
            const height = this.canvas.height;

            // Set up data arrays for analyzer
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Get frequency data
            analyser.getByteFrequencyData(dataArray);

            // Calculate average frequency energy for background effects
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const averageEnergy = sum / bufferLength / 255;

            // Get state data from modules
            const oscillatorState = this.oscillatorManager?.getState().oscillators || {};
            const lfoState = this.modulationManager?.getState().lfos || {};
            const effectsState = this.effectsChain?.getState().effects || {};

            // Update background colors based on active controls
            this.backgroundPhase += 0.01 * (lfoState[1]?.active ? lfoState[1]?.freq : 0.5);

            // Update hue based on oscillator frequencies
            let activeOscCount = 0;
            let oscFreqSum = 0;
            for (let i = 1; i <= 3; i++) {
                if (oscillatorState[i]?.active) {
                    activeOscCount++;
                    oscFreqSum += oscillatorState[i]?.freq || 0;
                }
            }

            if (activeOscCount > 0) {
                // Map average oscillator frequency to hue (20-880Hz to 0-360 degrees)
                const avgFreq = oscFreqSum / activeOscCount;
                this.backgroundHue = (avgFreq / 880 * 360) % 360;
            }

            // Update saturation based on filter frequency
            this.backgroundSaturation = 20 + ((effectsState?.filter?.freq || 2000) / 20000 * 80);

            // Use distortion for pattern intensity
            this.backgroundPattern = effectsState?.distortion?.active ?
                effectsState.distortion.amount / 100 : 0.1;

            // Draw dynamic background
            this.drawBackground(
                this.ctx,
                width,
                height,
                this.backgroundPhase,
                this.backgroundHue,
                this.backgroundSaturation,
                this.backgroundPattern,
                averageEnergy
            );

            // Draw frequency bars
            const barWidth = Math.max(1, width / (bufferLength / 16)); // Show fewer bars
            let x = 0;

            for (let i = 0; i < bufferLength; i += 16) { // Skip some values for performance
                const barHeight = dataArray[i] / 255 * height * 0.8;

                // Calculate color based on frequency and active oscillators
                let hue = (i / bufferLength) * 360;

                // Use chaos matrix to influence bar colors if available
                const chaosState = this.chaosMatrix?.getState();
                if (chaosState) {
                    const chaosActiveCount = chaosState.chaosMatrix.filter(cell => cell).length;
                    if (chaosActiveCount > 0) {
                        hue = (hue + this.backgroundHue + chaosActiveCount) % 360;
                    }
                }

                const saturation = 70 + Math.sin(i * 0.1 + this.backgroundPhase) * 30;
                const lightness = 50 + Math.cos(i * 0.05 + this.backgroundPhase) * 10;

                this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
                if (x > width) break;
            }

            // Draw waveform
            analyser.getByteTimeDomainData(dataArray);

            this.ctx.lineWidth = 2;

            // Waveform color based on active LFOs
            const lfoInfluence = (lfoState[1]?.active ? lfoState[1]?.depth : 0) +
                (lfoState[2]?.active ? lfoState[2]?.depth : 0);

            const waveformHue = (this.backgroundHue + 180) % 360; // Complementary color
            const waveformSaturation = Math.min(100, 50 + lfoInfluence);

            this.ctx.strokeStyle = `hsla(${waveformHue}, ${waveformSaturation}%, 60%, 0.8)`;
            this.ctx.beginPath();

            const sliceWidth = width / bufferLength;
            x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this.ctx.stroke();
        } catch (error) {
            console.error('Error in visualizer draw function:', error);
        }
    }

    // Draw dynamic background patterns based on audio settings
    drawBackground(ctx, width, height, phase, hue, saturation, pattern, energy) {
        // Create gradient based on current settings
        const gradient = ctx.createLinearGradient(0, 0, width, height);

        // Base color from oscillator frequencies
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, 10%, 0.8)`);
        gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, ${saturation}%, 15%, 0.8)`);

        // Fill background with semi-transparent gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Get effect states
        const effectsState = this.effectsChain?.getState().effects || {};

        // Create pattern overlay based on filter and distortion
        const patternIntensity = pattern * energy * 0.5;

        // Draw pattern based on reverb and delay settings
        if (effectsState.reverb?.active || effectsState.delay?.active) {
            // Calculate pattern parameters
            const xOffset = Math.sin(phase) * 20;
            const yOffset = Math.cos(phase * 0.7) * 20;
            const size = 40 + Math.sin(phase * 0.5) * 20;

            // Number of cells based on chaos matrix
            const chaosState = this.chaosMatrix?.getState();
            const chaosActiveCount = chaosState ?
                chaosState.chaosMatrix.filter(cell => cell).length : 0;
            const cellSize = 10 + (chaosActiveCount > 0 ? 50 / chaosActiveCount : 0);

            // Draw grid pattern
            ctx.fillStyle = `hsla(${(hue + 180) % 360}, ${saturation}%, 50%, ${patternIntensity})`;

            for (let x = -size; x < width + size; x += cellSize) {
                for (let y = -size; y < height + size; y += cellSize) {
                    const sizeVar = size * (0.5 + Math.sin(x * 0.05 + phase) * 0.5) *
                        (0.5 + Math.cos(y * 0.05 + phase) * 0.5);

                    ctx.beginPath();

                    // Use different patterns based on active effects
                    if (effectsState.delay?.active && effectsState.reverb?.active) {
                        // Diamond pattern
                        ctx.moveTo(x + xOffset, y - sizeVar/2 + yOffset);
                        ctx.lineTo(x + sizeVar/2 + xOffset, y + yOffset);
                        ctx.lineTo(x + xOffset, y + sizeVar/2 + yOffset);
                        ctx.lineTo(x - sizeVar/2 + xOffset, y + yOffset);
                    } else if (effectsState.delay?.active) {
                        // Circle pattern
                        ctx.arc(x + xOffset, y + yOffset, sizeVar/4, 0, Math.PI * 2);
                    } else if (effectsState.reverb?.active) {
                        // Square pattern
                        ctx.rect(x - sizeVar/4 + xOffset, y - sizeVar/4 + yOffset, sizeVar/2, sizeVar/2);
                    }

                    ctx.fill();
                }
            }
        }
    }

    // Resize canvas on window resize
    handleResize() {
        if (this.canvas) {
            this.canvas.width = this.canvas.offsetWidth || 800;
            this.canvas.height = this.canvas.offsetHeight || 200;
        }
    }
}