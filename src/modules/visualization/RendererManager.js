// src/modules/visualization/rendererManager.js
export class RendererManager {
    constructor(visualizerCore) {
        this.visualizerCore = visualizerCore;

        // Background animation variables
        this.backgroundPhase = 0;
        this.backgroundHue = 0;
        this.backgroundSaturation = 20;
        this.backgroundPattern = 0;

        // Animation variables
        this.spiralAngle = 0;
        this.flowLinesOffset = 0;
        this.logoOpacity = 0;
        this.logoPhase = 0;

        // Particles system
        this.particles = [];
        this.maxParticles = 200;

        // Exotic patterns data
        this.attractorPoints = [];
        this.flowFields = [];

        console.log("RendererManager initialized");
    }

    // Initialize renderer
    init() {
        const canvas = this.visualizerCore.getCanvas();
        if (canvas) {
            const width = canvas.width;
            const height = canvas.height;

            // Initialize particles
            this.initParticles(width, height);

            // Initialize exotic pattern data
            this.initExoticPatterns(width, height);
        }
    }

    // Initialize particles for complex motion
    initParticles(width, height) {
        this.particles = [];

        for (let i = 0; i < this.maxParticles; i++) {
            // Create more varied particles
            const size = Math.random() < 0.2 ?
                // 20% of particles are larger
                Math.random() * 8 + 4 :
                // Rest are smaller
                Math.random() * 4 + 1;

            this.particles.push({
                x: Math.random() * width * 1.2 - width * 0.1, // Allow initial positions slightly outside
                y: Math.random() * height * 1.2 - height * 0.1,
                size: size,
                speedX: (Math.random() - 0.5) * 2, // Increased speed
                speedY: (Math.random() - 0.5) * 2,
                hue: Math.random() * 360,
                opacity: Math.random() * 0.7 + 0.3, // Higher base opacity
                pulse: Math.random() * 0.2 + 0.1, // Pulse rate
                phase: Math.random() * Math.PI * 2, // Individual phase
                breakBounds: Math.random() < 0.4 // 40% of particles can break boundaries
            });
        }
    }

