import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { PhysicsBody, type PhysicsBodyConfig } from './PhysicsBody';
import { CollisionBuilder } from './CollisionBuilder';

export const PhysicsHelper = {
  // --- PhysicsBody / CollisionBuilder factories ---

  /**
   * Enable Arcade physics on a game object and return a typed PhysicsBody wrapper.
   *
   * @example
   * const body = PhysicsHelper.body(scene, sprite, { drag: 300, collideWorldBounds: true });
   * body.setVelocity(200, 0).setBounce(0.5);
   */
  body(
    scene: Phaser.Scene,
    obj: Phaser.GameObjects.GameObject,
    config?: PhysicsBodyConfig,
  ): PhysicsBody {
    return new PhysicsBody(scene, obj, config);
  },

  /**
   * Begin a fluent collision setup chain.
   *
   * @example
   * PhysicsHelper.collide(scene, player).with(platforms).onHit(onLand);
   * PhysicsHelper.collide(scene, bullets).with(enemies).asOverlap(onHit);
   */
  collide(
    scene: Phaser.Scene,
    a: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
  ): CollisionBuilder {
    return new CollisionBuilder(scene, a);
  },


  // --- Gravity ---

  setGravity(scene: Phaser.Scene, x: number, y: number): void {
    if (scene.physics?.world) {
      scene.physics.world.gravity.set(x, y);
    }
  },

  // --- Body Setup ---

  enableBody(scene: Phaser.Scene, obj: Phaser.GameObjects.GameObject, isStatic = false): void {
    scene.physics.add.existing(obj, isStatic);
  },

  setBodySize(obj: Phaser.GameObjects.GameObject, width: number, height: number, offsetX = 0, offsetY = 0): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(width, height);
      body.setOffset(offsetX, offsetY);
    }
  },

  setCircularBody(obj: Phaser.GameObjects.GameObject, radius: number, offsetX = 0, offsetY = 0): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCircle(radius, offsetX, offsetY);
    }
  },

  // --- Velocity & Movement ---

  setVelocity(obj: Phaser.GameObjects.GameObject, x: number, y: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setVelocity(x, y);
  },

  setVelocityX(obj: Phaser.GameObjects.GameObject, x: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setVelocityX(x);
  },

  setVelocityY(obj: Phaser.GameObjects.GameObject, y: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setVelocityY(y);
  },

  setMaxVelocity(obj: Phaser.GameObjects.GameObject, x: number, y?: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setMaxVelocity(x, y ?? x);
  },

  setDrag(obj: Phaser.GameObjects.GameObject, x: number, y?: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setDrag(x, y ?? x);
  },

  setFriction(obj: Phaser.GameObjects.GameObject, x: number, y?: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setFriction(x, y ?? x);
  },

  setBounce(obj: Phaser.GameObjects.GameObject, x: number, y?: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setBounce(x, y ?? x);
  },

  // --- Collision ---

  addCollider(
    scene: Phaser.Scene,
    a: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    b: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    process?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): Phaser.Physics.Arcade.Collider | null {
    if (!scene.physics) return null;
    return scene.physics.add.collider(a, b, callback, process);
  },

  addOverlap(
    scene: Phaser.Scene,
    a: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    b: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    process?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): Phaser.Physics.Arcade.Collider | null {
    if (!scene.physics) return null;
    return scene.physics.add.overlap(a, b, callback, process);
  },

  // --- World Bounds ---

  setWorldBounds(scene: Phaser.Scene, x: number, y: number, width: number, height: number): void {
    scene.physics.world.setBounds(x, y, width, height);
  },

  setCollideWorldBounds(obj: Phaser.GameObjects.GameObject, collide = true): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    body?.setCollideWorldBounds(collide);
  },

  // --- Body Properties ---

  setImmovable(obj: Phaser.GameObjects.GameObject, immovable = true): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) body.immovable = immovable;
  },

  setGravityY(obj: Phaser.GameObjects.GameObject, gravity: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) body.setGravityY(gravity);
  },

  /** Check if body is on the floor (touching down) */
  isOnFloor(obj: Phaser.GameObjects.GameObject): boolean {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    return body?.blocked?.down ?? false;
  },

  /** Get velocity of a body */
  getVelocity(obj: Phaser.GameObjects.GameObject): { x: number; y: number } {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    return body ? { x: body.velocity.x, y: body.velocity.y } : { x: 0, y: 0 };
  },

  // --- Groups ---

  createGroup(scene: Phaser.Scene, config?: Phaser.Types.Physics.Arcade.PhysicsGroupConfig): Phaser.Physics.Arcade.Group {
    return scene.physics.add.group(config);
  },

  createStaticGroup(scene: Phaser.Scene): Phaser.Physics.Arcade.StaticGroup {
    return scene.physics.add.staticGroup();
  },

  // --- One-Way Platforms ---

  /**
   * Make a platform one-way (passable from below, solid from above).
   * Call this in the collider's process callback.
   */
  oneWayPlatformCheck(
    player: Phaser.GameObjects.GameObject,
    platform: Phaser.GameObjects.GameObject,
  ): boolean {
    const playerBody = (player as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    const platBody = (platform as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (!playerBody || !platBody) return false;

    // Only collide if player is falling and above the platform
    return playerBody.velocity.y >= 0 && playerBody.bottom <= platBody.top + 10;
  },

  /** Check if body is touching a wall on left */
  isOnLeftWall(obj: Phaser.GameObjects.GameObject): boolean {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    return body?.blocked?.left ?? false;
  },

  /** Check if body is touching a wall on right */
  isOnRightWall(obj: Phaser.GameObjects.GameObject): boolean {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    return body?.blocked?.right ?? false;
  },

  /** Check if body is touching ceiling */
  isOnCeiling(obj: Phaser.GameObjects.GameObject): boolean {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    return body?.blocked?.up ?? false;
  },

  /** Apply an impulse (instant velocity change) */
  impulse(obj: Phaser.GameObjects.GameObject, x: number, y: number): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.velocity.x += x;
      body.velocity.y += y;
    }
  },

  /** Set body as kinematic (moves via velocity, not affected by collisions) */
  setAllowGravity(obj: Phaser.GameObjects.GameObject, allow: boolean): void {
    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) body.allowGravity = allow;
  },

  /** Get the physics body of a game object */
  getBody(obj: Phaser.GameObjects.GameObject): Phaser.Physics.Arcade.Body | null {
    return ((obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body) ?? null;
  },
};
