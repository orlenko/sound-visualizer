import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Plasma - Classic demoscene plasma effect with audio reactivity
 * Uses sine waves to create flowing color patterns
 */
export class Plasma implements Visualizer {
  name = 'PLASMA';

  private imageData: ImageData | null = null;
  private lastWidth = 0;
  private lastHeight = 0;
  private scale = 4; // Render at lower resolution for performance

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

    // Scaled dimensions for performance
    const w = Math.floor(width / this.scale);
    const h = Math.floor(height / this.scale);

    // Recreate image data if size changed
    if (w !== this.lastWidth || h !== this.lastHeight) {
      this.imageData = ctx.createImageData(w, h);
      this.lastWidth = w;
      this.lastHeight = h;
    }

    if (!this.imageData) return;

    const data = this.imageData.data;

    // Time variables modulated by audio
    const t1 = time * (0.5 + bass * 2);
    const t2 = time * (0.7 + mid);
    const t3 = time * (0.3 + treble * 1.5);

    // Plasma parameters affected by audio
    const scale1 = 0.02 + average * 0.02;
    const scale2 = 0.03 + bass * 0.03;
    const scale3 = 0.015 + mid * 0.02;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Classic plasma formula with audio modulation
        const v1 = Math.sin((x * scale1) + t1);
        const v2 = Math.sin((y * scale2) + t2);
        const v3 = Math.sin((x * scale1 + y * scale2) + t1);
        const v4 = Math.sin(Math.sqrt((x - w/2) ** 2 + (y - h/2) ** 2) * scale3 + t3);

        // Combine waves
        let value = (v1 + v2 + v3 + v4) / 4;

        // Add audio-reactive distortion
        value += Math.sin(x * 0.1 + bass * 10) * bass * 0.3;
        value += Math.sin(y * 0.1 + mid * 10) * mid * 0.2;

        // Convert to color (using HSL-like approach)
        const hue = (value + 1) * 180 + time * 30;
        const saturation = 0.8 + treble * 0.2;
        const lightness = 0.4 + average * 0.3 + value * 0.2;

        // HSL to RGB conversion
        const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const hue2 = hue / 60;
        const x2 = c * (1 - Math.abs((hue2 % 2) - 1));
        const m = lightness - c / 2;

        let r = 0, g = 0, b = 0;
        if (hue2 < 1) { r = c; g = x2; }
        else if (hue2 < 2) { r = x2; g = c; }
        else if (hue2 < 3) { g = c; b = x2; }
        else if (hue2 < 4) { g = x2; b = c; }
        else if (hue2 < 5) { r = x2; b = c; }
        else { r = c; b = x2; }

        const idx = (y * w + x) * 4;
        data[idx] = (r + m) * 255;
        data[idx + 1] = (g + m) * 255;
        data[idx + 2] = (b + m) * 255;
        data[idx + 3] = 255;
      }
    }

    // Draw scaled up
    ctx.putImageData(this.imageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      ctx.canvas,
      0, 0, w, h,
      0, 0, width, height
    );

    // Add vignette effect
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 + bass * 0.2})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Flash on bass hits
    if (bass > 0.6) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(bass - 0.6) * 0.3})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  reset(): void {
    this.imageData = null;
    this.lastWidth = 0;
    this.lastHeight = 0;
  }
}
