import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

/**
 * Classic Oscilloscope - Shows the waveform like Winamp's classic scope
 * Features glowing line with gradient coloring based on amplitude
 */
export class Oscilloscope implements Visualizer {
  name = 'OSCILLOSCOPE';

  render(
    ctx: CanvasRenderingContext2D,
    audio: AudioEngine,
    width: number,
    height: number,
    time: number
  ): void {
    const waveform = audio.getWaveformData();
    if (waveform.length === 0) return;

    const centerY = height / 2;
    const amplitude = audio.getAverageAmplitude();

    // Create gradient based on audio intensity
    const hue = (time * 30 + amplitude * 180) % 360;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
    gradient.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 100%, 60%)`);
    gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 100%, 50%)`);

    // Draw glow effect (multiple passes with decreasing alpha)
    for (let glow = 3; glow >= 0; glow--) {
      ctx.beginPath();
      ctx.strokeStyle = glow === 0 ? gradient : `hsla(${hue}, 100%, 70%, ${0.3 - glow * 0.08})`;
      ctx.lineWidth = glow === 0 ? 2 : 4 + glow * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const step = width / waveform.length;

      for (let i = 0; i < waveform.length; i++) {
        // Normalize waveform data: 128 is silence, 0-255 is the range
        const normalized = (waveform[i] - 128) / 128;
        const y = centerY + normalized * (height * 0.4);
        const x = i * step;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    // Add some sparkle effects at peaks
    ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
    for (let i = 0; i < waveform.length; i += 32) {
      const normalized = Math.abs((waveform[i] - 128) / 128);
      if (normalized > 0.5) {
        const x = (i / waveform.length) * width;
        const y = centerY + ((waveform[i] - 128) / 128) * (height * 0.4);
        const size = normalized * 4;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
