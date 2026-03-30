import Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { PositionLike, VisibilityLike, SpawnableLike } from '../utils/interfaces';

/**
 * Managed physics group with automatic recycling.
 * Objects are deactivated instead of destroyed, then reused.
 */
export class PhysicsPool {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private factory: (scene: Phaser.Scene) => Phaser.GameObjects.GameObject;

  constructor(
    scene: Phaser.Scene,
    factory: (scene: Phaser.Scene) => Phaser.GameObjects.GameObject,
    maxSize = 50,
  ) {
    this.scene = scene;
    this.factory = factory;
    this.group = scene.physics.add.group({
      maxSize,
      active: false,
      visible: false,
      enable: false,
    });
  }

  /** Get an object from the pool. Creates new if pool is empty. */
  spawn(x: number, y: number): Phaser.GameObjects.GameObject | null {
    let obj = this.group.getFirstDead(false);

    if (!obj) {
      if (this.group.maxSize > 0 && this.group.getLength() >= this.group.maxSize) {
        return null; // Pool exhausted
      }
      obj = this.factory(this.scene);
      this.group.add(obj);
    }

    obj.setActive(true);
    (obj as unknown as VisibilityLike).setVisible(true);

    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.reset(x, y);
    } else {
      (obj as unknown as SpawnableLike).setPosition(x, y);
    }

    return obj;
  }

  /** Return an object to the pool */
  despawn(obj: Phaser.GameObjects.GameObject): void {
    obj.setActive(false);
    (obj as unknown as VisibilityLike).setVisible(false);

    const body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }
  }

  /** Despawn all active objects */
  despawnAll(): void {
    for (const obj of this.group.getChildren()) {
      if (obj.active) this.despawn(obj);
    }
  }

  /** Get the underlying Phaser group for collision setup */
  getGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  /** Count of active objects */
  get activeCount(): number {
    return this.group.countActive(true);
  }

  /** Count of inactive (available) objects */
  get availableCount(): number {
    return this.group.countActive(false);
  }

  /** Total objects in pool */
  get totalCount(): number {
    return this.group.getLength();
  }

  /** Run a function on each active object */
  forEachActive(callback: (obj: Phaser.GameObjects.GameObject) => void): void {
    for (const obj of this.group.getChildren()) {
      if (obj.active) callback(obj);
    }
  }

  /** Despawn objects that are off-screen */
  cullOffscreen(margin = 50): void {
    const cam = this.scene.cameras.main;
    const bounds = {
      left: cam.scrollX - margin,
      right: cam.scrollX + cam.width + margin,
      top: cam.scrollY - margin,
      bottom: cam.scrollY + cam.height + margin,
    };

    this.forEachActive(obj => {
      const go = obj as unknown as PositionLike;
      if (go.x < bounds.left || go.x > bounds.right || go.y < bounds.top || go.y > bounds.bottom) {
        this.despawn(obj);
      }
    });
  }
}
