import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn() },
}));

import { Collectible } from '../../../src/entity/components/Collectible';
import { makeEntityMock } from '../../helpers/TestScene';

const collector = {} as Phaser.GameObjects.GameObject;

function makeCollectible(type = 'coin', value = 1) {
  const c = new Collectible(type, value);
  c.entity = makeEntityMock() as never;
  return c;
}

describe('Collectible', () => {
  it('getType and getValue return constructor args', () => {
    const c = makeCollectible('gem', 5);
    expect(c.getType()).toBe('gem');
    expect(c.getValue()).toBe(5);
  });

  it('isCollected starts false', () => {
    expect(makeCollectible().isCollected()).toBe(false);
  });

  it('collect() returns true on first call', () => {
    expect(makeCollectible().collect(collector)).toBe(true);
  });

  it('collect() returns false on second call', () => {
    const c = makeCollectible();
    c.collect(collector);
    expect(c.collect(collector)).toBe(false);
  });

  it('collect() sets isCollected to true', () => {
    const c = makeCollectible();
    c.collect(collector);
    expect(c.isCollected()).toBe(true);
  });

  it('collect() fires the onCollect callback', () => {
    const cb = vi.fn();
    const c = makeCollectible();
    c.onCollect(cb);
    c.collect(collector);
    expect(cb).toHaveBeenCalledWith(collector);
  });

  it('onCollect callback does not fire on double-collect', () => {
    const cb = vi.fn();
    const c = makeCollectible();
    c.onCollect(cb);
    c.collect(collector);
    c.collect(collector);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('reset() allows re-collection', () => {
    const c = makeCollectible();
    c.collect(collector);
    c.reset();
    expect(c.isCollected()).toBe(false);
    expect(c.collect(collector)).toBe(true);
  });

  it('onCollect returns this for chaining', () => {
    const c = makeCollectible();
    expect(c.onCollect(vi.fn())).toBe(c);
  });
});
