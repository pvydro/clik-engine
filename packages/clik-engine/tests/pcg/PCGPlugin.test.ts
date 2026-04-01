import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { PCGPlugin } from '../../src/pcg/PCGPlugin';

describe('PCGPlugin', () => {
  let plugin: PCGPlugin;
  const mockGame = {
    config: { physics: {} },
  } as unknown as Phaser.Game;

  beforeEach(() => {
    plugin = new PCGPlugin();
  });

  afterEach(() => {
    plugin.destroy();
  });

  it('has correct metadata', () => {
    expect(plugin.name).toBe('PCGPlugin');
    expect(plugin.version).toBe('1.0.0');
  });

  it('exposes a registry', () => {
    expect(plugin.registry).toBeDefined();
    expect(plugin.registry.listGenerators()).toEqual([]);
  });

  it('registers built-in generators on init', () => {
    plugin.init(mockGame);
    const generators = plugin.registry.listGenerators();
    expect(generators).toContain('dungeon');
    expect(generators).toContain('platformer');
    expect(generators).toContain('arena');
  });

  it('registers built-in constraints on init', () => {
    plugin.init(mockGame);
    const constraints = plugin.registry.listConstraints();
    expect(constraints).toContain('reachability');
    expect(constraints).toContain('entity-density');
    expect(constraints).toContain('difficulty');
  });

  it('cleans up global reference on destroy', () => {
    (globalThis as Record<string, unknown>).__CLIK_PCG = plugin.registry;
    plugin.destroy();
    expect((globalThis as Record<string, unknown>).__CLIK_PCG).toBeUndefined();
  });
});
