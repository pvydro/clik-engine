import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../helpers/TestScene';
import { TrailRenderer } from '../../src/particles/TrailRenderer';

describe('TrailRenderer', () => {
  let scene: Phaser.Scene;
  let trail: TrailRenderer;

  beforeEach(() => {
    scene = makeTestScene();
    trail = new TrailRenderer(scene, { maxLength: 5, minDistance: 1 });
  });

  it('starts with no points', () => {
    expect(trail.length).toBe(0);
  });

  it('records points from target', () => {
    const target = { x: 0, y: 0 };
    trail.attachTo(target);
    trail.update();
    expect(trail.length).toBe(1);

    target.x = 10;
    trail.update();
    expect(trail.length).toBe(2);
  });

  it('respects maxLength', () => {
    const target = { x: 0, y: 0 };
    trail.attachTo(target);
    for (let i = 0; i < 10; i++) {
      target.x = i * 10;
      trail.update();
    }
    expect(trail.length).toBeLessThanOrEqual(5);
  });

  it('does not record when not active', () => {
    const target = { x: 0, y: 0 };
    trail.attachTo(target);
    trail.detach();
    target.x = 100;
    trail.update();
    expect(trail.length).toBe(0);
  });

  it('clear removes all points', () => {
    const target = { x: 0, y: 0 };
    trail.attachTo(target);
    trail.update();
    trail.clear();
    expect(trail.length).toBe(0);
  });

  it('chains setColor and setWidth', () => {
    expect(trail.setColor(0xff0000)).toBe(trail);
    expect(trail.setWidth(8)).toBe(trail);
  });

  it('destroy cleans up', () => {
    trail.destroy();
    expect(trail.length).toBe(0);
  });
});
