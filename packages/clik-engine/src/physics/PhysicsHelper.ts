import Phaser from 'phaser';

export const PhysicsHelper = {
  setArcadeGravity(scene: Phaser.Scene, x: number, y: number): void {
    if (scene.physics?.world) {
      scene.physics.world.gravity.set(x, y);
    }
  },

  addCollider(
    scene: Phaser.Scene,
    object1: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    object2: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): Phaser.Physics.Arcade.Collider | null {
    if (!scene.physics) return null;
    return scene.physics.add.collider(object1, object2, callback);
  },

  addOverlap(
    scene: Phaser.Scene,
    object1: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    object2: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): Phaser.Physics.Arcade.Collider | null {
    if (!scene.physics) return null;
    return scene.physics.add.overlap(object1, object2, callback);
  },

  enableBody(
    scene: Phaser.Scene,
    gameObject: Phaser.GameObjects.GameObject,
    bodyType?: number,
  ): void {
    if (scene.physics) {
      scene.physics.add.existing(gameObject, bodyType === 1);
    }
  },
};
