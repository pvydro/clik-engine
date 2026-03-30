import Phaser from 'phaser';
import { ObjectPool } from '../utils/pool';

export type ParticleShape = 'circle' | 'square' | 'diamond' | 'star';

export interface ExplodeConfig {
  count?: number;
  shapes?: ParticleShape[];
  baseSize?: number;
  speed?: number;
  life?: number;
  gravityChance?: number;
  gravity?: number;
  comboMultiplier?: number;
  whiteCenter?: number;
  depth?: number;
}

export interface ShockwaveConfig {
  maxScale?: number;
  lineWidth?: number;
  alpha?: number;
  duration?: number;
  depth?: number;
}

export interface SparkleConfig {
  count?: number;
  distance?: number;
  life?: number;
  depth?: number;
}

export interface CelebrateConfig {
  count?: number;
  gravity?: number;
  life?: number;
  depth?: number;
}

/**
 * Procedural multi-shape particles using Graphics objects.
 * No textures required — draws circles, squares, diamonds, and stars.
 */
export class GraphicsParticles {
  private scene: Phaser.Scene;
  private pool: ObjectPool<Phaser.GameObjects.Graphics>;

  constructor(scene: Phaser.Scene, poolSize = 32) {
    this.scene = scene;
    this.pool = new ObjectPool(
      () => scene.add.graphics().setVisible(false),
      (gfx) => { gfx.clear(); gfx.setAlpha(1); gfx.setScale(1); gfx.setAngle(0); gfx.setVisible(false); },
      poolSize,
    );
  }

  /** Acquire a graphics object from the pool */
  private acquireGfx(x: number, y: number, depth: number, alpha: number): Phaser.GameObjects.Graphics {
    const gfx = this.pool.acquire();
    gfx.clear();
    gfx.setPosition(x, y);
    gfx.setDepth(depth);
    gfx.setAlpha(alpha);
    gfx.setScale(1);
    gfx.setAngle(0);
    gfx.setVisible(true);
    return gfx;
  }

  /** Release a graphics object back to the pool */
  private releaseGfx(gfx: Phaser.GameObjects.Graphics): void {
    this.pool.release(gfx);
  }

  /** Get pool stats for profiling */
  get poolSize(): number {
    return this.pool.size;
  }

  /**
   * Multi-particle burst with mixed shapes.
   */
  explode(x: number, y: number, color: number, config?: ExplodeConfig): void {
    const combo = config?.comboMultiplier ?? 1;
    const count = Math.round((config?.count ?? 12) + combo * 4);
    const shapes = config?.shapes ?? ['square', 'square', 'circle', 'diamond', 'star'];
    const baseSize = (config?.baseSize ?? 6) + combo * 1.5;
    const speed = (config?.speed ?? 200) * (1 + combo * 0.25);
    const life = config?.life ?? 400;
    const gravityChance = config?.gravityChance ?? 0.3;
    const gravity = config?.gravity ?? 80;
    const whiteFrac = config?.whiteCenter ?? 0.25;
    const depth = config?.depth ?? 50;

    for (let i = 0; i < count; i++) {
      const isWhite = i < count * whiteFrac;
      const pColor = isWhite ? 0xffffff : color;
      const pAlpha = isWhite ? 0.95 : 0.6 + Math.random() * 0.4;
      const size = baseSize * (0.4 + Math.random() * 1.2);
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const hasGravity = Math.random() < gravityChance;
      const pLife = life * (0.5 + Math.random() * 0.5);

      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;

      const gfx = this.acquireGfx(x, y, depth, pAlpha);

      this.drawShape(gfx, 0, 0, size, shape, pColor);

      // Animate with individual physics
      const targetX = x + vx * 0.5;
      const targetY = y + vy * 0.5 + (hasGravity ? gravity : 0);
      const rotation = (Math.random() - 0.5) * 6;

      this.scene.tweens.add({
        targets: gfx,
        x: targetX,
        y: targetY,
        alpha: 0,
        angle: Phaser.Math.RadToDeg(rotation),
        scaleX: 0.1 + Math.random() * 0.3,
        scaleY: 0.1 + Math.random() * 0.3,
        duration: pLife,
        ease: 'Quad.easeOut',
        onComplete: () => this.releaseGfx(gfx),
      });
    }
  }

