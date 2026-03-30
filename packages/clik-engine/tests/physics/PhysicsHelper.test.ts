import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../helpers/TestScene';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { PhysicsHelper } from '../../src/physics/PhysicsHelper';
import { CollisionBuilder } from '../../src/physics/CollisionBuilder';

describe('PhysicsHelper', () => {
  let scene: ReturnType<typeof makeTestScene>;

  beforeEach(() => {
    scene = makeTestScene();
  });

  describe('body()', () => {
    it('creates a PhysicsBody wrapper for a game object', () => {
      const obj = { body: null } as any;
      const body = PhysicsHelper.body(scene as any, obj);
      expect(body).toBeDefined();
      expect(body.raw).toBeDefined();
    });
  });

  describe('collide()', () => {
    it('returns a CollisionBuilder', () => {
      const obj = {} as any;
      const builder = PhysicsHelper.collide(scene as any, obj);
      expect(builder).toBeInstanceOf(CollisionBuilder);
    });
  });

  describe('setVelocity()', () => {
    it('calls setVelocity on the body', () => {
      const body = { setVelocity: vi.fn() };
      const obj = { body } as any;
      PhysicsHelper.setVelocity(obj, 100, 200);
      expect(body.setVelocity).toHaveBeenCalledWith(100, 200);
    });

    it('does not throw when body is null', () => {
      const obj = { body: null } as any;
      expect(() => PhysicsHelper.setVelocity(obj, 10, 20)).not.toThrow();
    });
  });

  describe('setBounce()', () => {
    it('calls setBounce on the body', () => {
      const body = { setBounce: vi.fn() };
      const obj = { body } as any;
      PhysicsHelper.setBounce(obj, 0.5);
      expect(body.setBounce).toHaveBeenCalledWith(0.5, 0.5);
    });

    it('supports separate x/y values', () => {
      const body = { setBounce: vi.fn() };
      const obj = { body } as any;
      PhysicsHelper.setBounce(obj, 0.3, 0.8);
      expect(body.setBounce).toHaveBeenCalledWith(0.3, 0.8);
    });
  });

  describe('setDrag()', () => {
    it('calls setDrag on the body', () => {
      const body = { setDrag: vi.fn() };
      const obj = { body } as any;
      PhysicsHelper.setDrag(obj, 300);
      expect(body.setDrag).toHaveBeenCalledWith(300, 300);
    });
  });

  describe('setGravityY()', () => {
    it('sets gravity on the body', () => {
      const body = { setGravityY: vi.fn() };
      const obj = { body } as any;
      PhysicsHelper.setGravityY(obj, 500);
      expect(body.setGravityY).toHaveBeenCalledWith(500);
    });
  });

  describe('setGravity()', () => {
    it('sets world gravity', () => {
      PhysicsHelper.setGravity(scene as any, 0, 980);
      expect(scene.physics.world.gravity.set).toHaveBeenCalledWith(0, 980);
    });
  });

  describe('enableBody()', () => {
    it('enables physics on an object', () => {
      const obj = {} as any;
      PhysicsHelper.enableBody(scene as any, obj);
      expect(scene.physics.add.existing).toHaveBeenCalledWith(obj, false);
    });

    it('enables static physics when requested', () => {
      const obj = {} as any;
      PhysicsHelper.enableBody(scene as any, obj, true);
      expect(scene.physics.add.existing).toHaveBeenCalledWith(obj, true);
    });
  });

  describe('addCollider()', () => {
    it('creates a collider between two objects', () => {
      const a = {} as any;
      const b = {} as any;
      const cb = vi.fn();
      PhysicsHelper.addCollider(scene as any, a, b, cb);
      expect(scene.physics.add.collider).toHaveBeenCalledWith(a, b, cb, undefined);
    });
  });

  describe('addOverlap()', () => {
    it('creates an overlap between two objects', () => {
      const a = {} as any;
      const b = {} as any;
      const cb = vi.fn();
      PhysicsHelper.addOverlap(scene as any, a, b, cb);
      expect(scene.physics.add.overlap).toHaveBeenCalledWith(a, b, cb, undefined);
    });
  });

  describe('isOnFloor()', () => {
    it('returns true when body is blocked down', () => {
      const obj = { body: { blocked: { down: true } } } as any;
      expect(PhysicsHelper.isOnFloor(obj)).toBe(true);
    });

    it('returns false when body is not blocked', () => {
      const obj = { body: { blocked: { down: false } } } as any;
      expect(PhysicsHelper.isOnFloor(obj)).toBe(false);
    });
  });

  describe('getVelocity()', () => {
    it('returns body velocity', () => {
      const obj = { body: { velocity: { x: 50, y: -100 } } } as any;
      expect(PhysicsHelper.getVelocity(obj)).toEqual({ x: 50, y: -100 });
    });

    it('returns zero when no body', () => {
      const obj = { body: null } as any;
      expect(PhysicsHelper.getVelocity(obj)).toEqual({ x: 0, y: 0 });
    });
  });
});

describe('CollisionBuilder', () => {
  let scene: ReturnType<typeof makeTestScene>;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('fluent API: with().onHit() creates a collider', () => {
    const a = {} as any;
    const b = {} as any;
    const cb = vi.fn();
    const builder = new CollisionBuilder(scene as any, a);
    const result = builder.with(b).onHit(cb);
    expect(scene.physics.add.collider).toHaveBeenCalledWith(a, b, cb, undefined);
    expect(result).toBeDefined();
  });

  it('fluent API: with().asOverlap() creates an overlap', () => {
    const a = {} as any;
    const b = {} as any;
    const cb = vi.fn();
    const builder = new CollisionBuilder(scene as any, a);
    const result = builder.with(b).asOverlap(cb);
    expect(scene.physics.add.overlap).toHaveBeenCalledWith(a, b, cb, undefined);
    expect(result).toBeDefined();
  });

  it('onHit returns null when no target set', () => {
    const a = {} as any;
    const builder = new CollisionBuilder(scene as any, a);
    expect(builder.onHit()).toBeNull();
  });

  it('asOverlap returns null when no target set', () => {
    const a = {} as any;
    const builder = new CollisionBuilder(scene as any, a);
    expect(builder.asOverlap()).toBeNull();
  });

  it('onProcess sets the process callback', () => {
    const a = {} as any;
    const b = {} as any;
    const hitCb = vi.fn();
    const processCb = vi.fn();
    const builder = new CollisionBuilder(scene as any, a);
    builder.with(b).onProcess(processCb).onHit(hitCb);
    expect(scene.physics.add.collider).toHaveBeenCalledWith(a, b, hitCb, processCb);
  });
});
