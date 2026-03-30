import { describe, it, expect, vi } from 'vitest';
import { CollisionBuilder } from '../../src/physics/CollisionBuilder';

const makeCollider = () => ({ active: true });

const makeScene = () => {
  const addCollider = vi.fn(() => makeCollider());
  const addOverlap = vi.fn(() => makeCollider());
  return {
    physics: {
      add: { collider: addCollider, overlap: addOverlap },
    },
    _collider: addCollider,
    _overlap: addOverlap,
  } as unknown as Phaser.Scene & { _collider: ReturnType<typeof vi.fn>; _overlap: ReturnType<typeof vi.fn> };
};

const objA = {} as Phaser.GameObjects.GameObject;
const objB = {} as Phaser.GameObjects.GameObject;

describe('CollisionBuilder', () => {
  it('creates a collider via onHit()', () => {
    const scene = makeScene();
    const cb = vi.fn();
    const result = new CollisionBuilder(scene, objA).with(objB).onHit(cb);
    expect(result).not.toBeNull();
    expect(scene._collider).toHaveBeenCalledWith(objA, objB, cb, undefined);
  });

  it('creates an overlap via asOverlap()', () => {
    const scene = makeScene();
    const cb = vi.fn();
    const result = new CollisionBuilder(scene, objA).with(objB).asOverlap(cb);
    expect(result).not.toBeNull();
    expect(scene._overlap).toHaveBeenCalledWith(objA, objB, cb, undefined);
  });

  it('passes a process callback when provided', () => {
    const scene = makeScene();
    const hit = vi.fn();
    const process = vi.fn();
    new CollisionBuilder(scene, objA).with(objB).onProcess(process).onHit(hit);
    expect(scene._collider).toHaveBeenCalledWith(objA, objB, hit, process);
  });

  it('returns null from onHit when .with() was not called', () => {
    const scene = makeScene();
    const result = new CollisionBuilder(scene, objA).onHit();
    expect(result).toBeNull();
  });

  it('returns null from asOverlap when .with() was not called', () => {
    const scene = makeScene();
    const result = new CollisionBuilder(scene, objA).asOverlap();
    expect(result).toBeNull();
  });

  it('chains .with() fluently', () => {
    const scene = makeScene();
    const builder = new CollisionBuilder(scene, objA);
    expect(builder.with(objB)).toBe(builder);
  });

  it('chains .onProcess() fluently', () => {
    const scene = makeScene();
    const builder = new CollisionBuilder(scene, objA);
    expect(builder.onProcess(vi.fn())).toBe(builder);
  });

  it('PhysicsHelper.collide() returns a CollisionBuilder', async () => {
    const { PhysicsHelper } = await import('../../src/physics/PhysicsHelper');
    const scene = makeScene();
    const builder = PhysicsHelper.collide(scene, objA);
    expect(builder).toBeInstanceOf(CollisionBuilder);
  });
});
