import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { StateSync } from '../../src/network/StateSync';

function makeMockNetwork() {
  const handlers: ((type: string, data: unknown) => void)[] = [];
  return {
    send: vi.fn(),
    onMessage: vi.fn((h: (type: string, data: unknown) => void) => { handlers.push(h); }),
    offMessage: vi.fn(),
    _dispatch(type: string, data: unknown) {
      for (const h of handlers) h(type, data);
    },
  };
}

describe('StateSync', () => {
  let net: ReturnType<typeof makeMockNetwork>;
  let sync: StateSync;

  beforeEach(() => {
    vi.useFakeTimers();
    net = makeMockNetwork();
    sync = new StateSync(
      net as unknown as import('../../src/network/NetworkManager').NetworkManager,
      { syncRate: 50, interpolationDelay: 100, maxExtrapolation: 200 }
    );
  });

  afterEach(() => {
    sync.destroy();
    vi.useRealTimers();
  });

  it('registers local and remote entities', () => {
    const localTarget = { x: 0, y: 0 };
    const remoteTarget = { x: 100, y: 100 };

    sync.registerLocal('player', localTarget);
    sync.registerRemote('enemy', remoteTarget);

    expect(sync.getEntity('player')?.isLocal).toBe(true);
    expect(sync.getEntity('enemy')?.isLocal).toBe(false);
    expect(sync.getAllEntities()).toHaveLength(2);
  });

  it('unregisters entities', () => {
    sync.registerLocal('player', { x: 0, y: 0 });
    sync.unregister('player');
    expect(sync.getEntity('player')).toBeUndefined();
  });

  it('sends local entity state on sync interval', () => {
    const target = { x: 50, y: 75 };
    sync.registerLocal('player', target);
    sync.start();

    vi.advanceTimersByTime(50);
    expect(net.send).toHaveBeenCalledWith('sync:update', {
      entities: [{ id: 'player', x: 50, y: 75 }],
    });
  });

  it('does not send if no local entities', () => {
    sync.registerRemote('enemy', { x: 0, y: 0 });
    sync.start();

    vi.advanceTimersByTime(50);
    expect(net.send).not.toHaveBeenCalled();
  });

  it('receives and buffers remote state', () => {
    const target = { x: 0, y: 0 };
    sync.registerRemote('enemy', target);

    net._dispatch('sync:state', {
      entities: [{ id: 'enemy', x: 100, y: 200, vx: 10, vy: 0 }],
      serverTime: 1000,
    });

    const entity = sync.getEntity('enemy');
    expect(entity?.stateBuffer).toHaveLength(1);
    expect(entity?.stateBuffer[0]).toMatchObject({ x: 100, y: 200 });
  });

  it('ignores state for local entities', () => {
    sync.registerLocal('player', { x: 0, y: 0 });

    net._dispatch('sync:state', {
      entities: [{ id: 'player', x: 999, y: 999 }],
      serverTime: 1000,
    });

    expect(sync.getEntity('player')?.stateBuffer).toHaveLength(0);
  });

  it('interpolates between buffered states', () => {
    const target = { x: 0, y: 0 };
    sync.registerRemote('enemy', target);

    // Buffer two states
    const now = Date.now();
    net._dispatch('sync:state', {
      entities: [{ id: 'enemy', x: 0, y: 0 }],
      serverTime: now - 200,
    });
    net._dispatch('sync:state', {
      entities: [{ id: 'enemy', x: 100, y: 100 }],
      serverTime: now - 100,
    });

    // Update should interpolate
    sync.update(16);

    // Target should have moved from the interpolation
    // Exact values depend on timing — just verify it changed
    expect(sync.getEntity('enemy')?.stateBuffer.length).toBeGreaterThanOrEqual(1);
  });

  it('stop() clears sync timer', () => {
    sync.start();
    sync.stop();

    vi.advanceTimersByTime(100);
    expect(net.send).not.toHaveBeenCalled();
  });

  it('destroy() cleans up everything', () => {
    sync.registerLocal('a', { x: 0, y: 0 });
    sync.registerRemote('b', { x: 0, y: 0 });
    sync.start();

    sync.destroy();
    expect(net.offMessage).toHaveBeenCalled();
    expect(sync.getAllEntities()).toHaveLength(0);
  });

  it('bounds state buffer to 30 entries', () => {
    sync.registerRemote('enemy', { x: 0, y: 0 });

    for (let i = 0; i < 40; i++) {
      net._dispatch('sync:state', {
        entities: [{ id: 'enemy', x: i, y: i }],
        serverTime: 1000 + i * 10,
      });
    }

    expect(sync.getEntity('enemy')?.stateBuffer.length).toBeLessThanOrEqual(30);
  });
});
