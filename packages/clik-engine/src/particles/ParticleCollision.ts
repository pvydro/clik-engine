/**
 * Particle-world collision via AABB checks against obstacle list.
 * Designed for lightweight debris/spark bouncing, not full physics.
 *
 * Usage:
 * ```
 * const collision = new ParticleCollision();
 * collision.addObstacle({ x: 0, y: 500, width: 800, height: 20 }); // floor
 * // In particle update loop:
 * collision.resolve(particle); // bounces particle off obstacles
 * ```
 */

export interface ParticleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BouncingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface ParticleCollisionConfig {
  /** Bounce coefficient (0 = no bounce, 1 = perfect bounce) */
  bounce?: number;
  /** Friction applied on bounce (0-1) */
  friction?: number;
  /** Minimum velocity to count as alive (below this, particle stops) */
  minVelocity?: number;
}

export class ParticleCollision {
  private obstacles: ParticleRect[] = [];
  private config: Required<ParticleCollisionConfig>;

  constructor(config?: ParticleCollisionConfig) {
    this.config = {
      bounce: config?.bounce ?? 0.5,
      friction: config?.friction ?? 0.8,
      minVelocity: config?.minVelocity ?? 5,
    };
  }

  /** Add a rectangular obstacle */
  addObstacle(rect: ParticleRect): this {
    this.obstacles.push(rect);
    return this;
  }

  /** Set obstacles from a list (replaces existing) */
  setObstacles(rects: ParticleRect[]): this {
    this.obstacles = [...rects];
    return this;
  }

  /** Clear all obstacles */
  clearObstacles(): this {
    this.obstacles.length = 0;
    return this;
  }

  /**
   * Resolve collisions for a single particle.
   * Mutates the particle's position and velocity.
   * Returns true if a collision occurred.
   */
  resolve(p: BouncingParticle): boolean {
    let collided = false;

    for (const obs of this.obstacles) {
      // Check if particle center is inside obstacle
      if (p.x >= obs.x && p.x <= obs.x + obs.width &&
          p.y >= obs.y && p.y <= obs.y + obs.height) {

        // Find shortest exit direction
        const dLeft = p.x - obs.x;
        const dRight = (obs.x + obs.width) - p.x;
        const dTop = p.y - obs.y;
        const dBottom = (obs.y + obs.height) - p.y;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);

        if (minD === dTop || minD === dBottom) {
          // Vertical collision
          p.vy = -p.vy * this.config.bounce;
          p.vx *= this.config.friction;
          p.y = minD === dTop ? obs.y - p.size : obs.y + obs.height + p.size;
        } else {
          // Horizontal collision
          p.vx = -p.vx * this.config.bounce;
          p.vy *= this.config.friction;
          p.x = minD === dLeft ? obs.x - p.size : obs.x + obs.width + p.size;
        }

        // Kill if too slow
        if (Math.abs(p.vx) < this.config.minVelocity && Math.abs(p.vy) < this.config.minVelocity) {
          p.vx = 0;
          p.vy = 0;
        }

        collided = true;
      }
    }

    return collided;
  }

  /** Resolve collisions for an array of particles */
  resolveAll(particles: BouncingParticle[]): number {
    let count = 0;
    for (const p of particles) {
      if (this.resolve(p)) count++;
    }
    return count;
  }

  get obstacleCount(): number {
    return this.obstacles.length;
  }
}
