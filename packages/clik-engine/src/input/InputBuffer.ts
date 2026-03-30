/**
 * Input buffer for fighting-game-style input with timing windows.
 * Records recent action presses with timestamps for sequence detection.
 */
export class InputBuffer {
  private buffer: { action: string; time: number }[] = [];
  private windowMs: number;
  private maxSize: number;

  constructor(windowMs = 300, maxSize = 30) {
    this.windowMs = windowMs;
    this.maxSize = maxSize;
  }

  /** Record an action press */
  record(action: string, time = Date.now()): void {
    this.buffer.push({ action, time });
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /** Check if an action was pressed within the time window */
  wasActionInWindow(action: string, windowMs?: number, now = Date.now()): boolean {
    const w = windowMs ?? this.windowMs;
    const cutoff = now - w;
    return this.buffer.some(e => e.action === action && e.time >= cutoff);
  }

  /** Get the sequence of actions within the time window (oldest first) */
  getSequence(windowMs?: number, now = Date.now()): string[] {
    const w = windowMs ?? this.windowMs;
    const cutoff = now - w;
    return this.buffer.filter(e => e.time >= cutoff).map(e => e.action);
  }

  /** Check if a specific sequence was input within the window */
  matchSequence(sequence: string[], windowMs?: number, now = Date.now()): boolean {
    const recent = this.getSequence(windowMs, now);
    if (recent.length < sequence.length) return false;

    // Check if the sequence appears at the end of recent inputs
    const start = recent.length - sequence.length;
    for (let i = 0; i < sequence.length; i++) {
      if (recent[start + i] !== sequence[i]) return false;
    }
    return true;
  }

  /** Clear the buffer */
  clear(): void {
    this.buffer.length = 0;
  }

  /** Get buffer size */
  get size(): number {
    return this.buffer.length;
  }
}
