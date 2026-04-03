import Phaser from 'phaser';
import { Component } from '../Component';

export class Movement extends Component {
  speed = 200;
  friction = 0;
  private velocityX = 0;
  private velocityY = 0;

  constructor(speed = 200, friction = 0) {
    super();
    this.speed = speed;
    this.friction = friction;
  }

  setVelocity(x: number, y: number): void {
    this.velocityX = x;
    this.velocityY = y;
  }

  moveInDirection(dx: number, dy: number): void {
    // Normalize diagonal movement
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      this.velocityX = (dx / len) * this.speed;
      this.velocityY = (dy / len) * this.speed;
    } else {
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  moveToward(targetX: number, targetY: number): void {
    const dx = targetX - this.entity.x;
    const dy = targetY - this.entity.y;
    this.moveInDirection(dx, dy);
  }

  stop(): void {
    this.velocityX = 0;
    this.velocityY = 0;
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.entity.x += this.velocityX * dt;
    this.entity.y += this.velocityY * dt;

    // Apply friction
    if (this.friction > 0) {
      this.velocityX *= 1 - this.friction * dt;
      this.velocityY *= 1 - this.friction * dt;
      if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
      if (Math.abs(this.velocityY) < 0.1) this.velocityY = 0;
    }
  }

  getVelocity(): { x: number; y: number } {
    return { x: this.velocityX, y: this.velocityY };
  }

  isMoving(): boolean {
    return this.velocityX !== 0 || this.velocityY !== 0;
  }

  reset(): void {
    this.velocityX = 0;
    this.velocityY = 0;
  }
}
