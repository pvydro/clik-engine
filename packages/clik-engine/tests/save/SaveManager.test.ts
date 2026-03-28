import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    save: vi.fn(),
    error: vi.fn(),
  },
}));

import { SaveManager } from '../../src/save/SaveManager';

// Mock localStorage
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('SaveManager', () => {
  let save: SaveManager;

  beforeEach(() => {
    storage.clear();
    save = new SaveManager('test-game', { slots: 3, version: 1 });
  });

  it('saves and loads data', () => {
    save.save(0, { score: 100, level: 3 });
    const data = save.load(0);
    expect(data).toEqual({ score: 100, level: 3 });
  });

  it('returns null for empty slot', () => {
    expect(save.load(0)).toBeNull();
  });

  it('rejects out-of-range slots', () => {
    expect(save.save(-1, {})).toBe(false);
    expect(save.save(3, {})).toBe(false);
    expect(save.load(5)).toBeNull();
  });

  it('deletes a save', () => {
    save.save(0, { test: true });
    expect(save.hasSave(0)).toBe(true);
    save.delete(0);
    expect(save.hasSave(0)).toBe(false);
  });

  it('lists occupied slots', () => {
    save.save(0, { a: 1 });
    save.save(2, { b: 2 });
    const slots = save.listSlots();
    expect(slots).toHaveLength(2);
    expect(slots[0].slot).toBe(0);
    expect(slots[1].slot).toBe(2);
  });

  it('stores version and timestamp', () => {
    save.save(0, {});
    const slots = save.listSlots();
    expect(slots[0].version).toBe(1);
    expect(slots[0].timestamp).toBeGreaterThan(0);
  });
});
