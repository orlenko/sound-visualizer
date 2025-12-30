import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

interface Star {
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
  size: number;
  hue: number;
}

/**
 * Starfield - 3D starfield that warps with bass and pulses with music
 * Classic demoscene effect with audio reactivity
 */
export class Starfield implements Visualizer {
  name = 'STARFIELD';

  private stars: Star[] = [];
  private numStars = 400;
  private speed = 0;
  private targetSpeed = 2;

  constructor() {
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      this.stars.push(this.createStar(true));
    }
  }

  private createStar(randomZ: boolean): Star {
    return {
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: randomZ ? Math.random() * 1000 : 1000,
      prevX: 0,
      prevY: 0,
      size: Math.random() * 2 + 1,
      hue: Math.random() * 60 + 200 // Blue-ish stars
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

    const centerX = width / 2;
    const centerY = height / 2;

    // Speed reacts to bass - warp drive effect
    this.targetSpeed = 2 + bass * 25 + average * 10;
    this.speed += (this.targetSpeed - this.speed) * 0.1;

    // Clear with slight fade for trails
    ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + bass * 0.3})`;
    ctx.fillRect(0, 0, width, height);

    // Sort stars by z for proper depth rendering
    this.stars.sort((a, b) => b.z - a.z);

    for (const star of this.stars) {
      // Store previous position for trails
      const prevScreenX = (star.x / star.z) * 300 + centerX;
      const prevScreenY = (star.y / star.z) * 300 + centerY;

      // Move star towards camera
      star.z -= this.speed;

      // Reset star if it passes the camera
      if (star.z <= 1) {
        Object.assign(star, this.createStar(false));
        continue;
      }

      // Project to 2D
      const screenX = (star.x / star.z) * 300 + centerX;
      const screenY = (star.y / star.z) * 300 + centerY;

      // Skip if off screen
      if (screenX < 0 || screenX > width || screenY < 0 || screenY > height) {
        continue;
      }

      // Size based on depth and audio
      const depth = 1 - star.z / 1000;
      const size = (star.size * depth * 3) * (1 + mid * 2);

      // Color shifts with audio
      const hue = (star.hue + time * 30 + treble * 100) % 360;
      const lightness = 50 + depth * 30 + average * 20;

      // Draw trail (line from previous position)
      if (this.speed > 3) {
        const trailLength = Math.min(this.speed * 2, 50);
        const gradient = ctx.createLinearGradient(prevScreenX, prevScreenY, screenX, screenY);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `hsla(${hue}, 80%, ${lightness}%, ${depth * 0.8})`);

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = size * 0.5 + trailLength * 0.02;
        ctx.moveTo(prevScreenX, prevScreenY);
        ctx.lineTo(screenX, screenY);
        ctx.stroke();
      }

      // Draw star core
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${depth})`;
      ctx.fill();

      // Glow on bright stars
      if (depth > 0.5) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${depth * 0.3 * (1 + bass)})`;
        ctx.fill();
      }
    }

    // Add central glow on bass hits
    if (bass > 0.5) {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200 * bass);
      gradient.addColorStop(0, `hsla(${time * 60 % 360}, 100%, 70%, ${bass * 0.3})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  reset(): void {
    this.initStars();
    this.speed = 0;
  }
}
