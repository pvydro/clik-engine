import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

export interface ServerConfig {
  port?: number;
  maxRooms?: number;
  maxPlayersPerRoom?: number;
  maxMessagesPerSecond?: number;
  maxPayloadBytes?: number;
  roomTimeoutMs?: number;
}

export interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string | null;
  ready: boolean;
  messageCount: number;
  messageResetTime: number;
}

export interface Room {
  id: string;
  name: string;
  host: string;
  maxPlayers: number;
  state: 'waiting' | 'playing' | 'finished';
  players: Map<string, Player>;
  gameState: Record<string, unknown>;
  lastActivity: number;
}

/**
 * Testable, class-based WebSocket matchmaking server.
 */
export class ClikServer {
  private config: Required<ServerConfig>;
  private wss: WebSocketServer | null = null;
  private httpServer: http.Server | null = null;
  readonly players = new Map<string, Player>();
  readonly rooms = new Map<string, Room>();
  private nextId = 1;
  private roomCleanupTimer: ReturnType<typeof setInterval> | null = null;
  private startTime = Date.now();

  constructor(config?: ServerConfig) {
    this.config = {
      port: config?.port ?? 8080,
      maxRooms: config?.maxRooms ?? 100,
      maxPlayersPerRoom: config?.maxPlayersPerRoom ?? 8,
      maxMessagesPerSecond: config?.maxMessagesPerSecond ?? 60,
      maxPayloadBytes: config?.maxPayloadBytes ?? 65536,
      roomTimeoutMs: config?.roomTimeoutMs ?? 300000, // 5 minutes
    };
  }

