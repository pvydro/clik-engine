import { ConsoleReporter } from '../debug/ConsoleReporter';
import { InstancePool } from './InstancePool';
import type { ClikGameConfig } from '../utils/types';
import type { Scenario, RunResult, HarnessReport } from './Scenario';

export interface RunOpts {
  /** Game config to boot for every instance (forced into headless mode). */
  config: ClikGameConfig;
  /** Scenario template applied to every instance. */
  scenario: Scenario;
  /** Either an explicit list of seeds or a count + start. */
  seeds: number[] | { count: number; start?: number };
  /** Concurrent instances at a time. Default 8. */
  concurrency?: number;
  /** Per-run progress callback. */
  onProgress?: (done: number, total: number, result: RunResult) => void;
}

/**
 * Top-level orchestrator. One call → N headless instances → one HarnessReport.
 *
 * ```ts
 * const report = await HarnessRunner.run({
 *   config,
 *   scenario: { strategy, maxFrames: 600 },
 *   seeds: { count: 100 },
 *   concurrency: 8,
 * });
 * ```
 */
export class HarnessRunner {
  static async run(opts: RunOpts): Promise<HarnessReport> {
    const seeds = normaliseSeeds(opts.seeds);
    ConsoleReporter.harness(`run starting: ${seeds.length} instance(s), concurrency=${opts.concurrency ?? 8}`);
    const start = nowMs();

    const factories = seeds.map(seed => () => ({
      config: opts.config,
      seed,
      scenario: opts.scenario,
    }));

    const runs = await InstancePool.runAll(factories, {
      concurrency: opts.concurrency,
      onProgress: opts.onProgress,
    });

    const passed = runs.filter(r => r.ok && !r.abortReason).length;
    const failed = runs.length - passed;
    const avgFrames = runs.length === 0 ? 0 : runs.reduce((s, r) => s + r.frames, 0) / runs.length;

    const report: HarnessReport = {
      total: runs.length,
      passed,
      failed,
      durationMs: nowMs() - start,
      avgFrames,
      runs,
    };
    ConsoleReporter.harness(`run done: ${passed}/${runs.length} passed in ${report.durationMs.toFixed(0)}ms`);
    return report;
  }
}

function normaliseSeeds(seeds: number[] | { count: number; start?: number }): number[] {
  if (Array.isArray(seeds)) return [...seeds];
  const start = seeds.start ?? 0;
  return Array.from({ length: seeds.count }, (_, i) => start + i);
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}
