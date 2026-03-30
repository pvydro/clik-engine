import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { PluginManager } from '../../src/plugin/PluginManager';
import { ConsoleReporter } from '../../src/debug/ConsoleReporter';
import type { ClikPlugin, ClikScenePlugin, ClikPluginConfig } from '../../src/plugin/ClikPlugin';

function makePlugin(name: string, deps?: string[]): ClikPlugin {
  return {
    name,
    version: '1.0.0',
    dependencies: deps,
    init: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeScenePlugin(name: string): ClikScenePlugin {
  return {
    name,
    version: '1.0.0',
    init: vi.fn(),
    destroy: vi.fn(),
    onSceneCreate: vi.fn(),
    onSceneUpdate: vi.fn(),
    onSceneShutdown: vi.fn(),
  };
}

describe('PluginManager', () => {
  let pm: PluginManager;
  let game: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    pm = new PluginManager();
    game = { registry: { get: vi.fn(), set: vi.fn() } };
  });

  it('registers plugins', () => {
    const p1 = makePlugin('p1');
    pm.register([{ plugin: p1 }]);
    expect(pm.getAll()).toHaveLength(1);
    expect(pm.get('p1')).toBe(p1);
  });

  it('rejects duplicate names', () => {
    const p1 = makePlugin('dup');
    pm.register([{ plugin: p1 }, { plugin: makePlugin('dup') }]);
    expect(pm.getAll()).toHaveLength(1);
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'dup' is already registered"),
      expect.any(String)
    );
  });

  it('validates dependencies exist', () => {
    const p1 = makePlugin('p1', ['missing']);
    pm.register([{ plugin: p1 }]);
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("depends on 'missing'"),
      expect.any(String)
    );
  });

  it('accepts valid dependencies', () => {
    const p1 = makePlugin('base');
    const p2 = makePlugin('ext', ['base']);
    pm.register([{ plugin: p1 }, { plugin: p2 }]);
    expect(pm.getAll()).toHaveLength(2);
  });

  it('initializes all plugins', () => {
    const p1 = makePlugin('p1');
    const p2 = makePlugin('p2');
    const configs: ClikPluginConfig[] = [
      { plugin: p1, config: { foo: 1 } },
      { plugin: p2 },
    ];
    pm.register(configs);
    pm.init(game as import('phaser').default.Game, configs);

    expect(p1.init).toHaveBeenCalledWith(game, { foo: 1 });
    expect(p2.init).toHaveBeenCalledWith(game, undefined);
  });

  it('isolates init errors', () => {
    const bad = makePlugin('bad');
    (bad.init as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('boom'); });
    const good = makePlugin('good');

    const configs: ClikPluginConfig[] = [{ plugin: bad }, { plugin: good }];
    pm.register(configs);
    pm.init(game as import('phaser').default.Game, configs);

    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'bad' failed to initialize"),
      expect.any(String)
    );
    expect(good.init).toHaveBeenCalled();
  });

  it('dispatches scene hooks', () => {
    const sp = makeScenePlugin('sp');
    pm.register([{ plugin: sp }]);

    const scene = {} as import('../../src/scenes/BaseScene').BaseScene;
    pm.onSceneCreate(scene);
    expect(sp.onSceneCreate).toHaveBeenCalledWith(scene);

    pm.onSceneUpdate(scene, 100, 16);
    expect(sp.onSceneUpdate).toHaveBeenCalledWith(scene, 100, 16);

    pm.onSceneShutdown(scene);
    expect(sp.onSceneShutdown).toHaveBeenCalledWith(scene);
  });

  it('isolates scene hook errors', () => {
    const sp = makeScenePlugin('sp');
    (sp.onSceneCreate as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('nope'); });
    pm.register([{ plugin: sp }]);

    const scene = {} as import('../../src/scenes/BaseScene').BaseScene;
    pm.onSceneCreate(scene);

    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'sp' error in onSceneCreate")
    );
  });

  it('does not dispatch scene hooks to non-scene plugins', () => {
    const p = makePlugin('p');
    pm.register([{ plugin: p }]);

    const scene = {} as import('../../src/scenes/BaseScene').BaseScene;
    pm.onSceneCreate(scene);
    // No error, no crash — just skipped
  });

  it('destroys plugins in reverse order', () => {
    const order: string[] = [];
    const p1 = makePlugin('first');
    (p1.destroy as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('first'));
    const p2 = makePlugin('second');
    (p2.destroy as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('second'));

    pm.register([{ plugin: p1 }, { plugin: p2 }]);
    pm.destroy();

    expect(order).toEqual(['second', 'first']);
    expect(pm.getAll()).toHaveLength(0);
  });

  it('isolates destroy errors', () => {
    const bad = makePlugin('bad');
    (bad.destroy as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error('fail'); });
    const good = makePlugin('good');

    pm.register([{ plugin: bad }, { plugin: good }]);
    pm.destroy();

    expect(good.destroy).toHaveBeenCalled();
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'bad' error in destroy")
    );
  });
});
