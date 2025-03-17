// src/modules/visualization/EffectsManager.js

export class EffectsManager {
    constructor(visualizerCore) {
        this.core = visualizerCore;

        // Glitch effect properties
        this.glitchLastUpdate = 0;

        // Face effect properties
        this.faceOpacity = 0;
        this.facePosition = { x: 0, y: 0 };

        // Breaking out of bounds effect
        this.overflowFactor = 0;
        this.overflowPhase = 0;

        // Noise texture for the background
        this.noiseImage = null;

        console.log("EffectsManager initialized");
    }

    // Initialize all effects
    initialize() {
        this.generateNoiseTexture();
    }

    // Generate noise texture for glitch effects
    generateNoiseTexture() {
        // Create a new ImageData object
        this.noiseImage = new ImageData(128, 128);
        const data = this.noiseImage.data;

        for (let i = 0; i < data.length; i += 4) {
            const value = Math.floor(Math.random() * 256);
            data[i] = value;       // R
            data[i + 1] = value;   // G
            data[i + 2] = value;   // B
            data[i + 3] = 30;      // A - low opacity
        }
    }

    // Get noise texture
    getNoiseTexture() {
        return this.noiseImage;
    }

    // Get overflow factor
    getOverflowFactor() {
        return this.overflowFactor;
    }

    // Apply glitch effect if needed
    applyGlitch(ctx, params) {
        const { chaosFactor, currentTime } = params;
        const { width, height } = params;

        // Calculate glitch intensity based on chaos factor
        const glitchIntensity = chaosFactor * 0.8;

        // Only apply glitch if intensity is high enough and we haven't updated too recently
        if (glitchIntensity > 0.2 && (currentTime - this.glitchLastUpdate > 100)) {
            this.drawGlitchEffect(ctx, width, height, glitchIntensity);
            this.glitchLastUpdate = currentTime;
        }

        // Update overflow factor for breaking out of bounds effect
        this.overflowPhase += 0.01;
        this.overflowFactor = 0.1 + Math.max(
            chaosFactor * 0.5,
            Math.sin(this.overflowPhase) * 0.1 * (1 + params.averageEnergy)
        );
    }

