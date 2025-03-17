# Aphex Soundscape

An interactive web-based synthesizer inspired by Aphex Twin's aesthetic for creating experimental soundscapes.

## Features

- **3 Oscillators**: Control frequency and waveform type (sine, square, sawtooth, triangle)
- **Modulation**: 2 LFOs with adjustable frequency and depth
- **Effects**: 
  - Delay with time and feedback controls
  - Filter with frequency and resonance controls
  - Distortion with amount control
  - Reverb with mix control
- **Chaos Matrix**: 8x8 grid of cells that introduce random variations to the sound
- **Visualizer**: Real-time frequency and waveform visualization
- **Special Controls**:
  - Randomize: Generate random settings for oscillators and filter
  - Glitch: Create temporary glitchy effects
  - Save Preset: Export your current settings as a JSON file

## How to Use

1. Open `index.html` in a web browser (Chrome recommended for best Web Audio API support)
2. Click anywhere on the page to initialize audio (browser security requires user interaction)
3. Use the sliders, switches, and buttons to craft your soundscape
4. Experiment with the Chaos Matrix by clicking individual cells to add randomness
5. Try the Randomize and Glitch buttons for unexpected sonic results
6. Save your favorite settings using the Save Preset button

## UI Overview

- **Oscillators Panel**: Control the basic sound generators
- **Modulation Panel**: Add movement and variation to parameters
- **Effects Panel**: Shape and process the sound
- **Master Panel**: Control overall volume and reverb
- **Chaos Matrix**: Add controlled randomness to the sound
- **Visualizer**: See a representation of the sound in real-time

## Aphex Twin Influence

The interface design and sound capabilities draw inspiration from Aphex Twin's approach to electronic music, featuring:

- Complex, experimental sound design possibilities
- Glitchy, unpredictable elements
- Visual aesthetic with bold colors and minimal design
- Ability to create both beautiful ambient textures and harsh noise

## Technical Details

Built using:
- HTML5
- CSS3
- JavaScript
- Web Audio API

No external libraries or frameworks required.

## License

Feel free to use, modify, and share as you wish.