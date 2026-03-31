import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => {
  const listeners = new Set<(msg: string, sug?: string) => void>();
  return {
    ConsoleReporter: {
      playtest: vi.fn(),
      engine: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      addErrorListener: vi.fn((fn: (msg: string) => void) => listeners.add(fn)),
      removeErrorListener: vi.fn((fn: (msg: string) => void) => listeners.delete(fn)),
      _listeners: listeners,
    },
  };
});

vi.mock('../../src/debug/Profiler', () => ({
  profiler: {
    getAverageFrameTime: vi.fn(() => 16.6),
    getTimingSummary: vi.fn(() => ({})),
  },
}));

vi.mock('../../src/utils/EventBus', () => {
  const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  return {
    eventBus: {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        if (!handlers.has(event)) handlers.set(event, []);
        handlers.get(event)!.push(cb);
      }),
      removeAllByOwner: vi.fn(),
      _handlers: handlers,
      _emit: (event: string, ...args: unknown[]) => {
        for (const cb of handlers.get(event) ?? []) cb(...args);
      },
    },
  };
});

import { PlaytestReporter } from '../../src/playtest/PlaytestReporter';
import { ConsoleReporter } from '../../src/debug/ConsoleReporter';
import { eventBus } from '../../src/utils/EventBus';

function makeGameMock() {
  return {
    loop: { actualFps: 60 },
    registry: { get: vi.fn(), set: vi.fn() },
  } as unknown as import('phaser').Game;
}

function makeSceneMock(key = 'GameScene') {
  return {
    scene: { key },
    getEntityRegistry: vi.fn(() => null),
    _actions: null,
  } as unknown as import('../../src/scenes/BaseScene').BaseScene;
}

