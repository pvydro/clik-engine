import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

/**
 * Helpers for Matter.js physics (alternative to Arcade).
 * Only usable when ClikGameConfig.physics = 'matter'.
 */
export const MatterHelper = {
  /** Create a rectangle body */
  addRectangle(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    options?: Phaser.Types.Physics.Matter.MatterBodyConfig,
  ): Phaser.Physics.Matter.Image | null {
    if (!scene.matter) {
      ConsoleReporter.error('Matter physics not enabled', 'Set physics: "matter" in ClikGameConfig');
      return null;
    }
    return scene.matter.add.image(x, y, '', undefined, { shape: { type: 'rectangle', width, height }, ...options });
  },

  /** Create a circle body */
  addCircle(
    scene: Phaser.Scene,
    x: number, y: number,
    radius: number,
    options?: Phaser.Types.Physics.Matter.MatterBodyConfig,
  ): Phaser.Physics.Matter.Image | null {
    if (!scene.matter) return null;
    return scene.matter.add.image(x, y, '', undefined, { shape: { type: 'circle', radius }, ...options });
  },

  /** Create a static rectangle (platform, wall) */
  addStaticRect(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
  ): MatterJS.BodyType | null {
    if (!scene.matter) return null;
    return scene.matter.add.rectangle(x, y, width, height, { isStatic: true });
  },

  /** Add a distance constraint (spring/rope) between two bodies */
  addConstraint(
    scene: Phaser.Scene,
    bodyA: MatterJS.BodyType,
    bodyB: MatterJS.BodyType,
    length?: number,
    stiffness = 0.5,
  ): MatterJS.ConstraintType | null {
    if (!scene.matter) return null;
    return scene.matter.add.constraint(bodyA, bodyB, length, stiffness);
  },

  /** Pin a body to a world point */
  addPin(
    scene: Phaser.Scene,
    body: MatterJS.BodyType,
    worldX: number, worldY: number,
    stiffness = 0.9,
  ): MatterJS.ConstraintType | null {
    if (!scene.matter) return null;
    return scene.matter.add.worldConstraint(body, 0, stiffness, {
      pointA: { x: worldX, y: worldY },
    });
  },

  /** Set gravity for Matter world */
  setGravity(scene: Phaser.Scene, x: number, y: number): void {
    if (scene.matter) {
      scene.matter.world.setGravity(x, y);
    }
  },

  /** Apply force to a body */
  applyForce(body: MatterJS.BodyType, forceX: number, forceY: number): void {
    MatterJS.Body.applyForce(body, body.position, { x: forceX, y: forceY });
  },

  /** Set velocity on a body */
  setVelocity(body: MatterJS.BodyType, x: number, y: number): void {
    MatterJS.Body.setVelocity(body, { x, y });
  },

  /** Set angular velocity */
  setAngularVelocity(body: MatterJS.BodyType, velocity: number): void {
    MatterJS.Body.setAngularVelocity(body, velocity);
  },

  /** Make a body a sensor (detects overlap but no collision response) */
  setSensor(body: MatterJS.BodyType, isSensor = true): void {
    body.isSensor = isSensor;
  },

  /** Set collision category and mask */
  setCollisionFilter(body: MatterJS.BodyType, category: number, mask: number, group = 0): void {
    body.collisionFilter = { category, mask, group };
  },

  /** Listen for collision events */
  onCollision(
    scene: Phaser.Scene,
    callback: (event: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }) => void,
  ): void {
    if (!scene.matter) return;
    scene.matter.world.on('collisionstart', (event: { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] }) => {
      for (const pair of event.pairs) {
        callback({ bodyA: pair.bodyA, bodyB: pair.bodyB });
      }
    });
  },
};
