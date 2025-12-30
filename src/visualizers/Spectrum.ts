import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Spectrum Analyzer - Classic bar visualization like Winamp
 * Features mirrored bars with peak indicators and color gradients
 */
export class Spectrum implements Visualizer {
  name = 'SPECTRUM';

  private peaks: number[] = [];
  private peakDecay = 0.98;

  render(
    ctx: CanvasRenderingContext2D,
    audio: AudioEngine,
    width: number,
    height: number,
    time: number
  ): void {
    const frequencyData = audio.getFrequencyData();
    if (frequencyData.length === 0) return;

    // Use fewer bars for visual clarity - sample the frequency data
    const barCount = 64;
    const barWidth = (width / barCount) * 0.8;
    const gap = (width / barCount) * 0.2;
    const centerY = height / 2;

    // Initialize peaks array
    if (this.peaks.length !== barCount) {
      this.peaks = new Array(barCount).fill(0);
    }

    for (let i = 0; i < barCount; i++) {
      // Sample frequency data logarithmically for more musical response
      const freqIndex = Math.floor(Math.pow(i / barCount, 1.5) * (frequencyData.length * 0.5));
      const value = frequencyData[freqIndex] / 255;

      // Update peak
      if (value > this.peaks[i]) {
        this.peaks[i] = value;
      } else {
        this.peaks[i] *= this.peakDecay;
      }

      const barHeight = value * (height * 0.45);
      const x = i * (barWidth + gap) + gap / 2;

      // Create gradient for bar
      const hue = (i / barCount) * 120 + time * 20; // Green to red spectrum
      const gradient = ctx.createLinearGradient(x, centerY, x, centerY - barHeight);
      gradient.addColorStop(0, `hsl(${hue}, 80%, 40%)`);
      gradient.addColorStop(0.5, `hsl(${hue}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${hue + 30}, 100%, 60%)`);

      // Draw upper bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);

      // Draw mirrored lower bar (slightly dimmer)
      const lowerGradient = ctx.createLinearGradient(x, centerY, x, centerY + barHeight);
      lowerGradient.addColorStop(0, `hsl(${hue}, 80%, 30%)`);
      lowerGradient.addColorStop(1, `hsl(${hue}, 60%, 20%)`);
      ctx.fillStyle = lowerGradient;
      ctx.fillRect(x, centerY, barWidth, barHeight * 0.7);

      // Draw peak indicator
      const peakY = this.peaks[i] * (height * 0.45);
      ctx.fillStyle = `hsl(${hue + 30}, 100%, 70%)`;
      ctx.fillRect(x, centerY - peakY - 3, barWidth, 3);

      // Glow effect on peaks
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.shadowBlur = 10;
      ctx.fillRect(x, centerY - peakY - 3, barWidth, 3);
      ctx.shadowBlur = 0;
    }

    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }

  reset(): void {
    this.peaks = [];
  }
}
