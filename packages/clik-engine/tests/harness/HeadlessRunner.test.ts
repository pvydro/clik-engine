import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser with a tiny fake Game whose `loop.step` and `events.once('ready')`
// behave like the real thing. The runner only touches a small surface area.
vi.mock('phaser', () => {
  class MockGame {
    _reg = new Map<string, unknown>();
    registry = {
      set: (k: string, v: unknown) => { (this as any)._reg.set(k, v); },
      get: (k: string) => (this as any)._reg.get(k),
    };
    events = {
      _ready: false as unknown,
      _readyCb: null as null | (() => void),
      _destroyCb: null as null | (() => void),
      once(name: string, cb: () => void) {
        if (name === 'ready') {
          // Fire on next microtask to mimic Phaser
          this._readyCb = cb;
          queueMicrotask(() => cb());
        } else if (name === 'destroy') {
          this._destroyCb = cb;
        }
      },
    };
    scene = {
      start: vi.fn(),
      bringToTop: vi.fn(),
      scenes: [
        {
          sys: { settings: { key: 'main' }, isActive: () => true },
        },
      ],
    };
    loop = {
      sleep: vi.fn(),
      stop: vi.fn(),
      step: vi.fn(),
    };
    headlessStep = vi.fn();
    renderer = { type: 1 }; // 1 = WEBGL placeholder, prevents READY warning path
    destroy = vi.fn();
  }
  return {
    default: {
      Game: MockGame,
      Scene: class {},
      AUTO: 0,
      HEADLESS: 1,
      Scale: { FIT: 1, CENTER_BOTH: 2 },
      Core: { Events: { READY: 'ready' } },
      Input: { Keyboard: { KeyCodes: {} } },
      Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
    },
  };
});

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    engine: vi.fn(),
    error: vi.fn(),
    input: vi.fn(),
    harness: vi.fn(),
    log: vi.fn(),
  },
  ClikLogChannel: {},
}));

vi.mock('../../src/debug/DebugOverlay', () => ({ DebugOverlay: class {} }));
vi.mock('../../src/debug/StateInspector', () => ({ StateInspector: class {} }));
vi.mock('../../src/debug/GridOverlay', () => ({ GridOverlay: class {} }));
vi.mock('../../src/debug/DebugConsole', () => ({ DebugConsole: class {} }));

import Phaser from 'phaser';
import { HeadlessRunner } from '../../src/harness/HeadlessRunner';
import { ScriptedStrategy } from '../../src/harness/strategies/ScriptedStrategy';
import { RandomFuzzStrategy } from '../../src/harness/strategies/RandomFuzzStrategy';
import { HarnessRunner } from '../../src/harness/HarnessRunner';
import type { ClikGameConfig } from '../../src/utils/types';

class DummyScene extends (Phaser as unknown as { Scene: new () => unknown }).Scene {}

