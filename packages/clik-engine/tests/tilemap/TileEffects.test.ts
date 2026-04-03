import { describe, it, expect, vi } from 'vitest';
import { TileEffects } from '../../src/tilemap/TileEffects';

function makeEntity() { return { active: true } as any; }

describe('TileEffects', () => {
  it('fires onEnter on first match', () => {
    const effects = new TileEffects();
    const enter = vi.fn();
    effects.register({ property: 'hazard', value: true, onEnter: enter });
    const e = makeEntity();
    effects.check(e, { hazard: true }, 5, 3, 16);
    expect(enter).toHaveBeenCalledWith(e, 5, 3);
  });

  it('fires onStay on subsequent frames', () => {
    const effects = new TileEffects();
    const stay = vi.fn();
    effects.register({ property: 'hazard', value: true, onStay: stay });
    const e = makeEntity();
    effects.check(e, { hazard: true }, 5, 3, 16); // enter
    effects.check(e, { hazard: true }, 5, 3, 16); // stay
    expect(stay).toHaveBeenCalledOnce();
  });

  it('fires onExit when leaving', () => {
    const effects = new TileEffects();
    const exit = vi.fn();
    effects.register({ property: 'ice', value: true, onExit: exit });
    const e = makeEntity();
    effects.check(e, { ice: true }, 5, 3, 16);
    effects.check(e, {}, 6, 3, 16); // no ice
    expect(exit).toHaveBeenCalledWith(e, 6, 3);
  });

  it('matches truthy when no value specified', () => {
    const effects = new TileEffects();
    const enter = vi.fn();
    effects.register({ property: 'slow', onEnter: enter });
    const e = makeEntity();
    effects.check(e, { slow: 0.5 }, 1, 1, 16);
    expect(enter).toHaveBeenCalled();
  });

  it('does not match when property is falsy', () => {
    const effects = new TileEffects();
    const enter = vi.fn();
    effects.register({ property: 'slow', onEnter: enter });
    const e = makeEntity();
    effects.check(e, { slow: 0 }, 1, 1, 16);
    expect(enter).not.toHaveBeenCalled();
  });

  it('unregister removes effects', () => {
    const effects = new TileEffects();
    effects.register({ property: 'hazard', onEnter: vi.fn() });
    effects.unregister('hazard');
    expect(effects.effectCount).toBe(0);
  });

  it('removeEntity clears tracking', () => {
    const effects = new TileEffects();
    effects.register({ property: 'x', onEnter: vi.fn() });
    const e = makeEntity();
    effects.check(e, { x: true }, 0, 0, 16);
    effects.removeEntity(e);
    // Should fire onEnter again (not onStay)
    const enter2 = vi.fn();
    effects.register({ property: 'x', onEnter: enter2 });
    effects.check(e, { x: true }, 0, 0, 16);
  });

  it('getRegisteredProperties returns all', () => {
    const effects = new TileEffects();
    effects.register({ property: 'a' });
    effects.register({ property: 'b' });
    expect(effects.getRegisteredProperties()).toContain('a');
    expect(effects.getRegisteredProperties()).toContain('b');
  });

  it('clear removes everything', () => {
    const effects = new TileEffects();
    effects.register({ property: 'a' });
    effects.clear();
    expect(effects.effectCount).toBe(0);
  });
});
