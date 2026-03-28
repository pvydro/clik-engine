import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface ComboDefinition {
  name: string;
  sequence: string[];
  /** Max time between inputs (ms) */
  timeout?: number;
}

/**
 * Detects input combos (sequences of actions within a time window).
 * Useful for fighting games, special moves, cheat codes.
 */
export class ComboDetector {
  private combos: ComboDefinition[] = [];
  private buffer: { action: string; time: number }[] = [];
  private maxBufferTime: number;
  private callbacks: Map<string, (() => void)[]> = new Map();

  constructor(maxBufferTimeMs = 1000) {
    this.maxBufferTime = maxBufferTimeMs;
  }

  /** Register a combo */
  addCombo(combo: ComboDefinition): this {
    this.combos.push(combo);
    return this;
  }

  /** Register a callback for when a combo is triggered */
  onCombo(comboName: string, callback: () => void): this {
    if (!this.callbacks.has(comboName)) {
      this.callbacks.set(comboName, []);
    }
    this.callbacks.get(comboName)!.push(callback);
    return this;
  }

  /**
   * Feed an action into the combo detector.
   * Call this when an action is justPressed.
   */
  input(action: string, time: number): string | null {
    // Add to buffer
    this.buffer.push({ action, time });

    // Prune old entries
    this.buffer = this.buffer.filter(b => time - b.time < this.maxBufferTime);

    // Check all combos
    for (const combo of this.combos) {
      const timeout = combo.timeout ?? 500;
      const seq = combo.sequence;

      if (this.buffer.length < seq.length) continue;

      // Check last N entries match the sequence
      const recent = this.buffer.slice(-seq.length);
      let matches = true;

      for (let i = 0; i < seq.length; i++) {
        if (recent[i].action !== seq[i]) {
          matches = false;
          break;
        }
        // Check timing between consecutive inputs
        if (i > 0 && recent[i].time - recent[i - 1].time > timeout) {
          matches = false;
          break;
        }
      }

      if (matches) {
        ConsoleReporter.input(`combo: ${combo.name}`);
        // Clear buffer to prevent re-triggering
        this.buffer = [];
        // Fire callbacks
        const cbs = this.callbacks.get(combo.name);
        if (cbs) {
          for (const cb of cbs) cb();
        }
        return combo.name;
      }
    }

    return null;
  }

  /** Clear the input buffer */
  clearBuffer(): void {
    this.buffer = [];
  }

  /** Remove a combo by name */
  removeCombo(name: string): void {
    this.combos = this.combos.filter(c => c.name !== name);
    this.callbacks.delete(name);
  }
}
