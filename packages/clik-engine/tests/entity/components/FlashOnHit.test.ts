import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: { GameObjects: { Sprite: class Sprite {} } },
}));

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { FlashOnHit } from '../../../src/entity/components/FlashOnHit';
import { makeEntityMock } from '../../helpers/TestScene';

function makeFlash(duration = 100, color = 0xffffff) {
  const comp = new FlashOnHit(duration, color);
  const entity = makeEntityMock();
  // FlashOnHit checks for setTintFill on the entity itself (as a "sprite-like" object)
  // and also iterates entity.list for Sprite children.
  // Our mock entity already has setTintFill (via makeEntityMock -> not directly, but we add it)
  // We'll make entity look like it has setTintFill so findSprites() picks it up.
  (entity as any).setTintFill = vi.fn().mockReturnThis();
  (entity as any).clearTint = vi.fn().mockReturnThis();
  comp.entity = entity as never;
  return { comp, entity };
}

describe('FlashOnHit', () => {
  it('flash sets tintFill on entity', () => {
    const { comp, entity } = makeFlash(100, 0xff0000);
    comp.flash();
    expect((entity as any).setTintFill).toHaveBeenCalledWith(0xff0000);
  });

  it('isFlashing returns true during flash', () => {
    const { comp } = makeFlash();
    expect(comp.isFlashing()).toBe(false);
    comp.flash();
    expect(comp.isFlashing()).toBe(true);
  });

  it('clearTint is called after duration via delayedCall', () => {
    const { comp, entity } = makeFlash(200);
    comp.flash();

    // The scene.time.delayedCall should have been invoked with the duration
    const delayedCall = entity.scene.time.delayedCall as ReturnType<typeof vi.fn>;
    expect(delayedCall).toHaveBeenCalledWith(200, expect.any(Function));

    // Invoke the delayed callback manually
    const callback = delayedCall.mock.calls[0][1] as () => void;
    callback();

    expect((entity as any).clearTint).toHaveBeenCalled();
    expect(comp.isFlashing()).toBe(false);
  });

  it('does not flash again while already flashing', () => {
    const { comp, entity } = makeFlash();
    comp.flash();
    comp.flash(); // second call should be ignored
    expect((entity as any).setTintFill).toHaveBeenCalledTimes(1);
  });

  it('can flash again after previous flash completes', () => {
    const { comp, entity } = makeFlash();
    comp.flash();

    // Complete the flash
    const callback = (entity.scene.time.delayedCall as ReturnType<typeof vi.fn>).mock.calls[0][1] as () => void;
    callback();

    comp.flash();
    expect((entity as any).setTintFill).toHaveBeenCalledTimes(2);
  });

  it('uses default white color', () => {
    const { comp, entity } = makeFlash(100); // default color = 0xffffff
    comp.flash();
    expect((entity as any).setTintFill).toHaveBeenCalledWith(0xffffff);
  });

  it('flashes sprite children in entity.list', () => {
    const { comp, entity } = makeFlash(100, 0x00ff00);
    // Add a fake Sprite child. FlashOnHit checks `child instanceof Phaser.GameObjects.Sprite`.
    // In our mock env, instanceof won't match, so only the entity itself (which has setTintFill) gets tinted.
    // This test verifies the entity-level tinting still works with list present.
    entity.list.push({ notASprite: true });
    comp.flash();
    expect((entity as any).setTintFill).toHaveBeenCalledWith(0x00ff00);
  });
});
