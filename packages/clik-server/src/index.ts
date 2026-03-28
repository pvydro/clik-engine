import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.PORT ?? '8080');

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string | null;
  ready: boolean;
}

interface Room {
  id: string;
  name: string;
  host: string;
  maxPlayers: number;
  state: 'waiting' | 'playing' | 'finished';
  players: Map<string, Player>;
  gameState: Record<string, unknown>;
}

const players = new Map<string, Player>();
const rooms = new Map<string, Room>();
let nextId = 1;

const wss = new WebSocketServer({ port: PORT });
console.log(`clik-server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  const playerId = `p${nextId++}`;
  const player: Player = { id: playerId, name: `Player ${playerId}`, ws, roomId: null, ready: false };
  players.set(playerId, player);

  send(ws, 'connected', { playerId });
  console.log(`Player connected: ${playerId}`);

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(player, msg.type, msg.data);
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });

  ws.on('close', () => {
    if (player.roomId) leaveRoom(player);
    players.delete(playerId);
    console.log(`Player disconnected: ${playerId}`);
  });
});

function handleMessage(player: Player, type: string, data: unknown): void {
  const d = data as Record<string, unknown>;

  switch (type) {
    case '__heartbeat':
      break;

    case 'lobby:list':
      send(player.ws, 'lobby:rooms', getRoomList());
      break;

    case 'lobby:create': {
      const room = createRoom(player, d.name as string ?? 'Game Room', d.maxPlayers as number ?? 4);
      send(player.ws, 'lobby:room_created', roomToJSON(room));
      send(player.ws, 'room:joined', {
        roomId: room.id,
        playerId: player.id,
        players: Array.from(room.players.values()).map(playerToJSON),
      });
      broadcastLobby();
      break;
    }

    case 'lobby:join':
    case 'room:join': {
      const roomId = d.roomId as string;
      const room = rooms.get(roomId);
      if (!room) { send(player.ws, 'error', { message: 'Room not found' }); break; }
      if (room.players.size >= room.maxPlayers) { send(player.ws, 'error', { message: 'Room full' }); break; }
      joinRoom(player, room);
      break;
    }

    case 'room:leave':
      if (player.roomId) leaveRoom(player);
      break;

    case 'room:ready':
      player.ready = (d as { ready: boolean }).ready;
      if (player.roomId) broadcastToRoom(player.roomId, 'room:player_updated', playerToJSON(player));
      break;

    case 'room:state':
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
          Object.assign(room.gameState, d);
          broadcastToRoom(player.roomId, 'room:state', room.gameState);
        }
      }
      break;

    case 'room:action':
      if (player.roomId) {
        broadcastToRoom(player.roomId, 'room:action', { playerId: player.id, ...d as object });
      }
      break;

    case 'sync:update':
      if (player.roomId) {
        broadcastToRoomExcept(player.roomId, player.id, 'sync:state', {
          entities: (d as { entities: unknown[] }).entities,
          serverTime: Date.now(),
        });
      }
      break;
  }
}

function createRoom(host: Player, name: string, maxPlayers: number): Room {
  const id = `r${nextId++}`;
  const room: Room = { id, name, host: host.id, maxPlayers, state: 'waiting', players: new Map(), gameState: {} };
  rooms.set(id, room);
  room.players.set(host.id, host);
  host.roomId = id;
  console.log(`Room created: ${name} (${id}) by ${host.id}`);
  return room;
}

function joinRoom(player: Player, room: Room): void {
  if (player.roomId) leaveRoom(player);
  room.players.set(player.id, player);
  player.roomId = room.id;

  send(player.ws, 'room:joined', {
    roomId: room.id,
    playerId: player.id,
    players: Array.from(room.players.values()).map(playerToJSON),
  });

  broadcastToRoomExcept(room.id, player.id, 'room:player_joined', playerToJSON(player));
  broadcastLobby();
  console.log(`${player.id} joined room ${room.id}`);
}

function leaveRoom(player: Player): void {
  const roomId = player.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(player.id);
  player.roomId = null;

  if (room.players.size === 0) {
    rooms.delete(roomId);
    console.log(`Room deleted: ${roomId} (empty)`);
  } else {
    // Migrate host if needed
    if (room.host === player.id) {
      room.host = room.players.keys().next().value!;
      console.log(`Host migrated to ${room.host} in room ${roomId}`);
    }
    broadcastToRoom(roomId, 'room:player_left', { id: player.id });
  }
  broadcastLobby();
}

function send(ws: WebSocket, type: string, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

function broadcastToRoom(roomId: string, type: string, data: unknown): void {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const p of room.players.values()) {
    send(p.ws, type, data);
  }
}

function broadcastToRoomExcept(roomId: string, exceptId: string, type: string, data: unknown): void {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const p of room.players.values()) {
    if (p.id !== exceptId) send(p.ws, type, data);
  }
}

function broadcastLobby(): void {
  const list = getRoomList();
  for (const p of players.values()) {
    if (!p.roomId) send(p.ws, 'lobby:rooms', list);
  }
}

function getRoomList(): unknown[] {
  return Array.from(rooms.values()).map(roomToJSON);
}

function roomToJSON(room: Room): unknown {
  return {
    id: room.id,
    name: room.name,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    host: room.host,
    state: room.state,
  };
}

function playerToJSON(player: Player): unknown {
  return { id: player.id, name: player.name, ready: player.ready };
}