function makeConfig(): ClikGameConfig {
  return {
    name: 'harness-test',
    scenes: [{ key: 'main', class: DummyScene as unknown as ClikGameConfig['scenes'][0]['class'], default: true }],
    input: {
      actions: {
        jump: { keys: ['SPACE'] },
        left: { keys: ['LEFT'] },
        right: { keys: ['RIGHT'] },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HeadlessRunner', () => {
  it('boots, advances frames, and tears down cleanly', async () => {
    const runner = new HeadlessRunner({
      config: makeConfig(),
      seed: 42,
      scenario: {
        strategy: { beforeFrame() {} },
        maxFrames: 600,
      },
    });
    await runner.boot();
    const result = await runner.runUntilDone();
    expect(result.ok).toBe(true);
    expect(result.frames).toBe(600);
    expect(result.seed).toBe(42);
    runner.destroy();
  });

  it('forces headless and injects ScriptedProvider into the InputManager', async () => {
    const runner = new HeadlessRunner({
      config: makeConfig(),
      seed: 1,
      scenario: { strategy: { beforeFrame() {} }, maxFrames: 1 },
    });
    await runner.boot();
    const inputManager = runner.game.registry.get('__clikInputManager') as
      | { getExtraProviders(): unknown[] }
      | undefined;
    expect(inputManager).toBeDefined();
    expect(inputManager!.getExtraProviders()).toContain(runner.scripted);
    runner.destroy();
  });

  it('aborts when shouldAbort returns a string', async () => {
    const runner = new HeadlessRunner({
      config: makeConfig(),
      seed: 1,
      scenario: {
        strategy: { beforeFrame() {} },
        maxFrames: 100,
        shouldAbort: ctx => (ctx.frame >= 5 ? 'reached-five' : false),
      },
    });
    const result = await runner.runUntilDone();
    expect(result.frames).toBe(5);
    expect(result.abortReason).toBe('reached-five');
    runner.destroy();
  });

  it('captures errors thrown by game.loop.step into the result', async () => {
    const runner = new HeadlessRunner({
      config: makeConfig(),
      seed: 1,
      scenario: { strategy: { beforeFrame() {} }, maxFrames: 10 },
    });
    await runner.boot();
    ((runner.game as unknown as { headlessStep: ReturnType<typeof vi.fn> }).headlessStep).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const result = await runner.runUntilDone();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('boom');
    runner.destroy();
  });

  it('finalSnapshot pulls inspector data from the registry-backed store', async () => {
    const runner = new HeadlessRunner({
      config: makeConfig(),
      seed: 1,
      scenario: {
        strategy: {
          init(ctx) {
            // Simulate BaseScene.inspectState() populating the harness store
            const map = new Map<string, Map<string, () => Record<string, unknown>>>();
            const labels = new Map<string, () => Record<string, unknown>>();
            labels.set('stats', () => ({ score: 7 }));
            map.set('main', labels);
            ctx.game.registry.set('__clikHarnessInspectors', map);
          },
          beforeFrame() {},
        },
        maxFrames: 1,
      },
    });
    const result = await runner.runUntilDone();
    expect(result.finalSnapshot).toBeDefined();
    expect((result.finalSnapshot as { main: { stats: { score: number } } }).main).toEqual({ stats: { score: 7 } });
    runner.destroy();
  });

  it('collectMetrics result lands in RunResult.metrics', async () => {
    const runner = new HeadlessRunner({
      config: makeConfig(),
      seed: 1,
      scenario: {
        strategy: { beforeFrame() {} },
        maxFrames: 3,
        collectMetrics: ctx => ({ frames: ctx.frame, seed: ctx.seed }),
      },
    });
    const result = await runner.runUntilDone();
    expect(result.metrics).toEqual({ frames: 3, seed: 1 });
    runner.destroy();
  });
});

describe('HeadlessRunner — determinism', () => {
  it('two runs with the same seed produce identical RNG streams', async () => {
    const captureFirst: number[] = [];
    const captureSecond: number[] = [];
    const make = (capture: number[]) =>
      new HeadlessRunner({
        config: makeConfig(),
        seed: 1234,
        scenario: {
          strategy: {
            beforeFrame(ctx) {
              capture.push(ctx.random.next());
            },
          },
          maxFrames: 50,
        },
      });

    const a = make(captureFirst);
    await a.runUntilDone();
    a.destroy();

    const b = make(captureSecond);
    await b.runUntilDone();
    b.destroy();

    expect(captureFirst).toEqual(captureSecond);
  });

  it('different seeds diverge', async () => {
    const cap1: number[] = [];
    const cap2: number[] = [];
    for (const [seed, capture] of [[1, cap1], [2, cap2]] as Array<[number, number[]]>) {
      const r = new HeadlessRunner({
        config: makeConfig(),
        seed,
        scenario: {
          strategy: { beforeFrame(ctx) { capture.push(ctx.random.next()); } },
          maxFrames: 20,
        },
      });
      await r.runUntilDone();
      r.destroy();
    }
    expect(cap1).not.toEqual(cap2);
  });
});

describe('HarnessRunner — orchestration', () => {
  it('runs N seeds with a scripted strategy and reports a summary', async () => {
    const report = await HarnessRunner.run({
      config: makeConfig(),
      scenario: {
        strategy: new ScriptedStrategy([
          { frame: 1, action: 'jump', value: true },
          { frame: 3, action: 'jump', value: false },
        ]),
        maxFrames: 10,
        collectMetrics: ctx => ({ seed: ctx.seed }),
      },
      seeds: { count: 5 },
      concurrency: 2,
    });
    expect(report.total).toBe(5);
    expect(report.passed).toBe(5);
    expect(report.failed).toBe(0);
    expect(report.runs.map(r => r.seed)).toEqual([0, 1, 2, 3, 4]);
    expect(report.runs.every(r => r.frames === 10)).toBe(true);
  });

  it('explicit seed array is respected', async () => {
    const report = await HarnessRunner.run({
      config: makeConfig(),
      scenario: { strategy: { beforeFrame() {} }, maxFrames: 1 },
      seeds: [10, 20, 30],
      concurrency: 1,
    });
    expect(report.runs.map(r => r.seed)).toEqual([10, 20, 30]);
  });

  it('RandomFuzzStrategy 100x SandboxScene-style — zero crashes', async () => {
    const report = await HarnessRunner.run({
      config: makeConfig(),
      scenario: {
        strategy: new RandomFuzzStrategy({
          actions: ['jump', 'left', 'right'],
          toggleChance: 0.5,
        }),
        maxFrames: 30,
      },
      seeds: { count: 100 },
      concurrency: 8,
    });
    expect(report.total).toBe(100);
    expect(report.runs.filter(r => !!r.error).length).toBe(0);
  });
});
