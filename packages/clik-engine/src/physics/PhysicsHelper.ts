import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export const PhysicsHelper = {
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
};
