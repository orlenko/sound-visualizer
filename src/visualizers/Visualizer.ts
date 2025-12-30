import type { AudioEngine } from '../audio/AudioEngine';

/**
 * Base interface for all visualizer presets
 */
export interface Visualizer {
  /** Display name for the UI */
  name: string;

  /** Render a single frame */
  render(
    ctx: CanvasRenderingContext2D,
    audio: AudioEngine,
    width: number,
    height: number,
    time: number
  ): void;

  /** Optional cleanup when switching away from this visualizer */
  reset?(): void;
}
