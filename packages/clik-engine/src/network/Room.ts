import { NetworkManager } from './NetworkManager';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface RoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  data?: Record<string, unknown>;
}

export class Room {
  private network: NetworkManager;
  private _roomId: string | null = null;
  private _players: Map<string, RoomPlayer> = new Map();
  private _localPlayerId: string | null = null;
  private _state: Record<string, unknown> = {};
  private onPlayerJoinCb?: (player: RoomPlayer) => void;
  private onPlayerLeaveCb?: (playerId: string) => void;
  private onStateChangeCb?: (state: Record<string, unknown>) => void;

  constructor(network: NetworkManager) {
    this.network = network;

    network.on('room:joined', (data: unknown) => {
      const d = data as { roomId: string; playerId: string; players: RoomPlayer[] };
      this._roomId = d.roomId;
      this._localPlayerId = d.playerId;
      for (const p of d.players) {
        this._players.set(p.id, p);
      }
      ConsoleReporter.engine(`Room: joined ${d.roomId} as ${d.playerId}`);
    });

    network.on('room:player_joined', (data: unknown) => {
      const player = data as RoomPlayer;
      this._players.set(player.id, player);
      this.onPlayerJoinCb?.(player);
      ConsoleReporter.engine(`Room: player joined — ${player.name}`);
    });

    network.on('room:player_left', (data: unknown) => {
      const d = data as { id: string };
      this._players.delete(d.id);
      this.onPlayerLeaveCb?.(d.id);
      ConsoleReporter.engine(`Room: player left — ${d.id}`);
    });

    network.on('room:state', (data: unknown) => {
      this._state = data as Record<string, unknown>;
      this.onStateChangeCb?.(this._state);
    });
  }

  create(options?: { maxPlayers?: number; name?: string }): void {
    this.network.send('room:create', options);
  }

  join(roomId: string): void {
    this.network.send('room:join', { roomId });
  }

  leave(): void {
    this.network.send('room:leave', { roomId: this._roomId });
    this._roomId = null;
    this._players.clear();
  }

  setReady(ready: boolean): void {
    this.network.send('room:ready', { ready });
  }

  sendState(state: Record<string, unknown>): void {
    this.network.send('room:state', state);
  }

  sendAction(action: string, data?: unknown): void {
    this.network.send('room:action', { action, data });
  }

  onPlayerJoin(cb: (player: RoomPlayer) => void): this {
    this.onPlayerJoinCb = cb;
    return this;
  }

  onPlayerLeave(cb: (playerId: string) => void): this {
    this.onPlayerLeaveCb = cb;
    return this;
  }

  onStateChange(cb: (state: Record<string, unknown>) => void): this {
    this.onStateChangeCb = cb;
    return this;
  }

  get roomId(): string | null { return this._roomId; }
  get localPlayerId(): string | null { return this._localPlayerId; }
  get players(): RoomPlayer[] { return Array.from(this._players.values()); }
  get playerCount(): number { return this._players.size; }
  get state(): Record<string, unknown> { return this._state; }
  get isInRoom(): boolean { return this._roomId !== null; }
}