    // Create complex glitch effect
    drawGlitchEffect(ctx, width, height, intensity) {
        // Calculate glitch parameters based on intensity
        const sliceCount = Math.floor(3 + intensity * 10);
        const maxOffset = Math.floor(intensity * 20);
        const maxColorShift = Math.floor(intensity * 10);

        // Save current canvas state
        const imageData = ctx.getImageData(0, 0, width, height);

        // Apply horizontal glitch slices
        for (let i = 0; i < sliceCount; i++) {
            // Random slice position and height
            const yPos = Math.floor(Math.random() * height);
            const sliceHeight = Math.floor(1 + Math.random() * 20 * intensity);

            // Random x offset
            const xOffset = Math.floor((Math.random() - 0.5) * maxOffset * 2);

            // Create temporary canvas for manipulation
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = width;
            tempCanvas.height = sliceHeight;

            // Copy slice to temp canvas
            tempCtx.drawImage(
                ctx.canvas,
                0, yPos, width, sliceHeight,
                0, 0, width, sliceHeight
            );

            // Clear original slice
            ctx.clearRect(0, yPos, width, sliceHeight);

            // Draw slice with offset
            ctx.drawImage(
                tempCanvas,
                0, 0, width, sliceHeight,
                xOffset, yPos, width, sliceHeight
            );

            // Occasionally apply RGB shift for more glitchy effect
            if (Math.random() < 0.3 && intensity > 0.5) {
                // Get slice data
                const sliceData = tempCtx.getImageData(0, 0, width, sliceHeight);
                const data = sliceData.data;

                // Shift RGB channels
                for (let p = 0; p < data.length; p += 4) {
                    // Shift red channel
                    if (p + 4 * maxColorShift < data.length) {
                        data[p] = data[p + 4 * maxColorShift];
                    }

                    // Shift blue channel in opposite direction
                    if (p - 4 * maxColorShift >= 0) {
                        data[p + 2] = data[p - 4 * maxColorShift + 2];
                    }
                }

                // Draw color-shifted slice
                tempCtx.putImageData(sliceData, 0, 0);
                ctx.globalAlpha = 0.5;
                ctx.globalCompositeOperation = 'lighten';
                ctx.drawImage(
                    tempCanvas,
                    0, 0, width, sliceHeight,
                    -xOffset/2, yPos, width, sliceHeight
                );
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

    // Draw subliminal face inspired by Windowlicker
    drawSubliminalFace(ctx, params) {
        const { width, height, highFreqEnergy, chaosFactor } = params;

        // Update face opacity based on chaos and high-frequency energy
        if (chaosFactor > 0.5 && highFreqEnergy > 0.5) {
            this.faceOpacity = Math.min(this.faceOpacity + 0.005, 0.4 * chaosFactor);
            // Slowly move the face position for subtle effect
            this.facePosition.x = width/2 + Math.sin(params.currentTime/2000) * width/4;
            this.facePosition.y = height/2 + Math.cos(params.currentTime/3000) * height/6;
        } else {
            this.faceOpacity = Math.max(this.faceOpacity - 0.01, 0);
        }

        if (this.faceOpacity <= 0) return;

        const x = this.facePosition.x;
        const y = this.facePosition.y;

        ctx.save();

        // Scale face size with energy
        const size = 50 + (highFreqEnergy * 30);

        // Make the face more visible with higher energy
        ctx.globalAlpha = this.faceOpacity * (0.5 + highFreqEnergy * 0.5);

        // Distortion amount
        const distortion = highFreqEnergy * 2;

        // Draw abstract face with intentional creepy distortion
        ctx.fillStyle = `rgba(255, 255, 255, ${this.faceOpacity * 0.5})`;

        // Face outline
        ctx.beginPath();
        ctx.ellipse(
            x, y,
            size * (1 + Math.sin(params.currentTime/500) * 0.1),
            size * 1.2 * (1 + Math.cos(params.currentTime/700) * 0.1),
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Eyes
        ctx.fillStyle = `rgba(0, 0, 0, ${this.faceOpacity * 0.7})`;

        // Left eye with distortion
        const leftEyeX = x - size/3 + Math.sin(params.currentTime/300) * distortion;
        const leftEyeY = y - size/6 + Math.cos(params.currentTime/400) * distortion;

        ctx.beginPath();
        ctx.ellipse(leftEyeX, leftEyeY, size/6, size/8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right eye with different distortion
        const rightEyeX = x + size/3 + Math.sin(params.currentTime/350) * distortion;
        const rightEyeY = y - size/6 + Math.cos(params.currentTime/450) * distortion;

        ctx.beginPath();
        ctx.ellipse(rightEyeX, rightEyeY, size/6, size/8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth - creepy smile
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 0, 0, ${this.faceOpacity * 0.8})`;
        ctx.lineWidth = 2;

        // Distorted arc for mouth
        const mouthY = y + size/4 + Math.sin(params.currentTime/200) * distortion * 2;
        ctx.arc(
            x, mouthY,
            size/3,
            0.1 + Math.sin(params.currentTime/600) * 0.2,
            Math.PI - 0.1 + Math.cos(params.currentTime/500) * 0.2,
            false
        );
        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    // Apply overall post-processing effects
    applyPostProcessing(ctx, params) {
        const { width, height, chaosFactor, midFreqEnergy } = params;

        ctx.save();

        // Apply vignette effect
        if (chaosFactor > 0.1) {
            const gradient = ctx.createRadialGradient(
                width/2, height/2, 0,
                width/2, height/2, Math.max(width, height)
            );

            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${0.5 + chaosFactor * 0.3})`);

            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, width, height);

            // Reset blend mode
            ctx.globalCompositeOperation = 'source-over';
        }

        // Add scanlines for CRT effect with high energy or chaos
        if (midFreqEnergy > 0.5 || chaosFactor > 0.6) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

            for (let y = 0; y < height; y += 4) {
                ctx.fillRect(0, y, width, 1);
            }

            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }

    // Handle window resize
    handleResize(width, height) {
        // Reset face position
        this.facePosition.x = width / 2;
        this.facePosition.y = height / 2;

        // Regenerate noise texture if needed
        this.generateNoiseTexture();
    }
}