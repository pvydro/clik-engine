import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { NetworkManager } from './NetworkManager';
import type { PlayerInfo, RoomJoinedData, RoomActionData } from './protocol';

type PlayerHandler = (player: PlayerInfo) => void;
type ActionHandler = (data: RoomActionData) => void;
type StateHandler = (state: Record<string, unknown>) => void;

/**
 * Represents the client's view of a game room.
 * Manages players, state, and dispatches room events.
 */
export class Room {
  private network: NetworkManager;
  private _roomId: string | null = null;
  private _hostId: string | null = null;
  private _players: Map<string, PlayerInfo> = new Map();
  private _gameState: Record<string, unknown> = {};

  private onPlayerJoinedHandlers: PlayerHandler[] = [];
  private onPlayerLeftHandlers: ((id: string) => void)[] = [];
  private onPlayerUpdatedHandlers: PlayerHandler[] = [];
  private onActionHandlers: ActionHandler[] = [];
  private onStateChangedHandlers: StateHandler[] = [];
  private messageCleanup: ((type: string, data: unknown) => void) | null = null;

  constructor(network: NetworkManager) {
    this.network = network;

    this.messageCleanup = (type: string, data: unknown) => {
      switch (type) {
        case 'room:joined': {
          const d = data as RoomJoinedData;
          this._roomId = d.roomId;
          this._players.clear();
          for (const p of d.players) {
            this._players.set(p.id, p);
            if (p.id !== d.playerId) {
              // Existing players
            }
          }
          ConsoleReporter.engine(`Room joined: ${d.roomId} with ${d.players.length} players`);
          break;
        }

        case 'room:player_joined': {
          const p = data as PlayerInfo;
          this._players.set(p.id, p);
          for (const h of this.onPlayerJoinedHandlers) h(p);
          ConsoleReporter.engine(`Player joined room: ${p.id}`);
          break;
        }

        case 'room:player_left': {
          const d = data as { id: string };
          this._players.delete(d.id);
          for (const h of this.onPlayerLeftHandlers) h(d.id);
          ConsoleReporter.engine(`Player left room: ${d.id}`);
          break;
        }

        case 'room:player_updated': {
          const p = data as PlayerInfo;
          this._players.set(p.id, p);
          for (const h of this.onPlayerUpdatedHandlers) h(p);
          break;
        }

        case 'room:state': {
          this._gameState = data as Record<string, unknown>;
          for (const h of this.onStateChangedHandlers) h(this._gameState);
          break;
        }

        case 'room:action': {
          const d = data as RoomActionData;
          for (const h of this.onActionHandlers) h(d);
          break;
        }
      }
    };
    network.onMessage(this.messageCleanup);
  }

  /** Leave the current room */
  leave(): void {
    if (this._roomId) {
      this.network.send('room:leave');
      this._roomId = null;
      this._players.clear();
    }
  }

  /** Set ready status */
  ready(isReady = true): void {
    this.network.send('room:ready', { ready: isReady });
  }

  /** Send a game action to all players in the room */
  sendAction(type: string, data?: Record<string, unknown>): void {
    this.network.send('room:action', { type, ...data });
  }

  /** Send game state update (host typically does this) */
  sendState(state: Record<string, unknown>): void {
    this.network.send('room:state', state);
  }

  /** Get the room ID */
  get roomId(): string | null { return this._roomId; }

  /** Get the host player ID */
  get hostId(): string | null { return this._hostId; }

  /** Check if the local player is the host */
  get isHost(): boolean {
    return this._hostId === this.network.getPlayerId();
  }

  /** Get all players in the room */
  get players(): PlayerInfo[] {
    return Array.from(this._players.values());
  }

  /** Get the current game state */
  get gameState(): Record<string, unknown> {
    return { ...this._gameState };
  }

  /** Get player count */
  get playerCount(): number {
    return this._players.size;
  }

  /** Check if in a room */
  get isInRoom(): boolean {
    return this._roomId !== null;
  }

  // ── Event Handlers ──────────────────────────────────────────────────────

  onPlayerJoined(handler: PlayerHandler): this {
    this.onPlayerJoinedHandlers.push(handler);
    return this;
  }

  onPlayerLeft(handler: (id: string) => void): this {
    this.onPlayerLeftHandlers.push(handler);
    return this;
  }

  onPlayerUpdated(handler: PlayerHandler): this {
    this.onPlayerUpdatedHandlers.push(handler);
    return this;
  }

  onAction(handler: ActionHandler): this {
    this.onActionHandlers.push(handler);
    return this;
  }

  onStateChanged(handler: StateHandler): this {
    this.onStateChangedHandlers.push(handler);
    return this;
  }

  destroy(): void {
    if (this._roomId) this.leave();
    if (this.messageCleanup) {
      this.network.offMessage(this.messageCleanup);
      this.messageCleanup = null;
    }
    this.onPlayerJoinedHandlers.length = 0;
    this.onPlayerLeftHandlers.length = 0;
    this.onPlayerUpdatedHandlers.length = 0;
    this.onActionHandlers.length = 0;
    this.onStateChangedHandlers.length = 0;
  }
}
