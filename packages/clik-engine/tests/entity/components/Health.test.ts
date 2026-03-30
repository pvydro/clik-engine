import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn() },
}));

import { Health } from '../../../src/entity/components/Health';
import { makeEntityMock } from '../../helpers/TestScene';

function makeHealth(max = 100) {
  const h = new Health(max);
  h.entity = makeEntityMock() as never;
  return h;
}

describe('Health', () => {
  it('initialises current and max', () => {
    const h = makeHealth(80);
    expect(h.max).toBe(80);
    expect(h.current).toBe(80);
  });

  it('damage reduces current', () => {
    const h = makeHealth(100);
    h.damage(30);
    expect(h.current).toBe(70);
  });

  it('damage clamps to 0', () => {
    const h = makeHealth(100);
    h.damage(200);
    expect(h.current).toBe(0);
  });

  it('damage is ignored when already dead', () => {
    const h = makeHealth(100);
    h.damage(100); // kill
    h.damage(50);  // should have no effect
    expect(h.current).toBe(0);
  });

  it('heal increases current', () => {
    const h = makeHealth(100);
    h.damage(50);
    h.heal(20);
    expect(h.current).toBe(70);
  });

  it('heal clamps to max', () => {
    const h = makeHealth(100);
    h.heal(200);
    expect(h.current).toBe(100);
  });

  it('isDead is false while alive', () => {
    expect(makeHealth(100).isDead).toBe(false);
  });

  it('isDead is true at zero', () => {
    const h = makeHealth(10);
    h.damage(10);
    expect(h.isDead).toBe(true);
  });

  it('ratio returns current/max', () => {
    const h = makeHealth(100);
    h.damage(25);
    expect(h.ratio).toBeCloseTo(0.75);
  });

  it('onDeath callback fires when health reaches zero', () => {
    const cb = vi.fn();
    const h = makeHealth(10);
    h.onDeath(cb);
    h.damage(10);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('onDeath callback does not fire for partial damage', () => {
    const cb = vi.fn();
    const h = makeHealth(100);
    h.onDeath(cb);
    h.damage(50);
    expect(cb).not.toHaveBeenCalled();
  });

  it('onDamage callback receives amount and remaining', () => {
    const cb = vi.fn();
    const h = makeHealth(100);
    h.onDamage(cb);
    h.damage(30);
    expect(cb).toHaveBeenCalledWith(30, 70);
  });

  it('reset restores current to max', () => {
    const h = makeHealth(100);
    h.damage(80);
    h.reset();
    expect(h.current).toBe(100);
  });

  it('onDeath returns this for chaining', () => {
    const h = makeHealth(100);
    expect(h.onDeath(vi.fn())).toBe(h);
  });

  it('onDamage returns this for chaining', () => {
    const h = makeHealth(100);
    expect(h.onDamage(vi.fn())).toBe(h);
  });
});
