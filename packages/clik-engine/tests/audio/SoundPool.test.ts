import { describe, it, expect, vi } from 'vitest';
import { SoundPool } from '../../src/audio/SoundPool';

function makeScene() {
  return {
    sound: {
      add: vi.fn(() => ({
        play: vi.fn(),
        stop: vi.fn(),
        destroy: vi.fn(),
        once: vi.fn(),
      })),
    },
  } as any;
}

describe('SoundPool', () => {
  it('register creates pool of instances', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene, { poolSize: 3 });
    pool.register('hit', 'hit_sfx');
    expect(scene.sound.add).toHaveBeenCalledTimes(3);
    expect(pool.getRegistered()).toContain('hit');
  });

  it('play returns true for registered sounds', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene, { poolSize: 3 });
    pool.register('hit', 'hit_sfx');
    expect(pool.play('hit')).toBe(true);
  });

  it('play returns false for unregistered sounds', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene);
    expect(pool.play('unknown')).toBe(false);
  });

  it('getActiveCount tracks playing instances', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene, { poolSize: 5 });
    pool.register('hit', 'hit_sfx');
    pool.play('hit');
    pool.play('hit');
    expect(pool.getActiveCount('hit')).toBe(2);
  });

  it('stop stops all instances', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene, { poolSize: 3 });
    pool.register('hit', 'hit_sfx');
    pool.play('hit');
    pool.play('hit');
    pool.stop('hit');
    expect(pool.getActiveCount('hit')).toBe(0);
  });

  it('stopAll stops everything', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene, { poolSize: 3 });
    pool.register('hit', 'hit_sfx');
    pool.register('boom', 'boom_sfx');
    pool.play('hit');
    pool.play('boom');
    pool.stopAll();
    expect(pool.getActiveCount('hit')).toBe(0);
    expect(pool.getActiveCount('boom')).toBe(0);
  });

  it('returns 0 active for unknown pool', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene);
    expect(pool.getActiveCount('nope')).toBe(0);
  });

  it('destroy clears all pools', () => {
    const scene = makeScene();
    const pool = new SoundPool(scene, { poolSize: 2 });
    pool.register('hit', 'hit_sfx');
    pool.destroy();
    expect(pool.getRegistered()).toHaveLength(0);
  });
});
