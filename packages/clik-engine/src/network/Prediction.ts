/**
 * Client-side input prediction for responsive multiplayer.
 * Applies inputs locally immediately, then corrects when server confirms.
 *
 * Usage:
 * ```
 * const prediction = new InputPrediction();
 * // On local input:
 * prediction.addInput({ seq: frameNum, input: { moveX: 1 }, predictedState: currentState });
 * // On server confirmation:
 * prediction.confirmInput(serverSeq, serverState);
 * // Get correction if needed:
 * const correction = prediction.getCorrection();
 * ```
 */

export interface PredictedInput<TInput = unknown, TState = unknown> {
  seq: number;
  input: TInput;
  predictedState: TState;
}

export interface PredictionCorrection<TState = unknown> {
  /** Whether correction is needed */
  needsCorrection: boolean;
  /** The authoritative server state */
  serverState: TState | null;
  /** Number of inputs to re-simulate */
  replayCount: number;
}

export class InputPrediction<TInput = unknown, TState = unknown> {
  private pendingInputs: PredictedInput<TInput, TState>[] = [];
  private lastConfirmedSeq = -1;
  private lastServerState: TState | null = null;
  private maxPendingInputs: number;

  constructor(maxPendingInputs = 120) {
    this.maxPendingInputs = maxPendingInputs;
  }

  /** Record a local input with its predicted result */
  addInput(input: PredictedInput<TInput, TState>): void {
    this.pendingInputs.push(input);
    if (this.pendingInputs.length > this.maxPendingInputs) {
      this.pendingInputs.shift();
    }
  }

  /**
   * Confirm an input from the server.
   * Removes all inputs up to and including the confirmed sequence.
   * Returns inputs that need to be re-simulated.
   */
  confirmInput(serverSeq: number, serverState: TState): PredictedInput<TInput, TState>[] {
    this.lastConfirmedSeq = serverSeq;
    this.lastServerState = serverState;

    // Remove all inputs up to confirmed
    const replayIdx = this.pendingInputs.findIndex(i => i.seq > serverSeq);
    if (replayIdx === -1) {
      this.pendingInputs = [];
      return [];
    }

    const toReplay = this.pendingInputs.slice(replayIdx);
    this.pendingInputs = toReplay;
    return toReplay;
  }

  /** Get correction info (call after confirmInput) */
  getCorrection(): PredictionCorrection<TState> {
    return {
      needsCorrection: this.pendingInputs.length > 0 && this.lastServerState !== null,
      serverState: this.lastServerState,
      replayCount: this.pendingInputs.length,
    };
  }

  /** Get all pending (unconfirmed) inputs */
  getPendingInputs(): readonly PredictedInput<TInput, TState>[] {
    return this.pendingInputs;
  }

  get pendingCount(): number { return this.pendingInputs.length; }
  get lastConfirmedSequence(): number { return this.lastConfirmedSeq; }

  /** Clear all pending inputs */
  clear(): void {
    this.pendingInputs = [];
    this.lastConfirmedSeq = -1;
    this.lastServerState = null;
  }
}
