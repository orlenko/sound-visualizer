import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Geiss - Faithful recreation of the legendary Geiss Winamp visualization
 *
 * Based on Ryan Geiss's original algorithm:
 * 1. Render audio waveforms into the image
 * 2. Warp/distort the entire image using a flow field
 * 3. Apply bilinear interpolation for smooth morphing
 * 4. Repeat - creating flowing, cloud-like patterns
 *
 * Reference: https://www.geisswerks.com/geiss/secrets.html
 */
export class Geiss implements Visualizer {
  name = 'GEISS';

  // Double-buffered pixel data for the warp effect
  private buffer1: ImageData | null = null;
  private buffer2: ImageData | null = null;
  private currentBuffer = 0;

  // Warp field parameters
  private warpTime = 0;
  private warpMode = 0;
  private warpModeTimer = 0;

  // Color cycling
  private colorPhase = 0;

  // Dimensions
  private width = 0;
  private height = 0;

  // Precomputed warp map for performance
  private warpMapX: Float32Array | null = null;
  private warpMapY: Float32Array | null = null;

  private initBuffers(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.buffer1 = new ImageData(width, height);
    this.buffer2 = new ImageData(width, height);
    this.warpMapX = new Float32Array(width * height);
    this.warpMapY = new Float32Array(width * height);

    // Initialize buffers to black
    for (let i = 0; i < width * height * 4; i += 4) {
      this.buffer1.data[i] = 0;
      this.buffer1.data[i + 1] = 0;
      this.buffer1.data[i + 2] = 0;
      this.buffer1.data[i + 3] = 255;
      this.buffer2.data[i] = 0;
      this.buffer2.data[i + 1] = 0;
      this.buffer2.data[i + 2] = 0;
      this.buffer2.data[i + 3] = 255;
    }
  }

