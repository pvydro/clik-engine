import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { NetworkManager } from './NetworkManager';
import type { EntityStateSnapshot, SyncStateData } from './protocol';

interface SyncedEntity {
  id: string;
  target: { x: number; y: number };
  isLocal: boolean;
  /** Buffer of received states for interpolation */
  stateBuffer: { x: number; y: number; vx: number; vy: number; time: number; state?: Record<string, unknown> }[];
}

export interface StateSyncConfig {
  /** How often to send local entity state (ms, default: 50 = 20Hz) */
  syncRate?: number;
  /** Interpolation delay in ms (default: 100) — trades latency for smoothness */
  interpolationDelay?: number;
  /** Max extrapolation time in ms (default: 200) */
  maxExtrapolation?: number;
}

/**
 * Client-side entity state synchronization with interpolation.
 * Sends local entity positions at a fixed rate, receives and interpolates remote entities.
 */
export class StateSync {
  private network: NetworkManager;
  private config: Required<StateSyncConfig>;
  private entities: Map<string, SyncedEntity> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private messageCleanup: ((type: string, data: unknown) => void) | null = null;

  constructor(network: NetworkManager, config?: StateSyncConfig) {
    this.network = network;
    this.config = {
      syncRate: config?.syncRate ?? 50,
      interpolationDelay: config?.interpolationDelay ?? 100,
      maxExtrapolation: config?.maxExtrapolation ?? 200,
    };

    this.messageCleanup = (type: string, data: unknown) => {
      if (type === 'sync:state') {
        this.receiveState(data as SyncStateData);
      }
    };
    network.onMessage(this.messageCleanup);
  }

  /** Register a local entity (its state will be sent to the server) */
  registerLocal(id: string, target: { x: number; y: number }): void {
    this.entities.set(id, { id, target, isLocal: true, stateBuffer: [] });
  }

  /** Register a remote entity (its state will be interpolated from server data) */
  registerRemote(id: string, target: { x: number; y: number }): void {
    this.entities.set(id, { id, target, isLocal: false, stateBuffer: [] });
  }

  /** Unregister an entity */
  unregister(id: string): void {
    this.entities.delete(id);
  }

  /** Start sending local entity state at the configured sync rate */
  start(): void {
    this.stop();
    this.syncTimer = setInterval(() => this.sendLocalState(), this.config.syncRate);
    ConsoleReporter.engine(`StateSync started (${this.config.syncRate}ms interval)`);
  }

  /** Stop sending state */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Update interpolation — call this every frame.
   * Moves remote entities toward their target positions.
   */
  update(delta: number): void {
    const now = Date.now();
    const renderTime = now - this.config.interpolationDelay;

    for (const entity of this.entities.values()) {
      if (entity.isLocal) continue;
      if (entity.stateBuffer.length < 2) continue;

      // Find the two states to interpolate between
      const buffer = entity.stateBuffer;
      let i = 0;
      while (i < buffer.length - 1 && buffer[i + 1].time <= renderTime) {
        i++;
      }

      // Drop old states we've passed
      if (i > 0) {
        buffer.splice(0, i);
      }

      if (buffer.length >= 2) {
        const a = buffer[0];
        const b = buffer[1];
        const t = Math.min((renderTime - a.time) / (b.time - a.time), 1);

        entity.target.x = a.x + (b.x - a.x) * t;
        entity.target.y = a.y + (b.y - a.y) * t;
      } else if (buffer.length === 1) {
        // Extrapolate if within max extrapolation time
        const last = buffer[0];
        const elapsed = now - last.time;
        if (elapsed < this.config.maxExtrapolation) {
          entity.target.x = last.x + (last.vx ?? 0) * (elapsed / 1000);
          entity.target.y = last.y + (last.vy ?? 0) * (elapsed / 1000);
        }
      }
    }
  }

  /** Get synced entity info */
  getEntity(id: string): SyncedEntity | undefined {
    return this.entities.get(id);
  }

  /** Get all registered entities */
  getAllEntities(): SyncedEntity[] {
    return Array.from(this.entities.values());
  }

  destroy(): void {
    this.stop();
    if (this.messageCleanup) {
      this.network.offMessage(this.messageCleanup);
      this.messageCleanup = null;
    }
    this.entities.clear();
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private sendLocalState(): void {
    const localEntities: EntityStateSnapshot[] = [];
    for (const entity of this.entities.values()) {
      if (!entity.isLocal) continue;
      localEntities.push({
        id: entity.id,
        x: entity.target.x,
        y: entity.target.y,
      });
    }

    if (localEntities.length > 0) {
      this.network.send('sync:update', { entities: localEntities });
    }
  }

  private receiveState(data: SyncStateData): void {
    for (const snapshot of data.entities) {
      const entity = this.entities.get(snapshot.id);
      if (!entity || entity.isLocal) continue;

      entity.stateBuffer.push({
        x: snapshot.x,
        y: snapshot.y,
        vx: snapshot.vx ?? 0,
        vy: snapshot.vy ?? 0,
        time: data.serverTime,
        state: snapshot.state,
      });

      // Keep buffer bounded
      while (entity.stateBuffer.length > 30) {
        entity.stateBuffer.shift();
      }
    }
  }
}
