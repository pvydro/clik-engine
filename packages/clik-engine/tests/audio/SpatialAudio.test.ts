import { describe, it, expect, vi } from 'vitest';
import { SpatialAudio } from '../../src/audio/SpatialAudio';

function makeScene() {
  return { sound: { play: vi.fn() } } as any;
}

describe('SpatialAudio', () => {
  it('compute returns full volume at listener position', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 500 });
    spatial.setListener({ x: 100, y: 100 });
    const { volume } = spatial.compute({ x: 100, y: 100 });
    expect(volume).toBeCloseTo(1, 1);
  });

  it('compute returns zero volume beyond maxDistance', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 100 });
    spatial.setListener({ x: 0, y: 0 });
    const { volume } = spatial.compute({ x: 200, y: 0 });
    expect(volume).toBe(0);
  });

  it('volume decreases with distance', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 500, refDistance: 50 });
    spatial.setListener({ x: 0, y: 0 });

    const near = spatial.compute({ x: 50, y: 0 });
    const far = spatial.compute({ x: 300, y: 0 });
    expect(near.volume).toBeGreaterThan(far.volume);
  });

  it('pan is negative for sounds to the left', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 500 });
    spatial.setListener({ x: 200, y: 0 });
    const { pan } = spatial.compute({ x: 0, y: 0 });
    expect(pan).toBeLessThan(0);
  });

  it('pan is positive for sounds to the right', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 500 });
    spatial.setListener({ x: 0, y: 0 });
    const { pan } = spatial.compute({ x: 200, y: 0 });
    expect(pan).toBeGreaterThan(0);
  });

  it('pan is clamped to [-1, 1]', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 100 });
    spatial.setListener({ x: 0, y: 0 });
    const { pan } = spatial.compute({ x: 200, y: 0 });
    expect(pan).toBeLessThanOrEqual(1);
    expect(pan).toBeGreaterThanOrEqual(-1);
  });

  it('play calls scene.sound.play with spatial config', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 500 });
    spatial.setListener({ x: 0, y: 0 });
    spatial.play('explosion', { x: 100, y: 0 });
    expect(scene.sound.play).toHaveBeenCalledWith('explosion', expect.objectContaining({
      volume: expect.any(Number),
      pan: expect.any(Number),
    }));
  });

  it('play without listener plays at default volume', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene);
    spatial.play('test', { x: 100, y: 100 });
    expect(scene.sound.play).toHaveBeenCalledWith('test');
  });

  it('does not play sounds beyond maxDistance', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene, { maxDistance: 50 });
    spatial.setListener({ x: 0, y: 0 });
    spatial.play('far', { x: 500, y: 500 });
    expect(scene.sound.play).not.toHaveBeenCalled();
  });

  it('compute returns defaults without listener', () => {
    const scene = makeScene();
    const spatial = new SpatialAudio(scene);
    const result = spatial.compute({ x: 100, y: 100 });
    expect(result.volume).toBe(1);
    expect(result.pan).toBe(0);
  });
});
