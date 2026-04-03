import { Component } from '../Component';
import type { PositionLike } from '../../utils/interfaces';

/**
 * Simple homing movement that turns toward a target at a configurable rate.
 * Lighter than SteeringComponent — no force accumulation or mass.
 */
export class HomingMovement extends Component {
  private speed: number;
  private turnRate: number;
  private angle = 0;
  private target: PositionLike | null = null;

  constructor(speed = 200, turnRate = Math.PI * 2) {
    super();
    this.speed = speed;
    this.turnRate = turnRate;
  }

  setTarget(target: PositionLike | null): this {
    this.target = target;
    return this;
  }

  setSpeed(speed: number): this {
    this.speed = speed;
    return this;
  }

  setTurnRate(rate: number): this {
    this.turnRate = rate;
    return this;
  }

  /** Set the current heading angle in radians */
  setAngle(angle: number): this {
    this.angle = angle;
    return this;
  }

  getAngle(): number {
    return this.angle;
  }

  update(delta: number): void {
    const dt = delta / 1000;

    if (this.target) {
      const desired = Math.atan2(this.target.y - this.entity.y, this.target.x - this.entity.x);
      let diff = desired - this.angle;

      // Normalize to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const maxTurn = this.turnRate * dt;
      if (Math.abs(diff) <= maxTurn) {
        this.angle = desired;
      } else {
        this.angle += Math.sign(diff) * maxTurn;
      }
    }

    this.entity.x += Math.cos(this.angle) * this.speed * dt;
    this.entity.y += Math.sin(this.angle) * this.speed * dt;
  }

  reset(): void {
    this.angle = 0;
    this.target = null;
  }
}
