/**
 * Delta compression for network state sync.
 * Only sends changed fields, reducing bandwidth 60-80%.
 *
 * Usage:
 * ```
 * const delta = new DeltaCompression();
 * const full = { x: 100, y: 200, hp: 50, name: 'player' };
 * delta.setBaseline(full);
 *
 * const updated = { x: 105, y: 200, hp: 50, name: 'player' };
 * const diff = delta.encode(updated); // { x: 105 } — only changed fields
 *
 * const decoded = delta.decode(diff); // { x: 105, y: 200, hp: 50, name: 'player' }
 * ```
 */

export type StateObject = Record<string, unknown>;

export interface DeltaPacket {
  /** Changed fields only */
  changed: StateObject;
  /** Sequence number for ordering */
  seq: number;
}

export class DeltaCompression {
  private baseline: StateObject = {};
  private seq = 0;

  /** Set the baseline state (full state that deltas are computed against) */
  setBaseline(state: StateObject): void {
    this.baseline = { ...state };
  }

  /** Encode a state into a delta against the baseline. Returns only changed fields. */
  encode(state: StateObject): DeltaPacket {
    const changed: StateObject = {};
    for (const key of Object.keys(state)) {
      if (state[key] !== this.baseline[key]) {
        changed[key] = state[key];
      }
    }

    // Check for removed keys
    for (const key of Object.keys(this.baseline)) {
      if (!(key in state)) {
        changed[key] = undefined;
      }
    }

    this.seq++;
    return { changed, seq: this.seq };
  }

  /** Decode a delta packet by applying it to the baseline. Returns full state. */
  decode(packet: DeltaPacket): StateObject {
    const result = { ...this.baseline };
    for (const [key, value] of Object.entries(packet.changed)) {
      if (value === undefined) {
        delete result[key];
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /** Apply a delta to the baseline (update baseline after decode) */
  applyToBaseline(packet: DeltaPacket): void {
    for (const [key, value] of Object.entries(packet.changed)) {
      if (value === undefined) {
        delete this.baseline[key];
      } else {
        this.baseline[key] = value;
      }
    }
  }

  /** Get current baseline */
  getBaseline(): StateObject {
    return { ...this.baseline };
  }

  /** Get current sequence number */
  getSeq(): number {
    return this.seq;
  }

  /** Check if a delta is empty (no changes) */
  static isEmpty(packet: DeltaPacket): boolean {
    return Object.keys(packet.changed).length === 0;
  }

  /** Quantize a number to reduce precision (saves bandwidth) */
  static quantize(value: number, precision = 100): number {
    return Math.round(value * precision) / precision;
  }

  /** Reset to empty baseline */
  clear(): void {
    this.baseline = {};
    this.seq = 0;
  }
}