describe('PlaytestReporter', () => {
  let reporter: PlaytestReporter;
  let game: ReturnType<typeof makeGameMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    reporter = new PlaytestReporter({
      trackEvents: ['player:death', 'score:changed'],
      autoStart: false,
      entitySampleRate: 1,
      performanceSampleRate: 1,
      idleThreshold: 5,
      fpsDropThreshold: 30,
    });
    game = makeGameMock();
    reporter.init(game);
  });

  afterEach(() => {
    reporter.destroy();
  });

  it('has correct plugin metadata', () => {
    expect(reporter.name).toBe('PlaytestReporter');
    expect(reporter.version).toBe('1.0.0');
  });

  it('registers EventBus listeners on init', () => {
    expect(eventBus.on).toHaveBeenCalledWith('player:death', expect.any(Function), reporter);
    expect(eventBus.on).toHaveBeenCalledWith('score:changed', expect.any(Function), reporter);
  });

  it('registers error listener on init', () => {
    expect(ConsoleReporter.addErrorListener).toHaveBeenCalled();
  });

  it('starts and stops recording', () => {
    expect(reporter.isRecording()).toBe(false);
    reporter.startRecording();
    expect(reporter.isRecording()).toBe(true);
    reporter.stopRecording();
    expect(reporter.isRecording()).toBe(false);
  });

  it('tracks scene transitions', () => {
    reporter.startRecording();
    const scene1 = makeSceneMock('MenuScene');
    const scene2 = makeSceneMock('GameScene');

    reporter.onSceneCreate(scene1);
    reporter.onSceneCreate(scene2);

    const report = reporter.getReport();
    expect(report.scenes.transitions).toHaveLength(1);
    expect(report.scenes.transitions[0].from).toBe('MenuScene');
    expect(report.scenes.transitions[0].to).toBe('GameScene');
  });

  it('ignores debug scenes', () => {
    reporter.startRecording();
    const debugScene = makeSceneMock('__clik_debug_overlay');
    reporter.onSceneCreate(debugScene);

    const report = reporter.getReport();
    expect(report.scenes.transitions).toHaveLength(0);
  });

  it('records scene durations on shutdown', () => {
    reporter.startRecording();
    const scene = makeSceneMock('GameScene');
    reporter.onSceneCreate(scene);

    // Simulate some time passing
    reporter.onSceneShutdown(scene);

    const report = reporter.getReport();
    expect(report.scenes.durations['GameScene']).toBeDefined();
    expect(report.scenes.durations['GameScene']).toBeGreaterThanOrEqual(0);
  });

  it('tracks custom events via trackEvent()', () => {
    reporter.startRecording();
    reporter.trackEvent('custom:event', { value: 42 });

    const report = reporter.getReport();
    expect(report.events).toHaveLength(1);
    expect(report.events[0].name).toBe('custom:event');
    expect(report.events[0].data).toEqual({ value: 42 });
  });

  it('tracks EventBus events', () => {
    reporter.startRecording();
    // Simulate an EventBus emit
    const bus = eventBus as unknown as { _handlers: Map<string, ((...args: unknown[]) => void)[]>; _emit: (e: string, ...args: unknown[]) => void };
    bus._emit('player:death', { lives: 0 });

    const report = reporter.getReport();
    expect(report.events).toHaveLength(1);
    expect(report.events[0].name).toBe('player:death');
  });

  it('tracks errors via ConsoleReporter listener', () => {
    reporter.startRecording();
    // Simulate an error via the listener
    const listeners = (ConsoleReporter as unknown as { _listeners: Set<(msg: string) => void> })._listeners;
    for (const fn of listeners) fn('Something broke');

    const report = reporter.getReport();
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].message).toBe('Something broke');
  });

  it('samples performance metrics', () => {
    reporter.startRecording();
    const scene = makeSceneMock('GameScene');
    reporter.onSceneCreate(scene);
    reporter.onSceneUpdate(scene, 0, 16);

    const report = reporter.getReport();
    expect(report.performance.fpsSamples.length).toBeGreaterThan(0);
    expect(report.performance.averageFps).toBe(60);
  });

  it('detects FPS drops', () => {
    reporter.startRecording();
    const scene = makeSceneMock('GameScene');
    reporter.onSceneCreate(scene);

    // Simulate low FPS
    (game as unknown as { loop: { actualFps: number } }).loop.actualFps = 20;
    reporter.onSceneUpdate(scene, 0, 50);

    const report = reporter.getReport();
    expect(report.performance.fpsDrops.length).toBeGreaterThan(0);
    expect(report.performance.fpsDrops[0].fps).toBe(20);
  });

  it('generates a human-readable summary', () => {
    reporter.startRecording();
    reporter.trackEvent('score:changed', { score: 100 });
    const summary = reporter.getSummary();

    expect(summary).toContain('=== Playtest Report ===');
    expect(summary).toContain('Duration:');
    expect(summary).toContain('Scenes:');
    expect(summary).toContain('Input:');
    expect(summary).toContain('Errors:');
  });

  it('exports JSON report', () => {
    reporter.startRecording();
    const json = reporter.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.sessionId).toContain('playtest_');
    expect(parsed.input).toBeDefined();
    expect(parsed.scenes).toBeDefined();
    expect(parsed.performance).toBeDefined();
  });

  it('getTimeline returns sorted entries', () => {
    reporter.startRecording();
    reporter.trackEvent('second', undefined);
    reporter.trackEvent('first', undefined);

    const timeline = reporter.getTimeline();
    expect(timeline.length).toBe(2);
    expect(timeline[0].at).toBeLessThanOrEqual(timeline[1].at);
  });

  it('reset clears all data', () => {
    reporter.startRecording();
    reporter.trackEvent('event1');
    reporter.reset();

    const report = reporter.getReport();
    expect(report.events).toHaveLength(0);
    expect(report.errors).toHaveLength(0);
    expect(report.timeline).toHaveLength(0);
  });

  it('does not record when not recording', () => {
    // Not started
    reporter.trackEvent('should:ignore');
    const report = reporter.getReport();
    expect(report.events).toHaveLength(0);
  });

  it('cleans up on destroy', () => {
    reporter.destroy();
    expect(eventBus.removeAllByOwner).toHaveBeenCalledWith(reporter);
    expect(ConsoleReporter.removeErrorListener).toHaveBeenCalled();
  });
});
