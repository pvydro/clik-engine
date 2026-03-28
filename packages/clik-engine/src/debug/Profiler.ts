import { ConsoleReporter } from './ConsoleReporter';

interface TimingEntry {
  label: string;
  total: number;
  count: number;
  max: number;
  recent: number[];
}

const MAX_SAMPLES = 60;

export class Profiler {
  private timings: Map<string, TimingEntry> = new Map();
  private startTimes: Map<string, number> = new Map();
  private frameStart = 0;
  private frameTimes: number[] = [];
  private slowFrameThreshold = 33; // ms (~30fps)
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setSlowFrameThreshold(ms: number): void {
    this.slowFrameThreshold = ms;
  }

  /** Call at the start of each frame */
  beginFrame(): void {
    if (!this.enabled) return;
    this.frameStart = performance.now();
  }

  /** Call at the end of each frame */
  endFrame(): void {
    if (!this.enabled || this.frameStart === 0) return;
    const elapsed = performance.now() - this.frameStart;
    this.frameTimes.push(elapsed);
    if (this.frameTimes.length > MAX_SAMPLES) this.frameTimes.shift();

    if (elapsed > this.slowFrameThreshold) {
      ConsoleReporter.engine(`Slow frame: ${elapsed.toFixed(1)}ms`, this.getTimingSummary());
    }
  }

  /** Begin timing a named section */
  begin(label: string): void {
    if (!this.enabled) return;
    this.startTimes.set(label, performance.now());
  }

  /** End timing a named section */
  end(label: string): void {
    if (!this.enabled) return;
    const start = this.startTimes.get(label);
    if (start === undefined) return;

    const elapsed = performance.now() - start;
    this.startTimes.delete(label);

    let entry = this.timings.get(label);
    if (!entry) {
      entry = { label, total: 0, count: 0, max: 0, recent: [] };
      this.timings.set(label, entry);
    }

    entry.total += elapsed;
    entry.count++;
    entry.max = Math.max(entry.max, elapsed);
    entry.recent.push(elapsed);
    if (entry.recent.length > MAX_SAMPLES) entry.recent.shift();
  }

  /** Get average ms for a timing label */
  getAverage(label: string): number {
    const entry = this.timings.get(label);
    if (!entry || entry.recent.length === 0) return 0;
    return entry.recent.reduce((a, b) => a + b, 0) / entry.recent.length;
  }

  /** Get average frame time */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /** Get timing summary for all tracked sections */
  getTimingSummary(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [label, entry] of this.timings) {
      const avg = entry.recent.length > 0
        ? (entry.recent.reduce((a, b) => a + b, 0) / entry.recent.length).toFixed(2)
        : '0';
      result[label] = `${avg}ms avg, ${entry.max.toFixed(2)}ms max`;
    }
    result['frame'] = `${this.getAverageFrameTime().toFixed(2)}ms avg`;
    return result;
  }

  /** Reset all timings */
  reset(): void {
    this.timings.clear();
    this.frameTimes = [];
  }
}

/** Global profiler singleton */
export const profiler = new Profiler();