  /**
   * Generate the warp map - this is the heart of the Geiss effect
   * Different modes create different flowing patterns
   */
  private updateWarpMap(bass: number, mid: number, time: number): void {
    if (!this.warpMapX || !this.warpMapY) return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    // Warp parameters that change over time
    const zoom = 0.98 + bass * 0.02; // Slight zoom in
    const rotation = 0.02 + mid * 0.03; // Rotation speed
    const spiralStrength = 0.3 + bass * 0.5;
    const waveAmp = 5 + mid * 10;
    const waveFreq = 0.02 + bass * 0.01;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        // Vector from center
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Normalized distance
        const normDist = dist / maxDist;

        let srcX: number, srcY: number;

        // Different warp modes for variety
        switch (this.warpMode) {
          case 0: // Spiral zoom
            {
              const newAngle = angle + rotation + spiralStrength * normDist;
              const newDist = dist * zoom;
              srcX = cx + Math.cos(newAngle) * newDist;
              srcY = cy + Math.sin(newAngle) * newDist;
            }
            break;

          case 1: // Wavy tunnel
            {
              const wave = Math.sin(dist * waveFreq + time * 2) * waveAmp * normDist;
              const newDist = dist * zoom + wave * 0.1;
              srcX = cx + Math.cos(angle + rotation) * newDist;
              srcY = cy + Math.sin(angle + rotation) * newDist;
            }
            break;

          case 2: // Flowing streams
            {
              const flowX = Math.sin(y * 0.02 + time) * 3;
              const flowY = Math.cos(x * 0.02 + time * 0.7) * 3;
              srcX = x * zoom + (cx - x * zoom) * 0.02 + flowX;
              srcY = y * zoom + (cy - y * zoom) * 0.02 + flowY;
            }
            break;

          case 3: // Kaleidoscope
            {
              const segments = 6;
              let symAngle = angle;
              symAngle = ((symAngle % (Math.PI * 2 / segments)) + Math.PI * 2 / segments) % (Math.PI * 2 / segments);
              const newDist = dist * zoom;
              srcX = cx + Math.cos(symAngle + rotation) * newDist;
              srcY = cy + Math.sin(symAngle + rotation) * newDist;
            }
            break;

          default: // Gentle swirl
            {
              const swirl = normDist * spiralStrength;
              srcX = cx + (dx * Math.cos(swirl) - dy * Math.sin(swirl)) * zoom;
              srcY = cy + (dx * Math.sin(swirl) + dy * Math.cos(swirl)) * zoom;
            }
        }

        this.warpMapX[idx] = srcX;
        this.warpMapY[idx] = srcY;
      }
    }
  }

  /**
   * Bilinear interpolation sampling - smooth pixel blending
   */
  private sampleBilinear(src: Uint8ClampedArray, x: number, y: number): [number, number, number] {
    // Clamp coordinates
    x = Math.max(0, Math.min(this.width - 1.001, x));
    y = Math.max(0, Math.min(this.height - 1.001, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const y1 = Math.min(y0 + 1, this.height - 1);

    const fx = x - x0;
    const fy = y - y0;

    // Sample 4 neighboring pixels
    const idx00 = (y0 * this.width + x0) * 4;
    const idx10 = (y0 * this.width + x1) * 4;
    const idx01 = (y1 * this.width + x0) * 4;
    const idx11 = (y1 * this.width + x1) * 4;

    // Bilinear interpolation for each channel
    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;

    const r = src[idx00] * w00 + src[idx10] * w10 + src[idx01] * w01 + src[idx11] * w11;
    const g = src[idx00 + 1] * w00 + src[idx10 + 1] * w10 + src[idx01 + 1] * w01 + src[idx11 + 1] * w11;
    const b = src[idx00 + 2] * w00 + src[idx10 + 2] * w10 + src[idx01 + 2] * w01 + src[idx11 + 2] * w11;

    return [r, g, b];
  }

  /**
   * Apply warp transformation with color decay
   */
  private applyWarp(): void {
    if (!this.buffer1 || !this.buffer2 || !this.warpMapX || !this.warpMapY) return;

    const src = this.currentBuffer === 0 ? this.buffer1.data : this.buffer2.data;
    const dst = this.currentBuffer === 0 ? this.buffer2.data : this.buffer1.data;

    // Color rotation for psychedelic effect
    const colorShift = this.colorPhase * 0.01;
    const cosShift = Math.cos(colorShift);
    const sinShift = Math.sin(colorShift);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const dstIdx = idx * 4;

        // Get warped source coordinates
        const srcX = this.warpMapX[idx];
        const srcY = this.warpMapY[idx];

        // Sample with bilinear interpolation
        let [r, g, b] = this.sampleBilinear(src, srcX, srcY);

        // Apply slight decay to prevent oversaturation
        const decay = 0.99;
        r *= decay;
        g *= decay;
        b *= decay;

        // Subtle color rotation (RGB rotation matrix)
        const newR = r * cosShift + g * sinShift * 0.3;
        const newG = g * cosShift + b * sinShift * 0.3;
        const newB = b * cosShift + r * sinShift * 0.3;

        dst[dstIdx] = Math.min(255, Math.max(0, newR));
        dst[dstIdx + 1] = Math.min(255, Math.max(0, newG));
        dst[dstIdx + 2] = Math.min(255, Math.max(0, newB));
        dst[dstIdx + 3] = 255;
      }
    }

    // Swap buffers
    this.currentBuffer = 1 - this.currentBuffer;
  }

  /**
   * Draw audio waveform into the buffer
   */
  private drawWaveform(audio: AudioEngine, time: number): void {
    const buffer = this.currentBuffer === 0 ? this.buffer1 : this.buffer2;
    if (!buffer) return;

    const waveform = audio.getWaveformData();
    const freqData = audio.getFrequencyData();
    if (waveform.length === 0) return;

    const data = buffer.data;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const bass = audio.getBassAmplitude();

    // Calculate hue based on time and audio
    const hue = (time * 50 + bass * 100) % 360;

    // Draw multiple waveform layers
    for (let layer = 0; layer < 3; layer++) {
      const layerHue = (hue + layer * 40) % 360;
      const [r, g, b] = this.hslToRgb(layerHue / 360, 1, 0.6);

      const radius = 50 + layer * 30 + bass * 50;
      const phaseOffset = layer * Math.PI * 2 / 3;

      for (let i = 0; i < waveform.length; i += 2) {
        const angle = (i / waveform.length) * Math.PI * 2 + time + phaseOffset;
        const waveVal = (waveform[i] - 128) / 128;
        const freqVal = freqData[Math.floor(i / waveform.length * freqData.length * 0.5)] / 255;

        const r2 = radius + waveVal * 40 + freqVal * 30;

        const x = Math.floor(cx + Math.cos(angle) * r2);
        const y = Math.floor(cy + Math.sin(angle) * r2);

        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const idx = (y * this.width + x) * 4;
          // Additive blending
          data[idx] = Math.min(255, data[idx] + r * 0.5);
          data[idx + 1] = Math.min(255, data[idx + 1] + g * 0.5);
          data[idx + 2] = Math.min(255, data[idx + 2] + b * 0.5);
        }
      }
    }

    // Draw frequency sparks on strong audio
    if (bass > 0.3) {
      const sparkCount = Math.floor(bass * 30);
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 100;
        const x = Math.floor(cx + Math.cos(angle) * dist);
        const y = Math.floor(cy + Math.sin(angle) * dist);

        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const sparkHue = (hue + Math.random() * 60) % 360;
          const [sr, sg, sb] = this.hslToRgb(sparkHue / 360, 1, 0.8);
          const idx = (y * this.width + x) * 4;
          data[idx] = Math.min(255, data[idx] + sr);
          data[idx + 1] = Math.min(255, data[idx + 1] + sg);
          data[idx + 2] = Math.min(255, data[idx + 2] + sb);
        }
      }
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  render(
    ctx: CanvasRenderingContext2D,
    audio: AudioEngine,
    width: number,
    height: number,
    time: number
  ): void {
    // Use lower resolution for performance (original Geiss ran at low res too)
    const scale = 2;
    const w = Math.floor(width / scale);
    const h = Math.floor(height / scale);

    // Initialize or resize buffers
    if (!this.buffer1 || this.width !== w || this.height !== h) {
      this.initBuffers(w, h);
    }

    const bass = audio.getBassAmplitude();
    const mid = audio.getMidAmplitude();

    // Update warp time
    this.warpTime += 0.016 * (1 + bass);
    this.colorPhase += 1 + mid * 2;

    // Change warp mode periodically or on strong beats
    this.warpModeTimer += 0.016;
    if (this.warpModeTimer > 8 || (bass > 0.7 && this.warpModeTimer > 2)) {
      this.warpMode = (this.warpMode + 1) % 5;
      this.warpModeTimer = 0;
    }

    // Update warp map (could be optimized to not update every frame)
    this.updateWarpMap(bass, mid, this.warpTime);

    // Draw audio waveform into buffer
    this.drawWaveform(audio, time);

    // Apply warp transformation
    this.applyWarp();

    // Render to canvas (scaled up)
    const buffer = this.currentBuffer === 0 ? this.buffer1 : this.buffer2;
    if (buffer) {
      // Create temporary canvas for scaling
      const tempCanvas = new OffscreenCanvas(w, h);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(buffer, 0, 0);

      // Draw scaled up with smoothing for that soft Geiss look
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, width, height);
    }
  }

  reset(): void {
    this.buffer1 = null;
    this.buffer2 = null;
    this.warpMapX = null;
    this.warpMapY = null;
    this.warpTime = 0;
    this.warpMode = 0;
    this.colorPhase = 0;
    this.currentBuffer = 0;
  }
}
