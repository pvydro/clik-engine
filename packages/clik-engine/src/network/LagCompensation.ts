import type { PositionLike } from '../utils/interfaces';

export interface HistoricalState {
  tick: number;
  positions: Map<string, PositionLike>;
}

/**
 * Server-side lag compensation using historical position snapshots.
 * Rewinds entity positions to verify hits at the time the client fired.
 *
 * Usage:
 * ```
 * const lagComp = new LagCompensation({ maxHistory: 30 });
 * // Each server tick:
 * lagComp.recordTick(tick, entityPositions);
 * // On hit request from client:
 * const wasHit = lagComp.verifyHit(clientTick, shooterPos, targetId, hitRadius);
 * ```
 */
export class LagCompensation {
  private history: HistoricalState[] = [];
  private maxHistory: number;

  constructor(config?: { maxHistory?: number }) {
    this.maxHistory = config?.maxHistory ?? 30;
  }

  /** Record entity positions for a server tick */
  recordTick(tick: number, positions: Map<string, PositionLike>): void {
    this.history.push({ tick, positions: new Map(positions) });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /** Get the historical state closest to a tick */
  getStateAtTick(tick: number): HistoricalState | null {
    if (this.history.length === 0) return null;

    let closest = this.history[0];
    let minDiff = Math.abs(closest.tick - tick);

    for (const state of this.history) {
      const diff = Math.abs(state.tick - tick);
      if (diff < minDiff) {
        closest = state;
        minDiff = diff;
      }
    }

    return closest;
  }

  /**
   * Verify a hit by rewinding to the client's tick.
   * Checks if the target was within hitRadius of the shot position at that tick.
   */
  verifyHit(
    clientTick: number,
    shooterPosition: PositionLike,
    targetId: string,
    hitRadius: number,
  ): boolean {
    const state = this.getStateAtTick(clientTick);
    if (!state) return false;

    const targetPos = state.positions.get(targetId);
    if (!targetPos) return false;

    const dx = targetPos.x - shooterPosition.x;
    const dy = targetPos.y - shooterPosition.y;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }

  /** Get the position of an entity at a historical tick */
  getPositionAtTick(tick: number, entityId: string): PositionLike | null {
    const state = this.getStateAtTick(tick);
    return state?.positions.get(entityId) ?? null;
  }

  /** Get current history depth */
  get historySize(): number {
    return this.history.length;
  }

  /** Get the tick range in history */
  getTickRange(): { oldest: number; newest: number } | null {
    if (this.history.length === 0) return null;
    return {
      oldest: this.history[0].tick,
      newest: this.history[this.history.length - 1].tick,
    };
  }

  /** Clear all history */
  clear(): void {
    this.history = [];
  }
}
