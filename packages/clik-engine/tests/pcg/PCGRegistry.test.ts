import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { log: vi.fn() },
  ClikLogChannel: { ENGINE: 'CLIK:ENGINE' },
}));

import { PCGRegistry } from '../../src/pcg/PCGRegistry';
import { Grid2D } from '../../src/utils/structures';
import { TileType } from '../../src/pcg/PCGTypes';
import type { LevelGenerator, LevelConstraint, GeneratedLevel, PCGConfig } from '../../src/pcg/PCGTypes';
import { SeededRandom } from '../../src/utils/random';

function makeMockLevel(config: PCGConfig, random: SeededRandom): GeneratedLevel {
  const grid = new Grid2D<TileType>(config.width, config.height, TileType.FLOOR);
  return {
    grid,
    entities: [{ type: 'enemy', x: 5, y: 5 }],
    spawn: { x: 1, y: 1 },
    exit: { x: config.width - 2, y: config.height - 2 },
    metadata: { seed: 0, generator: 'mock', difficulty: config.difficulty ?? 5, generationTimeMs: 0 },
  };
}

const mockGenerator: LevelGenerator = {
  name: 'mock',
  generate: (config, random) => makeMockLevel(config, random),
};

describe('PCGRegistry', () => {
  let registry: PCGRegistry;

  beforeEach(() => {
    registry = new PCGRegistry();
  });

  it('registers and retrieves generators', () => {
    registry.registerGenerator('mock', mockGenerator);
    expect(registry.getGenerator('mock')).toBe(mockGenerator);
  });

  it('lists registered generators', () => {
    registry.registerGenerator('a', mockGenerator);
    registry.registerGenerator('b', mockGenerator);
    expect(registry.listGenerators()).toEqual(['a', 'b']);
  });

  it('registers and retrieves constraints', () => {
    const constraint: LevelConstraint = {
      name: 'test',
      validate: () => ({ passed: true, message: 'ok' }),
    };
    registry.registerConstraint('test', constraint);
    expect(registry.getConstraint('test')).toBe(constraint);
  });

  it('lists registered constraints', () => {
    const c1: LevelConstraint = { name: 'a', validate: () => ({ passed: true, message: '' }) };
    const c2: LevelConstraint = { name: 'b', validate: () => ({ passed: true, message: '' }) };
    registry.registerConstraint('a', c1);
    registry.registerConstraint('b', c2);
    expect(registry.listConstraints()).toEqual(['a', 'b']);
  });

  it('generates a level without constraints', () => {
    registry.registerGenerator('mock', mockGenerator);
    const level = registry.generate('mock', { width: 20, height: 20 });
    expect(level.grid.width).toBe(20);
    expect(level.grid.height).toBe(20);
    expect(level.spawn).toEqual({ x: 1, y: 1 });
  });

  it('throws on unknown generator', () => {
    expect(() => registry.generate('nope', { width: 10, height: 10 })).toThrow('Unknown generator');
  });

  it('throws on unknown constraint', () => {
    registry.registerGenerator('mock', mockGenerator);
    expect(() => registry.generate('mock', { width: 10, height: 10 }, ['nope'])).toThrow('Unknown constraint');
  });

  it('validates constraints after generation', () => {
    const validate = vi.fn(() => ({ passed: true, message: 'ok' }));
    registry.registerGenerator('mock', mockGenerator);
    registry.registerConstraint('test', { name: 'test', validate });
    registry.generate('mock', { width: 10, height: 10 }, ['test']);
    expect(validate).toHaveBeenCalled();
  });

  it('retries on constraint failure', () => {
    let callCount = 0;
    registry.registerGenerator('mock', mockGenerator);
    registry.registerConstraint('fail-once', {
      name: 'fail-once',
      validate: () => {
        callCount++;
        if (callCount <= 1) return { passed: false, message: 'fail' };
        return { passed: true, message: 'ok' };
      },
    });

    const level = registry.generate('mock', { width: 10, height: 10, seed: 42 }, ['fail-once']);
    expect(level).toBeDefined();
    expect(callCount).toBeGreaterThan(1);
  });

  it('returns level after max retries exceeded', () => {
    registry.registerGenerator('mock', mockGenerator);
    registry.registerConstraint('always-fail', {
      name: 'always-fail',
      validate: () => ({ passed: false, message: 'nope' }),
    });

    // Should not throw — returns last attempt
    const level = registry.generate('mock', { width: 10, height: 10 }, ['always-fail']);
    expect(level).toBeDefined();
  });

  it('calls repair on failed constraint', () => {
    const repair = vi.fn((level) => level);
    registry.registerGenerator('mock', mockGenerator);
    registry.registerConstraint('repairable', {
      name: 'repairable',
      validate: () => ({ passed: false, message: 'fail' }),
      repair,
    });

    registry.generate('mock', { width: 10, height: 10 }, ['repairable']);
    expect(repair).toHaveBeenCalled();
  });

  it('uses provided seed for determinism', () => {
    registry.registerGenerator('mock', mockGenerator);
    const level = registry.generate('mock', { width: 10, height: 10, seed: 123 });
    expect(level.metadata.seed).toBe(123);
  });

  it('defaults difficulty to 5', () => {
    registry.registerGenerator('mock', mockGenerator);
    const level = registry.generate('mock', { width: 10, height: 10 });
    expect(level.metadata.difficulty).toBe(5);
  });
});
