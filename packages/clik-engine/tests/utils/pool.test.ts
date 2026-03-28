import { describe, it, expect } from 'vitest';
import { ObjectPool } from '../../src/utils/pool';

describe('ObjectPool', () => {
  it('creates objects from factory', () => {
    const pool = new ObjectPool(() => ({ value: 0 }), (obj) => { obj.value = 0; });
    const obj = pool.acquire();
    expect(obj).toEqual({ value: 0 });
  });

  it('reuses released objects', () => {
    const pool = new ObjectPool(() => ({ value: 0 }), (obj) => { obj.value = 0; });
    const obj1 = pool.acquire();
    obj1.value = 42;
    pool.release(obj1);
    const obj2 = pool.acquire();
    expect(obj2).toBe(obj1); // same reference
    expect(obj2.value).toBe(0); // reset was called
  });

  it('tracks pool size', () => {
    const pool = new ObjectPool(() => ({}), () => {}, 5);
    expect(pool.size).toBe(5);
    pool.acquire();
    expect(pool.size).toBe(4);
  });

  it('creates new when pool empty', () => {
    const pool = new ObjectPool(() => ({ id: Math.random() }), () => {});
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a).not.toBe(b);
  });
});
