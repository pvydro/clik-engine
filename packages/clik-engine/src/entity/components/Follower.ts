import { Component } from '../Component';
import type { PositionLike } from '../../utils/interfaces';

export class Follower extends Component {
  private target: PositionLike | null = null;
  private speed: number;
  private stopDistance: number;
  private mode: 'chase' | 'flee';

  constructor(speed = 100, stopDistance = 5, mode: 'chase' | 'flee' = 'chase') {
    super();
    this.speed = speed;
    this.stopDistance = stopDistance;
    this.mode = mode;
  }

  setTarget(target: PositionLike | null): this {
    this.target = target;
    return this;
  }

  setSpeed(speed: number): this {
    this.speed = speed;
    return this;
  }

  setMode(mode: 'chase' | 'flee'): this {
    this.mode = mode;
    return this;
  }

  update(delta: number): void {
    if (!this.target) return;

    const tx = this.target.x;
    const ty = this.target.y;
    const dx = tx - this.entity.x;
    const dy = ty - this.entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.mode === 'chase') {
      if (dist <= this.stopDistance) return;
      const nx = dx / dist;
      const ny = dy / dist;
      const step = this.speed * (delta / 1000);
      this.entity.x += nx * step;
      this.entity.y += ny * step;
    } else {
      // Flee: move away from target
      if (dist === 0) return;
      const nx = -dx / dist;
      const ny = -dy / dist;
      const step = this.speed * (delta / 1000);
      this.entity.x += nx * step;
      this.entity.y += ny * step;
    }
  }

  getDistanceToTarget(): number {
    if (!this.target) return Infinity;
    const tx = this.target.x;
    const ty = this.target.y;
    const dx = tx - this.entity.x;
    const dy = ty - this.entity.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  hasTarget(): boolean {
    return this.target !== null;
  }
}
