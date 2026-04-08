import { ConsoleReporter } from '../debug/ConsoleReporter';
import { HarnessRunner, type RunOpts } from './HarnessRunner';
import type { HarnessReport, RunResult } from './Scenario';

type Status = 'idle' | 'running' | 'done';

interface ProgressState {
  done: number;
  total: number;
}

/**
 * Singleton mounted on `window.__CLIK_HARNESS` so Claude (or any browser
 * console user) can launch sweeps and read results via `preview_eval`.
 *
 * Example:
 *
 *   await window.__CLIK_HARNESS.run({
 *     config: myGameConfig,
 *     scenario: { strategy: new RandomFuzzStrategy({ actions: ['jump','left','right'] }), maxFrames: 600 },
 *     seeds: { count: 25 },
 *   });
 *   window.__CLIK_HARNESS.lastReport.summary();
 *   window.__CLIK_HARNESS.failures();
 */
export class HarnessReporter {
  status: Status = 'idle';
  progress: ProgressState = { done: 0, total: 0 };
  lastReport: HarnessReport | null = null;

  private static _instance: HarnessReporter | null = null;
  private aborted = false;

  static install(): HarnessReporter {
    if (!this._instance) {
      this._instance = new HarnessReporter();
      const g = globalThis as Record<string, unknown>;
      g.__CLIK_HARNESS = this._instance;
    }
    return this._instance;
  }

  static get(): HarnessReporter | null {
    return this._instance;
  }

  async run(opts: RunOpts): Promise<HarnessReport> {
    if (this.status === 'running') {
      throw new Error('HarnessReporter: a run is already in progress');
    }
    this.aborted = false;
    this.status = 'running';
    const total = Array.isArray(opts.seeds) ? opts.seeds.length : opts.seeds.count;
    this.progress = { done: 0, total };
    ConsoleReporter.harness(`reporter run started: ${total} instance(s)`);

    try {
      const report = await HarnessRunner.run({
        ...opts,
        onProgress: (done, total, result) => {
          this.progress = { done, total };
          try { opts.onProgress?.(done, total, result); } catch { /* ignore */ }
        },
      });
      this.lastReport = report;
      this.status = 'done';
      return report;
    } catch (err) {
      this.status = 'done';
      throw err;
    }
  }

  /** All runs from the last report. */
  runs(): RunResult[] {
    return this.lastReport?.runs ?? [];
  }

  /** Failed runs (errored or aborted) from the last report. */
  failures(): RunResult[] {
    return this.runs().filter(r => !r.ok || !!r.abortReason);
  }

  /** Filter the last report's runs by tag. */
  byTag(tag: string): RunResult[] {
    return this.runs().filter(r => r.tags?.includes(tag));
  }

  /** Lookup a single run by seed. */
  bySeed(seed: number): RunResult | undefined {
    return this.runs().find(r => r.seed === seed);
  }

  /** Compact summary suitable for `preview_eval` round-trip. */
  summary(): { status: Status; total: number; passed: number; failed: number; durationMs: number; avgFrames: number } | null {
    const r = this.lastReport;
    if (!r) return null;
    return {
      status: this.status,
      total: r.total,
      passed: r.passed,
      failed: r.failed,
      durationMs: r.durationMs,
      avgFrames: r.avgFrames,
    };
  }

  /** Cooperative abort flag — strategies / shouldAbort callbacks may consult this. */
  abort(): void {
    this.aborted = true;
  }

  isAborted(): boolean {
    return this.aborted;
  }
}
