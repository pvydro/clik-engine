import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface PlatformWaypoint {
  x: number;
  y: number;
  pauseMs?: number;
}

/**
 * Creates a moving platform that travels between waypoints.
 * Players standing on it move with it (carried).
 */
export class MovingPlatform {
  private scene: Phaser.Scene;
  private platform: Phaser.GameObjects.Rectangle;
  private waypoints: PlatformWaypoint[];
  private currentIndex = 0;
  private speed: number;
  private paused = false;
  private pauseTimer = 0;
  private forward = true;
  private loop: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    waypoints: PlatformWaypoint[],
    speed = 100,
    color = 0x555577,
    loop = true,
  ) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.speed = speed;
    this.loop = loop;

    this.platform = scene.add.rectangle(x, y, width, height, color);
    scene.physics.add.existing(this.platform, false);

    const body = this.platform.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);

    // Start at first waypoint
    if (waypoints.length > 0) {
      this.platform.setPosition(waypoints[0].x, waypoints[0].y);
      this.currentIndex = 1;
    }
  }

  update(delta: number): void {
    if (this.waypoints.length < 2) return;

    if (this.paused) {
      this.pauseTimer -= delta;
      if (this.pauseTimer <= 0) this.paused = false;
      const body = this.platform.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      return;
    }

    const target = this.waypoints[this.currentIndex];
    const dx = target.x - this.platform.x;
    const dy = target.y - this.platform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      this.platform.setPosition(target.x, target.y);

      // Pause at waypoint
      if (target.pauseMs) {
        this.paused = true;
        this.pauseTimer = target.pauseMs;
      }

      // Next waypoint
      if (this.forward) {
        this.currentIndex++;
        if (this.currentIndex >= this.waypoints.length) {
          if (this.loop) {
            this.forward = false;
            this.currentIndex = this.waypoints.length - 2;
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
      const body = this.platform.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(nx * this.speed, ny * this.speed);
    }
  }

  /** Get the platform game object for collision setup */
  getGameObject(): Phaser.GameObjects.Rectangle {
    return this.platform;
  }

  /** Add collision with a player — player rides the platform */
  addRider(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.GameObject,
  ): Phaser.Physics.Arcade.Collider {
    return scene.physics.add.collider(player, this.platform);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  destroy(): void {
    this.platform.destroy();
  }
}
