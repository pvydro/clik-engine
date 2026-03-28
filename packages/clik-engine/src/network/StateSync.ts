import { NetworkManager } from './NetworkManager';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface SyncedEntity {
  id: string;
  x: number;
  y: number;
  velocityX?: number;
  velocityY?: number;
  rotation?: number;
  data?: Record<string, unknown>;
}

export interface StateSyncConfig {
  /** How often to send state updates (ms) */
  sendRate?: number;
  /** Interpolation delay for remote entities (ms) */
  interpolationDelay?: number;
  /** Enable client-side prediction */
  prediction?: boolean;
}

interface EntitySnapshot {
  entity: SyncedEntity;
  timestamp: number;
}

/**
 * Synchronizes entity state between clients via the NetworkManager.
 * Supports interpolation and client-side prediction.
 */
export class StateSync {
  private network: NetworkManager;
  private config: Required<StateSyncConfig>;
  private localEntities: Map<string, SyncedEntity> = new Map();
  private remoteSnapshots: Map<string, EntitySnapshot[]> = new Map();
  private sendTimer = 0;
  private serverTime = 0;
  private localPlayerId: string | null = null;

  constructor(network: NetworkManager, config?: StateSyncConfig) {
    this.network = network;
    this.config = {
      sendRate: config?.sendRate ?? 50,
      interpolationDelay: config?.interpolationDelay ?? 100,
      prediction: config?.prediction ?? true,
    };

    // Listen for state updates from server
    network.on('sync:state', (data: unknown) => {
      const update = data as { entities: SyncedEntity[]; serverTime: number };
      this.serverTime = update.serverTime;
      this.applyRemoteState(update.entities);
    });

    network.on('sync:full', (data: unknown) => {
      const full = data as { entities: SyncedEntity[]; serverTime: number; playerId: string };
      this.serverTime = full.serverTime;
      this.localPlayerId = full.playerId;
      for (const entity of full.entities) {
        this.remoteSnapshots.set(entity.id, [{ entity, timestamp: full.serverTime }]);
      }
      ConsoleReporter.engine(`StateSync: full state received (${full.entities.length} entities)`);
    });
  }

  /** Register a local entity to be synced */
  registerLocal(entity: SyncedEntity): void {
    this.localEntities.set(entity.id, entity);
  }

  /** Unregister a local entity */
  unregisterLocal(id: string): void {
    this.localEntities.delete(id);
  }

  /** Update local entity state (call each frame for controlled entities) */
  updateLocal(id: string, state: Partial<SyncedEntity>): void {
    const entity = this.localEntities.get(id);
    if (entity) {
      Object.assign(entity, state);
    }
  }

  /** Call each frame to send local state and interpolate remote entities */
  update(delta: number): void {
    // Send local state at configured rate
    this.sendTimer += delta;
    if (this.sendTimer >= this.config.sendRate) {
      this.sendTimer = 0;
      this.sendLocalState();
    }
  }

  /**
   * Get interpolated position for a remote entity.
   * Returns the smoothly interpolated state between two server snapshots.
   */
  getInterpolatedState(entityId: string): SyncedEntity | null {
    const snapshots = this.remoteSnapshots.get(entityId);
    if (!snapshots || snapshots.length < 2) {
      return snapshots?.[0]?.entity ?? null;
    }

    const renderTime = this.serverTime - this.config.interpolationDelay;

    // Find the two snapshots to interpolate between
    let before: EntitySnapshot | null = null;
    let after: EntitySnapshot | null = null;

    for (let i = 0; i < snapshots.length - 1; i++) {
      if (snapshots[i].timestamp <= renderTime && snapshots[i + 1].timestamp >= renderTime) {
        before = snapshots[i];
        after = snapshots[i + 1];
        break;
      }
    }

    if (!before || !after) {
      return snapshots[snapshots.length - 1].entity;
    }

    const t = (renderTime - before.timestamp) / (after.timestamp - before.timestamp);
    return {
      id: entityId,
      x: before.entity.x + (after.entity.x - before.entity.x) * t,
      y: before.entity.y + (after.entity.y - before.entity.y) * t,
      rotation: before.entity.rotation !== undefined && after.entity.rotation !== undefined
        ? before.entity.rotation + (after.entity.rotation - before.entity.rotation) * t
        : undefined,
      velocityX: after.entity.velocityX,
      velocityY: after.entity.velocityY,
      data: after.entity.data,
    };
  }

  /** Get all remote entity IDs */
  getRemoteEntityIds(): string[] {
    return Array.from(this.remoteSnapshots.keys()).filter(id => !this.localEntities.has(id));
  }

  /** Check if an entity is locally controlled */
  isLocal(entityId: string): boolean {
    return this.localEntities.has(entityId);
  }

  private sendLocalState(): void {
    if (!this.network.isConnected()) return;
    const entities = Array.from(this.localEntities.values());
    if (entities.length > 0) {
      this.network.send('sync:update', { entities, timestamp: Date.now() });
    }
  }

  private applyRemoteState(entities: SyncedEntity[]): void {
    const now = this.serverTime;
    for (const entity of entities) {
      // Skip local entities (we're authoritative for those)
      if (this.localEntities.has(entity.id)) continue;

      if (!this.remoteSnapshots.has(entity.id)) {
        this.remoteSnapshots.set(entity.id, []);
      }

      const snapshots = this.remoteSnapshots.get(entity.id)!;
      snapshots.push({ entity, timestamp: now });

      // Keep only last 20 snapshots
      while (snapshots.length > 20) {
        snapshots.shift();
      }
    }
  }

  getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  getServerTime(): number {
    return this.serverTime;
  }
}
