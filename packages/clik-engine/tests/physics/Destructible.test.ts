import { describe, it, expect, vi } from 'vitest';
import { Destructible } from '../../src/physics/Destructible';

describe('Destructible', () => {
  it('starts at full health', () => {
    const d = new Destructible({ maxHealth: 100 });
    expect(d.currentHealth).toBe(100);
    expect(d.healthRatio).toBe(1);
    expect(d.isDestroyed).toBe(false);
  });

  it('takes damage', () => {
    const d = new Destructible({ maxHealth: 100 });
    const actual = d.damage(30);
    expect(actual).toBe(30);
    expect(d.currentHealth).toBe(70);
    expect(d.healthRatio).toBe(0.7);
  });

  it('caps damage at remaining health', () => {
    const d = new Destructible({ maxHealth: 50 });
    const actual = d.damage(100);
    expect(actual).toBe(50);
    expect(d.currentHealth).toBe(0);
    expect(d.isDestroyed).toBe(true);
  });

  it('fires onDamage callback', () => {
    const cb = vi.fn();
    const d = new Destructible({ maxHealth: 100, onDamage: cb });
    d.damage(25);
    expect(cb).toHaveBeenCalledWith(25, 75);
  });

  it('fires onDestroy callback at zero health', () => {
    const cb = vi.fn();
    const d = new Destructible({ maxHealth: 50, onDestroy: cb });
    d.damage(50);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('does not fire onDestroy for partial damage', () => {
    const cb = vi.fn();
    const d = new Destructible({ maxHealth: 100, onDestroy: cb });
    d.damage(50);
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires stage callbacks at thresholds', () => {
    const halfCb = vi.fn();
    const quarterCb = vi.fn();
    const d = new Destructible({
      maxHealth: 100,
      stages: [
        { threshold: 0.5, callback: halfCb },
        { threshold: 0.25, callback: quarterCb },
      ],
    });

    d.damage(40); // 60% remaining
    expect(halfCb).not.toHaveBeenCalled();

    d.damage(20); // 40% remaining → crosses 50%
    expect(halfCb).toHaveBeenCalledOnce();
    expect(quarterCb).not.toHaveBeenCalled();

    d.damage(20); // 20% remaining → crosses 25%
    expect(quarterCb).toHaveBeenCalledOnce();
  });

  it('does not re-fire stage callbacks', () => {
    const cb = vi.fn();
    const d = new Destructible({
      maxHealth: 100,
      stages: [{ threshold: 0.5, callback: cb }],
    });
    d.damage(60);
    d.damage(10);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('ignores damage after destroyed', () => {
    const d = new Destructible({ maxHealth: 50 });
    d.damage(50);
    expect(d.damage(10)).toBe(0);
  });

  it('ignores zero and negative damage', () => {
    const d = new Destructible({ maxHealth: 100 });
    expect(d.damage(0)).toBe(0);
    expect(d.damage(-5)).toBe(0);
    expect(d.currentHealth).toBe(100);
  });

  it('repairs damage', () => {
    const d = new Destructible({ maxHealth: 100 });
    d.damage(40);
    d.repair(20);
    expect(d.currentHealth).toBe(80);
  });

  it('repair caps at max health', () => {
    const d = new Destructible({ maxHealth: 100 });
    d.damage(10);
    d.repair(50);
    expect(d.currentHealth).toBe(100);
  });

  it('repair does not work after destroyed', () => {
    const d = new Destructible({ maxHealth: 50 });
    d.damage(50);
    d.repair(25);
    expect(d.currentHealth).toBe(0);
  });

  it('repair resets stage fired flags above threshold', () => {
    const cb = vi.fn();
    const d = new Destructible({
      maxHealth: 100,
      stages: [{ threshold: 0.5, callback: cb }],
    });
    d.damage(60); // triggers 50% stage
    expect(cb).toHaveBeenCalledOnce();

    d.repair(30); // back to 70% → above 50% threshold
    d.damage(30); // drops to 40% → triggers again
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('reset restores full health', () => {
    const d = new Destructible({ maxHealth: 100 });
    d.damage(100);
    expect(d.isDestroyed).toBe(true);

    d.reset();
    expect(d.currentHealth).toBe(100);
    expect(d.isDestroyed).toBe(false);
  });
});
