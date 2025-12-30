import type { AudioEngine } from '../audio/AudioEngine';
import type { Visualizer } from './Visualizer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
}

/**
 * Particle System - Explosive particle effects driven by audio
 * Particles spawn from the center and react to bass/treble
 */
export class Particles implements Visualizer {
  name = 'PARTICLES';

  private particles: Particle[] = [];
  private maxParticles = 500;
  private lastBass = 0;

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

    // Spawn new particles based on audio energy
    const spawnRate = Math.floor(average * 20 + bass * 30);

    // Beat detection - spawn burst on bass hit
    const bassHit = bass > 0.5 && bass - this.lastBass > 0.1;
    this.lastBass = bass;

    if (bassHit) {
      // Spawn a burst of particles
      for (let i = 0; i < 50; i++) {
        this.spawnParticle(centerX, centerY, time, true);
      }
    }

    // Regular spawning
    for (let i = 0; i < spawnRate && this.particles.length < this.maxParticles; i++) {
      this.spawnParticle(centerX, centerY, time, false);
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx * (1 + bass);
      p.y += p.vy * (1 + bass);

      // Add some turbulence based on treble
      p.vx += (Math.random() - 0.5) * treble * 0.5;
      p.vy += (Math.random() - 0.5) * treble * 0.5;

      // Gravity effect modulated by mid frequencies
      p.vy += 0.05 * (1 - mid);

      // Update life
      p.life--;

      // Remove dead particles
      if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        this.particles.splice(i, 1);
        continue;
      }

      // Calculate alpha based on life
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.8;

      // Draw particle with glow
      const size = p.size * (0.5 + lifeRatio * 0.5) * (1 + bass * 0.5);

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${alpha * 0.2})`;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 50%, 90%, ${alpha})`;
      ctx.fill();
    }

    // Draw connecting lines between nearby particles for extra effect
    if (this.particles.length > 1 && this.particles.length < 200) {
      ctx.strokeStyle = `hsla(${time * 50 % 360}, 80%, 60%, 0.1)`;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const p1 = this.particles[i];
          const p2 = this.particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 50) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
    }
  }

  private spawnParticle(x: number, y: number, time: number, burst: boolean): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = burst
      ? 3 + Math.random() * 8
      : 1 + Math.random() * 3;

    this.particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      hue: (time * 40 + Math.random() * 60) % 360,
      life: 60 + Math.random() * 60,
      maxLife: 120
    });
  }

  reset(): void {
    this.particles = [];
    this.lastBass = 0;
  }
}
