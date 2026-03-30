import Phaser from 'phaser';

type PhysicsTarget = Phaser.GameObjects.GameObject | Phaser.GameObjects.Group;

/**
 * Fluent collision setup builder returned by `PhysicsHelper.collide()`.
 *
 * @example
 * PhysicsHelper.collide(scene, player)
 *   .with(platforms)
 *   .onHit((p, platform) => { ... });
 *
 * @example
 * PhysicsHelper.collide(scene, bullets)
 *   .with(enemies)
 *   .asOverlap((bullet, enemy) => {
 *     bullet.destroy();
 *     takeDamage(enemy);
 *   });
 */
export class CollisionBuilder {
  private readonly _scene: Phaser.Scene;
  private readonly _a: PhysicsTarget;
  private _b: PhysicsTarget | null = null;
  private _processCallback: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback | undefined;

  /** @internal - Use PhysicsHelper.collide() instead */
  constructor(scene: Phaser.Scene, a: PhysicsTarget) {
    this._scene = scene;
    this._a = a;
  }

  /** Set the second collision target */
  with(b: PhysicsTarget): this {
    this._b = b;
    return this;
  }

  /**
   * Optional process callback — return false to prevent the collision response
   * for that specific pair this frame (e.g., one-way platforms).
   */
  onProcess(callback: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback): this {
    this._processCallback = callback;
    return this;
  }

  /**
   * Create a solid collider between the two objects.
   * Bodies bounce off each other and cannot overlap.
   * @returns The created Collider, or null if physics is not available.
   */
  onHit(
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): Phaser.Physics.Arcade.Collider | null {
    if (!this._b || !this._scene.physics) return null;
    return this._scene.physics.add.collider(
      this._a,
      this._b,
      callback,
      this._processCallback,
    );
  }

  /**
   * Create an overlap sensor between the two objects.
   * Bodies pass through each other; the callback fires when they overlap.
   * @returns The created Collider (overlap), or null if physics is not available.
   */
  asOverlap(
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): Phaser.Physics.Arcade.Collider | null {
    if (!this._b || !this._scene.physics) return null;
    return this._scene.physics.add.overlap(
      this._a,
      this._b,
      callback,
      this._processCallback,
    );
  }
}
