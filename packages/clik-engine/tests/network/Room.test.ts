import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { Room } from '../../src/network/Room';

function makeMockNetwork() {
  const handlers: ((type: string, data: unknown) => void)[] = [];
  return {
    send: vi.fn(),
    getPlayerId: vi.fn(() => 'p1'),
    onMessage: vi.fn((h: (type: string, data: unknown) => void) => { handlers.push(h); }),
    offMessage: vi.fn((h: (type: string, data: unknown) => void) => {
      const idx = handlers.indexOf(h);
      if (idx >= 0) handlers.splice(idx, 1);
    }),
    _dispatch(type: string, data: unknown) {
      for (const h of handlers) h(type, data);
    },
    _handlers: handlers,
  };
}

describe('Room', () => {
  let net: ReturnType<typeof makeMockNetwork>;
  let room: Room;

  beforeEach(() => {
    net = makeMockNetwork();
    room = new Room(net as unknown as import('../../src/network/NetworkManager').NetworkManager);
  });

  it('starts with no room', () => {
    expect(room.isInRoom).toBe(false);
    expect(room.roomId).toBeNull();
    expect(room.playerCount).toBe(0);
  });

  it('handles room:joined', () => {
    net._dispatch('room:joined', {
      roomId: 'r1',
      playerId: 'p1',
      players: [
        { id: 'p1', name: 'Player 1', ready: false },
        { id: 'p2', name: 'Player 2', ready: true },
      ],
    });

    expect(room.isInRoom).toBe(true);
    expect(room.roomId).toBe('r1');
    expect(room.playerCount).toBe(2);
    expect(room.players).toHaveLength(2);
  });

  it('handles room:player_joined', () => {
    net._dispatch('room:joined', { roomId: 'r1', playerId: 'p1', players: [{ id: 'p1', name: 'P1', ready: false }] });

    const joinHandler = vi.fn();
    room.onPlayerJoined(joinHandler);

    net._dispatch('room:player_joined', { id: 'p2', name: 'P2', ready: false });
    expect(joinHandler).toHaveBeenCalledWith({ id: 'p2', name: 'P2', ready: false });
    expect(room.playerCount).toBe(2);
  });

  it('handles room:player_left', () => {
    net._dispatch('room:joined', { roomId: 'r1', playerId: 'p1', players: [
      { id: 'p1', name: 'P1', ready: false },
      { id: 'p2', name: 'P2', ready: false },
    ]});

    const leftHandler = vi.fn();
    room.onPlayerLeft(leftHandler);

    net._dispatch('room:player_left', { id: 'p2' });
    expect(leftHandler).toHaveBeenCalledWith('p2');
    expect(room.playerCount).toBe(1);
  });

  it('handles room:player_updated', () => {
    net._dispatch('room:joined', { roomId: 'r1', playerId: 'p1', players: [{ id: 'p1', name: 'P1', ready: false }] });

    const updateHandler = vi.fn();
    room.onPlayerUpdated(updateHandler);

    net._dispatch('room:player_updated', { id: 'p1', name: 'P1', ready: true });
    expect(updateHandler).toHaveBeenCalledWith({ id: 'p1', name: 'P1', ready: true });
  });

  it('handles room:state', () => {
    const stateHandler = vi.fn();
    room.onStateChanged(stateHandler);

    net._dispatch('room:state', { score: 100, level: 2 });
    expect(stateHandler).toHaveBeenCalledWith({ score: 100, level: 2 });
    expect(room.gameState).toEqual({ score: 100, level: 2 });
  });

  it('handles room:action', () => {
    const actionHandler = vi.fn();
    room.onAction(actionHandler);

    net._dispatch('room:action', { playerId: 'p2', type: 'move', x: 100 });
    expect(actionHandler).toHaveBeenCalledWith({ playerId: 'p2', type: 'move', x: 100 });
  });

  it('sends leave command', () => {
    net._dispatch('room:joined', { roomId: 'r1', playerId: 'p1', players: [] });
    room.leave();
    expect(net.send).toHaveBeenCalledWith('room:leave');
    expect(room.isInRoom).toBe(false);
  });

  it('sends ready command', () => {
    room.ready(true);
    expect(net.send).toHaveBeenCalledWith('room:ready', { ready: true });
  });

  it('sends action', () => {
    room.sendAction('attack', { damage: 10 });
    expect(net.send).toHaveBeenCalledWith('room:action', { type: 'attack', damage: 10 });
  });

  it('sends state', () => {
    room.sendState({ score: 50 });
    expect(net.send).toHaveBeenCalledWith('room:state', { score: 50 });
  });

  it('chains event handlers', () => {
    expect(room.onPlayerJoined(() => {})).toBe(room);
    expect(room.onPlayerLeft(() => {})).toBe(room);
    expect(room.onPlayerUpdated(() => {})).toBe(room);
    expect(room.onAction(() => {})).toBe(room);
    expect(room.onStateChanged(() => {})).toBe(room);
  });

  it('destroy cleans up message handler', () => {
    room.destroy();
    expect(net.offMessage).toHaveBeenCalled();
  });
});
