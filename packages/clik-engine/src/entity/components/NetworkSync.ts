import { Component } from '../Component';
import type { StateSync } from '../../network/StateSync';

/**
 * Entity component that bridges the Entity system with StateSync.
 * Automatically registers/unregisters the entity and syncs position.
 */
export class NetworkSync extends Component {
  private stateSync: StateSync;
  private entityId: string;
  private _isLocal: boolean;

  /**
   * @param stateSync The StateSync instance to register with
   * @param entityId Unique network ID for this entity
   * @param isLocal True if this entity is controlled locally (sends state); false for remote entities (receives state)
   */
  constructor(stateSync: StateSync, entityId: string, isLocal: boolean) {
    super();
    this.stateSync = stateSync;
    this.entityId = entityId;
    this._isLocal = isLocal;
  }

  onAttach(): void {
    if (this._isLocal) {
      this.stateSync.registerLocal(this.entityId, this.entity);
    } else {
      this.stateSync.registerRemote(this.entityId, this.entity);
    }
  }

  update(_delta: number): void {
    // For remote entities, StateSync.update() handles interpolation
    // and writes directly to the target (this.entity) position.
    // For local entities, StateSync.sendLocalState() reads from target position.
    // No per-frame work needed here — StateSync manages both directions.
  }

  onDetach(): void {
    this.stateSync.unregister(this.entityId);
  }

  get isLocal(): boolean {
    return this._isLocal;
  }

  get networkId(): string {
    return this.entityId;
  }
}
