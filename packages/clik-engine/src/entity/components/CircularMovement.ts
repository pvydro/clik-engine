import { Component } from '../Component';

/**
 * Orbits around a center point at a given radius and angular speed.
 */
export class CircularMovement extends Component {
  private centerX: number;
  private centerY: number;
  private radius: number;
  private angularSpeed: number;
  private currentAngle: number;

  constructor(config: {
    centerX?: number;
    centerY?: number;
    radius?: number;
    angularSpeed?: number;
    startAngle?: number;
  } = {}) {
    super();
    this.centerX = config.centerX ?? 0;
    this.centerY = config.centerY ?? 0;
    this.radius = config.radius ?? 50;
    this.angularSpeed = config.angularSpeed ?? Math.PI;
    this.currentAngle = config.startAngle ?? 0;
  }

  setCenter(x: number, y: number): this {
    this.centerX = x;
    this.centerY = y;
    return this;
  }

  setRadius(radius: number): this {
    this.radius = radius;
    return this;
  }

  setAngularSpeed(speed: number): this {
    this.angularSpeed = speed;
    return this;
  }

  getAngle(): number {
    return this.currentAngle;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.currentAngle += this.angularSpeed * dt;
    this.entity.x = this.centerX + Math.cos(this.currentAngle) * this.radius;
    this.entity.y = this.centerY + Math.sin(this.currentAngle) * this.radius;
  }

  reset(): void {
    this.currentAngle = 0;
  }
}
