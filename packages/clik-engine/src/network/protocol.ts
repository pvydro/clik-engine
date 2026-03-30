/**
 * Network protocol types matching clik-server message format.
 * All messages are JSON with { type: string, data: unknown }.
 */

// ── Connection States ─────────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ── Room States ───────────────────────────────────────────────────────────

export type RoomState = 'waiting' | 'playing' | 'finished';

// ── Server → Client Messages ──────────────────────────────────────────────

export interface ServerMessage {
  type: string;
  data: unknown;
}

export interface ConnectedData {
  playerId: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  host: string;
  state: RoomState;
}

export interface PlayerInfo {
  id: string;
  name: string;
  ready: boolean;
}

export interface RoomJoinedData {
  roomId: string;
  playerId: string;
  players: PlayerInfo[];
}

export interface RoomActionData {
  playerId: string;
  [key: string]: unknown;
}

export interface SyncStateData {
  entities: EntityStateSnapshot[];
  serverTime: number;
}

export interface EntityStateSnapshot {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  state?: Record<string, unknown>;
}

export interface ErrorData {
  message: string;
}

// ── Client → Server Messages ──────────────────────────────────────────────

export interface ClientMessage {
  type: string;
  data?: unknown;
}

// ── Network Configuration ─────────────────────────────────────────────────

export interface NetworkConfig {
  /** WebSocket server URL (e.g. ws://localhost:8080) */
  url: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Heartbeat interval in ms (default: 5000) */
  heartbeatInterval?: number;
  /** Max reconnection attempts (default: 10) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  reconnectBaseDelay?: number;
}
