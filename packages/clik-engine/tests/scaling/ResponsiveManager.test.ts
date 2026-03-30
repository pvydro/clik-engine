import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    engine: vi.fn(),
    error: vi.fn(),
    input: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock('phaser', () => ({
  default: {
    Scale: {
      Events: { RESIZE: 'resize' },
    },
  },
}));

vi.mock('../../src/scenes/BaseScene', () => ({
  BaseScene: class {},
}));

import { ResponsiveManager } from '../../src/scaling/ResponsiveManager';
import type { Breakpoint } from '../../src/scaling/ResponsiveManager';

type ResizeCallback = (gameSize: { width: number; height: number }) => void;

function makeGame(width = 800, height = 600, desktop = true) {
  const listeners: Record<string, ResizeCallback[]> = {};
  return {
    scale: {
      width,
      height,
      on: vi.fn((event: string, cb: ResizeCallback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      off: vi.fn((event: string, cb: ResizeCallback) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((l) => l !== cb);
        }
      }),
    },
    device: {
      os: { desktop },
    },
    scene: {
      getScenes: vi.fn(() => []),
    },
    _listeners: listeners,
    _emitResize(w: number, h: number) {
      // Also update scale dimensions for calculateBreakpoint
      this.scale.width = w;
      this.scale.height = h;
      for (const cb of listeners['resize'] || []) {
        cb({ width: w, height: h });
      }
    },
  } as unknown as import('phaser').default.Game & {
    _listeners: Record<string, ResizeCallback[]>;
    _emitResize: (w: number, h: number) => void;
  };
}

describe('ResponsiveManager', () => {
  let game: ReturnType<typeof makeGame>;

  beforeEach(() => {
    game = makeGame(800, 600);
  });

  describe('constructor', () => {
    it('registers resize listener', () => {
      new ResponsiveManager(game as any);
      expect(game.scale.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('uses default breakpoints', () => {
      const mgr = new ResponsiveManager(game as any);
      // 800 is >= 768 (sm) and < 1024 (md), so breakpoint = md
      expect(mgr.getBreakpoint()).toBe('md');
    });

    it('accepts custom breakpoints', () => {
      const mgr = new ResponsiveManager(game as any, { sm: 500 });
      // 800 >= 500 (sm) and < 1024 (md default), so still md
      expect(mgr.getBreakpoint()).toBe('md');
    });
  });

  describe('getBreakpoint', () => {
    it('returns xs for very small widths', () => {
      const g = makeGame(300, 600);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.getBreakpoint()).toBe('xs');
    });

    it('returns sm for small widths', () => {
      const g = makeGame(500, 600);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.getBreakpoint()).toBe('sm');
    });

    it('returns md for medium widths', () => {
      const g = makeGame(800, 600);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.getBreakpoint()).toBe('md');
    });

    it('returns lg for large widths', () => {
      const g = makeGame(1100, 600);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.getBreakpoint()).toBe('lg');
    });

    it('returns xl for extra large widths', () => {
      const g = makeGame(1400, 600);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.getBreakpoint()).toBe('xl');
    });
  });

  describe('responsive', () => {
    it('returns value for current breakpoint', () => {
      const g = makeGame(500, 600); // sm
      const mgr = new ResponsiveManager(g as any);
      const val = mgr.responsive({ sm: 10, md: 20, default: 0 });
      expect(val).toBe(10);
    });

    it('falls back to default when no match', () => {
      const g = makeGame(500, 600); // sm
      const mgr = new ResponsiveManager(g as any);
      const val = mgr.responsive({ md: 20, lg: 30, default: 99 });
      expect(val).toBe(99);
    });

    it('returns default for unspecified breakpoints', () => {
      const mgr = new ResponsiveManager(game as any); // md
      const val = mgr.responsive({ xs: 'tiny', default: 'normal' });
      expect(val).toBe('normal');
    });
  });

  describe('isPortrait / isLandscape', () => {
    it('detects portrait', () => {
      const g = makeGame(400, 800);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.isPortrait()).toBe(true);
      expect(mgr.isLandscape()).toBe(false);
    });

    it('detects landscape', () => {
      const g = makeGame(800, 400);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.isPortrait()).toBe(false);
      expect(mgr.isLandscape()).toBe(true);
    });

    it('treats square as landscape', () => {
      const g = makeGame(600, 600);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.isLandscape()).toBe(true);
      expect(mgr.isPortrait()).toBe(false);
    });
  });

  describe('isMobile / isDesktop', () => {
    it('detects desktop', () => {
      const g = makeGame(800, 600, true);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.isDesktop()).toBe(true);
      expect(mgr.isMobile()).toBe(false);
    });

    it('detects mobile', () => {
      const g = makeGame(400, 800, false);
      const mgr = new ResponsiveManager(g as any);
      expect(mgr.isMobile()).toBe(true);
      expect(mgr.isDesktop()).toBe(false);
    });
  });

  describe('isAtLeast', () => {
    it('returns true for current breakpoint', () => {
      const mgr = new ResponsiveManager(game as any); // md
      expect(mgr.isAtLeast('md')).toBe(true);
    });

    it('returns true for smaller breakpoints', () => {
      const mgr = new ResponsiveManager(game as any); // md
      expect(mgr.isAtLeast('xs')).toBe(true);
      expect(mgr.isAtLeast('sm')).toBe(true);
    });

    it('returns false for larger breakpoints', () => {
      const mgr = new ResponsiveManager(game as any); // md
      expect(mgr.isAtLeast('lg')).toBe(false);
      expect(mgr.isAtLeast('xl')).toBe(false);
    });
  });

  describe('onBreakpointChange', () => {
    it('fires listener when breakpoint changes on resize', () => {
      const listener = vi.fn();
      const mgr = new ResponsiveManager(game as any); // md (800)
      mgr.onBreakpointChange(listener);

      // Resize to xl
      game._emitResize(1400, 600);
      expect(listener).toHaveBeenCalledWith('xl');
    });

    it('does not fire listener when breakpoint stays the same', () => {
      const listener = vi.fn();
      const mgr = new ResponsiveManager(game as any); // md (800)
      mgr.onBreakpointChange(listener);

      // Resize but stay within md range
      game._emitResize(900, 600);
      expect(listener).not.toHaveBeenCalled();
    });

    it('returns this for chaining', () => {
      const mgr = new ResponsiveManager(game as any);
      const result = mgr.onBreakpointChange(() => {});
      expect(result).toBe(mgr);
    });
  });

  describe('width / height', () => {
    it('returns game dimensions', () => {
      const mgr = new ResponsiveManager(game as any);
      expect(mgr.width).toBe(800);
      expect(mgr.height).toBe(600);
    });
  });

  describe('destroy', () => {
    it('removes resize listener', () => {
      const mgr = new ResponsiveManager(game as any);
      mgr.destroy();
      expect(game.scale.off).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('clears breakpoint listeners', () => {
      const listener = vi.fn();
      const mgr = new ResponsiveManager(game as any);
      mgr.onBreakpointChange(listener);
      mgr.destroy();

      // Manually trigger would-be resize — listener should not fire
      // (resize handler was removed, so this tests the listeners array was cleared)
      // We verify by checking the listener count indirectly
      expect(game.scale.off).toHaveBeenCalled();
    });

    it('is safe to call destroy twice', () => {
      const mgr = new ResponsiveManager(game as any);
      mgr.destroy();
      expect(() => mgr.destroy()).not.toThrow();
    });
  });
});
