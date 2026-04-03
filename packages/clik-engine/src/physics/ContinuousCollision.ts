/**
 * Continuous collision detection (CCD) via swept AABB.
 * Prevents fast-moving objects from tunneling through thin walls.
 */

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SweptResult {
  /** Time of impact (0-1, where 0 = start, 1 = full movement) */
  t: number;
  /** Normal of the surface hit */
  normalX: number;
  normalY: number;
  /** Whether a collision occurred */
  hit: boolean;
}

/**
 * Swept AABB collision detection.
 *
 * Usage:
 * ```
 * const result = ContinuousCollision.sweep(
 *   { x: 10, y: 10, width: 4, height: 12 }, // moving box
 *   { x: 0, y: -600 * dt },                  // velocity this frame
 *   { x: 50, y: 0, width: 100, height: 10 }, // static obstacle
 * );
 * if (result.hit) {
 *   // Move only to t * velocity, then slide
 * }
 * ```
 */
export class ContinuousCollision {
  /**
   * Swept AABB test: does `mover` hit `obstacle` when moving by `velocity`?
   * Returns time-of-impact and collision normal.
   */
  static sweep(mover: AABB, velocity: { x: number; y: number }, obstacle: AABB): SweptResult {
    const noHit: SweptResult = { t: 1, normalX: 0, normalY: 0, hit: false };

    if (velocity.x === 0 && velocity.y === 0) return noHit;

    // Expand obstacle by mover's half-size (Minkowski sum)
    const expanded: AABB = {
      x: obstacle.x - mover.width / 2,
      y: obstacle.y - mover.height / 2,
      width: obstacle.width + mover.width,
      height: obstacle.height + mover.height,
    };

    // Ray from mover center vs expanded AABB
    const cx = mover.x + mover.width / 2;
    const cy = mover.y + mover.height / 2;

    return this.rayVsAABB(cx, cy, velocity.x, velocity.y, expanded);
  }

  /**
   * Sweep a mover against multiple obstacles. Returns the earliest hit.
   */
  static sweepAgainstAll(mover: AABB, velocity: { x: number; y: number }, obstacles: AABB[]): SweptResult {
    let earliest: SweptResult = { t: 1, normalX: 0, normalY: 0, hit: false };

    for (const obs of obstacles) {
      const result = this.sweep(mover, velocity, obs);
      if (result.hit && result.t < earliest.t) {
        earliest = result;
      }
    }

    return earliest;
  }

  /**
   * Resolve position after sweep: move to contact point and slide along surface.
   */
  static resolve(
    position: { x: number; y: number },
    velocity: { x: number; y: number },
    result: SweptResult,
  ): { x: number; y: number; vx: number; vy: number } {
    if (!result.hit) {
      return {
        x: position.x + velocity.x,
        y: position.y + velocity.y,
        vx: velocity.x,
        vy: velocity.y,
      };
    }

    // Move to just before contact
    const epsilon = 0.001;
    const contactT = Math.max(0, result.t - epsilon);
    const newX = position.x + velocity.x * contactT;
    const newY = position.y + velocity.y * contactT;

    // Remaining velocity
    const remainT = 1 - contactT;
    const remainVx = velocity.x * remainT;
    const remainVy = velocity.y * remainT;

    // Slide: remove velocity component along the normal
    const dot = remainVx * result.normalX + remainVy * result.normalY;
    const slideVx = remainVx - dot * result.normalX;
    const slideVy = remainVy - dot * result.normalY;

    return {
      x: newX + slideVx,
      y: newY + slideVy,
      vx: slideVx / (remainT || 1),
      vy: slideVy / (remainT || 1),
    };
  }

  /** Check if two AABBs overlap (static test) */
  static overlaps(a: AABB, b: AABB): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private static rayVsAABB(
    ox: number, oy: number,
    dx: number, dy: number,
    box: AABB,
  ): SweptResult {
    const noHit: SweptResult = { t: 1, normalX: 0, normalY: 0, hit: false };

    const invDx = dx !== 0 ? 1 / dx : (ox < box.x ? -Infinity : Infinity);
    const invDy = dy !== 0 ? 1 / dy : (oy < box.y ? -Infinity : Infinity);

    let tNearX = (box.x - ox) * invDx;
    let tFarX = (box.x + box.width - ox) * invDx;
    let tNearY = (box.y - oy) * invDy;
    let tFarY = (box.y + box.height - oy) * invDy;

    if (tNearX > tFarX) { const tmp = tNearX; tNearX = tFarX; tFarX = tmp; }
    if (tNearY > tFarY) { const tmp = tNearY; tNearY = tFarY; tFarY = tmp; }

    if (tNearX > tFarY || tNearY > tFarX) return noHit;

    const tNear = Math.max(tNearX, tNearY);
    const tFar = Math.min(tFarX, tFarY);

    if (tFar < 0 || tNear > 1 || tNear < 0) return noHit;

    let nx = 0, ny = 0;
    if (tNearX > tNearY) {
      nx = invDx < 0 ? 1 : -1;
    } else {
      ny = invDy < 0 ? 1 : -1;
    }

    return { t: tNear, normalX: nx, normalY: ny, hit: true };
  }
}
