import { AudioEngine } from './audio/AudioEngine';
import { VisualizerEngine } from './visualizer/VisualizerEngine';
import { Oscilloscope } from './visualizers/Oscilloscope';
import { Spectrum } from './visualizers/Spectrum';
import { Circular } from './visualizers/Circular';
import { Particles } from './visualizers/Particles';
import { Starfield } from './visualizers/Starfield';
import { Plasma } from './visualizers/Plasma';
import { Matrix } from './visualizers/Matrix';
import { Terrain } from './visualizers/Terrain';
import { Geiss } from './visualizers/Geiss';

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
const drawerTab = document.getElementById('drawer-tab') as HTMLDivElement;
const controlsDrawer = document.getElementById('controls-drawer') as HTMLDivElement;
const autoCycleCheckbox = document.getElementById('auto-cycle') as HTMLInputElement;

// Create engines
const audioEngine = new AudioEngine();
const visualizerEngine = new VisualizerEngine(canvas, audioEngine);

// Register visualizers
visualizerEngine.registerVisualizer('oscilloscope', new Oscilloscope());
visualizerEngine.registerVisualizer('spectrum', new Spectrum());
visualizerEngine.registerVisualizer('circular', new Circular());
visualizerEngine.registerVisualizer('particles', new Particles());
visualizerEngine.registerVisualizer('starfield', new Starfield());
visualizerEngine.registerVisualizer('plasma', new Plasma());
visualizerEngine.registerVisualizer('matrix', new Matrix());
visualizerEngine.registerVisualizer('terrain', new Terrain());
visualizerEngine.registerVisualizer('geiss', new Geiss());

// Set default visualizer
visualizerEngine.setVisualizer('oscilloscope');

// Preset mapping for keyboard shortcuts
const presetKeys: Record<string, string> = {
  '1': 'oscilloscope',
  '2': 'spectrum',
  '3': 'circular',
  '4': 'particles',
  '5': 'starfield',
  '6': 'plasma',
  '7': 'matrix',
  '8': 'terrain',
  '9': 'geiss'
};

// All available presets for random cycling
const allPresets = Object.values(presetKeys);

// Auto-cycle state
let autoCycleInterval: number | null = null;
let autoCycleEnabled = true;

/**
 * Toggle the controls drawer
 */
function toggleDrawer(): void {
  const isOpen = controlsDrawer.classList.toggle('open');
  drawerTab.classList.toggle('open', isOpen);
}

/**
 * Get a random preset different from the current one
 */
function getRandomPreset(): string {
  const currentPreset = visualizerEngine.getCurrentVisualizerName().toLowerCase();
  const availablePresets = allPresets.filter(p => p !== currentPreset);
  return availablePresets[Math.floor(Math.random() * availablePresets.length)];
}

/**
 * Start auto-cycling through visualizations
 */
function startAutoCycle(): void {
  stopAutoCycle();
  autoCycleEnabled = true;
  autoCycleInterval = window.setInterval(() => {
    if (autoCycleEnabled) {
      const randomPreset = getRandomPreset();
      switchPreset(randomPreset);
    }
  }, 10000); // 10 seconds
}

/**
 * Stop auto-cycling
 */
function stopAutoCycle(): void {
  if (autoCycleInterval !== null) {
    clearInterval(autoCycleInterval);
    autoCycleInterval = null;
  }
  autoCycleEnabled = false;
}

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

    // Start auto-cycling if enabled
    if (autoCycleCheckbox.checked) {
      startAutoCycle();
    }
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

// Drawer toggle
drawerTab.addEventListener('click', toggleDrawer);

// Auto-cycle checkbox
autoCycleCheckbox.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.checked) {
    startAutoCycle();
  } else {
    stopAutoCycle();
  }
});

// Preset button clicks
controlBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    if (preset) {
      switchPreset(preset);
      // Disable auto-cycle when user manually selects a preset
      stopAutoCycle();
      autoCycleCheckbox.checked = false;
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Number keys for presets
  if (presetKeys[e.key]) {
    switchPreset(presetKeys[e.key]);
    // Disable auto-cycle when user manually switches via keyboard
    stopAutoCycle();
    autoCycleCheckbox.checked = false;
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
  stopAutoCycle();
  audioEngine.stop();
  visualizerEngine.stop();
});

// Log startup
console.log('Sound Visualizer initialized');
console.log('Press 1-9 to switch presets, Space to toggle fullscreen');
