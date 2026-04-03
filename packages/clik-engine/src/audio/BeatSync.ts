/**
 * Beat synchronization system for rhythm-based gameplay.
 *
 * Usage:
 * ```
 * const beat = new BeatSync({ bpm: 120 });
 * beat.onBeat(() => flashUI());
 * beat.onMeasure(() => spawnEnemyWave());
 * beat.start();
 * // In update:
 * beat.update(delta);
 * ```
 */

export interface BeatSyncConfig {
  /** Beats per minute */
  bpm: number;
  /** Beats per measure (default: 4) */
  beatsPerMeasure?: number;
}

export type BeatCallback = (beatIndex: number) => void;
export type MeasureCallback = (measureIndex: number) => void;

export class BeatSync {
  private bpm: number;
  private beatsPerMeasure: number;
  private beatInterval: number; // ms per beat
  private elapsed = 0;
  private beatCount = 0;
  private measureCount = 0;
  private active = false;
  private beatCallbacks: BeatCallback[] = [];
  private measureCallbacks: MeasureCallback[] = [];

  constructor(config: BeatSyncConfig) {
    this.bpm = config.bpm;
    this.beatsPerMeasure = config.beatsPerMeasure ?? 4;
    this.beatInterval = 60000 / this.bpm;
  }

  /** Start the beat clock */
  start(): this {
    this.active = true;
    this.elapsed = 0;
    this.beatCount = 0;
    this.measureCount = 0;
    return this;
  }

  /** Stop the beat clock */
  stop(): this {
    this.active = false;
    return this;
  }

  /** Update the beat clock. Call each frame. */
  update(delta: number): void {
    if (!this.active) return;

    this.elapsed += delta;

    while (this.elapsed >= this.beatInterval) {
      this.elapsed -= this.beatInterval;
      this.beatCount++;

      for (const cb of this.beatCallbacks) cb(this.beatCount);

      if (this.beatCount % this.beatsPerMeasure === 0) {
        this.measureCount++;
        for (const cb of this.measureCallbacks) cb(this.measureCount);
      }
    }
  }

  /** Register a callback that fires on every beat */
  onBeat(callback: BeatCallback): this {
    this.beatCallbacks.push(callback);
    return this;
  }

  /** Register a callback that fires on every measure */
  onMeasure(callback: MeasureCallback): this {
    this.measureCallbacks.push(callback);
    return this;
  }

  /** Get progress toward next beat (0-1) */
  getBeatProgress(): number {
    return this.elapsed / this.beatInterval;
  }

  /** Quantize a time value to the nearest beat */
  quantize(timeMs: number): number {
    return Math.round(timeMs / this.beatInterval) * this.beatInterval;
  }

  /** Set new BPM */
  setBPM(bpm: number): this {
    this.bpm = bpm;
    this.beatInterval = 60000 / bpm;
    return this;
  }

  /** Get current BPM */
  getBPM(): number {
    return this.bpm;
  }

  /** Get beat interval in ms */
  getBeatInterval(): number {
    return this.beatInterval;
  }

  /** Get total beats counted */
  getTotalBeats(): number {
    return this.beatCount;
  }

  /** Get total measures counted */
  getTotalMeasures(): number {
    return this.measureCount;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Reset counters */
  reset(): void {
    this.elapsed = 0;
    this.beatCount = 0;
    this.measureCount = 0;
  }
}
