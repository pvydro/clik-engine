import { Component } from '../Component';
import type { Entity } from '../Entity';
import type { EntityPool } from '../EntityPool';
import type { Movement } from './Movement';
import { Cooldown } from '../../utils/Cooldown';
import type { PositionLike } from '../../utils/interfaces';
import type { PatternConfig, BulletConfig } from '../combat/BulletPattern';

/**
 * Spawns bullets from an entity pool using configurable patterns.
 * Attach to a weapon/turret/player entity.
 *
 * Usage:
 * ```
 * emitter = new BulletEmitter(bulletPool, { type: 'radial', count: 12 });
 * entity.addComponent('emitter', emitter);
 * emitter.fire(); // or setAutoFire(true)
 * ```
 */
export class BulletEmitter extends Component {
  private pool: EntityPool;
  private pattern: PatternConfig;
  private bulletConfig: BulletConfig;
  private cooldown: Cooldown;
  private autoFire = false;
  private target: PositionLike | null = null;
  private spiralAngle = 0;

  constructor(pool: EntityPool, pattern: PatternConfig, bulletConfig: BulletConfig = {}) {
    super();
    this.pool = pool;
    this.pattern = pattern;
    this.bulletConfig = bulletConfig;
    this.cooldown = new Cooldown(pattern.fireRateMs ?? 200);
  }

  /** Fire one burst of bullets according to the current pattern */
  fire(): Entity[] {
    if (!this.cooldown.use()) return [];

    const angles = this.computeAngles();
    const bullets: Entity[] = [];
    const speed = this.bulletConfig.speed ?? 300;

    for (const angle of angles) {
      const bullet = this.pool.acquire(this.entity.x, this.entity.y);
      if (!bullet) break;

      const movement = bullet.getComponent<Movement>('movement');
      if (movement) {
        movement.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }

      bullets.push(bullet);
    }

    return bullets;
  }

  setPattern(pattern: PatternConfig): this {
    this.pattern = pattern;
    if (pattern.fireRateMs !== undefined) {
      this.cooldown.setDuration(pattern.fireRateMs);
    }
    return this;
  }

  setAutoFire(enabled: boolean): this {
    this.autoFire = enabled;
    return this;
  }

  setTarget(target: PositionLike | null): this {
    this.target = target;
    return this;
  }

  setBulletConfig(config: BulletConfig): this {
    this.bulletConfig = config;
    return this;
  }

  update(delta: number): void {
    this.cooldown.update(delta);

    if (this.pattern.type === 'spiral') {
      this.spiralAngle += (this.pattern.rotationRate ?? Math.PI) * (delta / 1000);
    }

    if (this.autoFire) {
      this.fire();
    }
  }

  reset(): void {
    this.cooldown.reset();
    this.autoFire = false;
    this.target = null;
    this.spiralAngle = 0;
  }

  private computeAngles(): number[] {
    const { type, count = 8, angleSpread = Math.PI / 4, baseAngle = 0 } = this.pattern;

    switch (type) {
      case 'radial':
      case 'ring':
        return this.radialAngles(count, baseAngle);

      case 'aimed':
      case 'stream':
        return [this.aimAngle()];

      case 'spiral':
        return this.radialAngles(count, this.spiralAngle);

      case 'shotgun':
        return this.shotgunAngles(count, angleSpread);

      case 'random-spread':
        return this.randomSpreadAngles(count, angleSpread);

      default:
        return [baseAngle];
    }
  }

  private radialAngles(count: number, base: number): number[] {
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      angles.push(base + (Math.PI * 2 * i) / count);
    }
    return angles;
  }

  private aimAngle(): number {
    if (this.target) {
      return Math.atan2(this.target.y - this.entity.y, this.target.x - this.entity.x);
    }
    return this.pattern.baseAngle ?? 0;
  }

  private shotgunAngles(count: number, spread: number): number[] {
    const center = this.aimAngle();
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (Math.random() - 0.5) * spread;
      angles.push(center + offset);
    }
    return angles;
  }

  private randomSpreadAngles(count: number, spread: number): number[] {
    const center = this.pattern.baseAngle ?? 0;
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (Math.random() - 0.5) * spread;
      angles.push(center + offset);
    }
    return angles;
  }

  // ── Static helpers ──────────────────────────────────────────────

  static radialBurst(pool: EntityPool, config?: Partial<PatternConfig> & BulletConfig): BulletEmitter {
    return new BulletEmitter(pool, { type: 'radial', count: 12, ...config }, config);
  }

  static aimedStream(pool: EntityPool, target: PositionLike, config?: Partial<PatternConfig> & BulletConfig): BulletEmitter {
    const emitter = new BulletEmitter(pool, { type: 'aimed', fireRateMs: 100, ...config }, config);
    emitter.setTarget(target);
    return emitter;
  }

  static spiral(pool: EntityPool, config?: Partial<PatternConfig> & BulletConfig): BulletEmitter {
    return new BulletEmitter(pool, { type: 'spiral', count: 3, rotationRate: Math.PI, fireRateMs: 100, ...config }, config);
  }

  static shotgunSpread(pool: EntityPool, config?: Partial<PatternConfig> & BulletConfig): BulletEmitter {
    return new BulletEmitter(pool, { type: 'shotgun', count: 5, angleSpread: Math.PI / 3, fireRateMs: 500, ...config }, config);
  }
}
