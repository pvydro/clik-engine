import { ConsoleReporter } from './ConsoleReporter';

interface TrackedType {
  name: string;
  created: number;
  destroyed: number;
  current: number;
  peak: number;
}

/**
 * Tracks object creation and destruction to detect memory leaks.
 * Register types you want to monitor, then call created/destroyed.
 */
export class LeakDetector {
  private types: Map<string, TrackedType> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private warningThreshold: number;

  constructor(warningThreshold = 100) {
    this.warningThreshold = warningThreshold;
  }

  /** Register a type to track */
  register(name: string): this {
    if (!this.types.has(name)) {
      this.types.set(name, { name, created: 0, destroyed: 0, current: 0, peak: 0 });
    }
    return this;
  }

  /** Call when an object of a tracked type is created */
  created(name: string): void {
    const type = this.types.get(name);
    if (!type) {
      this.register(name);
      this.created(name);
      return;
    }
    type.created++;
    type.current++;
    if (type.current > type.peak) type.peak = type.current;

    if (type.current > this.warningThreshold) {
      ConsoleReporter.error(
        `Leak warning: ${name} has ${type.current} active instances (threshold: ${this.warningThreshold})`,
        `Check if you're forgetting to destroy ${name} instances.`
      );
    }
  }

  /** Call when an object of a tracked type is destroyed */
  destroyed(name: string): void {
    const type = this.types.get(name);
    if (!type) return;
    type.destroyed++;
    type.current = Math.max(0, type.current - 1);
  }

  /** Get stats for all tracked types */
  getStats(): Record<string, { current: number; peak: number; created: number; destroyed: number }> {
    const result: Record<string, { current: number; peak: number; created: number; destroyed: number }> = {};
    for (const [name, type] of this.types) {
      result[name] = {
        current: type.current,
        peak: type.peak,
        created: type.created,
        destroyed: type.destroyed,
      };
    }
    return result;
  }

  /** Get stats for a specific type */
  getTypeStats(name: string): TrackedType | undefined {
    return this.types.get(name);
  }

  /** Log a summary of all tracked types */
  logSummary(): void {
    for (const [name, type] of this.types) {
      const leaked = type.created - type.destroyed;
      const status = leaked > 0 ? '⚠' : '✓';
      ConsoleReporter.engine(
        `${status} ${name}: ${type.current} active (peak: ${type.peak}, created: ${type.created}, destroyed: ${type.destroyed})`
      );
    }
  }

  /** Start automatic periodic leak checks */
  startAutoCheck(intervalMs = 5000): void {
    this.stopAutoCheck();
    this.checkInterval = setInterval(() => {
      for (const type of this.types.values()) {
        if (type.current > this.warningThreshold) {
          ConsoleReporter.error(
            `Leak: ${type.name} at ${type.current} instances (peak: ${type.peak})`
          );
        }
      }
    }, intervalMs);
  }

  stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /** Reset all tracking data */
  reset(): void {
    this.types.clear();
  }

  /** Set the warning threshold */
  setThreshold(threshold: number): void {
    this.warningThreshold = threshold;
  }
}

/** Global leak detector singleton */
export const leakDetector = new LeakDetector();
