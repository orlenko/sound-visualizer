import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Terrain - 3D wireframe terrain that morphs with audio
 * Retro vector graphics style with audio-reactive hills
 * Maintains deep history so distant lines show older sound "memory"
 */
export class Terrain implements Visualizer {
  name = 'TERRAIN';

  private offset = 0;
  private history: number[][] = [];
  private historyLength = 100; // Deep history for sound "memory"

  render(
    ctx: CanvasRenderingContext2D,
    audio: AudioEngine,
    width: number,
    height: number,
    time: number
  ): void {
    const bass = audio.getBassAmplitude();
    const mid = audio.getMidAmplitude();
    const treble = audio.getTrebleAmplitude();
    const average = audio.getAverageAmplitude();
    const freqData = audio.getFrequencyData();

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Create height map from frequency data
    const points = 64;
    const heights: number[] = [];

    for (let i = 0; i < points; i++) {
      const freqIndex = Math.floor((i / points) * freqData.length * 0.6);
      const value = freqData[freqIndex] / 255;
      heights.push(value);
    }

    // Add to history
    this.history.unshift(heights);
    if (this.history.length > this.historyLength) {
      this.history.pop();
    }

    // Scroll speed based on bass
    this.offset += 1 + bass * 3;

    // Perspective settings - higher horizon for more visible history
    const horizonY = height * 0.25;
    const groundY = height * 0.98;
    const vanishX = width * 0.5;

    // Draw grid lines (depth)
    const rows = this.history.length;

    for (let z = rows - 1; z >= 0; z--) {
      const rowHeights = this.history[z];
      if (!rowHeights) continue;

      // Perspective scaling
      const zRatio = z / rows;
      const perspective = 1 - zRatio * 0.9;
      const y = horizonY + (groundY - horizonY) * zRatio;
      const rowWidth = width * perspective;
      const startX = vanishX - rowWidth / 2;

      // Color based on depth and audio - older lines fade to cooler colors
      const ageHueShift = zRatio * 60; // Shift hue towards blue/purple for older lines
      const hue = (time * 30 + z * 3 + bass * 50 + mid * 30 - ageHueShift) % 360;
      const alpha = Math.pow(1 - zRatio, 0.7) * (0.6 + average * 0.4); // More gradual fade
      const lightness = 50 + (1 - zRatio) * 30 + treble * 20;
      const saturation = 80 + mid * 20 - zRatio * 20; // Desaturate distant lines

      ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = (1 - zRatio) * 2 + 0.5 + treble;

      ctx.beginPath();

      for (let x = 0; x < points; x++) {
        const xRatio = x / (points - 1);
        const px = startX + rowWidth * xRatio;

        // Height from frequency data - maintain amplitude for older lines
        const heightValue = rowHeights[x] * (1 - zRatio * 0.3); // Less height reduction
        const py = y - heightValue * 180 * (1 - zRatio * 0.5); // Taller peaks

        if (x === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.stroke();

      // Draw vertical lines connecting to previous row for 3D effect
      if (z < rows - 1 && z % 3 === 0) { // Every 3rd row for cleaner look with more history
        const prevRowHeights = this.history[z + 1];
        if (!prevRowHeights) continue;

        const prevZRatio = (z + 1) / rows;
        const prevPerspective = 1 - prevZRatio * 0.9;
        const prevY = horizonY + (groundY - horizonY) * prevZRatio;
        const prevRowWidth = width * prevPerspective;
        const prevStartX = vanishX - prevRowWidth / 2;

        ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha * 0.3})`;
        ctx.lineWidth = 0.5;

        for (let x = 0; x < points; x += 4) {
          const xRatio = x / (points - 1);

          const px = startX + rowWidth * xRatio;
          const heightValue = rowHeights[x] * (1 - zRatio * 0.5);
          const py = y - heightValue * 150 * (1 - zRatio * 0.7);

          const prevPx = prevStartX + prevRowWidth * xRatio;
          const prevHeightValue = prevRowHeights[x] * (1 - prevZRatio * 0.3);
          const prevPy = prevY - prevHeightValue * 180 * (1 - prevZRatio * 0.5);

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(prevPx, prevPy);
          ctx.stroke();
        }
      }
    }

    // Add sun/orb at horizon
    const sunRadius = 40 + bass * 30;
    const sunGradient = ctx.createRadialGradient(
      vanishX, horizonY, 0,
      vanishX, horizonY, sunRadius * 2
    );
    const sunHue = (time * 20) % 360;
    sunGradient.addColorStop(0, `hsla(${sunHue}, 100%, 70%, ${0.8 + average * 0.2})`);
    sunGradient.addColorStop(0.5, `hsla(${sunHue + 30}, 100%, 50%, 0.4)`);
    sunGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(vanishX, horizonY, sunRadius * 2, 0, Math.PI * 2);
    ctx.fillStyle = sunGradient;
    ctx.fill();

    // Horizon line
    ctx.strokeStyle = `hsla(${sunHue}, 100%, 70%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    ctx.stroke();

    // Add retro grid lines on the ground
    ctx.strokeStyle = `hsla(${sunHue + 180}, 80%, 50%, 0.2)`;
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 1; i < 10; i++) {
      const ratio = i / 10;
      const y = horizonY + (groundY - horizonY) * ratio;
      const lineWidth = width * (1 - ratio * 0.9);
      const startX = vanishX - lineWidth / 2;

      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + lineWidth, y);
      ctx.stroke();
    }

    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  reset(): void {
    this.history = [];
    this.offset = 0;
  }
}
