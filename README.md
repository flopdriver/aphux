# Aphex Soundscape

A modular, interactive web-based synthesizer with visual feedback and experimental audio features.

## Features

- Three oscillators with customizable waveforms and frequencies
- Two LFOs (Low Frequency Oscillators) that can be assigned to modulate oscillators or filter
- Audio effect chain including delay, filter, distortion, and reverb
- Real-time audio visualization
- Chaos Matrix for random audio manipulation
- Preset system to save and load your favorite configurations

## Architecture

The application follows a modular architecture to allow for easy maintenance and future enhancements:

```
aphex-soundscape/
├── src/
│   ├── main.js                 # Application entry point
│   ├── styles.css              # Global styles
│   ├── modules/
│   │   ├── AudioCore.js        # Core audio context management
│   │   ├── OscillatorManager.js # Oscillator creation and control
│   │   ├── ModulationManager.js # LFO creation and routing
│   │   ├── EffectsChain.js     # Audio effects processing
│   │   ├── Visualizer.js       # Canvas visualization
│   │   ├── ChaosMatrix.js      # Randomization features
│   │   ├── UIController.js     # User interface interactions
│   │   └── StateManager.js     # State management (optional)
│   └── utils/
│       └── audioUtils.js       # Utility functions for audio processing
```

## Getting Started

### Prerequisites

- A modern web browser with Web Audio API support (Chrome, Firefox, Safari, Edge)

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/flopdriver/aphux.git
cd aphex-soundscape
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click the "START AUDIO" button to initialize the audio engine
2. Adjust oscillator settings (frequency, waveform, active state)
3. Assign LFOs to modulate oscillators or the filter
4. Experiment with the effect chain
5. Use the Chaos Matrix by clicking on cells to introduce randomness
6. Save your presets with the "SAVE PRESET" button

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by modular synthesizers and experimental electronic music
- Built with the Web Audio API