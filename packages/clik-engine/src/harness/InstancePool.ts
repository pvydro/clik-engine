import { ConsoleReporter } from '../debug/ConsoleReporter';
import { HeadlessRunner, type HeadlessRunnerOpts } from './HeadlessRunner';
import type { RunResult } from './Scenario';

export interface PoolOpts {
  /** Concurrent runners. Default 8. */
  concurrency?: number;
  /** Called after each run completes (fail or pass). */
  onProgress?: (done: number, total: number, result: RunResult) => void;
}

/**
 * Runs a batch of {@link HeadlessRunner}s with bounded concurrency.
 *
 * Each runner is created lazily inside its slot, run to completion, then
 * destroyed before the next one reuses that slot. Memory stays capped at
 * `concurrency × one-game`, regardless of total batch size — you can sweep
 * thousands of seeds without OOMing.
 *
 * Normally called via {@link HarnessRunner.run}; use directly only if you
 * need to build runners from non-seed factories.
 *
 * @category Harness
 */
export class InstancePool {
  static async runAll(
    factories: Array<() => HeadlessRunnerOpts>,
    opts: PoolOpts = {}
  ): Promise<RunResult[]> {
    const concurrency = Math.max(1, opts.concurrency ?? 8);
    const results: RunResult[] = new Array(factories.length);
    let nextIndex = 0;
    let done = 0;

    const workers = Array.from({ length: Math.min(concurrency, factories.length) }, async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= factories.length) return;
        let runner: HeadlessRunner | null = null;
        let result: RunResult;
        try {
          runner = new HeadlessRunner(factories[i]());
          result = await runner.runUntilDone();
        } catch (err) {
          result = {
            ok: false,
            seed: -1,
            frames: 0,
            durationMs: 0,
            error: `boot error: ${(err as Error)?.message ?? err}`,
          };
        } finally {
          try { runner?.destroy(); } catch { /* ignore */ }
        }
        results[i] = result;
        done += 1;
        try { opts.onProgress?.(done, factories.length, result); } catch { /* ignore */ }
      }
    });

    await Promise.all(workers);
    ConsoleReporter.harness(`pool finished ${done}/${factories.length}`);
    return results;
  }
}
