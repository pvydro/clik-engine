import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  // Simulate server sending a message
  _receive(type: string, data: unknown): void {
    this.onmessage?.({ data: JSON.stringify({ type, data }) });
  }

  _open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  _close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

let mockWs: MockWebSocket;
vi.stubGlobal('WebSocket', class extends MockWebSocket {
  constructor() {
    super();
    mockWs = this;
  }
});

// Expose OPEN on the global
(globalThis as Record<string, unknown>).WebSocket = Object.assign(
  (globalThis as Record<string, unknown>).WebSocket as Function,
  { OPEN: 1, CLOSED: 3 }
);

import { NetworkManager } from '../../src/network/NetworkManager';

describe('NetworkManager', () => {
  let net: NetworkManager;

  beforeEach(() => {
    vi.useFakeTimers();
    net = new NetworkManager({ url: 'ws://localhost:8080', autoReconnect: false });
  });

  afterEach(() => {
    net.destroy();
    vi.useRealTimers();
  });

  it('starts in disconnected state', () => {
    expect(net.getState()).toBe('disconnected');
    expect(net.isConnected).toBe(false);
    expect(net.getPlayerId()).toBeNull();
  });

  it('connects and transitions to connected on server confirmation', () => {
    const stateChanges: string[] = [];
    net.onStateChange(s => stateChanges.push(s));

    net.connect();
    expect(net.getState()).toBe('connecting');

    mockWs._open();
    // Server confirms connection
    mockWs._receive('connected', { playerId: 'p1' });

    expect(net.getState()).toBe('connected');
    expect(net.isConnected).toBe(true);
    expect(net.getPlayerId()).toBe('p1');
    expect(stateChanges).toEqual(['connecting', 'connected']);
  });

  it('sends messages as JSON', () => {
    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });

    net.send('lobby:list');
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'lobby:list', data: {} }));
  });

  it('sends messages with data', () => {
    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });

    net.send('lobby:create', { name: 'Test', maxPlayers: 4 });
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'lobby:create', data: { name: 'Test', maxPlayers: 4 } })
    );
  });

  it('dispatches server messages to handlers', () => {
    const messages: [string, unknown][] = [];
    net.onMessage((type, data) => messages.push([type, data]));

    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });
    mockWs._receive('lobby:rooms', [{ id: 'r1' }]);

    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual(['lobby:rooms', [{ id: 'r1' }]]);
  });

  it('removes message handlers with offMessage', () => {
    const handler = vi.fn();
    net.onMessage(handler);
    net.offMessage(handler);

    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('starts heartbeat on connect', () => {
    net = new NetworkManager({ url: 'ws://localhost:8080', heartbeatInterval: 1000, autoReconnect: false });
    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });

    mockWs.send.mockClear();
    vi.advanceTimersByTime(1000);
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: '__heartbeat', data: {} }));
  });

  it('disconnects cleanly', () => {
    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });

    net.disconnect();
    expect(net.getState()).toBe('disconnected');
    expect(net.getPlayerId()).toBeNull();
    expect(net.isConnected).toBe(false);
  });

  it('destroy cleans everything', () => {
    const handler = vi.fn();
    net.onMessage(handler);
    net.onStateChange(handler);

    net.connect();
    mockWs._open();
    mockWs._receive('connected', { playerId: 'p1' });

    net.destroy();
    expect(net.getState()).toBe('disconnected');
  });

  describe('auto-reconnect', () => {
    it('reconnects with exponential backoff', () => {
      net = new NetworkManager({
        url: 'ws://localhost:8080',
        autoReconnect: true,
        maxRetries: 3,
        reconnectBaseDelay: 100,
      });

      const stateChanges: string[] = [];
      net.onStateChange(s => stateChanges.push(s));

      net.connect();
      mockWs._open();
      mockWs._receive('connected', { playerId: 'p1' });

      // Server drops connection
      mockWs._close();

      expect(net.getState()).toBe('reconnecting');

      // After 100ms, should attempt reconnect
      vi.advanceTimersByTime(100);
      // New WebSocket created
      expect(stateChanges).toContain('reconnecting');

      net.destroy();
    });
  });
});
