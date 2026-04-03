export type ForceFieldType = 'attractor' | 'repeller' | 'vortex' | 'wind' | 'turbulence';

export interface ForceFieldConfig {
  type: ForceFieldType;
  x: number;
  y: number;
  /** Strength of the force */
  strength?: number;
  /** Radius of effect (0 = infinite) */
  radius?: number;
  /** For wind: direction angle in radians */
  angle?: number;
  /** For turbulence: noise scale */
  scale?: number;
}

export interface ForceTarget {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Force fields that affect particles in an area.
 *
 * Usage:
 * ```
 * const field = new ForceField({ type: 'attractor', x: 400, y: 300, strength: 500, radius: 200 });
 * // In particle update:
 * field.apply(particle, delta);
 * ```
 */
export class ForceField {
  private config: Required<ForceFieldConfig>;
  private _enabled = true;
  private turbulenceSeed = Math.random() * 1000;

  constructor(config: ForceFieldConfig) {
    this.config = {
      strength: 200,
      radius: 0,
      angle: 0,
      scale: 0.01,
      ...config,
    };
  }

  /** Apply force to a single target. Mutates vx/vy. */
  apply(target: ForceTarget, delta: number): void {
    if (!this._enabled) return;
    const dt = delta / 1000;

    const dx = this.config.x - target.x;
    const dy = this.config.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check radius
    if (this.config.radius > 0 && dist > this.config.radius) return;

    const strength = this.config.strength * dt;

    switch (this.config.type) {
      case 'attractor': {
        if (dist < 1) break;
        const nx = dx / dist;
        const ny = dy / dist;
        target.vx += nx * strength;
        target.vy += ny * strength;
        break;
      }
      case 'repeller': {
        if (dist < 1) break;
        const nx = -dx / dist;
        const ny = -dy / dist;
        const falloff = this.config.radius > 0 ? 1 - dist / this.config.radius : 1;
        target.vx += nx * strength * falloff;
        target.vy += ny * strength * falloff;
        break;
      }
      case 'vortex': {
        if (dist < 1) break;
        // Perpendicular to radial direction
        const nx = -dy / dist;
        const ny = dx / dist;
        target.vx += nx * strength;
        target.vy += ny * strength;
        break;
      }
      case 'wind': {
        target.vx += Math.cos(this.config.angle) * strength;
        target.vy += Math.sin(this.config.angle) * strength;
        break;
      }
      case 'turbulence': {
        // Simple pseudo-random turbulence using sine
        const s = this.config.scale;
        const fx = Math.sin(target.x * s + this.turbulenceSeed) * strength;
        const fy = Math.cos(target.y * s + this.turbulenceSeed * 1.3) * strength;
        target.vx += fx;
        target.vy += fy;
        break;
      }
    }
  }

  /** Apply force to many targets */
  applyAll(targets: ForceTarget[], delta: number): void {
    for (const t of targets) this.apply(t, delta);
  }

  /** Move the force field */
  setPosition(x: number, y: number): this {
    this.config.x = x;
    this.config.y = y;
    return this;
  }

  setStrength(strength: number): this {
    this.config.strength = strength;
    return this;
  }

  setRadius(radius: number): this {
    this.config.radius = radius;
    return this;
  }

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  getType(): ForceFieldType { return this.config.type; }

  getPosition(): { x: number; y: number } {
    return { x: this.config.x, y: this.config.y };
  }
}
