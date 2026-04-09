import type Phaser from 'phaser';

export interface GPUParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
}

export interface GPUEmitterConfig {
  /** Max particles this emitter can have alive at once */
  maxParticles?: number;
  /** Particle lifetime in ms */
  lifetime?: number;
  /** Emission rate (particles per second) */
  rate?: number;
  /** Initial speed range */
  speedMin?: number;
  speedMax?: number;
  /** Size range */
  sizeMin?: number;
  sizeMax?: number;
  /** Gravity applied to particles (pixels/sec^2) */
  gravity?: number;
  /** Color (hex) */
  color?: number;
  /** Alpha fade over lifetime */
  fadeOut?: boolean;
}

/**
 * High-performance CPU particle system optimized for large counts.
 * Uses a flat array with pooling — no object allocation during gameplay.
 * Renders via Phaser Graphics for zero-texture overhead.
 *
 * For true GPU rendering, WebGL custom pipelines would be needed.
 * This implementation targets 5K-10K particles at 60fps via optimized loops.
 *
 * Usage:
 * ```
 * const emitter = new GPUParticleEmitter(scene, { maxParticles: 5000, rate: 500 });
 * emitter.setPosition(400, 300);
 * emitter.start();
 * // In update:
 * emitter.update(delta);
 * ```
 */
export class GPUParticleEmitter {
  private scene: Phaser.Scene;
  private config: Required<GPUEmitterConfig>;
  private particles: Float32Array;
  private aliveCount = 0;
  private emitAccumulator = 0;
  private emitting = false;
  private posX = 0;
  private posY = 0;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  // Stride: x, y, vx, vy, life, maxLife, size, color(packed), alpha
  private static readonly STRIDE = 9;

  constructor(scene: Phaser.Scene, config?: GPUEmitterConfig) {
    this.scene = scene;
    this.config = {
      maxParticles: config?.maxParticles ?? 1000,
      lifetime: config?.lifetime ?? 1000,
      rate: config?.rate ?? 100,
      speedMin: config?.speedMin ?? 50,
      speedMax: config?.speedMax ?? 200,
      sizeMin: config?.sizeMin ?? 2,
      sizeMax: config?.sizeMax ?? 4,
      gravity: config?.gravity ?? 0,
      color: config?.color ?? 0xffffff,
      fadeOut: config?.fadeOut ?? true,
    };
    this.particles = new Float32Array(this.config.maxParticles * GPUParticleEmitter.STRIDE);
  }

  /** Set emitter position */
  setPosition(x: number, y: number): this {
    this.posX = x;
    this.posY = y;
    return this;
  }

  /** Start continuous emission */
  start(): this {
    this.emitting = true;
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics();
      this.graphics.setDepth(100);
    }
    return this;
  }

  /** Stop emission (existing particles continue to live) */
  stop(): this {
    this.emitting = false;
    return this;
  }

  /** Emit a burst of N particles at once */
  burst(count: number, x?: number, y?: number): void {
    const bx = x ?? this.posX;
    const by = y ?? this.posY;
    for (let i = 0; i < count; i++) {
      this.emit(bx, by);
    }
  }

  /** Update all particles. Call each frame. */
  update(delta: number): void {
    const dt = delta / 1000;
    const S = GPUParticleEmitter.STRIDE;
    const p = this.particles;

    // Emit new particles
    if (this.emitting) {
      this.emitAccumulator += this.config.rate * dt;
      while (this.emitAccumulator >= 1) {
        this.emit(this.posX, this.posY);
        this.emitAccumulator -= 1;
      }
    }

    // Update existing particles
    let writeIdx = 0;
    for (let i = 0; i < this.aliveCount; i++) {
      const base = i * S;
      p[base + 4] -= delta; // life -= delta

      if (p[base + 4] <= 0) continue; // dead

      // Physics
      p[base + 3] += this.config.gravity * dt; // vy += gravity
      p[base] += p[base + 2] * dt; // x += vx * dt
      p[base + 1] += p[base + 3] * dt; // y += vy * dt

      // Alpha fade
      if (this.config.fadeOut) {
        p[base + 8] = p[base + 4] / p[base + 5]; // alpha = life / maxLife
      }

      // Compact: copy to write position
      if (writeIdx !== i) {
        for (let j = 0; j < S; j++) p[writeIdx * S + j] = p[base + j];
      }
      writeIdx++;
    }
    this.aliveCount = writeIdx;

    // Render
    this.render();
  }

  /** Get current alive particle count */
  get count(): number {
    return this.aliveCount;
  }

  /** Get max capacity */
  get maxParticles(): number {
    return this.config.maxParticles;
  }

  /** Whether currently emitting */
  get isEmitting(): boolean {
    return this.emitting;
  }

  /** Destroy the emitter and its graphics */
  destroy(): void {
    this.emitting = false;
    this.aliveCount = 0;
    this.graphics?.destroy();
    this.graphics = null;
  }

  private emit(x: number, y: number): void {
    if (this.aliveCount >= this.config.maxParticles) return;

    const S = GPUParticleEmitter.STRIDE;
    const base = this.aliveCount * S;
    const angle = Math.random() * Math.PI * 2;
    const speed = this.config.speedMin + Math.random() * (this.config.speedMax - this.config.speedMin);

    this.particles[base] = x;     // x
    this.particles[base + 1] = y; // y
    this.particles[base + 2] = Math.cos(angle) * speed; // vx
    this.particles[base + 3] = Math.sin(angle) * speed; // vy
    this.particles[base + 4] = this.config.lifetime;     // life
    this.particles[base + 5] = this.config.lifetime;     // maxLife
    this.particles[base + 6] = this.config.sizeMin + Math.random() * (this.config.sizeMax - this.config.sizeMin);
    this.particles[base + 7] = this.config.color;        // color
    this.particles[base + 8] = 1;                        // alpha

    this.aliveCount++;
  }

  private render(): void {
    if (!this.graphics) return;
    this.graphics.clear();

    const S = GPUParticleEmitter.STRIDE;
    const p = this.particles;

    for (let i = 0; i < this.aliveCount; i++) {
      const base = i * S;
      const x = p[base];
      const y = p[base + 1];
      const size = p[base + 6];
      const color = p[base + 7];
      const alpha = p[base + 8];

      this.graphics.fillStyle(color, alpha);
      this.graphics.fillCircle(x, y, size);
    }
  }
}
