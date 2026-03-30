import { Component } from '../Component';
import { SteeringCalculator } from '../../ai/SteeringBehaviors';
import { Steering } from '../../ai/SteeringBehaviors';
import type { Vec2 } from '../../ai/SteeringBehaviors';

/**
 * Entity component that applies steering behaviors each frame.
 * Manages velocity and position using a SteeringCalculator.
 */
export class SteeringComponent extends Component {
  private calculator: SteeringCalculator;
  private velocity: Vec2 = { x: 0, y: 0 };
  private _maxSpeed: number;
  private _mass: number;

  constructor(maxSpeed = 100, maxForce = 50, mass = 1) {
    super();
    this._maxSpeed = maxSpeed;
    this._mass = mass;
    this.calculator = new SteeringCalculator(maxForce);
  }

  /** Add a seek force toward target */
  seek(target: Vec2, weight = 1): this {
    const force = Steering.seek(this.getPosition(), target, this.velocity, this._maxSpeed);
    this.calculator.add(force, weight);
    return this;
  }

  /** Add a flee force away from target */
  flee(target: Vec2, weight = 1): this {
    const force = Steering.flee(this.getPosition(), target, this.velocity, this._maxSpeed);
    this.calculator.add(force, weight);
    return this;
  }

  /** Add an arrive force (decelerates near target) */
  arrive(target: Vec2, slowRadius = 100, weight = 1): this {
    const force = Steering.arrive(this.getPosition(), target, this.velocity, this._maxSpeed, slowRadius);
    this.calculator.add(force, weight);
    return this;
  }

  /** Add a wander force */
  private wanderAngle = 0;
  wander(distance = 50, radius = 25, weight = 1): this {
    const result = Steering.wander(this.velocity, distance, radius, this.wanderAngle);
    this.wanderAngle = result.angle;
    this.calculator.add(result.force, weight);
    return this;
  }

  /** Add separation from neighbors */
  separate(neighbors: Vec2[], desiredSeparation = 50, weight = 1): this {
    const force = Steering.separation(this.getPosition(), neighbors, desiredSeparation);
    this.calculator.add(force, weight);
    return this;
  }

  /** Add a raw force vector */
  addForce(force: Vec2, weight = 1): this {
    this.calculator.add(force, weight);
    return this;
  }

  update(delta: number): void {
    const steeringForce = this.calculator.calculate();
    const dt = delta / 1000;

    // Apply force: acceleration = force / mass
    this.velocity.x += (steeringForce.x / this._mass) * dt;
    this.velocity.y += (steeringForce.y / this._mass) * dt;

    // Clamp to max speed
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > this._maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * this._maxSpeed;
      this.velocity.y = (this.velocity.y / speed) * this._maxSpeed;
    }

    // Apply velocity to entity position
    this.entity.x += this.velocity.x * dt;
    this.entity.y += this.velocity.y * dt;
  }

  getVelocity(): Vec2 {
    return { ...this.velocity };
  }

  setVelocity(vx: number, vy: number): this {
    this.velocity.x = vx;
    this.velocity.y = vy;
    return this;
  }

  get maxSpeed(): number { return this._maxSpeed; }
  set maxSpeed(v: number) { this._maxSpeed = v; }

  private getPosition(): Vec2 {
    return { x: this.entity.x, y: this.entity.y };
  }
}
