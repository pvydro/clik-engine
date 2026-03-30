import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn() },
}));

import { Lifetime } from '../../../src/entity/components/Lifetime';
import { makeEntityMock } from '../../helpers/TestScene';

function makeLifetime(durationMs: number, fadeOut = false) {
  const l = new Lifetime(durationMs, fadeOut);
  l.entity = makeEntityMock() as never;
  return l;
}

describe('Lifetime', () => {
  it('getRemaining starts at full duration', () => {
    expect(makeLifetime(2000).getRemaining()).toBe(2000);
  });

  it('getRatio starts at 1', () => {
    expect(makeLifetime(1000).getRatio()).toBe(1);
  });

  it('update reduces remaining', () => {
    const l = makeLifetime(1000);
    l.update(400);
    expect(l.getRemaining()).toBe(600);
  });

  it('getRemaining clamps to 0', () => {
    const l = makeLifetime(500);
    l.update(1000);
    expect(l.getRemaining()).toBe(0);
  });

  it('entity is destroyed when remaining hits zero', () => {
    const l = makeLifetime(500);
    l.update(500);
    expect(l.entity.destroy).toHaveBeenCalled();
  });

  it('entity is not destroyed before expiry', () => {
    const l = makeLifetime(500);
    l.update(400);
    expect(l.entity.destroy).not.toHaveBeenCalled();
  });

  it('onExpire callback fires on expiry', () => {
    const cb = vi.fn();
    const l = makeLifetime(100);
    l.onExpire(cb);
    l.update(100);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('extend adds time', () => {
    const l = makeLifetime(1000);
    l.update(800);
    l.extend(500);
    expect(l.getRemaining()).toBe(700);
  });

  it('reset restores full duration', () => {
    const l = makeLifetime(1000);
    l.update(900);
    l.reset();
    expect(l.getRemaining()).toBe(1000);
  });

  it('fadeOut reduces entity alpha as lifetime drains', () => {
    const l = makeLifetime(1000, true);
    l.update(500); // 50% through
    const alpha = (l.entity as { alpha: number }).alpha;
    expect(alpha).toBeCloseTo(0.5, 1);
  });

  it('onExpire returns this for chaining', () => {
    const l = makeLifetime(100);
    expect(l.onExpire(vi.fn())).toBe(l);
  });
});
