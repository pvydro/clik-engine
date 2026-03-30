# clik-server

WebSocket matchmaking server for clik-engine multiplayer games.

## Quick Start

```bash
npm run dev          # Start with ts-node + file watching
npm run start        # Start with ts-node
npm run test         # Run tests
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | WebSocket server port |
| `MAX_ROOMS` | `100` | Maximum concurrent rooms |
| `ROOM_TIMEOUT_MS` | `300000` | Room inactivity timeout (5 min) |

## Protocol

All messages are JSON: `{ "type": "string", "data": {} }`

### Client to Server

| Type | Data | Description |
|------|------|-------------|
| `__heartbeat` | — | Keepalive ping |
| `lobby:list` | — | Request room list |
| `lobby:create` | `{ name, maxPlayers }` | Create a new room |
| `lobby:join` | `{ roomId }` | Join a room |
| `room:leave` | — | Leave current room |
| `room:ready` | `{ ready: boolean }` | Set ready status |
| `room:state` | `{ ...state }` | Broadcast game state |
| `room:action` | `{ type, ...data }` | Broadcast game action |
| `sync:update` | `{ entities: [...] }` | Send entity state for interpolation |

### Server to Client

| Type | Data | Description |
|------|------|-------------|
| `connected` | `{ playerId }` | Connection confirmed |
| `lobby:rooms` | `[{ id, name, playerCount, maxPlayers, host, state }]` | Room list |
| `lobby:room_created` | `{ id, name, ... }` | Room created confirmation |
| `room:joined` | `{ roomId, playerId, players }` | Joined a room |
| `room:player_joined` | `{ id, name, ready }` | Another player joined |
| `room:player_left` | `{ id }` | Player left |
| `room:player_updated` | `{ id, name, ready }` | Player state changed |
| `room:host_migrated` | `{ newHost }` | Host changed |
| `room:state` | `{ ...state }` | Game state update |
| `room:action` | `{ playerId, type, ...data }` | Game action |
| `sync:state` | `{ entities, serverTime }` | Entity state for interpolation |
| `error` | `{ message }` | Error message |
| `server:shutdown` | `{ message }` | Server shutting down |

## Health Check

```bash
curl http://localhost:8080/health
# { "uptime": 120, "players": 4, "rooms": 2 }
```

## Features

- Auto room cleanup on inactivity timeout
- Host migration when host disconnects
- Rate limiting (60 msg/sec per client)
- Payload size limit (64KB)
- Graceful shutdown (SIGINT/SIGTERM)
