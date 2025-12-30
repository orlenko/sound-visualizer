# Sound Visualizer

Winamp-inspired audio visualizer that runs entirely in the browser. Uses the Web Audio API to capture ambient sound from your microphone and creates beautiful real-time visualizations.

## Features

- **Real-time audio visualization** - Captures sound from your microphone
- **4 Visualization Presets**:
  - **Oscilloscope** - Classic waveform display with glowing effects
  - **Spectrum** - Bar-based frequency analyzer with peak indicators
  - **Circular** - Radial frequency visualization inspired by Milkdrop
  - **Particles** - Explosive particle system that reacts to bass

## Getting Started

### Prerequisites

- Node.js 18+
- A modern browser (Chrome recommended)
- A microphone

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will start a local development server at `http://localhost:3000`.

### Building

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Controls

- **1-4** - Switch between visualization presets
- **Space** - Toggle fullscreen mode
- **Click preset buttons** - Switch visualizations

## Technical Stack

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **Web Audio API** - Real-time audio analysis
- **Canvas 2D** - Hardware-accelerated rendering

## Browser Support

Optimized for Chrome. Uses modern ES2022+ features.

## Deployment

This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages. Push to the `main` branch to deploy.

## License

MIT
