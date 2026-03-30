import { describe, it, expect, vi } from 'vitest';
import { Timer } from '../../../src/entity/components/Timer';
import { makeEntityMock } from '../../helpers/TestScene';

function makeTimer() {
  const t = new Timer();
  t.entity = makeEntityMock() as never;
  return t;
}

describe('Timer', () => {
  it('after() fires callback once after duration', () => {
    const t = makeTimer();
    const cb = vi.fn();
    t.after('shot', 1000, cb);
    t.update(999);
    expect(cb).not.toHaveBeenCalled();
    t.update(1);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('after() removes timer after firing', () => {
    const t = makeTimer();
    t.after('x', 100, vi.fn());
    t.update(200);
    expect(t.hasTimer('x')).toBe(false);
  });

  it('every() fires repeatedly', () => {
    const t = makeTimer();
    const cb = vi.fn();
    t.every('tick', 500, cb);
    t.update(500);
    expect(cb).toHaveBeenCalledTimes(1);
    t.update(500);
    expect(cb).toHaveBeenCalledTimes(2);
    t.update(500);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('every() keeps timer alive after firing', () => {
    const t = makeTimer();
    t.every('tick', 100, vi.fn());
    t.update(200);
    expect(t.hasTimer('tick')).toBe(true);
  });

  it('cancel() stops a running timer', () => {
    const t = makeTimer();
    const cb = vi.fn();
    t.after('boom', 1000, cb);
    t.cancel('boom');
    t.update(2000);
    expect(cb).not.toHaveBeenCalled();
    expect(t.hasTimer('boom')).toBe(false);
  });

  it('cancelAll() stops all timers', () => {
    const t = makeTimer();
    const cbA = vi.fn();
    const cbB = vi.fn();
    t.after('a', 100, cbA);
    t.every('b', 100, cbB);
    t.cancelAll();
    t.update(500);
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).not.toHaveBeenCalled();
  });

  it('hasTimer() returns false for unknown name', () => {
    expect(makeTimer().hasTimer('unknown')).toBe(false);
  });

  it('hasTimer() returns true for existing timer', () => {
    const t = makeTimer();
    t.after('x', 1000, vi.fn());
    expect(t.hasTimer('x')).toBe(true);
  });

  it('after() returns this for chaining', () => {
    const t = makeTimer();
    expect(t.after('x', 100, vi.fn())).toBe(t);
  });

  it('every() returns this for chaining', () => {
    const t = makeTimer();
    expect(t.every('y', 100, vi.fn())).toBe(t);
  });

  it('onDetach clears all timers', () => {
    const t = makeTimer();
    const cb = vi.fn();
    t.after('a', 100, cb);
    t.onDetach();
    t.update(500);
    expect(cb).not.toHaveBeenCalled();
  });
});
