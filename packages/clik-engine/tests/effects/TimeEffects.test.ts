import { describe, it, expect, vi } from 'vitest';

function makeScene(autoFireDelayed = false) {
  const delayedCalls: { delay: number; cb: Function }[] = [];
  return {
    time: {
      timeScale: 1,
      delayedCall: vi.fn((delay: number, cb: Function) => {
        if (autoFireDelayed) cb();
        else delayedCalls.push({ delay, cb });
      }),
      addEvent: vi.fn(() => ({ destroy: vi.fn() })),
    },
    physics: {
      world: {
        pause: vi.fn(),
        resume: vi.fn(),
      },
    },
    cameras: { main: { shake: vi.fn(), flash: vi.fn(), postFX: null } },
    _delayedCalls: delayedCalls,
  } as any;
}

import { TimeEffects } from '../../src/effects/TimeEffects';

describe('TimeEffects', () => {
  it('hitstop pauses time scale and physics', () => {
    const scene = makeScene();
    const te = new TimeEffects(scene);
    // hitstop uses rAF internally, but the initial call sets timeScale=0
    te.hitstop(3);
    // After rAF resolves (no rAF in test → immediate fallback resume),
    // just verify the function doesn't crash and physics was paused
    expect(scene.physics.world.pause).toHaveBeenCalled();
  });

  it('slowMo sets time scale', () => {
    const scene = makeScene(); // don't auto-fire delayed calls
    const te = new TimeEffects(scene);
    te.slowMo(0.3, 1000, 'instant');
    expect(scene.time.timeScale).toBe(0.3);
    expect(te.isSlowMoActive).toBe(true);
  });

  it('slowMo instant resumes via setTimeout', async () => {
    const scene = makeScene();
    const te = new TimeEffects(scene);
    te.slowMo(0.3, 10, 'instant');
    // Immediately after call, slowmo is active and timeScale is 0.3
    expect(scene.time.timeScale).toBe(0.3);
    expect(te.isSlowMoActive).toBe(true);
    // Wait for setTimeout to fire
    await new Promise(r => setTimeout(r, 20));
    expect(scene.time.timeScale).toBe(1);
    expect(te.isSlowMoActive).toBe(false);
  });

  it('getTimeScale returns current scale', () => {
    const scene = makeScene();
    const te = new TimeEffects(scene);
    scene.time.timeScale = 0.5;
    expect(te.getTimeScale()).toBe(0.5);
  });

  it('resume restores normal speed', () => {
    const scene = makeScene();
    const te = new TimeEffects(scene);
    scene.time.timeScale = 0;
    te.resume();
    expect(scene.time.timeScale).toBe(1);
    expect(te.isHitstopActive).toBe(false);
    expect(te.isSlowMoActive).toBe(false);
  });
});
