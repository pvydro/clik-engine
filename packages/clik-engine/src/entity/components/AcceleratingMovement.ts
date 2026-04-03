import { Component } from '../Component';

export type EasingFn = (t: number) => number;

/** Built-in easing functions for AcceleratingMovement */
export const MovementEasing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => { const t1 = t - 1; return t1 * t1 * t1 + 1; },
} as const;

/**
 * Moves in a direction with eased speed transition from startSpeed to endSpeed.
 */
export class AcceleratingMovement extends Component {
  private angle: number;
  private startSpeed: number;
  private endSpeed: number;
  private duration: number;
  private easing: EasingFn;
  private elapsed = 0;

  constructor(config: {
    angle?: number;
    startSpeed?: number;
    endSpeed?: number;
    duration?: number;
    easing?: EasingFn;
  } = {}) {
    super();
    this.angle = config.angle ?? 0;
    this.startSpeed = config.startSpeed ?? 0;
    this.endSpeed = config.endSpeed ?? 300;
    this.duration = config.duration ?? 1000;
    this.easing = config.easing ?? MovementEasing.easeIn;
  }

  setAngle(angle: number): this {
    this.angle = angle;
    return this;
  }

  /** Get current interpolated speed */
  getCurrentSpeed(): number {
    const t = Math.min(this.elapsed / this.duration, 1);
    const eased = this.easing(t);
    return this.startSpeed + (this.endSpeed - this.startSpeed) * eased;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.elapsed += delta;
    const speed = this.getCurrentSpeed();
    this.entity.x += Math.cos(this.angle) * speed * dt;
    this.entity.y += Math.sin(this.angle) * speed * dt;
  }

  reset(): void {
    this.elapsed = 0;
  }
}
