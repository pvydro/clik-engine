/**
 * Measures and tracks network latency (RTT) and jitter.
 *
 * Usage:
 * ```
 * const monitor = new LatencyMonitor();
 * // When sending ping:
 * const pingId = monitor.sendPing();
 * // When pong received:
 * monitor.receivePong(pingId);
 * // Read stats:
 * console.log(monitor.getRTT(), monitor.getJitter());
 * ```
 */

export class LatencyMonitor {
  private pendingPings: Map<number, number> = new Map();
  private rttSamples: number[] = [];
  private maxSamples: number;
  private nextPingId = 0;

  constructor(maxSamples = 30) {
    this.maxSamples = maxSamples;
  }

  /** Record a ping being sent. Returns the ping ID. */
  sendPing(): number {
    const id = this.nextPingId++;
    this.pendingPings.set(id, Date.now());
    return id;
  }

  /** Record a pong response for a ping ID */
  receivePong(pingId: number): number {
    const sendTime = this.pendingPings.get(pingId);
    if (sendTime === undefined) return -1;

    this.pendingPings.delete(pingId);
    const rtt = Date.now() - sendTime;

    this.rttSamples.push(rtt);
    if (this.rttSamples.length > this.maxSamples) {
      this.rttSamples.shift();
    }

    return rtt;
  }

  /** Get average RTT in ms */
  getRTT(): number {
    if (this.rttSamples.length === 0) return 0;
    return this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length;
  }

  /** Get jitter (standard deviation of RTT) */
  getJitter(): number {
    if (this.rttSamples.length < 2) return 0;
    const mean = this.getRTT();
    const variance = this.rttSamples.reduce((sum, s) => sum + (s - mean) ** 2, 0) / this.rttSamples.length;
    return Math.sqrt(variance);
  }

  /** Get one-way latency estimate (RTT / 2) */
  getOneWayLatency(): number {
    return this.getRTT() / 2;
  }

  /** Get min/max/avg RTT */
  getStats(): { min: number; max: number; avg: number; jitter: number; samples: number } {
    if (this.rttSamples.length === 0) {
      return { min: 0, max: 0, avg: 0, jitter: 0, samples: 0 };
    }
    return {
      min: Math.min(...this.rttSamples),
      max: Math.max(...this.rttSamples),
      avg: this.getRTT(),
      jitter: this.getJitter(),
      samples: this.rttSamples.length,
    };
  }

  /** Get recent RTT samples */
  getSamples(): readonly number[] {
    return this.rttSamples;
  }

  /** Number of pending (unanswered) pings */
  get pendingCount(): number {
    return this.pendingPings.size;
  }

  /** Clear all data */
  clear(): void {
    this.pendingPings.clear();
    this.rttSamples = [];
  }
}