  /**
   * Expanding ring from point.
   */
  shockwave(x: number, y: number, color: number, config?: ShockwaveConfig): void {
    const maxScale = config?.maxScale ?? 3;
    const lineWidth = config?.lineWidth ?? 2;
    const alpha = config?.alpha ?? 0.6;
    const duration = config?.duration ?? 300;
    const depth = config?.depth ?? 50;

    const gfx = this.acquireGfx(x, y, depth, alpha);
    gfx.lineStyle(lineWidth, color, 1);
    gfx.strokeCircle(0, 0, 20);

    this.scene.tweens.add({
      targets: gfx,
      scaleX: maxScale,
      scaleY: maxScale,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => this.releaseGfx(gfx),
    });
  }

  /**
   * 8-particle radial burst.
   */
  sparkle(x: number, y: number, color: number, config?: SparkleConfig): void {
    const count = config?.count ?? 8;
    const distance = config?.distance ?? 25;
    const life = config?.life ?? 300;
    const depth = config?.depth ?? 50;
    const shapes: ParticleShape[] = ['circle', 'diamond', 'square'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const dist = distance * (0.6 + Math.random() * 0.8);
      const size = 2 + Math.random() * 3;
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      const gfx = this.acquireGfx(x, y, depth, 0.7);

      this.drawShape(gfx, 0, 0, size, shape, color);

      this.scene.tweens.add({
        targets: gfx,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 250 + Math.random() * 150,
        ease: 'Quad.easeOut',
        onComplete: () => this.releaseGfx(gfx),
      });
    }
  }

  /**
   * Upward-biased celebration burst.
   */
  celebrate(x: number, y: number, color: number, config?: CelebrateConfig): void {
    const count = config?.count ?? 20;
    const gravity = config?.gravity ?? 60;
    const life = config?.life ?? 800;
    const depth = config?.depth ?? 50;
    const shapes: ParticleShape[] = ['star', 'diamond', 'circle'];

    for (let i = 0; i < count; i++) {
      const isWhite = i % 3 === 0;
      const pColor = isWhite ? 0xffffff : color;
      const size = 4 + Math.random() * 8;
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      const angle = Math.random() * Math.PI * 2;
      const spd = 100 + Math.random() * 200;
      const vx = Math.cos(angle) * spd * 0.5;
      const vy = Math.sin(angle) * spd * 0.5 - 100; // bias upward

      const gfx = this.acquireGfx(x, y, depth, 0.8);

      this.drawShape(gfx, 0, 0, size, shape, pColor);

      const pLife = life * (0.6 + Math.random() * 0.4);
      const rotation = (Math.random() - 0.5) * 8;

      this.scene.tweens.add({
        targets: gfx,
        x: x + vx,
        y: y + vy + gravity,
        alpha: 0,
        angle: Phaser.Math.RadToDeg(rotation),
        duration: pLife,
        ease: 'Quad.easeOut',
        onComplete: () => this.releaseGfx(gfx),
      });
    }
  }

  /**
   * Convenience: explode + shockwave, scaled by combo.
   */
  impact(x: number, y: number, color: number, combo = 1): void {
    this.explode(x, y, color, { comboMultiplier: combo });
    this.shockwave(x, y, color, {
      maxScale: 3 + combo * 1.5,
      duration: 300 + combo * 50,
    });
  }

  private drawShape(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, size: number, shape: ParticleShape, color: number): void {
    gfx.fillStyle(color, 1);
    switch (shape) {
      case 'circle':
        gfx.fillCircle(cx, cy, size);
        break;
      case 'square':
        gfx.fillRect(cx - size / 2, cy - size / 2, size, size);
        break;
      case 'diamond':
        gfx.beginPath();
        gfx.moveTo(cx, cy - size);
        gfx.lineTo(cx + size, cy);
        gfx.lineTo(cx, cy + size);
        gfx.lineTo(cx - size, cy);
        gfx.closePath();
        gfx.fillPath();
        break;
      case 'star': {
        const points = 5;
        const outer = size;
        const inner = size * 0.4;
        gfx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const angle = (Math.PI * i) / points - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) gfx.moveTo(px, py);
          else gfx.lineTo(px, py);
        }
        gfx.closePath();
        gfx.fillPath();
        break;
      }
    }
  }
}
