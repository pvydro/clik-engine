import type Phaser from 'phaser';
import { createGame } from '../boot/ClikGame';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { ScriptedProvider } from '../input/providers/ScriptedProvider';
import { SeededRandom } from '../utils/random';
import { installRandom } from './RandomService';
import type { ClikGameConfig } from '../utils/types';
import type { Scenario, ScenarioContext, RunResult } from './Scenario';

const DEFAULT_DELTA_MS = 1000 / 60;

export interface HeadlessRunnerOpts {
  /** Game config — `headless` and `inputProviders` are forced on. */
  config: ClikGameConfig;
  /** Per-instance seed; the RNG and any RandomFuzzStrategy use this. */
  seed: number;
  /** Scenario describing how to drive and end the run. */
  scenario: Scenario;
}

/**
 * Runs one headless game instance under a scenario. Drives the Phaser loop
 * manually so it advances at synthetic time and never blocks on RAF.
 */
export class HeadlessRunner {
  readonly seed: number;
  readonly scenario: Scenario;
  readonly scripted: ScriptedProvider;
  readonly random: SeededRandom;

  private config: ClikGameConfig;
  private _game: Phaser.Game | null = null;
  private _frame = 0;
  private _time = 0;
  private _booted = false;
  private _destroyed = false;
  private _ctx: ScenarioContext | null = null;

  constructor(opts: HeadlessRunnerOpts) {
    this.seed = opts.seed;
    this.scenario = opts.scenario;
    this.scripted = new ScriptedProvider();
    this.random = new SeededRandom(opts.seed);

    const providers = [...(opts.config.inputProviders ?? []), this.scripted];
    this.config = {
      ...opts.config,
      headless: true,
      debug: false,
      inputProviders: providers,
    };
  }

  get game(): Phaser.Game {
    if (!this._game) throw new Error('HeadlessRunner: not booted yet, call boot() first');
    return this._game;
  }

  get frame(): number {
    return this._frame;
  }

  get time(): number {
    return this._time;
  }

  /** Create the headless Phaser game and wait until READY. */
  async boot(): Promise<void> {
    if (this._booted) return;
    const game = createGame(this.config);
    this._game = game;
    installRandom(game, this.seed);

    // Phaser fires READY after the renderer is up. In HEADLESS the renderer
    // is null and the event path differs, so we race the event against a
    // poll on `isBooted` + scene manager ready state. Whichever completes
    // first wins, with a generous timeout for mocked environments.
    await new Promise<void>(resolve => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      try { game.events.once('ready', finish); } catch { /* ignore */ }
      const poll = () => {
        if (done) return;
        const g = game as unknown as { isBooted?: boolean; scene?: { scenes?: Array<{ sys?: { isActive?: () => boolean } }> } };
        const booted = g.isBooted === true;
        const anyActive = g.scene?.scenes?.some(s => s.sys?.isActive?.()) ?? false;
        if (booted && anyActive) { finish(); return; }
        setTimeout(poll, 4);
      };
      poll();
      // Safety timeout — resolve anyway so a stuck boot surfaces as a step error instead
      setTimeout(finish, 2000);
    });

    // Stop Phaser's automatic RAF/setTimeout-driven loop. We step manually
    // via game.headlessStep(time, delta) below. `stop()` prevents the next
    // RAF tick from double-stepping our synthetic clock.
    try { game.loop.stop(); } catch { /* mocks may lack loop.stop */ }

    // Optionally jump to a target scene before the run begins.
    if (this.scenario.startScene) {
      try { game.scene.start(this.scenario.startScene); } catch { /* ignore */ }
    }

