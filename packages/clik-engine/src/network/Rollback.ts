/**
 * Rollback netcode for real-time action games (GGPO-style).
 * Stores frame snapshots and re-simulates on late remote input.
 *
 * Usage:
 * ```
 * const rollback = new RollbackManager<GameState, Input>({
 *   maxRollbackFrames: 8,
 *   serialize: state => JSON.parse(JSON.stringify(state)),
 *   simulate: (state, inputs) => gameStep(state, inputs),
 * });
 * rollback.saveFrame(0, currentState);
 * rollback.addLocalInput(0, localInput);
 * // When remote input arrives late:
 * rollback.addRemoteInput(frameNum, remoteInput);
 * const result = rollback.rollbackIfNeeded(currentFrame);
 * ```
 */

export interface RollbackConfig<TState, TInput> {
  /** Max frames we can roll back */
  maxRollbackFrames?: number;
  /** Deep-copy function for state snapshots */
  serialize: (state: TState) => TState;
  /** Simulate one frame given state and all player inputs */
  simulate: (state: TState, inputs: Map<number, TInput>) => TState;
  /** Input delay in frames (adds latency but reduces rollbacks) */
  inputDelay?: number;
}

export interface RollbackResult<TState> {
  /** Whether a rollback occurred */
  rolledBack: boolean;
  /** How many frames were re-simulated */
  frameCount: number;
  /** The corrected state after re-simulation */
  state: TState | null;
}

interface FrameSnapshot<TState, TInput> {
  state: TState;
  inputs: Map<number, TInput>;
  confirmed: boolean;
}

export class RollbackManager<TState, TInput> {
  private config: Required<RollbackConfig<TState, TInput>>;
  private snapshots: Map<number, FrameSnapshot<TState, TInput>> = new Map();
  private oldestFrame = 0;
  private rollbackCount = 0;

  constructor(config: RollbackConfig<TState, TInput>) {
    this.config = {
      maxRollbackFrames: config.maxRollbackFrames ?? 8,
      inputDelay: config.inputDelay ?? 0,
      ...config,
    };
  }

  /** Save a frame snapshot */
  saveFrame(frame: number, state: TState): void {
    this.snapshots.set(frame, {
      state: this.config.serialize(state),
      inputs: new Map(),
      confirmed: false,
    });

    // Trim old snapshots
    const minFrame = frame - this.config.maxRollbackFrames * 2;
    for (const key of this.snapshots.keys()) {
      if (key < minFrame) this.snapshots.delete(key);
    }
  }

  /** Add local player input for a frame */
  addLocalInput(frame: number, input: TInput, playerId = 0): void {
    const snapshot = this.snapshots.get(frame);
    if (snapshot) {
      snapshot.inputs.set(playerId, input);
    }
  }

  /** Add remote player input (may arrive late, triggering rollback) */
  addRemoteInput(frame: number, input: TInput, playerId = 1): void {
    const snapshot = this.snapshots.get(frame);
    if (snapshot) {
      snapshot.inputs.set(playerId, input);
    }
  }

  /**
   * Check if rollback is needed and re-simulate if so.
   * Call this after receiving remote input.
   * Returns the corrected state or null if no rollback needed.
   */
  rollbackIfNeeded(currentFrame: number): RollbackResult<TState> {
    // Find the earliest unconfirmed frame with new input
    let rollbackFrame = -1;
    for (let f = currentFrame - this.config.maxRollbackFrames; f <= currentFrame; f++) {
      const snapshot = this.snapshots.get(f);
      if (snapshot && !snapshot.confirmed && snapshot.inputs.size > 0) {
        rollbackFrame = f;
        break;
      }
    }

    if (rollbackFrame < 0) {
      return { rolledBack: false, frameCount: 0, state: null };
    }

    // Roll back to the snapshot state
    const snapshot = this.snapshots.get(rollbackFrame)!;
    let state = this.config.serialize(snapshot.state);

    // Re-simulate from rollback frame to current frame
    const frameCount = currentFrame - rollbackFrame;
    for (let f = rollbackFrame; f < currentFrame; f++) {
      const frameSnapshot = this.snapshots.get(f);
      const inputs = frameSnapshot?.inputs ?? new Map();
      state = this.config.simulate(state, inputs);

      // Mark as confirmed
      if (frameSnapshot) frameSnapshot.confirmed = true;
    }

    this.rollbackCount++;
    return { rolledBack: true, frameCount, state };
  }

  /** Get total rollback count (for debugging) */
  get totalRollbacks(): number { return this.rollbackCount; }

  /** Get the input delay setting */
  get inputDelay(): number { return this.config.inputDelay; }

  /** Get snapshot count (for debugging) */
  get snapshotCount(): number { return this.snapshots.size; }

  /** Clear all snapshots */
  clear(): void {
    this.snapshots.clear();
    this.rollbackCount = 0;
  }
}
