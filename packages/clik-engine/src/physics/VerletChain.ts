/**
 * Verlet integration chain for rope/chain physics.
 *
 * Usage:
 * ```
 * const chain = new VerletChain({
 *   points: 10,
 *   segmentLength: 15,
 *   gravity: 980,
 *   stiffness: 3,
 * });
 * chain.setAnchor(0, playerX, playerY);  // pin first point to player
 * chain.update(delta);
 * const points = chain.getPoints();       // render as line
 * ```
 */

export interface VerletChainConfig {
  /** Number of points in the chain */
  points: number;
  /** Rest length between consecutive points */
  segmentLength: number;
  /** Gravity in pixels/sec^2 (default: 980) */
  gravity?: number;
  /** Constraint solver iterations (higher = stiffer, default: 3) */
  stiffness?: number;
  /** Damping factor (0-1, lower = more damping, default: 0.99) */
  damping?: number;
}

interface VerletPoint {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pinned: boolean;
}

export class VerletChain {
  private points: VerletPoint[];
  private segmentLength: number;
  private gravity: number;
  private stiffness: number;
  private damping: number;

  constructor(config: VerletChainConfig) {
    this.segmentLength = config.segmentLength;
    this.gravity = config.gravity ?? 980;
    this.stiffness = config.stiffness ?? 3;
    this.damping = config.damping ?? 0.99;

    // Initialize points in a vertical line
    this.points = [];
    for (let i = 0; i < config.points; i++) {
      this.points.push({
        x: 0,
        y: i * config.segmentLength,
        prevX: 0,
        prevY: i * config.segmentLength,
        pinned: false,
      });
    }
  }

  /** Pin a point to a fixed position (it won't move during simulation) */
  setAnchor(index: number, x: number, y: number): void {
    if (index < 0 || index >= this.points.length) return;
    const p = this.points[index];
    p.x = x;
    p.y = y;
    p.prevX = x;
    p.prevY = y;
    p.pinned = true;
  }

  /** Unpin a point */
  releaseAnchor(index: number): void {
    if (index < 0 || index >= this.points.length) return;
    this.points[index].pinned = false;
  }

  /** Update the chain simulation */
  update(delta: number): void {
    const dt = delta / 1000;

    // Verlet integration
    for (const p of this.points) {
      if (p.pinned) continue;

      const vx = (p.x - p.prevX) * this.damping;
      const vy = (p.y - p.prevY) * this.damping;

      p.prevX = p.x;
      p.prevY = p.y;

      p.x += vx;
      p.y += vy + this.gravity * dt * dt;
    }

    // Constraint solving (multiple iterations for stability)
    for (let iter = 0; iter < this.stiffness; iter++) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const a = this.points[i];
        const b = this.points[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) continue;

        const diff = (dist - this.segmentLength) / dist;
        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;

        if (!a.pinned) {
          a.x += offsetX;
          a.y += offsetY;
        }
        if (!b.pinned) {
          b.x -= offsetX;
          b.y -= offsetY;
        }
      }
    }
  }

  /** Get all point positions for rendering */
  getPoints(): { x: number; y: number }[] {
    return this.points.map(p => ({ x: p.x, y: p.y }));
  }

  /** Get a specific point */
  getPoint(index: number): { x: number; y: number } | null {
    const p = this.points[index];
    return p ? { x: p.x, y: p.y } : null;
  }

  /** Get the last point (useful for attaching things to chain end) */
  getTail(): { x: number; y: number } {
    const p = this.points[this.points.length - 1];
    return { x: p.x, y: p.y };
  }

  /** Get chain length (number of points) */
  get length(): number {
    return this.points.length;
  }

  /** Get total extended length of the chain */
  get totalLength(): number {
    return (this.points.length - 1) * this.segmentLength;
  }

  /** Apply an impulse to a point */
  applyImpulse(index: number, fx: number, fy: number): void {
    if (index < 0 || index >= this.points.length) return;
    const p = this.points[index];
    if (p.pinned) return;
    p.x += fx;
    p.y += fy;
  }

  /** Reset all points to a vertical line from the first point's position */
  resetChain(): void {
    const startX = this.points[0]?.x ?? 0;
    const startY = this.points[0]?.y ?? 0;
    for (let i = 0; i < this.points.length; i++) {
      this.points[i].x = startX;
      this.points[i].y = startY + i * this.segmentLength;
      this.points[i].prevX = this.points[i].x;
      this.points[i].prevY = this.points[i].y;
    }
  }
}