    this._ctx = this.makeContext();
    if (this.scenario.strategy.init) {
      await this.scenario.strategy.init(this._ctx);
    }
    this._booted = true;
    ConsoleReporter.harness(`runner booted seed=${this.seed}`);
  }

  /**
   * Advance exactly one frame. Returns the abort reason if `shouldAbort` fires
   * this frame, otherwise undefined. Throws on step errors.
   */
  async stepFrame(): Promise<string | undefined> {
    if (!this._booted || !this._game || !this._ctx) {
      throw new Error('HeadlessRunner: stepFrame() before boot()');
    }
    const dt = this.scenario.fixedDeltaMs ?? DEFAULT_DELTA_MS;
    this._frame += 1;
    this._time += dt;

    await this.scenario.strategy.beforeFrame(this._ctx);
    // Drive the game directly. Bypass TimeStep entirely so sleeping the loop
    // doesn't make step() a no-op. Prefer headlessStep when available.
    const g = this._game as unknown as {
      headlessStep?: (time: number, delta: number) => void;
      step?: (time: number, delta: number) => void;
      loop: { step: (time: number) => void };
    };
    if (typeof g.headlessStep === 'function') {
      g.headlessStep(this._time, dt);
    } else if (typeof g.step === 'function') {
      g.step(this._time, dt);
    } else {
      g.loop.step(this._time);
    }

    if (this.scenario.shouldAbort) {
      const r = this.scenario.shouldAbort(this._ctx);
      if (r) return typeof r === 'string' ? r : 'aborted';
    }
    return undefined;
  }

  /** Run frames until maxFrames or shouldAbort. Resolves with the result. */
  async runUntilDone(): Promise<RunResult> {
    const start = nowMs();
    let abortReason: string | undefined;
    let error: string | undefined;

    try {
      if (!this._booted) await this.boot();
    } catch (err) {
      error = `boot error: ${(err as Error)?.message ?? err}`;
      ConsoleReporter.harness(`runner boot failed seed=${this.seed}: ${error}`);
      return {
        ok: false,
        seed: this.seed,
        frames: 0,
        durationMs: nowMs() - start,
        error,
      };
    }

    const ctx = this._ctx!;
    try {
      while (this._frame < this.scenario.maxFrames) {
        const r = await this.stepFrame();
        if (r) { abortReason = r; break; }
      }
    } catch (err) {
      error = (err as Error)?.message ?? String(err);
      ConsoleReporter.harness(`runner error seed=${this.seed} frame=${this._frame}: ${error}`);
    }

    let metrics: Record<string, unknown> | undefined;
    let finalSnapshot: Record<string, unknown> | undefined;
    try {
      metrics = this.scenario.collectMetrics?.(ctx);
      finalSnapshot = ctx.snapshot();
    } catch (err) {
      // Don't let metrics collection mask a successful run.
      ConsoleReporter.harness(`metrics collect failed seed=${this.seed}: ${err}`);
    }

    try { this.scenario.strategy.done?.(ctx); } catch { /* isolate */ }

    return {
      ok: !error,
      seed: this.seed,
      frames: this._frame,
      durationMs: nowMs() - start,
      abortReason,
      error,
      metrics,
      finalSnapshot,
      tags: this.scenario.tags,
    };
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    try { this._game?.destroy(true, false); } catch { /* ignore */ }
    this._game = null;
    this._ctx = null;
    this.scripted.destroy();
  }

  private makeContext(): ScenarioContext {
    const self = this;
    return {
      get game() { return self.game; },
      get scripted() { return self.scripted; },
      get random() { return self.random; },
      get frame() { return self._frame; },
      get time() { return self._time; },
      get seed() { return self.seed; },
      snapshot: () => self.takeSnapshot(),
    };
  }

  private takeSnapshot(): Record<string, unknown> {
    const out: Record<string, unknown> = {
      frame: this._frame,
      time: this._time,
      seed: this.seed,
    };
    const game = this._game;
    if (!game) return out;
    try {
      // Pull state from the registry-backed inspector store populated by
      // BaseScene.inspectState(). Key by scene key; values are the collected
      // getters keyed by label.
      const map = game.registry.get('__clikHarnessInspectors') as
        | Map<string, Map<string, () => Record<string, unknown>>>
        | undefined;
      if (map) {
        for (const [sceneKey, labels] of map) {
          const sceneOut: Record<string, unknown> = {};
          for (const [label, getter] of labels) {
            try { sceneOut[label] = getter(); } catch { /* isolate */ }
          }
          out[sceneKey] = sceneOut;
        }
      }
    } catch {
      // best-effort snapshot
    }
    return out;
  }
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}
