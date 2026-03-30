# Network System

Client-side multiplayer via WebSocket, matching the clik-server protocol.

## Setup

```typescript
createGame({
  name: 'my-game',
  network: { url: 'ws://localhost:8080' },
  scenes: [{ key: 'lobby', class: LobbyScene, default: true }],
});
```

## Connecting

```typescript
class LobbyScene extends BaseScene {
  create() {
    super.create();
    this.network.connect();
    this.network.onStateChange(state => {
      console.log('Connection:', state); // connecting → connected
    });
  }
}
```

## Lobby — Browse & Join Rooms

```typescript
// List available rooms
this.lobby.onRoomList(rooms => {
  for (const room of rooms) {
    console.log(`${room.name} (${room.playerCount}/${room.maxPlayers})`);
  }
});
this.lobby.listRooms();

// Create a room
this.lobby.createRoom('My Room', 4);

// Quick match — auto-join or create
this.lobby.quickMatch();
```

## Room — Manage Players & State

```typescript
// Listen for players
this.room.onPlayerJoined(player => {
  console.log(`${player.name} joined!`);
});

// Send game actions to all players
this.room.sendAction('move', { x: 100, y: 200 });

// Receive actions from other players
this.room.onAction(data => {
  console.log(`${data.playerId} did ${data.type}`);
});

// Sync game state (host sends, all receive)
this.room.sendState({ score: 100 });
this.room.onStateChanged(state => {
  this.score = state.score as number;
});
```

## StateSync — Entity Interpolation

For real-time games, StateSync handles smooth movement of remote entities:

```typescript
import { StateSync, NetworkSync } from '@pvydro/clik-engine';

const sync = new StateSync(this.network, {
  syncRate: 50,           // Send state every 50ms (20Hz)
  interpolationDelay: 100, // 100ms delay for smooth interpolation
});

// Local player — sends position to server
const player = new Entity(this, 100, 100);
player.addComponent('netSync', new NetworkSync(sync, 'player1', true));

// Remote player — receives and interpolates position
const enemy = new Entity(this, 200, 200);
enemy.addComponent('netSync', new NetworkSync(sync, 'player2', false));

// Start syncing
sync.start();

// Each frame, update interpolation
update(time, delta) {
  super.update(time, delta);
  sync.update(delta);
}
```

## Server

Run `packages/clik-server`:

```bash
cd packages/clik-server
npm run dev
# Server running on ws://localhost:8080
```

See the [server README](../../packages/clik-server/README.md) for deployment and configuration.
