import { describe, it, expect } from 'vitest';
import { CollisionGroups } from '../../src/physics/CollisionGroups';

describe('CollisionGroups', () => {
  it('creates unique categories', () => {
    const groups = new CollisionGroups();
    const a = groups.create('player');
    const b = groups.create('enemy');
    expect(a).not.toBe(b);
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('gets category by name', () => {
    const groups = new CollisionGroups();
    groups.create('bullet');
    expect(groups.get('bullet')).toBe(1);
    expect(groups.get('unknown')).toBe(0);
  });

  it('sets collision masks', () => {
    const groups = new CollisionGroups();
    groups.create('player');
    groups.create('enemy');
    groups.create('bullet');
    groups.setCollides('bullet', ['enemy']); // Bullets only hit enemies

    expect(groups.canCollide('bullet', 'enemy')).toBe(true);
    // bullet mask doesn't include player, but player default mask includes everything
    const bulletMask = groups.getMask('bullet');
    expect(bulletMask & groups.get('player')).toBe(0);
    expect(bulletMask & groups.get('enemy')).not.toBe(0);
  });

  it('adds and removes collision', () => {
    const groups = new CollisionGroups();
    groups.create('a');
    groups.create('b');
    groups.setCollides('a', []);
    expect(groups.getMask('a')).toBe(0);

    groups.addCollision('a', 'b');
    expect(groups.getMask('a') & groups.get('b')).not.toBe(0);

    groups.removeCollision('a', 'b');
    expect(groups.getMask('a') & groups.get('b')).toBe(0);
  });

  it('gets filter for Matter.js', () => {
    const groups = new CollisionGroups();
    groups.create('player');
    const filter = groups.getFilter('player');
    expect(filter.category).toBe(1);
    expect(filter.mask).toBe(0xffffffff);
  });

  it('lists all names', () => {
    const groups = new CollisionGroups();
    groups.create('a');
    groups.create('b');
    groups.create('c');
    expect(groups.getNames()).toEqual(['a', 'b', 'c']);
  });

  it('limits to 32 categories', () => {
    const groups = new CollisionGroups();
    for (let i = 0; i < 32; i++) groups.create(`cat${i}`);
    expect(() => groups.create('overflow')).toThrow();
  });
});
