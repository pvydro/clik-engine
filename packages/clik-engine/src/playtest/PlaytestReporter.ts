import type Phaser from 'phaser';
import type { ClikScenePlugin } from '../plugin/ClikPlugin';
import type { BaseScene } from '../scenes/BaseScene';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { ErrorListener } from '../debug/ConsoleReporter';
import { eventBus } from '../utils/EventBus';
import { profiler } from '../debug/Profiler';
import type {
  PlaytestConfig,
  PlaytestReport,
  InputMetrics,
  SceneMetrics,
  EntityMetrics,
  PerformanceMetrics,
  TimelineEntry,
} from './PlaytestTypes';

const DEFAULT_TRACK_EVENTS = [
  'player:death',
  'player:respawn',
  'score:changed',
  'level:complete',
  'enemy:killed',
  'item:collected',
];

const DEFAULT_CONFIG: Required<PlaytestConfig> = {
  trackEvents: DEFAULT_TRACK_EVENTS,
  entitySampleRate: 60,
  performanceSampleRate: 60,
  idleThreshold: 5,
  fpsDropThreshold: 30,
  autoStart: true,
};

/**
 * PlaytestReporter — records gameplay sessions and produces structured reports
 * that Claude (or humans) can analyze for game design feedback.
 *
 * Register as a ClikScenePlugin via ClikGameConfig.plugins:
 * ```ts
 * createGame({
 *   plugins: [{ plugin: new PlaytestReporter({ trackEvents: ['score:changed'] }), config: {} }],
 *   ...
 * });
 * ```
 */
export class PlaytestReporter implements ClikScenePlugin {
  readonly name = 'PlaytestReporter';
  readonly version = '1.0.0';

  private game!: Phaser.Game;
  private config: Required<PlaytestConfig>;
  private recording = false;
  private sessionId = '';
  private startTime = 0;

  // Collectors
  private actionCounts: Record<string, number> = {};
  private totalActions = 0;
  private lastInputTime = 0;
  private idlePeriods: { start: number; end: number; duration: number }[] = [];
  private idleStart = 0;

  private sceneTransitions: { from: string; to: string; at: number }[] = [];
  private sceneDurations: Record<string, number> = {};
  private sceneEnterTimes: Record<string, number> = {};

  private peakEntityCount = 0;
  private peakByType: Record<string, number> = {};
  private entitySampleCount = 0;

  private fpsSamples: number[] = [];
  private minFps = Infinity;
  private fpsDrops: { at: number; fps: number }[] = [];
  private slowFrames = 0;

  private events: { name: string; at: number; data?: unknown }[] = [];
  private errors: { message: string; at: number }[] = [];
  private timeline: TimelineEntry[] = [];

  private frameCounter = 0;
  private lastSceneKey = '';
  private eventHandlers: Map<string, (...args: unknown[]) => void> = new Map();
  private errorListener: ErrorListener;

  constructor(config?: PlaytestConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.errorListener = (message: string) => {
      if (!this.recording) return;
      const at = Date.now() - this.startTime;
      this.errors.push({ message, at });
      this.timeline.push({ type: 'error', label: message, at });
    };
  }

  // ── Plugin lifecycle ──────────────────────────────────────────────

  init(game: Phaser.Game): void {
    this.game = game;
    ConsoleReporter.playtest('PlaytestReporter initialized');

    // Listen for tracked events on the global EventBus
    for (const eventName of this.config.trackEvents) {
      const handler = (...args: unknown[]) => {
        if (!this.recording) return;
        const at = Date.now() - this.startTime;
        const data = args.length === 1 ? args[0] : args.length > 1 ? args : undefined;
        this.events.push({ name: eventName, at, data });
        this.timeline.push({ type: 'event', label: eventName, at, data });
      };
      this.eventHandlers.set(eventName, handler);
      eventBus.on(eventName, handler, this);
    }

    // Hook into ConsoleReporter errors
    ConsoleReporter.addErrorListener(this.errorListener);

    if (this.config.autoStart) {
      this.startRecording();
    }
  }

  destroy(): void {
    this.stopRecording();

    // Remove EventBus listeners
    for (const [eventName] of this.eventHandlers) {
      eventBus.removeAllByOwner(this);
    }
    this.eventHandlers.clear();

    ConsoleReporter.removeErrorListener(this.errorListener);
    ConsoleReporter.playtest('PlaytestReporter destroyed');
  }

  // ── Scene hooks ───────────────────────────────────────────────────

  onSceneCreate(scene: BaseScene): void {
    if (!this.recording) return;
    const key = scene.scene.key;
    if (key.startsWith('__clik_')) return;

    const at = Date.now() - this.startTime;

    if (this.lastSceneKey && this.lastSceneKey !== key) {
      this.sceneTransitions.push({ from: this.lastSceneKey, to: key, at });
      this.timeline.push({ type: 'scene', label: `${this.lastSceneKey} → ${key}`, at });

      // Close out previous scene duration
      if (this.sceneEnterTimes[this.lastSceneKey] !== undefined) {
        const dur = at - this.sceneEnterTimes[this.lastSceneKey];
        this.sceneDurations[this.lastSceneKey] = (this.sceneDurations[this.lastSceneKey] ?? 0) + dur;
      }
    }

    this.sceneEnterTimes[key] = at;
    this.lastSceneKey = key;
  }

