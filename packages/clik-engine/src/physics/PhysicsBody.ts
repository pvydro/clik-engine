import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface PhysicsBodyConfig {
  /** Create a static (immovable, unaffected by gravity) body. Default: false */
  isStatic?: boolean;
  /** Initial velocity. Logs a warning if combined with isStatic. */
  velocity?: { x: number; y: number };
  /** Maximum velocity in each axis */
  maxVelocity?: { x: number; y: number };
  /** Linear drag applied each frame. Single number = equal x/y. */
  drag?: number | { x: number; y: number };
  /** Bounce factor (0 = no bounce, 1 = full). Single number = equal x/y. */
  bounce?: number | { x: number; y: number };
  /** Surface friction. Single number = equal x/y. */
  friction?: number | { x: number; y: number };
  /** Per-body gravity override on the Y axis */
  gravityY?: number;
  /** Whether world gravity applies to this body. Default: true */
  allowGravity?: boolean;
  /** Body cannot be pushed by other bodies */
  immovable?: boolean;
  /** Stop at world bounds instead of exiting */
  collideWorldBounds?: boolean;
  /** Override the AABB hitbox size */
  bodySize?: { width: number; height: number; offsetX?: number; offsetY?: number };
  /** Use a circle hitbox instead of a rectangle */
  circleRadius?: number;
}

/**
 * Typed, fluent wrapper around a Phaser Arcade physics body.
 * Eliminates the `as unknown as` cast pattern and adds config validation.
 *
 * @example
 * const body = new PhysicsBody(scene, sprite, { drag: 300, collideWorldBounds: true });
 * body.setVelocity(200, 0).setBounce(0.5);
 *
 * @example
 * // Attach to an object that already has physics enabled
 * const body = PhysicsBody.from(existingSprite);
 * if (body) body.setVelocityX(100);
 */
export class PhysicsBody {
  private _body!: Phaser.Physics.Arcade.Body;
  private _isStatic = false;

  constructor(
    scene: Phaser.Scene,
    obj: Phaser.GameObjects.GameObject,
    config: PhysicsBodyConfig = {},
  ) {
    this._isStatic = config.isStatic ?? false;
    scene.physics.add.existing(obj, this._isStatic);
    this._body = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body;

    // Config validation
    if (this._isStatic && config.velocity) {
      ConsoleReporter.error(
        'PhysicsBody: velocity set on a static body has no effect',
        'Remove isStatic, or remove velocity from the config',
      );
    }

    // Apply initial config
    if (config.velocity && !this._isStatic) {
      this._body.setVelocity(config.velocity.x, config.velocity.y);
    }
    if (config.maxVelocity) {
      this._body.setMaxVelocity(config.maxVelocity.x, config.maxVelocity.y);
    }
    if (config.drag !== undefined) {
      const d = typeof config.drag === 'number' ? { x: config.drag, y: config.drag } : config.drag;
      this._body.setDrag(d.x, d.y);
    }
    if (config.bounce !== undefined) {
      const b = typeof config.bounce === 'number' ? { x: config.bounce, y: config.bounce } : config.bounce;
      this._body.setBounce(b.x, b.y);
    }
    if (config.friction !== undefined) {
      const f = typeof config.friction === 'number' ? { x: config.friction, y: config.friction } : config.friction;
      this._body.setFriction(f.x, f.y);
    }
    if (config.gravityY !== undefined) {
      this._body.setGravityY(config.gravityY);
    }
    if (config.allowGravity !== undefined) {
      this._body.allowGravity = config.allowGravity;
    }
    if (config.immovable) {
      this._body.immovable = true;
    }
    if (config.collideWorldBounds) {
      this._body.setCollideWorldBounds(true);
    }
    if (config.bodySize) {
      const { width, height, offsetX = 0, offsetY = 0 } = config.bodySize;
      this._body.setSize(width, height);
      this._body.setOffset(offsetX, offsetY);
    }
    if (config.circleRadius !== undefined) {
      this._body.setCircle(config.circleRadius);
    }
  }

  // ── Static factory ────────────────────────────────────────────

  /**
   * Wrap the physics body of a game object that already has physics enabled.
   * Returns null if the object has no body yet.
   */
  static from(obj: Phaser.GameObjects.GameObject): PhysicsBody | null {
    const raw = (obj as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as Phaser.Physics.Arcade.Body | undefined;
    if (!raw) return null;
    // Bypass the constructor — physics already added
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pb = Object.create(PhysicsBody.prototype) as any;
    pb._body = raw;
    pb._isStatic = !raw.moves; // static bodies have moves = false
    return pb as PhysicsBody;
  }

  // ── Raw access ────────────────────────────────────────────────

  /** The underlying Phaser Arcade body — escape hatch for advanced use */
  get raw(): Phaser.Physics.Arcade.Body {
    return this._body;
  }

  /** Whether this body was created as static */
  get isStatic(): boolean {
    return this._isStatic;
  }

  // ── Velocity ──────────────────────────────────────────────────

  setVelocity(x: number, y: number): this {
    if (this._isStatic) {
      ConsoleReporter.error(
        'PhysicsBody.setVelocity on a static body has no effect',
        'Create the body with isStatic: false, or use setImmovable instead',
      );
    }
    this._body.setVelocity(x, y);
    return this;
  }

  setVelocityX(x: number): this {
    this._body.setVelocityX(x);
    return this;
  }

  setVelocityY(y: number): this {
    this._body.setVelocityY(y);
    return this;
  }

  setMaxVelocity(x: number, y = x): this {
    this._body.setMaxVelocity(x, y);
    return this;
  }

  get velocity(): Phaser.Math.Vector2 {
    return this._body.velocity;
  }

  // ── Physics properties ────────────────────────────────────────

  setDrag(x: number, y = x): this {
    this._body.setDrag(x, y);
    return this;
  }

  setBounce(x: number, y = x): this {
    this._body.setBounce(x, y);
    return this;
  }

  setFriction(x: number, y = x): this {
    this._body.setFriction(x, y);
    return this;
  }

  setGravityY(gravity: number): this {
    this._body.setGravityY(gravity);
    return this;
  }

  setAllowGravity(allow: boolean): this {
    this._body.allowGravity = allow;
    return this;
  }

  setImmovable(immovable = true): this {
    this._body.immovable = immovable;
    return this;
  }

  setCollideWorldBounds(collide = true): this {
    this._body.setCollideWorldBounds(collide);
    return this;
  }

  // ── Body shape ────────────────────────────────────────────────

  setBodySize(width: number, height: number, offsetX = 0, offsetY = 0): this {
    this._body.setSize(width, height);
    this._body.setOffset(offsetX, offsetY);
    return this;
  }

  setCircle(radius: number, offsetX = 0, offsetY = 0): this {
    this._body.setCircle(radius, offsetX, offsetY);
    return this;
  }

  // ── Impulse ───────────────────────────────────────────────────

  /** Add an instant velocity delta (impulse) */
  impulse(x: number, y: number): this {
    this._body.velocity.x += x;
    this._body.velocity.y += y;
    return this;
  }

  // ── State queries ─────────────────────────────────────────────

  /** True when the body is resting on a floor */
  get isOnFloor(): boolean {
    return this._body.blocked.down;
  }

  /** True when the body is pressed against a ceiling */
  get isOnCeiling(): boolean {
    return this._body.blocked.up;
  }

  /** True when the body is against a wall on the left */
  get isOnLeftWall(): boolean {
    return this._body.blocked.left;
  }

  /** True when the body is against a wall on the right */
  get isOnRightWall(): boolean {
    return this._body.blocked.right;
  }
}
