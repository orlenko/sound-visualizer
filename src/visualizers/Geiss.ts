import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Geiss - Inspired by the legendary Geiss v2 Winamp plugin
 * Features warping motion blur, color cycling, and psychedelic flow patterns
 */
export class Geiss implements Visualizer {
  name = 'GEISS';

  private offscreen: OffscreenCanvas | null = null;
  private offCtx: OffscreenCanvasRenderingContext2D | null = null;
  private lastWidth = 0;
  private lastHeight = 0;
  private warpAngle = 0;
  private colorPhase = 0;
  private zoom = 1;
  private targetZoom = 1;

  private initOffscreen(width: number, height: number): void {
    this.offscreen = new OffscreenCanvas(width, height);
    this.offCtx = this.offscreen.getContext('2d', { willReadFrequently: true })!;
    this.lastWidth = width;
    this.lastHeight = height;

    // Clear to black
    this.offCtx.fillStyle = '#000';
    this.offCtx.fillRect(0, 0, width, height);
  }

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
    const waveform = audio.getWaveformData();
    const freqData = audio.getFrequencyData();

    // Initialize or resize offscreen canvas
    if (!this.offscreen || width !== this.lastWidth || height !== this.lastHeight) {
      this.initOffscreen(width, height);
    }

    if (!this.offCtx || !this.offscreen) return;

    const centerX = width / 2;
    const centerY = height / 2;

    // Update animation parameters
    this.warpAngle += 0.02 + bass * 0.1;
    this.colorPhase += 0.5 + average * 2;

    // Zoom pulses with bass
    this.targetZoom = 1.01 + bass * 0.03;
    this.zoom += (this.targetZoom - this.zoom) * 0.3;

    // === WARP EFFECT: Scale and rotate the previous frame ===
    this.offCtx.save();

    // Copy current canvas to offscreen
    this.offCtx.drawImage(ctx.canvas, 0, 0, width, height);

    // Clear main canvas with slight transparency for trails
    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + (1 - average) * 0.05})`;
    ctx.fillRect(0, 0, width, height);

    // Draw warped version back with time-based variation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(0.01 + mid * 0.02 + Math.sin(time * 0.5) * 0.005);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-centerX, -centerY);

    // Slight color shift for that psychedelic feel
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.offscreen, 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();

    this.offCtx.restore();

    // === DRAW NEW AUDIO-REACTIVE ELEMENTS ===

    // Central waveform spiral
    const spiralPoints = 128;
    const maxRadius = Math.min(width, height) * 0.35;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.warpAngle * 0.5);

    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();

      const layerPhase = layer * (Math.PI * 2 / 3);
      const hue = (this.colorPhase + layer * 40) % 360;

      for (let i = 0; i < spiralPoints; i++) {
        const t = i / spiralPoints;
        const angle = t * Math.PI * 4 + this.warpAngle + layerPhase;

        // Get waveform value for this point
        const waveIdx = Math.floor(t * waveform.length);
        const waveValue = (waveform[waveIdx] - 128) / 128;

        // Spiral radius modulated by audio
        const baseRadius = t * maxRadius * (0.5 + average * 0.5);
        const audioMod = waveValue * 30 * (1 + bass);
        const radius = baseRadius + audioMod;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Gradient stroke
      const gradient = ctx.createLinearGradient(-maxRadius, 0, maxRadius, 0);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
      gradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 60%, 0.9)`);
      gradient.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 50%, 0.8)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 + bass * 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();

    // === FREQUENCY BARS AROUND THE EDGE ===
    const barCount = 64;
    const barMaxHeight = 100;

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const freqIdx = Math.floor((i / barCount) * freqData.length * 0.5);
      const value = freqData[freqIdx] / 255;

      const innerRadius = Math.min(width, height) * 0.42;
      const barHeight = value * barMaxHeight * (1 + bass * 0.5);

      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);

      const hue = (this.colorPhase + i * 5) % 360;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + value * 30}%, ${0.5 + value * 0.5})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Glow on loud frequencies
      if (value > 0.5) {
        ctx.beginPath();
        ctx.arc(x2, y2, value * 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${value * 0.5})`;
        ctx.fill();
      }
    }

    // === CENTRAL FLASH ON BASS HITS ===
    if (bass > 0.6) {
      const flashRadius = (bass - 0.4) * 200;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, flashRadius);
      const hue = this.colorPhase % 360;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${(bass - 0.6) * 0.5})`);
      gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, ${(bass - 0.6) * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, flashRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // === FLOATING PARTICLES ===
    const particleCount = Math.floor(treble * 20);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * maxRadius * 1.5;
      const x = centerX + Math.cos(angle + this.warpAngle) * dist;
      const y = centerY + Math.sin(angle + this.warpAngle) * dist;
      const size = Math.random() * 3 + 1;
      const hue = (this.colorPhase + Math.random() * 60) % 360;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.7)`;
      ctx.fill();
    }
  }

  reset(): void {
    this.offscreen = null;
    this.offCtx = null;
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.warpAngle = 0;
    this.colorPhase = 0;
    this.zoom = 1;
  }
}
