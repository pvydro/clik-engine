import { Component } from '../Component';

export interface PatrolPoint {
  x: number;
  y: number;
  waitMs?: number;
}

/**
 * Moves an entity back and forth between patrol points.
 */
export class Patrol extends Component {
  private points: PatrolPoint[];
  private currentIndex = 0;
  private speed: number;
  private waiting = false;
  private waitTimer = 0;
  private loop: boolean;
  private forward = true;

  constructor(points: PatrolPoint[], speed = 100, loop = true) {
    super();
    this.points = points;
    this.speed = speed;
    this.loop = loop;
  }

  onAttach(): void {
    if (this.points.length > 0) {
      this.entity.x = this.points[0].x;
      this.entity.y = this.points[0].y;
    }
  }

  update(delta: number): void {
    if (this.points.length < 2) return;

    if (this.waiting) {
      this.waitTimer -= delta;
      if (this.waitTimer <= 0) this.waiting = false;
      return;
    }

    const target = this.points[this.currentIndex];
    const dx = target.x - this.entity.x;
    const dy = target.y - this.entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.speed * (delta / 1000);

    if (dist <= step) {
      this.entity.x = target.x;
      this.entity.y = target.y;

      // Wait at point
      if (target.waitMs) {
        this.waiting = true;
        this.waitTimer = target.waitMs;
      }

      // Advance to next point
      if (this.forward) {
        this.currentIndex++;
        if (this.currentIndex >= this.points.length) {
          if (this.loop) {
            this.forward = false;
            this.currentIndex = this.points.length - 2;
          } else {
            this.currentIndex = 0;
          }
        }
      } else {
        this.currentIndex--;
        if (this.currentIndex < 0) {
          this.forward = true;
          this.currentIndex = 1;
        }
      }
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      this.entity.x += nx * step;
      this.entity.y += ny * step;
    }
  }

  /** Get current patrol index */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /** Reverse patrol direction */
  reverse(): void {
    this.forward = !this.forward;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }
}
