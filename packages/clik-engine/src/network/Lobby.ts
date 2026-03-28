import { NetworkManager } from './NetworkManager';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface LobbyRoom {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  host: string;
  state: 'waiting' | 'playing' | 'finished';
  data?: Record<string, unknown>;
}

/**
 * Lobby system for browsing and creating multiplayer rooms.
 */
export class Lobby {
  private network: NetworkManager;
  private rooms: Map<string, LobbyRoom> = new Map();
  private onRoomListCallback?: (rooms: LobbyRoom[]) => void;
  private onRoomCreatedCallback?: (room: LobbyRoom) => void;

  constructor(network: NetworkManager) {
    this.network = network;

    network.on('lobby:rooms', (data: unknown) => {
      const roomList = data as LobbyRoom[];
      this.rooms.clear();
      for (const room of roomList) {
        this.rooms.set(room.id, room);
      }
      this.onRoomListCallback?.(roomList);
      ConsoleReporter.engine(`Lobby: ${roomList.length} rooms available`);
    });

    network.on('lobby:room_created', (data: unknown) => {
      const room = data as LobbyRoom;
      this.rooms.set(room.id, room);
      this.onRoomCreatedCallback?.(room);
      ConsoleReporter.engine(`Lobby: room created — ${room.name}`);
    });

    network.on('lobby:room_updated', (data: unknown) => {
      const room = data as LobbyRoom;
      this.rooms.set(room.id, room);
    });

    network.on('lobby:room_removed', (data: unknown) => {
      const d = data as { id: string };
      this.rooms.delete(d.id);
    });
  }

  /** Request the list of available rooms */
  refreshRooms(): void {
    this.network.send('lobby:list');
  }

  /** Create a new room */
  createRoom(name: string, maxPlayers = 4, data?: Record<string, unknown>): void {
    this.network.send('lobby:create', { name, maxPlayers, data });
  }

  /** Join an existing room */
  joinRoom(roomId: string): void {
    this.network.send('lobby:join', { roomId });
  }

  /** Quick match — join a random available room or create one */
  quickMatch(gameName: string, maxPlayers = 4): void {
    const available = this.getAvailableRooms();
    if (available.length > 0) {
      // Join random available room
      const room = available[Math.floor(Math.random() * available.length)];
      this.joinRoom(room.id);
      ConsoleReporter.engine(`Quick match: joining ${room.name}`);
    } else {
      // No rooms available — create one
      this.createRoom(`${gameName}-${Date.now().toString(36)}`, maxPlayers);
      ConsoleReporter.engine('Quick match: creating new room');
    }
  }

  /** Get all rooms */
  getRooms(): LobbyRoom[] {
    return Array.from(this.rooms.values());
  }

  /** Get rooms that aren't full and are in 'waiting' state */
  getAvailableRooms(): LobbyRoom[] {
    return this.getRooms().filter(r => r.state === 'waiting' && r.playerCount < r.maxPlayers);
  }

  /** Get a specific room by ID */
  getRoom(id: string): LobbyRoom | undefined {
    return this.rooms.get(id);
  }

  onRoomList(callback: (rooms: LobbyRoom[]) => void): this {
    this.onRoomListCallback = callback;
    return this;
  }

  onRoomCreated(callback: (room: LobbyRoom) => void): this {
    this.onRoomCreatedCallback = callback;
    return this;
  }
}
