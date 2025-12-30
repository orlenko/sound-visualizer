import { AudioEngine } from './audio/AudioEngine';
import { VisualizerEngine } from './visualizer/VisualizerEngine';
import { Oscilloscope } from './visualizers/Oscilloscope';
import { Spectrum } from './visualizers/Spectrum';
import { Circular } from './visualizers/Circular';
import { Particles } from './visualizers/Particles';

/**
 * Sound Visualizer - Winamp-inspired audio visualization
 * Uses Web Audio API for real-time microphone input analysis
 */

// Get DOM elements
const canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement;
const startOverlay = document.getElementById('start-overlay') as HTMLDivElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const presetName = document.getElementById('preset-name') as HTMLDivElement;
const controlBtns = document.querySelectorAll<HTMLButtonElement>('.control-btn[data-preset]');

// Create engines
const audioEngine = new AudioEngine();
const visualizerEngine = new VisualizerEngine(canvas, audioEngine);

// Register visualizers
visualizerEngine.registerVisualizer('oscilloscope', new Oscilloscope());
visualizerEngine.registerVisualizer('spectrum', new Spectrum());
visualizerEngine.registerVisualizer('circular', new Circular());
visualizerEngine.registerVisualizer('particles', new Particles());

// Set default visualizer
visualizerEngine.setVisualizer('oscilloscope');

// Preset mapping for keyboard shortcuts
const presetKeys: Record<string, string> = {
  '1': 'oscilloscope',
  '2': 'spectrum',
  '3': 'circular',
  '4': 'particles'
};

/**
 * Switch to a preset and update UI
 */
function switchPreset(presetId: string): void {
  visualizerEngine.setVisualizer(presetId);
  presetName.textContent = visualizerEngine.getCurrentVisualizerName();

  // Update button states
  controlBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === presetId);
  });
}

/**
 * Start the audio engine and visualization
 */
async function start(): Promise<void> {
  try {
    startBtn.textContent = 'Starting...';
    startBtn.disabled = true;

    await audioEngine.start();
    visualizerEngine.start();

    // Hide overlay with animation
    startOverlay.classList.add('hidden');
  } catch (error) {
    console.error('Failed to start:', error);
    startBtn.textContent = 'Error - Click to retry';
    startBtn.disabled = false;

    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access and try again.');
      } else {
        alert(`Failed to start: ${error.message}`);
      }
    }
  }
}

// Event listeners
startBtn.addEventListener('click', start);

// Preset button clicks
controlBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    if (preset) {
      switchPreset(preset);
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Number keys for presets
  if (presetKeys[e.key]) {
    switchPreset(presetKeys[e.key]);
    return;
  }

  // Space for fullscreen
  if (e.key === ' ' && !e.repeat) {
    e.preventDefault();
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  // Escape to exit fullscreen
  if (e.key === 'Escape' && document.fullscreenElement) {
    document.exitFullscreen();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  audioEngine.stop();
  visualizerEngine.stop();
});

// Log startup
console.log('Sound Visualizer initialized');
console.log('Press 1-4 to switch presets, Space to toggle fullscreen');
