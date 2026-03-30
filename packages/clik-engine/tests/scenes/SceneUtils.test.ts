import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { SceneUtils } from '../../src/scenes/SceneUtils';
import { makeTestScene } from '../helpers/TestScene';

/**
 * Patch the scene mock so that:
 *  - add.rectangle / add.text return objects with setScrollFactor
 *  - cameras.main.shake does not crash when called with only 2 args
 */
function patchScene(scene: ReturnType<typeof makeTestScene>) {
  const makeChainable = () => {
    const obj: Record<string, any> = {};
    const proxy = new Proxy(obj, {
      get(target, prop) {
        if (prop in target) return target[prop];
        // Return a function that returns the proxy itself (chaining)
        target[prop as string] = vi.fn().mockReturnValue(proxy);
        return target[prop as string];
      },
    });
    // Provide some concrete defaults
    obj.x = 0;
    obj.y = 0;
    obj.alpha = 1;
    obj.destroy = vi.fn();
    obj.setText = vi.fn().mockReturnValue(proxy);
    obj.text = '';
    return proxy;
  };

  (scene.add.rectangle as ReturnType<typeof vi.fn>).mockImplementation(() => makeChainable());
  (scene.add.text as ReturnType<typeof vi.fn>).mockImplementation(() => makeChainable());

  // Override shake to not require a callback argument
  scene.cameras.main.shake = vi.fn();

  return scene;
}

describe('SceneUtils', () => {
  let scene: ReturnType<typeof makeTestScene>;

  beforeEach(() => {
    scene = patchScene(makeTestScene());
    vi.clearAllMocks();
    // Re-apply patches after clearAllMocks
    patchScene(scene);
  });

  // ── wait ──────────────────────────────────────────────────────────

  describe('wait', () => {
    it('returns a Promise that resolves via delayedCall', async () => {
      (scene.time.delayedCall as ReturnType<typeof vi.fn>).mockImplementation(
        (_ms: number, cb: () => void) => { cb(); return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 }; },
      );
      await SceneUtils.wait(scene, 100);
      expect(scene.time.delayedCall).toHaveBeenCalledWith(100, expect.any(Function));
    });
  });

  // ── screenFlash ───────────────────────────────────────────────────

  describe('screenFlash', () => {
    it('creates a rectangle and a tween', async () => {
      (scene.tweens.add as ReturnType<typeof vi.fn>).mockImplementation((config: any) => {
        config.onComplete?.();
        return { stop: vi.fn(), destroy: vi.fn() };
      });

      const promise = SceneUtils.screenFlash(scene, 0xff0000, 200);
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({ alpha: 0, duration: 200 }),
      );
      await promise;
    });

    it('returns a Promise', () => {
      (scene.tweens.add as ReturnType<typeof vi.fn>).mockImplementation((config: any) => {
        config.onComplete?.();
        return { stop: vi.fn() };
      });
      const result = SceneUtils.screenFlash(scene);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ── hitStop ───────────────────────────────────────────────────────

  describe('hitStop', () => {
    it('sets timeScale to 0, pauses physics, then restores', async () => {
      (scene.time.delayedCall as ReturnType<typeof vi.fn>).mockImplementation(
        (_ms: number, cb: () => void) => { cb(); return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 }; },
      );
      (scene.physics.world as any).pause = vi.fn();
      (scene.physics.world as any).resume = vi.fn();

      await SceneUtils.hitStop(scene, 50);

      expect(scene.time.delayedCall).toHaveBeenCalledWith(50, expect.any(Function));
      expect(scene.time.timeScale).toBe(1);
      expect((scene.physics.world as any).resume).toHaveBeenCalled();
    });

    it('returns a Promise', () => {
      (scene.time.delayedCall as ReturnType<typeof vi.fn>).mockImplementation(
        (_ms: number, cb: () => void) => { cb(); return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 }; },
      );
      (scene.physics.world as any).pause = vi.fn();
      (scene.physics.world as any).resume = vi.fn();
      const result = SceneUtils.hitStop(scene, 50);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ── comboShake ────────────────────────────────────────────────────

  describe('comboShake', () => {
    it('calls cameras.main.shake with intensity scaled by combo', () => {
      SceneUtils.comboShake(scene, 3);
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(
        300,     // baseDuration (100) * min(3, 5) = 300
        0.006,   // baseIntensity (0.002) * 3 = 0.006
      );
    });

    it('clamps duration to maxCombo', () => {
      SceneUtils.comboShake(scene, 10, { maxCombo: 5 });
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(500, 0.02);
    });

    it('accepts custom config', () => {
      SceneUtils.comboShake(scene, 2, { baseIntensity: 0.01, baseDuration: 200, maxCombo: 10 });
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(400, 0.02);
    });
  });

  // ── countdown ─────────────────────────────────────────────────────

  describe('countdown', () => {
    it('creates a text object and a timer event', () => {
      SceneUtils.countdown(scene, 3);
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.time.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 1000, repeat: 2 }),
      );
    });

    it('returns a Promise', () => {
      const result = SceneUtils.countdown(scene, 3);
      expect(result).toBeInstanceOf(Promise);
    });

    it('countdown resolves after all ticks complete', async () => {
      let timerCallback: (() => void) | undefined;
      (scene.time.addEvent as ReturnType<typeof vi.fn>).mockImplementation((config: any) => {
        timerCallback = config.callback;
        return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 };
      });

      (scene.tweens.add as ReturnType<typeof vi.fn>).mockImplementation((config: any) => {
        config.onComplete?.();
        return { stop: vi.fn(), destroy: vi.fn() };
      });

      const promise = SceneUtils.countdown(scene, 3);

      // Simulate 3 timer ticks: 3->2, 2->1, 1->GO!
      timerCallback!(); // remaining = 2
      timerCallback!(); // remaining = 1
      timerCallback!(); // remaining = 0 -> "GO!" -> resolve

      await promise;
    });

    it('uses provided x,y or defaults to center', () => {
      SceneUtils.countdown(scene, 1, 100, 200);
      expect(scene.add.text).toHaveBeenCalledWith(
        100, 200, '1', expect.any(Object),
      );
    });
  });

  // ── screenFlashColor ──────────────────────────────────────────────

  describe('screenFlashColor', () => {
    it('creates rectangle and tween with config', async () => {
      (scene.tweens.add as ReturnType<typeof vi.fn>).mockImplementation((config: any) => {
        config.onComplete?.();
        return { stop: vi.fn(), destroy: vi.fn() };
      });
      await SceneUtils.screenFlashColor(scene, { color: 0x00ff00, alpha: 0.5, duration: 300 });
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({ alpha: 0, duration: 300 }),
      );
    });
  });
});
