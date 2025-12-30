import { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from '../visualizers/Visualizer';

/**
 * VisualizerEngine - Manages canvas rendering and animation loop
 */
export class VisualizerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioEngine: AudioEngine;
  private visualizers: Map<string, Visualizer> = new Map();
  private currentVisualizer: Visualizer | null = null;
  private animationId: number | null = null;
  private startTime: number = 0;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.audioEngine = audioEngine;

    // Handle canvas resize
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    // Use device pixel ratio for crisp rendering on high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);
  }

  /**
   * Register a visualizer preset
   */
  registerVisualizer(id: string, visualizer: Visualizer): void {
    this.visualizers.set(id, visualizer);
  }

  /**
   * Switch to a different visualizer
   */
  setVisualizer(id: string): void {
    const visualizer = this.visualizers.get(id);
    if (!visualizer) {
      console.warn(`Visualizer "${id}" not found`);
      return;
    }

    // Cleanup previous visualizer
    if (this.currentVisualizer?.reset) {
      this.currentVisualizer.reset();
    }

    this.currentVisualizer = visualizer;
  }

  /**
   * Get current visualizer name
   */
  getCurrentVisualizerName(): string {
    return this.currentVisualizer?.name ?? '';
  }

  /**
   * Start the animation loop
   */
  start(): void {
    if (this.animationId !== null) return;
    this.startTime = performance.now();
    this.animate();
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const time = (performance.now() - this.startTime) / 1000;

    // Clear canvas with a slight fade for trail effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, width, height);

    // Render current visualizer
    if (this.currentVisualizer && this.audioEngine.isRunning) {
      this.currentVisualizer.render(
        this.ctx,
        this.audioEngine,
        width,
        height,
        time
      );
    }
  };
}
