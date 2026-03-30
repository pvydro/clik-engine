import { ConsoleReporter } from '../debug/ConsoleReporter';
import type { NetworkManager } from './NetworkManager';
import type { RoomInfo } from './protocol';

type RoomListHandler = (rooms: RoomInfo[]) => void;
type RoomHandler = (room: RoomInfo) => void;
type ErrorHandler = (message: string) => void;

/**
 * Lobby client — browse, create, and join rooms through the NetworkManager.
 */
export class Lobby {
  private network: NetworkManager;
  private roomListHandlers: RoomListHandler[] = [];
  private roomCreatedHandlers: RoomHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private messageCleanup: ((type: string, data: unknown) => void) | null = null;

  constructor(network: NetworkManager) {
    this.network = network;

    this.messageCleanup = (type: string, data: unknown) => {
      switch (type) {
        case 'lobby:rooms':
          for (const h of this.roomListHandlers) h(data as RoomInfo[]);
          break;
        case 'lobby:room_created':
          for (const h of this.roomCreatedHandlers) h(data as RoomInfo);
          break;
        case 'error': {
          const err = data as { message: string };
          for (const h of this.errorHandlers) h(err.message);
          ConsoleReporter.error(`Lobby error: ${err.message}`);
          break;
        }
      }
    };
    network.onMessage(this.messageCleanup);
  }

  /** Request the current room list from the server */
  listRooms(): void {
    this.network.send('lobby:list');
  }

  /** Create a new room */
  createRoom(name: string, maxPlayers = 4): void {
    this.network.send('lobby:create', { name, maxPlayers });
  }

  /** Join an existing room by ID */
  joinRoom(roomId: string): void {
    this.network.send('lobby:join', { roomId });
  }

  /** Quick match — server finds first available room or creates one */
  quickMatch(gameName = 'Quick Match'): void {
    // Request room list, join first available or create
    const handler = (rooms: RoomInfo[]) => {
      const available = rooms.find(r => r.state === 'waiting' && r.playerCount < r.maxPlayers);
      if (available) {
        this.joinRoom(available.id);
      } else {
        this.createRoom(gameName);
      }
      // Remove this one-shot handler
      const idx = this.roomListHandlers.indexOf(handler);
      if (idx >= 0) this.roomListHandlers.splice(idx, 1);
    };
    this.roomListHandlers.push(handler);
    this.listRooms();
  }

  onRoomList(handler: RoomListHandler): this {
    this.roomListHandlers.push(handler);
    return this;
  }

  onRoomCreated(handler: RoomHandler): this {
    this.roomCreatedHandlers.push(handler);
    return this;
  }

  onError(handler: ErrorHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }

  destroy(): void {
    if (this.messageCleanup) {
      this.network.offMessage(this.messageCleanup);
      this.messageCleanup = null;
    }
    this.roomListHandlers.length = 0;
    this.roomCreatedHandlers.length = 0;
    this.errorHandlers.length = 0;
  }
}
