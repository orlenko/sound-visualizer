import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Circular Spectrum - Radial visualization reminiscent of Milkdrop
 * Features rotating circles with frequency-reactive spikes
 */
export class Circular implements Visualizer {
  name = 'CIRCULAR';

  private rotation = 0;

  render(
    ctx: CanvasRenderingContext2D,
    audio: AudioEngine,
    width: number,
    height: number,
    time: number
  ): void {
    const frequencyData = audio.getFrequencyData();
    if (frequencyData.length === 0) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const bass = audio.getBassAmplitude();

    // Update rotation based on bass
    this.rotation += 0.01 + bass * 0.05;

    const baseRadius = Math.min(width, height) * 0.2;
    const maxSpike = Math.min(width, height) * 0.25;

    // Number of points around the circle
    const points = 128;
    const angleStep = (Math.PI * 2) / points;

    // Draw multiple layers for depth
    for (let layer = 2; layer >= 0; layer--) {
      const layerOffset = layer * 0.1;
      const layerAlpha = 1 - layer * 0.3;

      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const angle = i * angleStep + this.rotation + layerOffset;

        // Sample frequency data
        const freqIndex = Math.floor((i / points) * frequencyData.length * 0.5);
        const value = frequencyData[freqIndex] / 255;

        // Calculate radius with frequency response
        const spikeLength = value * maxSpike * (1 - layer * 0.2);
        const radius = baseRadius + spikeLength + layer * 10;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      // Gradient fill
      const hue = (time * 40 + layer * 30) % 360;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.5,
        centerX, centerY, baseRadius + maxSpike
      );
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${layerAlpha * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 50%, ${layerAlpha * 0.2})`);
      gradient.addColorStop(1, `hsla(${hue + 120}, 100%, 40%, 0)`);

      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${layerAlpha * 0.8})`;
      ctx.lineWidth = 2 - layer * 0.5;
      ctx.stroke();
    }

    // Inner circle glow
    const innerHue = (time * 60) % 360;
    const innerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, baseRadius * (0.5 + bass * 0.3)
    );
    innerGradient.addColorStop(0, `hsla(${innerHue}, 100%, 80%, 0.5)`);
    innerGradient.addColorStop(0.5, `hsla(${innerHue + 30}, 100%, 60%, 0.2)`);
    innerGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * (0.5 + bass * 0.3), 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    // Add orbiting particles on strong beats
    if (bass > 0.4) {
      const particleCount = Math.floor(bass * 10);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = baseRadius + Math.random() * maxSpike;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        const size = Math.random() * 3 + 1;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${innerHue + Math.random() * 60}, 100%, 70%, 0.8)`;
        ctx.fill();
      }
    }
  }

  reset(): void {
    this.rotation = 0;
  }
}
