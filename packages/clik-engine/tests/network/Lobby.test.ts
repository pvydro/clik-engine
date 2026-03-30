import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { Lobby } from '../../src/network/Lobby';

function makeMockNetwork() {
  const handlers: ((type: string, data: unknown) => void)[] = [];
  return {
    send: vi.fn(),
    onMessage: vi.fn((h: (type: string, data: unknown) => void) => { handlers.push(h); }),
    offMessage: vi.fn(),
    _dispatch(type: string, data: unknown) {
      for (const h of [...handlers]) h(type, data);
    },
    _handlers: handlers,
  };
}

describe('Lobby', () => {
  let net: ReturnType<typeof makeMockNetwork>;
  let lobby: Lobby;

  beforeEach(() => {
    net = makeMockNetwork();
    lobby = new Lobby(net as unknown as import('../../src/network/NetworkManager').NetworkManager);
  });

  it('sends lobby:list on listRooms()', () => {
    lobby.listRooms();
    expect(net.send).toHaveBeenCalledWith('lobby:list');
  });

  it('sends lobby:create on createRoom()', () => {
    lobby.createRoom('Test Room', 6);
    expect(net.send).toHaveBeenCalledWith('lobby:create', { name: 'Test Room', maxPlayers: 6 });
  });

  it('sends lobby:join on joinRoom()', () => {
    lobby.joinRoom('r1');
    expect(net.send).toHaveBeenCalledWith('lobby:join', { roomId: 'r1' });
  });

  it('dispatches room list to handlers', () => {
    const handler = vi.fn();
    lobby.onRoomList(handler);

    net._dispatch('lobby:rooms', [{ id: 'r1', name: 'Room 1' }]);
    expect(handler).toHaveBeenCalledWith([{ id: 'r1', name: 'Room 1' }]);
  });

  it('dispatches room created to handlers', () => {
    const handler = vi.fn();
    lobby.onRoomCreated(handler);

    net._dispatch('lobby:room_created', { id: 'r1', name: 'Room 1' });
    expect(handler).toHaveBeenCalledWith({ id: 'r1', name: 'Room 1' });
  });

  it('dispatches errors to handlers', () => {
    const handler = vi.fn();
    lobby.onError(handler);

    net._dispatch('error', { message: 'Room full' });
    expect(handler).toHaveBeenCalledWith('Room full');
  });

  it('quickMatch joins first available room', () => {
    lobby.quickMatch();
    expect(net.send).toHaveBeenCalledWith('lobby:list');

    // Server responds with rooms
    net._dispatch('lobby:rooms', [
      { id: 'r1', state: 'waiting', playerCount: 2, maxPlayers: 4 },
    ]);

    expect(net.send).toHaveBeenCalledWith('lobby:join', { roomId: 'r1' });
  });

  it('quickMatch creates room if none available', () => {
    lobby.quickMatch('My Game');
    expect(net.send).toHaveBeenCalledWith('lobby:list');

    // Server responds with no available rooms
    net._dispatch('lobby:rooms', [
      { id: 'r1', state: 'playing', playerCount: 4, maxPlayers: 4 },
    ]);

    expect(net.send).toHaveBeenCalledWith('lobby:create', { name: 'My Game', maxPlayers: 4 });
  });

  it('chains event handlers', () => {
    expect(lobby.onRoomList(() => {})).toBe(lobby);
    expect(lobby.onRoomCreated(() => {})).toBe(lobby);
    expect(lobby.onError(() => {})).toBe(lobby);
  });

  it('destroy cleans up message handler', () => {
    lobby.destroy();
    expect(net.offMessage).toHaveBeenCalled();
  });
});