    // Initialize exotic patterns data
    initExoticPatterns(width, height) {
        // Create attractor points for flowing patterns
        this.attractorPoints = [];

        for (let i = 0; i < 8; i++) {
            this.attractorPoints.push({
                x: width * (0.1 + Math.random() * 0.8),
                y: height * (0.1 + Math.random() * 0.8),
                strength: 30 + Math.random() * 70,
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.05,
                hue: Math.random() * 360,
                pulseRate: 0.5 + Math.random() * 0.5,
                seed: Math.random() * 100
            });
        }

        // Create flow field grid nodes
        this.flowFields = [];
        const gridSize = 20; // Distance between flow field points

        for (let x = 0; x < width; x += gridSize) {
            for (let y = 0; y < height; y += gridSize) {
                this.flowFields.push({
                    x: x,
                    y: y,
                    angle: Math.random() * Math.PI * 2,
                    strength: Math.random() * 5 + 1,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
    }

    // Draw enhanced background with more complex patterns
    drawBackground(ctx, params) {
        const { width, height, averageEnergy, lowFreqEnergy, midFreqEnergy,
            highFreqEnergy, effectsInfluence = 0.3, chaosFactor } = params;

        // Update background colors and animation
        this.updateBackgroundParams(params);

        // Save context for stacking effects
        ctx.save();

        // Create more complex gradient based on current settings
        const gradient = ctx.createRadialGradient(
            width * 0.5, height * 0.5, 0,
            width * 0.5, height * 0.5, Math.max(width, height) * 0.8
        );

        // Base colors with more stops for complexity
        gradient.addColorStop(0, `hsla(${this.backgroundHue}, ${this.backgroundSaturation}%, 15%, 0.95)`);
        gradient.addColorStop(0.4, `hsla(${(this.backgroundHue + 30) % 360}, ${this.backgroundSaturation - 10}%, 12%, 0.9)`);
        gradient.addColorStop(0.7, `hsla(${(this.backgroundHue + 60) % 360}, ${this.backgroundSaturation}%, 10%, 0.85)`);
        gradient.addColorStop(1, `hsla(${(this.backgroundHue + 90) % 360}, ${this.backgroundSaturation + 5}%, 8%, 0.8)`);

        // Fill background with gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Apply noise texture for grain effect if needed
        this.applyNoiseTexture(ctx, width, height, chaosFactor);

        // Draw complex grid/fractal patterns in background
        if (effectsInfluence > 0) {
            ctx.strokeStyle = `hsla(${(this.backgroundHue + 180) % 360}, ${this.backgroundSaturation}%, 50%, ${0.1 + (effectsInfluence * 0.2)})`;
            ctx.lineWidth = 0.5;

            // Number of lines based on chaos and effects
            const lineCount = 5 + Math.floor(effectsInfluence * 15) + Math.floor(chaosFactor * 10);

            for (let i = 0; i < lineCount; i++) {
                // Draw fractal line patterns
                ctx.beginPath();

                const linePhase = this.backgroundPhase + (i / lineCount * Math.PI * 2);
                const yCenter = height * (0.3 + 0.4 * Math.sin(linePhase + this.flowLinesOffset));

                // Starting points
                let x = 0;
                let y = yCenter + Math.sin(linePhase) * height * 0.3;

                ctx.moveTo(x, y);

                // Create organic line with mathematical influence
                for (x = 0; x < width; x += width/120) {
                    // Complex waveform with multiple frequencies
                    y = yCenter +
                        Math.sin(x * 0.01 + linePhase) * height * 0.1 * (0.5 + lowFreqEnergy) +
                        Math.sin(x * 0.02 - linePhase * 2) * height * 0.05 * (0.5 + midFreqEnergy) +
                        Math.sin(x * 0.05 + linePhase * 0.5) * height * 0.025 * (0.5 + highFreqEnergy);

                    ctx.lineTo(x, y);
                }

                ctx.stroke();
            }
        }

        // Draw circular/spiral patterns
        if (averageEnergy > 0.2 || chaosFactor > 0.3) {
            const circleCount = 3 + Math.floor(averageEnergy * 6);

            for (let i = 0; i < circleCount; i++) {
                const circlePhase = this.backgroundPhase + (i / circleCount * Math.PI * 2);
                const centerX = width * (0.5 + 0.3 * Math.cos(circlePhase + this.spiralAngle));
                const centerY = height * (0.5 + 0.3 * Math.sin(circlePhase - this.spiralAngle * 0.7));

                const radius = Math.min(width, height) * (0.05 + 0.2 * Math.sin(this.backgroundPhase + i));

                // Vary circle opacity and color based on energy
                ctx.strokeStyle = `hsla(${(this.backgroundHue + i * 30) % 360}, ${this.backgroundSaturation}%, 
                                        ${50 + i * 5}%, ${0.1 + averageEnergy * 0.4})`;
                ctx.lineWidth = 1 + Math.sin(this.backgroundPhase + i) * 2;

                // Draw spiral instead of simple circle
                ctx.beginPath();

                const spiralPoints = 100;
                const spiralGrowth = 0.3 + (chaosFactor * 0.7);

                for (let j = 0; j < spiralPoints; j++) {
                    const angle = this.spiralAngle + (j / spiralPoints * Math.PI * 2 * (i % 2 ? 1 : -1));
                    const spiralRadius = (j / spiralPoints) * radius * spiralGrowth;

                    const x = centerX + Math.cos(angle) * spiralRadius;
                    const y = centerY + Math.sin(angle) * spiralRadius;

                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // Helper method to apply noise texture
    applyNoiseTexture(ctx, width, height, chaosFactor) {
        if (chaosFactor > 0.2) {
            ctx.globalAlpha = 0.05 + (chaosFactor * 0.1);
            ctx.globalCompositeOperation = 'overlay';

            // Use the noise texture from EffectsManager
            const noiseImage = this.visualizerCore.effectsManager.getNoiseTexture();
            if (noiseImage) {
                // Create temporary canvas for noise scaling
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = noiseImage.width;
                tempCanvas.height = noiseImage.height;
                tempCtx.putImageData(noiseImage, 0, 0);

                // Draw noise with a pattern transformation
                const patternMatrix = new DOMMatrix([
                    Math.cos(this.backgroundPhase/5), Math.sin(this.backgroundPhase/4),
                    -Math.sin(this.backgroundPhase/5), Math.cos(this.backgroundPhase/4),
                    0, 0
                ]);

                const pattern = ctx.createPattern(tempCanvas, 'repeat');
                pattern.setTransform(patternMatrix);
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, width, height);
            }

            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // Update background parameters based on audio data
    updateBackgroundParams(params) {
        const { lowFreqEnergy, midFreqEnergy, chaosFactor, currentTime } = params;
        const oscillatorManager = this.visualizerCore.getOscillatorManager();
        const effectsChain = this.visualizerCore.getEffectsChain();
        const modulationManager = this.visualizerCore.getModulationManager();

        // Update animation variables
        const lfoState = modulationManager?.getState().lfos || {};
        this.backgroundPhase += 0.005 * (1 + (lfoState[1]?.active ? lfoState[1]?.freq * 0.5 : 0));
        this.flowLinesOffset += 0.02 * (1 + lowFreqEnergy * 3); // Faster movement
        this.spiralAngle += 0.01 + (lowFreqEnergy * 0.2); // Increased speed

        // Update hue based on oscillator frequencies
        const oscillatorState = oscillatorManager?.getState().oscillators || {};
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
        const effectsState = effectsChain?.getState().effects || {};
        this.backgroundSaturation = 20 + ((effectsState?.filter?.freq || 2000) / 20000 * 80);

        // Use distortion for pattern intensity
        this.backgroundPattern = 0.2 + (effectsState?.distortion?.active ?
            effectsState.distortion.amount / 100 : 0.1);

        // Update logo phase and opacity - show logo more with high chaos
        this.logoPhase += 0.01;
        if (chaosFactor > 0.7) {
            this.logoOpacity = Math.min(this.logoOpacity + 0.003, 0.4);
        } else {
            this.logoOpacity = Math.max(this.logoOpacity - 0.005, 0);
        }

        // Update attractor points for exotic patterns
        this.attractorPoints.forEach(point => {
            point.angle += point.rotationSpeed * (1 + lowFreqEnergy * 2);

            // Update position with some organic movement
            point.x += Math.sin(currentTime/3000 + point.seed) * 0.5 * (1 + midFreqEnergy * 2);
            point.y += Math.cos(currentTime/2500 + point.seed) * 0.5 * (1 + lowFreqEnergy * 2);

            // Keep points within bounds with padding
            const canvas = this.visualizerCore.getCanvas();
            if (canvas) {
                const width = canvas.width;
                const height = canvas.height;
                const padding = 20;
                if (point.x < padding) point.x = padding;
                if (point.x > width - padding) point.x = width - padding;
                if (point.y < padding) point.y = padding;
                if (point.y > height - padding) point.y = height - padding;
            }
        });
    }

    // Draw enhanced frequency spectrum visualization
    drawSpectrum(ctx, params) {
        const { width, height, dataArray, bufferLength, averageEnergy, chaosFactor } = params;

        ctx.save();

        // Traditional bars but with more complexity
        const barWidth = Math.max(1, width / (bufferLength / 12));
        let x = 0;

        // Function to get complex color based on frequency and energy
        const getComplexColor = (i, bufferLength, height, barHeight, baseHue) => {
            const frequencyRatio = i / bufferLength;
            const hue = (baseHue + frequencyRatio * 180) % 360;

            // Higher frequencies get brighter colors
            const saturation = 70 + (frequencyRatio * 30);

            // Taller bars get brighter
            const lightness = 40 + (barHeight / height * 60);

            // More alpha for stronger signals
            const alpha = 0.3 + (barHeight / height * 0.7);

            return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        };

        // Main frequency bars with glow effect
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < bufferLength; i += 12) {
            // Make height more dramatic with non-linear scaling
            let barHeight = Math.pow(dataArray[i] / 255, 1.5) * height * 0.8;

            // Introduce slight randomness for more organic feel if chaotic
            if (chaosFactor > 0.3) {
                barHeight *= (0.9 + Math.random() * 0.2);
            }

            // Skip drawing very small bars for cleaner look
            if (barHeight < 2) {
                x += barWidth + 1;
                continue;
            }

            // Draw main bar
            const barColor = getComplexColor(i, bufferLength, height, barHeight, this.backgroundHue);
            ctx.fillStyle = barColor;

            // Draw bar with rounded top
            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, height - barHeight);
            ctx.arc(x + barWidth/2, height - barHeight, barWidth/2, Math.PI, 0, false);
            ctx.lineTo(x + barWidth, height);
            ctx.closePath();
            ctx.fill();

            // Add glow effect for taller bars
            if (barHeight > height * 0.4 && averageEnergy > 0.3) {
                ctx.beginPath();
                const gradient = ctx.createRadialGradient(
                    x + barWidth/2, height - barHeight/2, 0,
                    x + barWidth/2, height - barHeight/2, barHeight * 0.6
                );
                gradient.addColorStop(0, `hsla(${(this.backgroundHue + 30) % 360}, 100%, 70%, 0.4)`);
                gradient.addColorStop(1, `hsla(${(this.backgroundHue + 30) % 360}, 100%, 50%, 0)`);

                ctx.fillStyle = gradient;
                ctx.arc(
                    x + barWidth/2,
                    height - barHeight/2,
                    barHeight * 0.6,
                    0, Math.PI * 2
                );
                ctx.fill();
            }

            x += barWidth + 1;
            if (x > width) break;
        }

        // Reset blend mode
        ctx.globalCompositeOperation = 'source-over';

        // Draw frequency contour lines from history data for depth effect
        const dataHistory = this.visualizerCore.getDataHistory();
        if (dataHistory.length > 5) {
            ctx.lineWidth = 1;

            // Draw multiple history lines with decreasing opacity
            for (let h = 0; h < Math.min(8, dataHistory.length); h++) {
                const historyData = dataHistory[h];
                if (!historyData) continue;

                ctx.beginPath();
                ctx.strokeStyle = `hsla(${(this.backgroundHue + 180) % 360}, 
                                       80%, 60%, ${0.4 - (h * 0.05)})`;

                x = 0;
                const dataStep = Math.ceil(bufferLength / (width / 2));

                for (let i = 0; i < bufferLength; i += dataStep) {
                    // Create smoother curve by averaging nearby frequencies
                    let sum = 0;
                    let count = 0;

                    for (let j = Math.max(0, i - 1); j <= Math.min(bufferLength - 1, i + 1); j++) {
                        sum += historyData[j] || 0;
                        count++;
                    }

                    const avgValue = sum / count;
                    const y = height - (avgValue / 255 * height * 0.7) - (h * 2);

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    x += 2;
                    if (x > width) break;
                }

                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // Update and draw particles that respond to audio and flow fields
    drawParticles(ctx, params) {
        const { width, height, averageEnergy, lowFreqEnergy, highFreqEnergy, chaosFactor, currentTime } = params;

        ctx.save();

        // Get the overflow factor from effects manager
        const overflowFactor = this.visualizerCore.effectsManager.getOverflowFactor();

        // Update particle count based on energy - increased max count for more intense effect
        const targetParticles = 40 + Math.floor(averageEnergy * 160);

        // Add particles if needed
        while (this.particles.length < targetParticles && this.particles.length < this.maxParticles) {
            // Create more varied particles
            const size = Math.random() < 0.3 ?
                // 30% of particles are larger
                Math.random() * 12 + 8 :
                // Rest are smaller
                Math.random() * 6 + 2;

            this.particles.push({
                x: Math.random() * width * 1.4 - width * 0.2, // Allow initial positions outside
                y: Math.random() * height * 1.4 - height * 0.2,
                size: size,
                speedX: (Math.random() - 0.5) * 4, // Much faster
                speedY: (Math.random() - 0.5) * 4,
                hue: Math.random() * 360,
                opacity: Math.random() * 0.8 + 0.2,
                pulse: Math.random() * 0.2 + 0.1,
                phase: Math.random() * Math.PI * 2,
                breakBounds: Math.random() < 0.6 // 60% can break boundaries
            });
        }

        // Remove excess particles
        while (this.particles.length > targetParticles) {
            this.particles.pop();
        }

        // Update and draw particles
        ctx.globalCompositeOperation = 'lighter';

        this.particles.forEach((p, index) => {
            // Apply chaos factor to particle behavior
            const particleChaos = overflowFactor * (p.breakBounds ? 1.5 : 0.5);

            // Pulse size based on individual phase and bass energy
            const sizeMultiplier = 1 + Math.sin(p.phase + performance.now() * p.pulse * 0.001) * 0.3;

            // Add more erratic movement for some particles when energy is high
            if (lowFreqEnergy > 0.6 && Math.random() < 0.1) {
                p.speedX += (Math.random() - 0.5) * lowFreqEnergy * 2;
                p.speedY += (Math.random() - 0.5) * lowFreqEnergy * 2;
            }

            // Limit max speed
            const maxSpeed = 8;
            p.speedX = Math.max(-maxSpeed, Math.min(maxSpeed, p.speedX));
            p.speedY = Math.max(-maxSpeed, Math.min(maxSpeed, p.speedY));

            // Calculate influence from flow fields for this particle
            const fieldInfluence = this.calculateFlowFieldForce(p.x, p.y, currentTime, chaosFactor, lowFreqEnergy);

            // Apply flow field force with strength based on chaos and energy
            const fieldStrength = 0.2 + (chaosFactor * 0.8) + (lowFreqEnergy * 0.5);
            p.speedX += fieldInfluence.x * fieldStrength;
            p.speedY += fieldInfluence.y * fieldStrength;

            // Apply attractor points influence
            this.attractorPoints.forEach(attractor => {
                const dx = attractor.x - p.x;
                const dy = attractor.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < attractor.strength * (1 + chaosFactor)) {
                    // Attraction/repulsion force
                    const force = 0.08 * Math.min(1, (attractor.strength / (distance + 5)));
                    const angle = Math.atan2(dy, dx);

                    // Oscillate between attraction and repulsion
                    const oscillation = Math.sin(currentTime * 0.001 * attractor.pulseRate + p.phase);

                    p.speedX += Math.cos(angle) * force * oscillation;
                    p.speedY += Math.sin(angle) * force * oscillation;
                }
            });

            // Update particle position
            p.x += p.speedX;
            p.y += p.speedY;

            // For particles that don't break bounds, bounce off edges
            // with slightly expanded boundary
            const margin = p.size * 3; // Allow particles to partially leave screen

            if (!p.breakBounds) {
                if (p.x < -margin || p.x > width + margin) {
                    p.speedX *= -0.8; // Slightly dampen on collision
                    // Pull back into view
                    p.x = p.x < 0 ? -margin : width + margin;
                }

                if (p.y < -margin || p.y > height + margin) {
                    p.speedY *= -0.8;
                    p.y = p.y < 0 ? -margin : height + margin;
                }
            } else {
                // Particles that can break bounds still eventually wrap around
                // with much larger boundaries
                const wrapMargin = width * 0.5;

                if (p.x < -wrapMargin) p.x = width + margin;
                if (p.x > width + wrapMargin) p.x = -margin;
                if (p.y < -wrapMargin) p.y = height + margin;
                if (p.y > height + wrapMargin) p.y = -margin;
            }

            // Adjust size based on frequency content and overflow factor
            const size = p.size * sizeMultiplier * (1 + lowFreqEnergy) * (1 + particleChaos * 0.5);

            // Calculate if particle is completely offscreen (don't render)
            const fullyOffscreen =
                p.x < -size * 3 ||
                p.x > width + size * 3 ||
                p.y < -size * 3 ||
                p.y > height + size * 3;

            if (fullyOffscreen) return;

            // Draw particle with more intense glow
            const particleHue = (this.backgroundHue + index % 60) % 360;

            // Make opacity pulse with high frequency energy
            const opacityPulse = p.opacity * (0.7 + 0.3 * Math.sin(p.phase + performance.now() * 0.001));
            const finalOpacity = opacityPulse * (0.5 + averageEnergy + highFreqEnergy * 0.5);

            // Inner bright core
            ctx.beginPath();
            ctx.fillStyle = `hsla(${particleHue}, 90%, 70%, ${finalOpacity})`;
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Outer glow - larger for "breaking out" effect
            ctx.beginPath();
            const glowSize = size * (3 + particleChaos * 2);
            const gradient = ctx.createRadialGradient(
                p.x, p.y, size * 0.5,
                p.x, p.y, glowSize
            );

            // Brighter glow core
            gradient.addColorStop(0, `hsla(${particleHue}, 100%, 80%, ${finalOpacity * 0.7})`);
            // Fade out
            gradient.addColorStop(1, `hsla(${particleHue}, 100%, 60%, 0)`);

            ctx.fillStyle = gradient;
            ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Add connection lines between nearby particles for more complex visual effect
            if (Math.random() < 0.1 * averageEnergy && index % 5 === 0) {
                for (let j = 0; j < this.particles.length; j += 5) {
                    if (j !== index) {
                        const otherP = this.particles[j];
                        const dx = p.x - otherP.x;
                        const dy = p.y - otherP.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // Connect if within range
                        const connectDistance = (p.size + otherP.size) * (10 + overflowFactor * 10);

                        if (distance < connectDistance) {
                            // Calculate alpha based on distance
                            const alpha = (1 - distance / connectDistance) * 0.2 * finalOpacity;

                            ctx.beginPath();
                            ctx.strokeStyle = `hsla(${particleHue}, 90%, 70%, ${alpha})`;
                            ctx.lineWidth = 1 + lowFreqEnergy;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(otherP.x, otherP.y);
                            ctx.stroke();
                        }
                    }
                }
            }

            // Update particle phase for next frame
            p.phase += p.pulse * (1 + averageEnergy);
        });

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    // Helper method to calculate flow field force at a position
    calculateFlowFieldForce(x, y, time, chaosFactor, bassEnergy) {
        // Default force
        let forceX = 0;
        let forceY = 0;

        // Find the 2-3 closest flow field points
        const closestPoints = [];
        let minDist1 = Infinity;
        let minDist2 = Infinity;
        let minDist3 = Infinity;
        let point1 = null;
        let point2 = null;
        let point3 = null;

        for (const point of this.flowFields) {
            const dx = point.x - x;
            const dy = point.y - y;
            const dist = dx * dx + dy * dy; // Squared distance (faster)

            if (dist < minDist1) {
                minDist3 = minDist2;
                minDist2 = minDist1;
                minDist1 = dist;
                point3 = point2;
                point2 = point1;
                point1 = point;
            } else if (dist < minDist2) {
                minDist3 = minDist2;
                minDist2 = dist;
                point3 = point2;
                point2 = point;
            } else if (dist < minDist3) {
                minDist3 = dist;
                point3 = point;
            }
        }

        // Calculate weighted force from closest points
        if (point1) {
            const weight1 = 1 / (Math.sqrt(minDist1) + 1);
            const angle1 = point1.angle + Math.sin(time * 0.001 + point1.phase) * chaosFactor * Math.PI;
            forceX += Math.cos(angle1) * weight1 * point1.strength * (1 + bassEnergy);
            forceY += Math.sin(angle1) * weight1 * point1.strength * (1 + bassEnergy);
        }

        if (point2) {
            const weight2 = 1 / (Math.sqrt(minDist2) + 1) * 0.5; // Less influence
            const angle2 = point2.angle + Math.sin(time * 0.001 + point2.phase) * chaosFactor * Math.PI;
            forceX += Math.cos(angle2) * weight2 * point2.strength * (1 + bassEnergy * 0.5);
            forceY += Math.sin(angle2) * weight2 * point2.strength * (1 + bassEnergy * 0.5);
        }

        if (point3 && chaosFactor > 0.3) { // Only use third point with higher chaos
            const weight3 = 1 / (Math.sqrt(minDist3) + 1) * 0.2; // Even less influence
            const angle3 = point3.angle + Math.sin(time * 0.001 + point3.phase) * chaosFactor * Math.PI;
            forceX += Math.cos(angle3) * weight3 * point3.strength * bassEnergy;
            forceY += Math.sin(angle3) * weight3 * point3.strength * bassEnergy;
        }

        // Normalize and scale force
        const magnitude = Math.sqrt(forceX * forceX + forceY * forceY);
        if (magnitude > 0) {
            forceX = forceX / magnitude * 0.2; // Scale force
            forceY = forceY / magnitude * 0.2;
        }

        return { x: forceX, y: forceY };
    }

    // Draw exotic patterns inspired by strange attractors and flow fields
    drawExoticPatterns(ctx, params) {
        const { width, height, midFreqEnergy, chaosFactor, bassEnergy, highFreqEnergy, currentTime } = params;

        ctx.save();

        // Create different exotic patterns based on frequency and chaos levels

        // 1. Draw Strange Attractor Patterns
        if (midFreqEnergy > 0.2 || chaosFactor > 0.3) {
            // Choose which strange attractor algorithm to use based on chaos level
            const attractorType = chaosFactor > 0.7 ? 'lorenz' :
                chaosFactor > 0.4 ? 'clifford' : 'dejong';

            const iterationCount = 3000 + Math.floor(chaosFactor * 2000);
            const scaleFactor = Math.min(width, height) * 0.25 * (1 + chaosFactor);
            const offsetX = width / 2;
            const offsetY = height / 2;

            // Get attractor parameters influenced by audio and chaos
            const params = this.getAttractorParams(attractorType, bassEnergy, midFreqEnergy, chaosFactor);

            // Set rendering style
            ctx.lineWidth = 1.5 * (1 + bassEnergy);
            ctx.strokeStyle = `hsla(${this.backgroundHue}, 80%, 60%, ${0.1 + chaosFactor * 0.3})`;

            if (highFreqEnergy > 0.4) {
                ctx.shadowColor = `hsla(${this.backgroundHue}, 90%, 70%, 0.4)`;
                ctx.shadowBlur = 5 + highFreqEnergy * 10;
            }

            ctx.beginPath();

            // Initialize starting point
            let x = 0.1;
            let y = 0.1;
            let z = 0.1;
            let nx, ny, nz;

            // First point
            let screenX = offsetX + x * scaleFactor;
            let screenY = offsetY + y * scaleFactor;
            ctx.moveTo(screenX, screenY);

            // Generate attractor path
            for (let i = 0; i < iterationCount; i++) {
                // Calculate next point based on attractor type
                if (attractorType === 'lorenz') {
                    // Lorenz attractor - 3D chaotic system
                    const dt = 0.005;
                    nx = x + dt * params.a * (y - x);
                    ny = y + dt * (x * (params.b - z) - y);
                    nz = z + dt * (x * y - params.c * z);

                    // Project 3D to 2D
                    screenX = offsetX + (nx * scaleFactor * 0.1);
                    screenY = offsetY + (ny * scaleFactor * 0.1);

                } else if (attractorType === 'clifford') {
                    // Clifford attractor - 2D strange attractor
                    nx = Math.sin(params.a * y) + params.c * Math.cos(params.a * x);
                    ny = Math.sin(params.b * x) + params.d * Math.cos(params.b * y);

                    screenX = offsetX + nx * scaleFactor * 0.4;
                    screenY = offsetY + ny * scaleFactor * 0.4;

                } else {
                    // De Jong attractor - another 2D strange attractor
                    nx = Math.sin(params.a * y) - Math.cos(params.b * x);
                    ny = Math.sin(params.c * x) - Math.cos(params.d * y);

                    screenX = offsetX + nx * scaleFactor * 0.4;
                    screenY = offsetY + ny * scaleFactor * 0.4;
                }

                // Update current point
                x = nx;
                y = ny;
                if (attractorType === 'lorenz') z = nz;

                // Only draw if point is within visible area with padding
                const padding = 20;
                if (screenX >= -padding && screenX <= width + padding &&
                    screenY >= -padding && screenY <= height + padding) {

                    // Vary opacity based on iteration for fading effect
                    if (i % 20 === 0) {
                        const iterationProgress = i / iterationCount;
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(screenX, screenY);

                        // Change color over the attractor for rainbow effect
                        const iterationHue = (this.backgroundHue + iterationProgress * 120) % 360;
                        ctx.strokeStyle = `hsla(${iterationHue}, 80%, 60%, ${0.1 + iterationProgress * 0.3 + chaosFactor * 0.3})`;
                    } else {
                        ctx.lineTo(screenX, screenY);
                    }
                }
            }

            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 2. Draw Dynamic Flow Field Visualization
        if (bassEnergy > 0.2 || chaosFactor > 0.4) {
            const lineCount = 150 + Math.floor(bassEnergy * 200) + Math.floor(chaosFactor * 200);
            const stepSize = 4;
            const steps = 30 + Math.floor(chaosFactor * 30);

            // Set style for flow lines
            ctx.lineWidth = 1 + bassEnergy * 2;
            ctx.globalAlpha = 0.2 + chaosFactor * 0.3;

            for (let i = 0; i < lineCount; i++) {
                // Random starting point
                let x = Math.random() * width;
                let y = Math.random() * height;

                // Get unique color for this flow line
                const lineHue = (this.backgroundHue + i * 0.8) % 360;
                ctx.strokeStyle = `hsla(${lineHue}, 70%, 60%, ${0.1 + chaosFactor * 0.2})`;

                // Add glow for high energy
                if (midFreqEnergy > 0.6) {
                    ctx.shadowColor = `hsla(${lineHue}, 90%, 70%, 0.3)`;
                    ctx.shadowBlur = midFreqEnergy * 8;
                }

                ctx.beginPath();
                ctx.moveTo(x, y);

                // Follow the flow field
                for (let j = 0; j < steps; j++) {
                    // Get flow field force at current position
                    const force = this.calculateFlowFieldForce(
                        x, y, currentTime, chaosFactor, bassEnergy
                    );

                    // Calculate next position
                    const angle = Math.atan2(force.y, force.x);
                    const strength = (Math.sqrt(force.x * force.x + force.y * force.y) + 0.1) *
                        stepSize * (5 + bassEnergy * 20);

                    x += Math.cos(angle) * strength;
                    y += Math.sin(angle) * strength;

                    // Stop if out of bounds
                    if (x < 0 || x > width || y < 0 || y > height) {
                        break;
                    }

                    ctx.lineTo(x, y);
                }

                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            ctx.globalAlpha = 1.0;
        }

        // 3. Draw Attractor Point Visualizations
        this.attractorPoints.forEach((point, index) => {
            // Only draw if energy is high enough
            if (midFreqEnergy > 0.3 || chaosFactor > 0.5) {
                const size = point.strength * 0.1 * (1 + midFreqEnergy) *
                    (1 + Math.sin(currentTime * 0.001 * point.pulseRate) * 0.3);

                const pointHue = (this.backgroundHue + index * 30) % 360;

                // Draw influence field
                const gradient = ctx.createRadialGradient(
                    point.x, point.y, 0,
                    point.x, point.y, point.strength * (1 + chaosFactor * 0.5)
                );

                gradient.addColorStop(0, `hsla(${pointHue}, 90%, 60%, ${0.4 + midFreqEnergy * 0.3})`);
                gradient.addColorStop(0.3, `hsla(${pointHue}, 80%, 40%, 0.2)`);
                gradient.addColorStop(1, `hsla(${pointHue}, 70%, 30%, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.strength * (1 + chaosFactor * 0.5), 0, Math.PI * 2);
                ctx.fill();

                // Draw center point
                ctx.fillStyle = `hsla(${pointHue}, 100%, 70%, ${0.7 + bassEnergy * 0.3})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fill();

                // Add glow at high energy
                if (bassEnergy > 0.5) {
                    ctx.shadowColor = `hsla(${pointHue}, 100%, 80%, 0.8)`;
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, size * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        });

        ctx.restore();
    }

    // Draw enhanced waveform visualization
    drawWaveform(ctx, params) {
        const { width, height, timeDataArray, bufferLength, effectsInfluence = 0.3, highFreqEnergy } = params;

        ctx.save();

        // Multiple overlapping waveforms for complexity
        const layers = 3;

        for (let layer = 0; layer < layers; layer++) {
            // Different waveform characteristics per layer
            const lineWidth = 3 - layer;
            const alpha = 0.8 - (layer * 0.2);
            const waveOffset = layer * 5; // Vertical offset between layers

            // Complementary hue with variation
            const waveHue = (this.backgroundHue + 180 + layer * 30) % 360;

            // Vary saturation based on effects
            const waveSaturation = Math.min(100, 50 + effectsInfluence * 50);

            // Vary opacity based on energy
            const waveOpacity = Math.min(0.9, alpha + (highFreqEnergy * 0.4));

            // Create complex line style
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = `hsla(${waveHue}, ${waveSaturation}%, 60%, ${waveOpacity})`;

            // Add glow for stronger high frequencies
            if (highFreqEnergy > 0.4 && layer === 0) {
                ctx.shadowColor = `hsla(${waveHue}, 100%, 70%, 0.7)`;
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();

            // Apply different sampling rates for each layer
            const sliceWidth = width / (bufferLength / (1 + layer * 0.5));
            let x = 0;

            // First point
            const firstV = timeDataArray[0] / 128.0;
            const firstY = (firstV * height / 2) + waveOffset;
            ctx.moveTo(x, firstY);

            // Draw waveform with different sampling rates per layer
            const step = Math.max(1, Math.floor(bufferLength / (width * (1 + layer * 0.5))));

            for (let i = step; i < bufferLength; i += step) {
                // Create smoother waveform with slight averaging
                let sum = 0;
                for (let j = Math.max(0, i - step/2); j <= Math.min(bufferLength - 1, i + step/2); j++) {
                    sum += timeDataArray[j];
                }
                const v = (sum / (step + 1)) / 128.0;

                // Add slight distortion based on effects
                const distortion = Math.sin(x * 0.1) * effectsInfluence * 5;

                // Calculate y position with effects
                const y = (v * height / 2) + waveOffset + distortion;

                x += sliceWidth;

                // Use bezier curves for smoother waveform when effects are present
                if (effectsInfluence > 0.3) {
                    // Calculate control points for smoother curve
                    const cp1x = x - sliceWidth/2;
                    const cp1y = y - height * 0.02 * Math.sin(x * 0.1);

                    ctx.quadraticCurveTo(cp1x, cp1y, x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                if (x > width) break;
            }

            ctx.stroke();

            // For the first layer, add dotted highlights at peaks
            if (layer === 0 && highFreqEnergy > 0.3) {
                ctx.fillStyle = `hsla(${waveHue}, 100%, 80%, ${highFreqEnergy * 0.8})`;

                x = 0;
                for (let i = 0; i < bufferLength; i += step * 5) {
                    const v = timeDataArray[i] / 128.0;

                    // Only draw dots at peaks
                    if (Math.abs(v - 1) < 0.2) {
                        const y = (v * height / 2) + waveOffset;

                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    x += sliceWidth * 5;
                    if (x > width) break;
                }
            }
        }

        ctx.restore();
    }

    // Draw subtle Aphex Twin logo
    drawAphexLogo(ctx, params) {
        if (this.logoOpacity <= 0) return;

        const { width, height } = params;

        ctx.save();

        // Logo position in center
        const x = width / 2;
        const y = height / 2;

        // Scale logo to fit visualization but stay subtle
        const size = Math.min(width, height) * 0.4;

        // Pulse the opacity slightly for more dynamic effect
        const pulseOpacity = this.logoOpacity * (0.7 + Math.sin(this.logoPhase * 2) * 0.3);

        // Draw stylized "A" with a circle (simplified Aphex Twin logo)
        ctx.globalAlpha = pulseOpacity;
        ctx.strokeStyle = `hsla(0, 100%, 70%, ${pulseOpacity})`;
        ctx.lineWidth = 1.5;

        // Draw circle
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        ctx.stroke();

        // Draw "A" shape
        ctx.beginPath();
        ctx.moveTo(x - size/3, y + size/3);
        ctx.lineTo(x, y - size/3);
        ctx.lineTo(x + size/3, y + size/3);

        // Crossbar of the "A"
        ctx.moveTo(x - size/6, y);
        ctx.lineTo(x + size/6, y);

        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    // Get attractor algorithm parameters based on audio
    getAttractorParams(type, bassEnergy, midFrequency, chaosFactor) {
        // Base parameters that create interesting patterns
        const baseParams = {
            lorenz: { a: 10, b: 28, c: 8/3 },
            clifford: { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
            dejong: { a: 1.4, b: -2.3, c: 2.4, d: -2.1 }
        };

        const params = { ...baseParams[type] };

        // Modify parameters based on audio and chaos
        if (type === 'lorenz') {
            params.a = baseParams.lorenz.a + (bassEnergy - 0.5) * 6;
            params.b = baseParams.lorenz.b + (midFrequency - 0.5) * 8;
            params.c = baseParams.lorenz.c + (chaosFactor - 0.5) * 3;
        }
        else if (type === 'clifford') {
            params.a = baseParams.clifford.a + (bassEnergy - 0.5) * 0.6;
            params.b = baseParams.clifford.b + (midFrequency - 0.5) * 0.6;
            params.c = baseParams.clifford.c + (chaosFactor - 0.5) * 0.4;
            params.d = baseParams.clifford.d + (bassEnergy - 0.5) * 0.4;
        }
        else { // dejong
            params.a = baseParams.dejong.a + (bassEnergy - 0.5) * 0.8;
            params.b = baseParams.dejong.b + (midFrequency - 0.5) * 0.8;
            params.c = baseParams.dejong.c + (chaosFactor - 0.5) * 0.5;
            params.d = baseParams.dejong.d + (bassEnergy - 0.5) * 0.5;
        }

        return params;
    }

    // Handle resize event
    handleResize(width, height) {
        // Re-initialize particles and flow fields for new size
        this.initParticles(width, height);
        this.initExoticPatterns(width, height);
    }
}