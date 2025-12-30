import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
  hue: number;
}

/**
 * Matrix - The iconic falling code rain, audio reactive
 * Characters fall faster with bass, colors shift with audio
 */
export class Matrix implements Visualizer {
  name = 'MATRIX';

  private columns: MatrixColumn[] = [];
  private charSet = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
  private fontSize = 16;
  private lastWidth = 0;

  private initColumns(width: number, height: number): void {
    this.columns = [];
    const numColumns = Math.floor(width / this.fontSize);

    for (let i = 0; i < numColumns; i++) {
      this.columns.push(this.createColumn(i, height, true));
    }
    this.lastWidth = width;
  }

  private createColumn(index: number, height: number, randomY: boolean): MatrixColumn {
    const length = Math.floor(Math.random() * 20) + 10;
    const chars: string[] = [];
    for (let i = 0; i < length; i++) {
      chars.push(this.charSet[Math.floor(Math.random() * this.charSet.length)]);
    }

    return {
      x: index * this.fontSize,
      y: randomY ? Math.random() * height - height : 0,
      speed: Math.random() * 2 + 2,
      chars,
      length,
      hue: 120 // Green by default
    };
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

    // Reinit if width changed
    if (Math.floor(width / this.fontSize) !== Math.floor(this.lastWidth / this.fontSize)) {
      this.initColumns(width, height);
    }

    // Initialize if needed
    if (this.columns.length === 0) {
      this.initColumns(width, height);
    }

    // Fade effect - more fade with less audio
    ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + (1 - average) * 0.1})`;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${this.fontSize}px monospace`;
    ctx.textAlign = 'center';

    // Get frequency data for per-column effects
    const freqData = audio.getFrequencyData();

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];

      // Speed modulated by bass and column-specific frequency
      const freqIndex = Math.floor((i / this.columns.length) * freqData.length * 0.5);
      const freqValue = freqData[freqIndex] / 255;

      const speed = col.speed * (1 + bass * 3 + freqValue * 2);
      col.y += speed;

      // Color based on audio - shifts from green to other colors with intensity
      const hue = 120 + (average * 60) + (freqValue * 40) + Math.sin(time) * 10;
      const saturation = 80 + treble * 20 + mid * 10;

      // Draw each character in the column
      for (let j = 0; j < col.length; j++) {
        const charY = col.y - j * this.fontSize;

        // Skip if off screen
        if (charY < -this.fontSize || charY > height + this.fontSize) continue;

        // Brightness based on position in trail
        const trailPos = j / col.length;
        const brightness = (1 - trailPos) * (0.7 + average * 0.3);

        if (j === 0) {
          // Lead character is bright white/green
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, 90%, 1)`;
          // Add glow
          ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
          ctx.shadowBlur = 10 + bass * 10;
        } else {
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${30 + brightness * 40}%, ${brightness})`;
          ctx.shadowBlur = 0;
        }

        // Randomly change characters occasionally
        if (Math.random() < 0.01 + treble * 0.05) {
          col.chars[j] = this.charSet[Math.floor(Math.random() * this.charSet.length)];
        }

        ctx.fillText(col.chars[j], col.x + this.fontSize / 2, charY);
      }

      ctx.shadowBlur = 0;

      // Reset column when it goes off screen
      if (col.y - col.length * this.fontSize > height) {
        Object.assign(col, this.createColumn(i, height, false));
        col.y = -col.length * this.fontSize;
      }
    }

    // Add scanline effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }

    // Flash effect on strong bass
    if (bass > 0.7) {
      ctx.fillStyle = `rgba(0, 255, 100, ${(bass - 0.7) * 0.15})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  reset(): void {
    this.columns = [];
    this.lastWidth = 0;
  }
}