  /** Start the server */
  start(): void {
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getHealth()));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket) => {
      this.onConnection(ws);
    });

    this.httpServer.listen(this.config.port);
    console.log(`clik-server running on ws://localhost:${this.config.port}`);

    // Periodic room cleanup
    this.roomCleanupTimer = setInterval(() => this.cleanupRooms(), 30000);

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /** Gracefully shut down the server */
  shutdown(): void {
    console.log('clik-server shutting down...');

    // Notify all players
    for (const player of this.players.values()) {
      this.send(player.ws, 'server:shutdown', { message: 'Server is shutting down' });
      player.ws.close(1001, 'Server shutdown');
    }

    if (this.roomCleanupTimer) {
      clearInterval(this.roomCleanupTimer);
      this.roomCleanupTimer = null;
    }

    this.wss?.close();
    this.httpServer?.close();
    this.players.clear();
    this.rooms.clear();
  }

  /** Get server health information */
  getHealth(): { uptime: number; players: number; rooms: number } {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      players: this.players.size,
      rooms: this.rooms.size,
    };
  }

  // ── Connection handling ─────────────────────────────────────────────

  private onConnection(ws: WebSocket): void {
    const playerId = `p${this.nextId++}`;
    const player: Player = {
      id: playerId,
      name: `Player ${playerId}`,
      ws,
      roomId: null,
      ready: false,
      messageCount: 0,
      messageResetTime: Date.now(),
    };
    this.players.set(playerId, player);
    this.send(ws, 'connected', { playerId });

    ws.on('message', (data: Buffer) => {
      // Payload size check
      if (data.length > this.config.maxPayloadBytes) {
        this.send(ws, 'error', { message: 'Payload too large' });
        return;
      }

      // Rate limiting
      const now = Date.now();
      if (now - player.messageResetTime > 1000) {
        player.messageCount = 0;
        player.messageResetTime = now;
      }
      player.messageCount++;
      if (player.messageCount > this.config.maxMessagesPerSecond) {
        this.send(ws, 'error', { message: 'Rate limit exceeded' });
        return;
      }

      try {
        const msg = JSON.parse(data.toString());
        if (typeof msg.type !== 'string') {
          this.send(ws, 'error', { message: 'Invalid message: type must be a string' });
          return;
        }
        this.handleMessage(player, msg.type, msg.data ?? {});
      } catch {
        this.send(ws, 'error', { message: 'Invalid JSON' });
      }
    });

    ws.on('close', () => {
      if (player.roomId) this.leaveRoom(player);
      this.players.delete(playerId);
    });
  }

  // ── Message handling ────────────────────────────────────────────────

  handleMessage(player: Player, type: string, data: unknown): void {
    const d = data as Record<string, unknown>;

    switch (type) {
      case '__heartbeat':
        break;

      case 'lobby:list':
        this.send(player.ws, 'lobby:rooms', this.getRoomList());
        break;

      case 'lobby:create': {
        if (this.rooms.size >= this.config.maxRooms) {
          this.send(player.ws, 'error', { message: 'Server room limit reached' });
          break;
        }
        const name = typeof d.name === 'string' ? d.name : 'Game Room';
        const maxPlayers = typeof d.maxPlayers === 'number'
          ? Math.min(d.maxPlayers, this.config.maxPlayersPerRoom)
          : 4;
        const room = this.createRoom(player, name, maxPlayers);
        this.send(player.ws, 'lobby:room_created', this.roomToJSON(room));
        this.send(player.ws, 'room:joined', {
          roomId: room.id,
          playerId: player.id,
          players: Array.from(room.players.values()).map(this.playerToJSON),
        });
        this.broadcastLobby();
        break;
      }

      case 'lobby:join':
      case 'room:join': {
        const roomId = d.roomId as string;
        const room = this.rooms.get(roomId);
        if (!room) { this.send(player.ws, 'error', { message: 'Room not found' }); break; }
        if (room.players.size >= room.maxPlayers) { this.send(player.ws, 'error', { message: 'Room full' }); break; }
        this.joinRoom(player, room);
        break;
      }

      case 'room:leave':
        if (player.roomId) this.leaveRoom(player);
        break;

      case 'room:ready':
        player.ready = !!(d as { ready: boolean }).ready;
        if (player.roomId) this.broadcastToRoom(player.roomId, 'room:player_updated', this.playerToJSON(player));
        break;

      case 'room:state':
        if (player.roomId) {
          const room = this.rooms.get(player.roomId);
          if (room) {
            Object.assign(room.gameState, d);
            room.lastActivity = Date.now();
            this.broadcastToRoom(player.roomId, 'room:state', room.gameState);
          }
        }
        break;

      case 'room:action':
        if (player.roomId) {
          const room = this.rooms.get(player.roomId);
          if (room) room.lastActivity = Date.now();
          this.broadcastToRoom(player.roomId, 'room:action', { playerId: player.id, ...d as object });
        }
        break;

      case 'sync:update':
        if (player.roomId) {
          this.broadcastToRoomExcept(player.roomId, player.id, 'sync:state', {
            entities: (d as { entities: unknown[] }).entities,
            serverTime: Date.now(),
          });
        }
        break;

      default:
        this.send(player.ws, 'error', { message: `Unknown message type: ${type}` });
    }
  }

  // ── Room operations ─────────────────────────────────────────────────

  private createRoom(host: Player, name: string, maxPlayers: number): Room {
    const id = `r${this.nextId++}`;
    const room: Room = {
      id, name, host: host.id, maxPlayers,
      state: 'waiting', players: new Map(), gameState: {},
      lastActivity: Date.now(),
    };
    this.rooms.set(id, room);
    room.players.set(host.id, host);
    host.roomId = id;
    return room;
  }

  private joinRoom(player: Player, room: Room): void {
    if (player.roomId) this.leaveRoom(player);
    room.players.set(player.id, player);
    player.roomId = room.id;
    room.lastActivity = Date.now();

    this.send(player.ws, 'room:joined', {
      roomId: room.id,
      playerId: player.id,
      players: Array.from(room.players.values()).map(this.playerToJSON),
    });

    this.broadcastToRoomExcept(room.id, player.id, 'room:player_joined', this.playerToJSON(player));
    this.broadcastLobby();
  }

  leaveRoom(player: Player): void {
    const roomId = player.roomId;
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players.delete(player.id);
    player.roomId = null;

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    } else {
      if (room.host === player.id) {
        room.host = room.players.keys().next().value!;
        this.broadcastToRoom(roomId, 'room:host_migrated', { newHost: room.host });
      }
      this.broadcastToRoom(roomId, 'room:player_left', { id: player.id });
    }
    this.broadcastLobby();
  }

  private cleanupRooms(): void {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (now - room.lastActivity > this.config.roomTimeoutMs) {
        for (const p of room.players.values()) {
          this.send(p.ws, 'error', { message: 'Room timed out due to inactivity' });
          p.roomId = null;
        }
        this.rooms.delete(id);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  send(ws: WebSocket, type: string, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  private broadcastToRoom(roomId: string, type: string, data: unknown): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const p of room.players.values()) {
      this.send(p.ws, type, data);
    }
  }

  private broadcastToRoomExcept(roomId: string, exceptId: string, type: string, data: unknown): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const p of room.players.values()) {
      if (p.id !== exceptId) this.send(p.ws, type, data);
    }
  }

  private broadcastLobby(): void {
    const list = this.getRoomList();
    for (const p of this.players.values()) {
      if (!p.roomId) this.send(p.ws, 'lobby:rooms', list);
    }
  }

  private getRoomList(): unknown[] {
    return Array.from(this.rooms.values()).map(this.roomToJSON);
  }

  private roomToJSON = (room: Room) => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    host: room.host,
    state: room.state,
  });

  private playerToJSON = (player: Player) => ({
    id: player.id,
    name: player.name,
    ready: player.ready,
  });
}
