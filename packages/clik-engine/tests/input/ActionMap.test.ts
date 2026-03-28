import { describe, it, expect } from 'vitest';
import { ActionMap } from '../../src/input/ActionMap';

describe('ActionMap', () => {
  it('creates from config', () => {
    const map = new ActionMap({
      actions: {
        jump: { keys: ['SPACE', 'UP'], touch: 'tap' },
        left: { keys: ['LEFT', 'A'] },
      },
    });
    expect(map.has('jump')).toBe(true);
    expect(map.has('left')).toBe(true);
    expect(map.has('right')).toBe(false);
  });

  it('gets keys for an action', () => {
    const map = new ActionMap({ actions: { move: { keys: ['W', 'UP'] } } });
    expect(map.getKeys('move')).toEqual(['W', 'UP']);
  });

  it('gets touch binding', () => {
    const map = new ActionMap({ actions: { jump: { keys: [], touch: 'tap' } } });
    expect(map.getTouch('jump')).toBe('tap');
  });

  it('gets gamepad binding', () => {
    const map = new ActionMap({ actions: { fire: { keys: [], gamepad: '0' } } });
    expect(map.getGamepad('fire')).toBe('0');
  });

  it('returns empty for missing action', () => {
    const map = new ActionMap();
    expect(map.getKeys('missing')).toEqual([]);
    expect(map.getTouch('missing')).toBeUndefined();
  });

  it('lists all actions', () => {
    const map = new ActionMap({ actions: { a: { keys: [] }, b: { keys: [] }, c: { keys: [] } } });
    expect(map.allActions()).toEqual(['a', 'b', 'c']);
  });

  it('registers new actions', () => {
    const map = new ActionMap();
    map.register('dash', { keys: ['SHIFT'] });
    expect(map.has('dash')).toBe(true);
    expect(map.getKeys('dash')).toEqual(['SHIFT']);
  });

  it('rebinds existing actions', () => {
    const map = new ActionMap({ actions: { jump: { keys: ['SPACE'] } } });
    map.rebind('jump', { keys: ['W', 'UP'] });
    expect(map.getKeys('jump')).toEqual(['W', 'UP']);
  });

  it('rebind merges with existing', () => {
    const map = new ActionMap({ actions: { act: { keys: ['X'], touch: 'tap' } } });
    map.rebind('act', { keys: ['Z'] }); // Only change keys
    expect(map.getKeys('act')).toEqual(['Z']);
    expect(map.getTouch('act')).toBe('tap'); // Touch preserved
  });

  it('unregisters actions', () => {
    const map = new ActionMap({ actions: { temp: { keys: [] } } });
    map.unregister('temp');
    expect(map.has('temp')).toBe(false);
  });
});