  onSceneUpdate(scene: BaseScene, time: number, delta: number): void {
    if (!this.recording) return;
    if (scene.scene.key.startsWith('__clik_')) return;

    this.frameCounter++;

    // ── Input sampling (every frame — lightweight, just checks action map) ──
    this.sampleInput(scene);

    // ── Entity sampling ──
    if (this.frameCounter % this.config.entitySampleRate === 0) {
      this.sampleEntities(scene);
    }

    // ── Performance sampling ──
    if (this.frameCounter % this.config.performanceSampleRate === 0) {
      this.samplePerformance();
    }
  }

  onSceneShutdown(scene: BaseScene): void {
    if (!this.recording) return;
    const key = scene.scene.key;
    if (key.startsWith('__clik_')) return;

    // Close scene duration
    if (this.sceneEnterTimes[key] !== undefined) {
      const at = Date.now() - this.startTime;
      const dur = at - this.sceneEnterTimes[key];
      this.sceneDurations[key] = (this.sceneDurations[key] ?? 0) + dur;
      delete this.sceneEnterTimes[key];
    }
  }

  // ── Recording control ─────────────────────────────────────────────

  startRecording(): void {
    if (this.recording) return;
    this.reset();
    this.recording = true;
    this.sessionId = `playtest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.startTime = Date.now();
    this.lastInputTime = this.startTime;
    ConsoleReporter.playtest('Recording started', { sessionId: this.sessionId });
  }

  stopRecording(): void {
    if (!this.recording) return;
    this.recording = false;

    // Close any open scene durations
    const at = Date.now() - this.startTime;
    for (const key of Object.keys(this.sceneEnterTimes)) {
      const dur = at - this.sceneEnterTimes[key];
      this.sceneDurations[key] = (this.sceneDurations[key] ?? 0) + dur;
    }

    ConsoleReporter.playtest('Recording stopped', { sessionId: this.sessionId });
  }

  isRecording(): boolean {
    return this.recording;
  }

  /** Manually track a custom game event. */
  trackEvent(name: string, data?: unknown): void {
    if (!this.recording) return;
    const at = Date.now() - this.startTime;
    this.events.push({ name, at, data });
    this.timeline.push({ type: 'event', label: name, at, data });
  }

  // ── Report generation ─────────────────────────────────────────────

  getReport(): PlaytestReport {
    const endTime = Date.now();
    const duration = endTime - (this.startTime || endTime);

    const input: InputMetrics = {
      totalActions: this.totalActions,
      actionsPerSecond: duration > 0 ? this.totalActions / (duration / 1000) : 0,
      actionCounts: { ...this.actionCounts },
      idlePeriods: [...this.idlePeriods],
    };

    const scenes: SceneMetrics = {
      transitions: [...this.sceneTransitions],
      durations: { ...this.sceneDurations },
    };

    const entities: EntityMetrics = {
      peakCount: this.peakEntityCount,
      peakByType: { ...this.peakByType },
      samples: this.entitySampleCount,
    };

    const avgFps = this.fpsSamples.length > 0
      ? this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length
      : 0;

    const performance: PerformanceMetrics = {
      averageFps: Math.round(avgFps * 10) / 10,
      minFps: this.minFps === Infinity ? 0 : this.minFps,
      fpsDrops: [...this.fpsDrops],
      slowFrames: this.slowFrames,
      fpsSamples: [...this.fpsSamples],
    };

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      input,
      scenes,
      entities,
      performance,
      events: [...this.events],
      errors: [...this.errors],
      timeline: [...this.timeline].sort((a, b) => a.at - b.at),
    };
  }

  getSummary(): string {
    const report = this.getReport();
    const dur = (report.duration / 1000).toFixed(1);

    // Scene flow
    const sceneEntries = Object.entries(report.scenes.durations)
      .map(([key, ms]) => `${key} (${(ms / 1000).toFixed(1)}s)`)
      .join(' → ');

    // Top actions
    const topActions = Object.entries(report.input.actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');

    // Entity peaks
    const entityPeaks = Object.entries(report.entities.peakByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    // Event counts
    const eventCounts: Record<string, number> = {};
    for (const e of report.events) {
      eventCounts[e.name] = (eventCounts[e.name] ?? 0) + 1;
    }
    const eventSummary = Object.entries(eventCounts)
      .map(([name, count]) => `${name} x${count}`)
      .join(', ');

    const lines = [
      `=== Playtest Report ===`,
      `Duration: ${dur}s | Avg FPS: ${report.performance.averageFps} | FPS drops: ${report.performance.fpsDrops.length}`,
      `Scenes: ${sceneEntries || 'none'}`,
      `Input: ${report.input.totalActions} actions (${report.input.actionsPerSecond.toFixed(1)}/s) | Top: ${topActions || 'none'}`,
      `Idle periods: ${report.input.idlePeriods.length} (${report.input.idlePeriods.map(p => `${(p.duration / 1000).toFixed(1)}s`).join(', ') || 'none'})`,
      `Entities: peak ${report.entities.peakCount} (${entityPeaks || 'none'})`,
      `Events: ${eventSummary || 'none'}`,
      `Errors: ${report.errors.length}${report.errors.length > 0 ? ' — ' + report.errors.map(e => e.message).join('; ') : ''}`,
    ];

    return lines.join('\n');
  }

  getTimeline(): TimelineEntry[] {
    return [...this.timeline].sort((a, b) => a.at - b.at);
  }

  exportJSON(): string {
    return JSON.stringify(this.getReport(), null, 2);
  }

  // ── Reset ─────────────────────────────────────────────────────────

  reset(): void {
    this.actionCounts = {};
    this.totalActions = 0;
    this.lastInputTime = 0;
    this.idlePeriods = [];
    this.idleStart = 0;
    this.sceneTransitions = [];
    this.sceneDurations = {};
    this.sceneEnterTimes = {};
    this.peakEntityCount = 0;
    this.peakByType = {};
    this.entitySampleCount = 0;
    this.fpsSamples = [];
    this.minFps = Infinity;
    this.fpsDrops = [];
    this.slowFrames = 0;
    this.events = [];
    this.errors = [];
    this.timeline = [];
    this.frameCounter = 0;
    this.lastSceneKey = '';
  }

  // ── Private samplers ──────────────────────────────────────────────

  private sampleInput(scene: BaseScene): void {
    // We read pressed actions from the scene's InputManager via the game's input plugin.
    // InputManager tracks justPressed per frame — we hook into the scene's action map.
    try {
      const inputManager = (scene as unknown as Record<string, unknown>)['_actions'];
      if (!inputManager) return;

      const actionMap = (inputManager as Record<string, unknown>)['actionMap'];
      if (!actionMap || typeof actionMap !== 'object') return;

      const allActions = (actionMap as { allActions?: () => string[] }).allActions?.();
      if (!allActions) return;

      const im = inputManager as { justPressed?: (action: string) => boolean };
      if (typeof im.justPressed !== 'function') return;

      for (const action of allActions) {
        if (im.justPressed(action)) {
          this.actionCounts[action] = (this.actionCounts[action] ?? 0) + 1;
          this.totalActions++;
          const now = Date.now();

          // Check if we were idle
          if (this.idleStart > 0) {
            const idleDuration = now - this.idleStart;
            if (idleDuration >= this.config.idleThreshold * 1000) {
              this.idlePeriods.push({
                start: this.idleStart - this.startTime,
                end: now - this.startTime,
                duration: idleDuration,
              });
              this.timeline.push({
                type: 'input',
                label: `idle ${(idleDuration / 1000).toFixed(1)}s`,
                at: this.idleStart - this.startTime,
              });
            }
            this.idleStart = 0;
          }

          this.lastInputTime = now;
        }
      }

      // Start idle tracking if no input for a while
      if (this.idleStart === 0 && Date.now() - this.lastInputTime > this.config.idleThreshold * 1000) {
        this.idleStart = this.lastInputTime;
      }
    } catch {
      // Silently ignore — input may not be initialized
    }
  }

  private sampleEntities(scene: BaseScene): void {
    try {
      const registry = scene.getEntityRegistry();
      if (!registry) return;

      this.entitySampleCount++;
      const count = registry.count;
      if (count > this.peakEntityCount) {
        this.peakEntityCount = count;
      }

      // Sample by type — getAll returns all entities, we group by constructor name
      const all = registry.getAll();
      const typeCounts: Record<string, number> = {};
      for (const entity of all) {
        const typeName = entity.constructor.name || 'Entity';
        typeCounts[typeName] = (typeCounts[typeName] ?? 0) + 1;
      }
      for (const [type, cnt] of Object.entries(typeCounts)) {
        if (!this.peakByType[type] || cnt > this.peakByType[type]) {
          this.peakByType[type] = cnt;
        }
      }
    } catch {
      // Silently ignore
    }
  }

  private samplePerformance(): void {
    try {
      const fps = Math.round(this.game.loop.actualFps);
      this.fpsSamples.push(fps);

      if (fps < this.minFps) {
        this.minFps = fps;
      }

      if (fps < this.config.fpsDropThreshold) {
        const at = Date.now() - this.startTime;
        this.fpsDrops.push({ at, fps });
        this.timeline.push({ type: 'performance', label: `FPS drop: ${fps}`, at });
      }

      const avgFrame = profiler.getAverageFrameTime();
      if (avgFrame > 33) {
        this.slowFrames++;
      }
    } catch {
      // Silently ignore
    }
  }
}
