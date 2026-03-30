import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClikServer } from '../src/ClikServer';
import type { Player } from '../src/ClikServer';
import { WebSocket } from 'ws';

function mockWs(): WebSocket {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
  } as unknown as WebSocket;
}

function makePlayer(server: ClikServer, id: string): Player {
  const ws = mockWs();
  const player: Player = {
    id,
    name: `Player ${id}`,
    ws,
    roomId: null,
    ready: false,
    messageCount: 0,
    messageResetTime: Date.now(),
  };
  server.players.set(id, player);
  return player;
}

function lastSent(player: Player): { type: string; data: unknown } | null {
  const calls = (player.ws.send as ReturnType<typeof vi.fn>).mock.calls;
  if (calls.length === 0) return null;
  return JSON.parse(calls[calls.length - 1][0] as string);
}

function allSent(player: Player): { type: string; data: unknown }[] {
  return (player.ws.send as ReturnType<typeof vi.fn>).mock.calls.map(
    (c: unknown[]) => JSON.parse(c[0] as string)
  );
}

describe('ClikServer', () => {
  let server: ClikServer;

  beforeEach(() => {
    server = new ClikServer({ port: 0, maxRooms: 10, maxMessagesPerSecond: 5 });
  });

  describe('health', () => {
    it('returns uptime, player count, room count', () => {
      const health = server.getHealth();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.players).toBe(0);
      expect(health.rooms).toBe(0);
    });
  });

  describe('lobby', () => {
    it('lobby:list returns empty array initially', () => {
      const p = makePlayer(server, 'p1');
      server.handleMessage(p, 'lobby:list', {});
      expect(lastSent(p)?.type).toBe('lobby:rooms');
      expect(lastSent(p)?.data).toEqual([]);
    });

    it('lobby:create creates a room and joins player', () => {
      const p = makePlayer(server, 'p1');
      server.handleMessage(p, 'lobby:create', { name: 'Test Room', maxPlayers: 4 });

      const msgs = allSent(p);
      expect(msgs.some(m => m.type === 'lobby:room_created')).toBe(true);
      expect(msgs.some(m => m.type === 'room:joined')).toBe(true);
      expect(server.rooms.size).toBe(1);
      expect(p.roomId).not.toBeNull();
    });

    it('lobby:create respects server maxRooms', () => {
      for (let i = 0; i < 10; i++) {
        const p = makePlayer(server, `host${i}`);
        server.handleMessage(p, 'lobby:create', { name: `Room ${i}` });
      }
      expect(server.rooms.size).toBe(10);

      const p = makePlayer(server, 'over');
      server.handleMessage(p, 'lobby:create', { name: 'Too Many' });
      expect(lastSent(p)?.type).toBe('error');
      expect(server.rooms.size).toBe(10);
    });
  });

  describe('room join/leave', () => {
    it('join a room', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const roomId = host.roomId!;

      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId });
      expect(p2.roomId).toBe(roomId);

      const joined = allSent(p2).find(m => m.type === 'room:joined');
      expect(joined).toBeDefined();
    });

    it('rejects join to full room', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 1 });
      const roomId = host.roomId!;

      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId });
      expect(lastSent(p2)?.type).toBe('error');
      expect(p2.roomId).toBeNull();
    });

    it('rejects join to nonexistent room', () => {
      const p = makePlayer(server, 'p1');
      server.handleMessage(p, 'lobby:join', { roomId: 'nope' });
      expect(lastSent(p)?.type).toBe('error');
    });

    it('leave room removes player', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId: host.roomId! });

      server.handleMessage(p2, 'room:leave', {});
      expect(p2.roomId).toBeNull();
    });

    it('empty room is deleted', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const roomId = host.roomId!;

      server.leaveRoom(host);
      expect(server.rooms.has(roomId)).toBe(false);
    });
  });

  describe('host migration', () => {
    it('migrates host when host leaves', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const roomId = host.roomId!;

      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId });

      server.leaveRoom(host);
      const room = server.rooms.get(roomId);
      expect(room?.host).toBe('p2');
    });
  });

  describe('room actions', () => {
    it('room:ready updates player state', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room' });
      server.handleMessage(host, 'room:ready', { ready: true });
      expect(host.ready).toBe(true);
    });

    it('room:state broadcasts to room', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId: host.roomId! });

      (host.ws.send as ReturnType<typeof vi.fn>).mockClear();
      (p2.ws.send as ReturnType<typeof vi.fn>).mockClear();

      server.handleMessage(host, 'room:state', { score: 100 });
      expect(lastSent(host)?.type).toBe('room:state');
      expect(lastSent(p2)?.type).toBe('room:state');
    });

    it('room:action broadcasts with playerId', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId: host.roomId! });

      (host.ws.send as ReturnType<typeof vi.fn>).mockClear();

      server.handleMessage(p2, 'room:action', { type: 'move', x: 10 });
      const msg = lastSent(host);
      expect(msg?.type).toBe('room:action');
      expect((msg?.data as Record<string, unknown>).playerId).toBe('p2');
    });
  });

  describe('validation', () => {
    it('unknown message type returns error', () => {
      const p = makePlayer(server, 'p1');
      server.handleMessage(p, 'totally:invalid', {});
      expect(lastSent(p)?.type).toBe('error');
    });

    it('heartbeat is accepted silently', () => {
      const p = makePlayer(server, 'p1');
      server.handleMessage(p, '__heartbeat', {});
      expect((p.ws.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('sync:update broadcasts to other room members', () => {
      const host = makePlayer(server, 'host');
      server.handleMessage(host, 'lobby:create', { name: 'Room', maxPlayers: 4 });
      const p2 = makePlayer(server, 'p2');
      server.handleMessage(p2, 'lobby:join', { roomId: host.roomId! });

      (host.ws.send as ReturnType<typeof vi.fn>).mockClear();
      (p2.ws.send as ReturnType<typeof vi.fn>).mockClear();

      server.handleMessage(host, 'sync:update', { entities: [{ id: 'e1', x: 10, y: 20 }] });
      // p2 gets the state, host does not (excludes sender)
      expect(lastSent(p2)?.type).toBe('sync:state');
      expect((p2.ws.send as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });
  });
});
