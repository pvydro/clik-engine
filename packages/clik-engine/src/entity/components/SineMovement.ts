import { Component } from '../Component';

/**
 * Moves forward at an angle while oscillating perpendicular to the forward direction.
 * Creates sine-wave bullet patterns.
 */
export class SineMovement extends Component {
  private speed: number;
  private amplitude: number;
  private frequency: number;
  private angle: number;
  private elapsed = 0;

  constructor(config: { speed?: number; amplitude?: number; frequency?: number; angle?: number } = {}) {
    super();
    this.speed = config.speed ?? 200;
    this.amplitude = config.amplitude ?? 30;
    this.frequency = config.frequency ?? 3;
    this.angle = config.angle ?? 0;
  }

  setSpeed(speed: number): this {
    this.speed = speed;
    return this;
  }

  setAngle(angle: number): this {
    this.angle = angle;
    return this;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.elapsed += dt;

    // Forward direction
    const fx = Math.cos(this.angle);
    const fy = Math.sin(this.angle);

    // Perpendicular direction
    const px = -fy;
    const py = fx;

    // Forward movement
    this.entity.x += fx * this.speed * dt;
    this.entity.y += fy * this.speed * dt;

    // Sine offset (apply delta to avoid jumps)
    const prevOffset = Math.sin((this.elapsed - dt) * this.frequency * Math.PI * 2) * this.amplitude;
    const currOffset = Math.sin(this.elapsed * this.frequency * Math.PI * 2) * this.amplitude;
    const offsetDelta = currOffset - prevOffset;

    this.entity.x += px * offsetDelta;
    this.entity.y += py * offsetDelta;
  }

  reset(): void {
    this.elapsed = 0;
  }
}
