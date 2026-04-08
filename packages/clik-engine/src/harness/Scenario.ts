import type Phaser from 'phaser';
import type { ScriptedProvider } from '../input/providers/ScriptedProvider';
import type { SeededRandom } from '../utils/random';

/**
 * Live context handed to a {@link ScenarioStrategy} on every frame and to
 * `shouldAbort` / `collectMetrics` callbacks. The runner builds and mutates
 * this in-place per instance.
 *
 * @category Harness
 */
export interface ScenarioContext {
  /** The headless Phaser game. */
  readonly game: Phaser.Game;
  /** The scripted input provider — write actions onto this. */
  readonly scripted: ScriptedProvider;
  /** Per-instance deterministic RNG (seeded from the run seed). */
  readonly random: SeededRandom;
  /** Frame counter, increments before each step. */
  readonly frame: number;
  /** Synthetic clock (ms) at the start of the current step. */
  readonly time: number;
  /** This run's seed. */
  readonly seed: number;
  /**
   * Snapshot of every state registered via `BaseScene.inspectState()` on the
   * currently-active scene, plus a few engine fields. Cheap to call.
   */
  snapshot(): Record<string, unknown>;
}

/**
 * Decides which actions to press each frame under the harness. Implemented
 * by {@link ScriptedStrategy}, {@link RandomFuzzStrategy},
 * {@link PolicyStrategy}, or your own class.
 *
 * `beforeFrame` runs *before* the game step — write to `ctx.scripted` to
 * apply inputs for this frame. Strategies may be async (the runner awaits).
 *
 * @category Harness
 */
export interface ScenarioStrategy {
  /** Optional one-time setup at boot, e.g. seed randomization. */
  init?(ctx: ScenarioContext): void | Promise<void>;
  /** Called every frame; mutate `ctx.scripted` to drive inputs. */
  beforeFrame(ctx: ScenarioContext): void | Promise<void>;
  /** Optional teardown at end of run. */
  done?(ctx: ScenarioContext): void;
}

/**
 * Describes one harness run: the {@link ScenarioStrategy} driving inputs,
 * a hard frame cap, plus optional abort, metrics, and tagging hooks.
 *
 * @category Harness
 */
export interface Scenario {
  /** Strategy that drives inputs. Required. */
  strategy: ScenarioStrategy;
  /** Hard cap on frames per run. Required so a stuck run can't hang the harness. */
  maxFrames: number;
  /** Fixed delta in ms per frame (default 16.666 ≈ 60 fps). */
  fixedDeltaMs?: number;
  /** Optional scene key to start before the run begins. */
  startScene?: string;
  /**
   * Return a truthy value (or a string reason) to end the run early.
   * Called once per frame after the step.
   */
  shouldAbort?: (ctx: ScenarioContext) => boolean | string | undefined;
  /**
   * Called once at the end of the run (success or abort) to collect metrics
   * that land in `RunResult.metrics`.
   */
  collectMetrics?: (ctx: ScenarioContext) => Record<string, unknown>;
  /** Free-form tags for filtering reports. */
  tags?: string[];
}

/**
 * Result of running a single harness instance. Collected into
 * {@link HarnessReport.runs}.
 *
 * @category Harness
 */
export interface RunResult {
  ok: boolean;
  seed: number;
  frames: number;
  durationMs: number;
  abortReason?: string;
  error?: string;
  metrics?: Record<string, unknown>;
  finalSnapshot?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Aggregated report of a multi-instance harness run. Returned by
 * {@link HarnessRunner.run} and stored on {@link HarnessReporter.lastReport}.
 *
 * @category Harness
 */
export interface HarnessReport {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  avgFrames: number;
  runs: RunResult[];
}
