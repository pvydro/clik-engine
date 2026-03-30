import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { GameFeelPresets } from '../../src/tween/GameFeelPresets';
import { makeTestScene } from '../helpers/TestScene';

describe('GameFeelPresets', () => {
  let scene: ReturnType<typeof makeTestScene>;
  let target: { x: number; y: number; scaleX: number; scaleY: number; alpha: number; angle: number };

  beforeEach(() => {
    scene = makeTestScene();
    target = { x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, angle: 0 };

    // Make tweens.add invoke onComplete immediately so promises resolve
    scene.tweens.add = vi.fn((config: Record<string, unknown>) => {
      if (typeof config.onComplete === 'function') {
        (config.onComplete as () => void)();
      }
      return { stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), isPlaying: vi.fn(() => false) };
    }) as unknown as typeof scene.tweens.add;
  });

  describe('mergeSquash', () => {
    it('creates 3 sequential tweens (squash, bounce, settle)', async () => {
      await GameFeelPresets.mergeSquash(scene, target);
      expect(scene.tweens.add).toHaveBeenCalledTimes(3);
    });

    it('first step squashes (wide + short)', async () => {
      await GameFeelPresets.mergeSquash(scene, target);
      const firstCall = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(firstCall.scaleX).toBeCloseTo(1.35);
      expect(firstCall.scaleY).toBeCloseTo(0.75);
      expect(firstCall.duration).toBe(70);
    });

    it('second step bounces (narrow + tall)', async () => {
      await GameFeelPresets.mergeSquash(scene, target);
      const secondCall = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(secondCall.scaleX).toBeCloseTo(0.85);
      expect(secondCall.scaleY).toBeCloseTo(1.2);
      expect(secondCall.duration).toBe(60);
    });

    it('third step settles back to scale 1', async () => {
      await GameFeelPresets.mergeSquash(scene, target);
      const thirdCall = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[2][0];
      expect(thirdCall.scaleX).toBe(1);
      expect(thirdCall.scaleY).toBe(1);
      expect(thirdCall.duration).toBe(80);
    });

    it('respects custom durations', async () => {
      await GameFeelPresets.mergeSquash(scene, target, {
        squashDuration: 100,
        bounceDuration: 90,
        settleDuration: 120,
      });
      const calls = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0].duration).toBe(100);
      expect(calls[1][0].duration).toBe(90);
      expect(calls[2][0].duration).toBe(120);
    });

    it('respects custom intensity', async () => {
      await GameFeelPresets.mergeSquash(scene, target, { intensity: 0.5 });
      const firstCall = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(firstCall.scaleX).toBeCloseTo(1 + 0.35 * 0.5);
      expect(firstCall.scaleY).toBeCloseTo(1 - 0.25 * 0.5);
    });

    it('returns a promise that resolves to void', async () => {
      const result = await GameFeelPresets.mergeSquash(scene, target);
      expect(result).toBeUndefined();
    });
  });

  describe('impactPop', () => {
    it('creates a yoyo scale tween', async () => {
      await GameFeelPresets.impactPop(scene, target);
      expect(scene.tweens.add).toHaveBeenCalledTimes(1);
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.scaleX).toBe(1.2);
      expect(config.scaleY).toBe(1.2);
      expect(config.yoyo).toBe(true);
      expect(config.duration).toBe(80);
    });

    it('uses custom scale and duration', async () => {
      await GameFeelPresets.impactPop(scene, target, { scale: 1.5, duration: 120 });
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.scaleX).toBe(1.5);
      expect(config.scaleY).toBe(1.5);
      expect(config.duration).toBe(120);
    });

    it('returns a promise', async () => {
      const result = await GameFeelPresets.impactPop(scene, target);
      expect(result).toBeUndefined();
    });
  });

  describe('collectShrink', () => {
    it('creates 2 sequential tweens (peak then shrink)', async () => {
      await GameFeelPresets.collectShrink(scene, target);
      expect(scene.tweens.add).toHaveBeenCalledTimes(2);
    });

    it('first tween scales up to peak', async () => {
      await GameFeelPresets.collectShrink(scene, target);
      const first = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(first.scaleX).toBe(1.3);
      expect(first.scaleY).toBe(1.3);
      expect(first.duration).toBe(300 * 0.3);
    });

    it('second tween shrinks to 0 with fade', async () => {
      await GameFeelPresets.collectShrink(scene, target);
      const second = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[1][0];
      expect(second.scaleX).toBe(0);
      expect(second.scaleY).toBe(0);
      expect(second.alpha).toBe(0);
      expect(second.duration).toBe(300 * 0.7);
    });

    it('respects custom peak scale and duration', async () => {
      await GameFeelPresets.collectShrink(scene, target, { peakScale: 2, duration: 500 });
      const first = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(first.scaleX).toBe(2);
      expect(first.duration).toBe(500 * 0.3);
    });
  });

  describe('spawnIn', () => {
    it('sets target scale to 0 then tweens to 1', async () => {
      await GameFeelPresets.spawnIn(scene, target);
      expect(target.scaleX).toBe(0);
      expect(target.scaleY).toBe(0);
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.scaleX).toBe(1);
      expect(config.scaleY).toBe(1);
      expect(config.ease).toBe('Back.easeOut');
      expect(config.duration).toBe(200);
    });

    it('accepts custom duration and ease', async () => {
      await GameFeelPresets.spawnIn(scene, target, { duration: 400, ease: 'Quad.easeOut' });
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.duration).toBe(400);
      expect(config.ease).toBe('Quad.easeOut');
    });
  });

  describe('despawn', () => {
    it('tweens scale and alpha to 0', async () => {
      await GameFeelPresets.despawn(scene, target);
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.scaleX).toBe(0);
      expect(config.scaleY).toBe(0);
      expect(config.alpha).toBe(0);
      expect(config.duration).toBe(250);
    });

    it('adds angle when spin is true', async () => {
      target.angle = 45;
      await GameFeelPresets.despawn(scene, target, { spin: true });
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.angle).toBe(405);
    });

    it('does not include angle when spin is false', async () => {
      await GameFeelPresets.despawn(scene, target, { spin: false });
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.angle).toBeUndefined();
    });

    it('respects custom duration', async () => {
      await GameFeelPresets.despawn(scene, target, { duration: 500 });
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.duration).toBe(500);
    });
  });

  describe('flashGlow', () => {
    it('creates a graphics object and tweens it to alpha 0', async () => {
      await GameFeelPresets.flashGlow(scene, target as unknown as Phaser.GameObjects.Container);
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalledTimes(1);
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.alpha).toBe(0);
    });

    it('returns a promise that resolves', async () => {
      const result = await GameFeelPresets.flashGlow(scene, target as unknown as Phaser.GameObjects.Container);
      expect(result).toBeUndefined();
    });
  });

  describe('flashTint', () => {
    it('sets tint fill and clears after delay', async () => {
      const sprite = {
        setTintFill: vi.fn(),
        clearTint: vi.fn(),
      } as unknown as Phaser.GameObjects.Sprite;

      // Make delayedCall invoke callback immediately
      scene.time.delayedCall = vi.fn((_dur: number, cb: () => void) => {
        cb();
        return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 };
      }) as unknown as typeof scene.time.delayedCall;

      await GameFeelPresets.flashTint(scene, sprite as unknown as Phaser.GameObjects.Components.Tint);
      expect(sprite.setTintFill).toHaveBeenCalledWith(0xffffff);
      expect(sprite.clearTint).toHaveBeenCalled();
    });

    it('uses custom color', async () => {
      const sprite = {
        setTintFill: vi.fn(),
        clearTint: vi.fn(),
      } as unknown as Phaser.GameObjects.Sprite;

      scene.time.delayedCall = vi.fn((_dur: number, cb: () => void) => {
        cb();
        return { destroy: vi.fn(), remove: vi.fn(), elapsed: 0 };
      }) as unknown as typeof scene.time.delayedCall;

      await GameFeelPresets.flashTint(scene, sprite as unknown as Phaser.GameObjects.Components.Tint, { color: 0xff0000 });
      expect(sprite.setTintFill).toHaveBeenCalledWith(0xff0000);
    });
  });

  describe('numberRoll', () => {
    it('creates a counter tween and a punch tween by default', async () => {
      const textObj = {
        setText: vi.fn(),
        setColor: vi.fn(),
      } as unknown as Phaser.GameObjects.Text;

      // Override to handle onUpdate + onComplete
      scene.tweens.add = vi.fn((config: Record<string, unknown>) => {
        if (typeof config.onComplete === 'function') {
          (config.onComplete as () => void)();
        }
        return { stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), isPlaying: vi.fn(() => false) };
      }) as unknown as typeof scene.tweens.add;

      await GameFeelPresets.numberRoll(scene, textObj, 0, 100);
      // Two tweens: punch + counter roll
      expect(scene.tweens.add).toHaveBeenCalledTimes(2);
    });

    it('flashes text color white then restores', async () => {
      const textObj = {
        setText: vi.fn(),
        setColor: vi.fn(),
      } as unknown as Phaser.GameObjects.Text;

      scene.tweens.add = vi.fn((config: Record<string, unknown>) => {
        if (typeof config.onComplete === 'function') {
          (config.onComplete as () => void)();
        }
        return { stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), isPlaying: vi.fn(() => false) };
      }) as unknown as typeof scene.tweens.add;

      await GameFeelPresets.numberRoll(scene, textObj, 0, 50);
      expect(textObj.setColor).toHaveBeenCalledWith('#ffffff');
    });

    it('skips flash and punch when disabled', async () => {
      const textObj = {
        setText: vi.fn(),
        setColor: vi.fn(),
      } as unknown as Phaser.GameObjects.Text;

      scene.tweens.add = vi.fn((config: Record<string, unknown>) => {
        if (typeof config.onComplete === 'function') {
          (config.onComplete as () => void)();
        }
        return { stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), destroy: vi.fn(), isPlaying: vi.fn(() => false) };
      }) as unknown as typeof scene.tweens.add;

      await GameFeelPresets.numberRoll(scene, textObj, 0, 100, { flash: false, punch: false });
      // Only 1 tween (the counter), no punch
      expect(scene.tweens.add).toHaveBeenCalledTimes(1);
      expect(textObj.setColor).not.toHaveBeenCalled();
    });
  });

  describe('slideTo', () => {
    it('tweens target to position', async () => {
      await GameFeelPresets.slideTo(scene, target, 200, 300);
      expect(scene.tweens.add).toHaveBeenCalledTimes(1);
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.x).toBe(200);
      expect(config.y).toBe(300);
      expect(config.duration).toBe(120);
      expect(config.ease).toBe('Cubic.easeOut');
    });

    it('respects custom duration and ease', async () => {
      await GameFeelPresets.slideTo(scene, target, 50, 50, { duration: 200, ease: 'Linear' });
      const config = (scene.tweens.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(config.duration).toBe(200);
      expect(config.ease).toBe('Linear');
    });

    it('returns a promise', async () => {
      const result = await GameFeelPresets.slideTo(scene, target, 0, 0);
      expect(result).toBeUndefined();
    });
  });
});
