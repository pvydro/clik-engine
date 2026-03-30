import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

// PlatformManager requires document.addEventListener at construction time.
const mockAddEventListener = vi.fn();

vi.stubGlobal('document', {
  addEventListener: mockAddEventListener,
  hidden: false,
  documentElement: { requestFullscreen: vi.fn() },
  fullscreenElement: null,
  exitFullscreen: vi.fn(),
});

vi.stubGlobal('window', {
  innerWidth: 800,
  innerHeight: 600,
  matchMedia: vi.fn(() => ({ matches: false })),
});

vi.stubGlobal('getComputedStyle', vi.fn(() => ({
  getPropertyValue: vi.fn(() => '0'),
})));

vi.mock('phaser', () => ({
  default: {},
}));

import { PlatformManager } from '../../src/platform/PlatformManager';

function makeGame(osOverrides: Record<string, boolean> = {}) {
  return {
    device: {
      os: {
        desktop: true,
        iOS: false,
        android: false,
        macOS: false,
        windows: false,
        linux: false,
        ...osOverrides,
      },
    },
    scene: {
      getScenes: vi.fn(() => []),
    },
  } as unknown as import('phaser').default.Game;
}

describe('PlatformManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects desktop platform', () => {
    const pm = new PlatformManager(makeGame({ desktop: true }));
    expect(pm.isDesktop).toBe(true);
    expect(pm.isMobile).toBe(false);
  });

  it('detects mobile platform', () => {
    const pm = new PlatformManager(makeGame({ desktop: false }));
    expect(pm.isMobile).toBe(true);
    expect(pm.isDesktop).toBe(false);
  });

  it('detects capacitor', () => {
    (globalThis as Record<string, unknown>).Capacitor = {};
    const pm = new PlatformManager(makeGame());
    expect(pm.isCapacitor).toBe(true);
    delete (globalThis as Record<string, unknown>).Capacitor;
  });

  it('detects no capacitor', () => {
    delete (globalThis as Record<string, unknown>).Capacitor;
    const pm = new PlatformManager(makeGame());
    expect(pm.isCapacitor).toBe(false);
  });

  describe('getOS', () => {
    it('returns ios', () => {
      expect(new PlatformManager(makeGame({ iOS: true })).getOS()).toBe('ios');
    });
    it('returns android', () => {
      expect(new PlatformManager(makeGame({ android: true })).getOS()).toBe('android');
    });
    it('returns windows', () => {
      expect(new PlatformManager(makeGame({ windows: true })).getOS()).toBe('windows');
    });
    it('returns macos', () => {
      expect(new PlatformManager(makeGame({ macOS: true })).getOS()).toBe('macos');
    });
    it('returns linux', () => {
      expect(new PlatformManager(makeGame({ linux: true })).getOS()).toBe('linux');
    });
    it('returns unknown', () => {
      expect(new PlatformManager(makeGame()).getOS()).toBe('unknown');
    });
  });

  it('registers visibilitychange listener', () => {
    new PlatformManager(makeGame());
    expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('registers backbutton listener on mobile', () => {
    new PlatformManager(makeGame({ desktop: false }));
    expect(mockAddEventListener).toHaveBeenCalledWith('backbutton', expect.any(Function));
  });

  it('does not register backbutton on desktop', () => {
    new PlatformManager(makeGame({ desktop: true }));
    const calls = mockAddEventListener.mock.calls.filter(
      (c: unknown[]) => c[0] === 'backbutton'
    );
    expect(calls).toHaveLength(0);
  });

  it('onPause/onResume register callbacks and chain', () => {
    const pm = new PlatformManager(makeGame());
    const pauseCb = vi.fn();
    const resumeCb = vi.fn();
    expect(pm.onPause(pauseCb)).toBe(pm);
    expect(pm.onResume(resumeCb)).toBe(pm);
  });

  it('detects landscape', () => {
    const pm = new PlatformManager(makeGame());
    expect(pm.isLandscape()).toBe(true);
  });
});
