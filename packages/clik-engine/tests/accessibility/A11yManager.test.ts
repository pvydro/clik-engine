import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    engine: vi.fn(),
    error: vi.fn(),
    input: vi.fn(),
    log: vi.fn(),
  },
}));

// Stub Phaser.Math.Clamp since we don't load real Phaser
vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
    },
  },
}));

import { A11yManager } from '../../src/accessibility/A11yManager';

const makeGame = () => ({}) as unknown as import('phaser').default.Game;

describe('A11yManager', () => {
  let game: import('phaser').default.Game;

  beforeEach(() => {
    game = makeGame();
    // Ensure matchMedia returns false for reduced motion by default
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });

  describe('constructor', () => {
    it('initializes with default config', () => {
      const mgr = new A11yManager(game);
      const config = mgr.getConfig();
      expect(config.colorBlindMode).toBe('none');
      expect(config.highContrast).toBe(false);
      expect(config.reducedMotion).toBe(false);
      expect(config.fontScale).toBe(1);
    });

    it('accepts custom config', () => {
      const mgr = new A11yManager(game, {
        colorBlindMode: 'deuteranopia',
        highContrast: true,
        fontScale: 1.5,
      });
      const config = mgr.getConfig();
      expect(config.colorBlindMode).toBe('deuteranopia');
      expect(config.highContrast).toBe(true);
      expect(config.fontScale).toBe(1.5);
    });
  });

  describe('setColorBlindMode / getColorBlindMode', () => {
    it('sets and gets color blind mode', () => {
      const mgr = new A11yManager(game);
      mgr.setColorBlindMode('protanopia');
      expect(mgr.getColorBlindMode()).toBe('protanopia');
    });

    it('can cycle through all modes', () => {
      const mgr = new A11yManager(game);
      for (const mode of ['none', 'deuteranopia', 'protanopia', 'tritanopia'] as const) {
        mgr.setColorBlindMode(mode);
        expect(mgr.getColorBlindMode()).toBe(mode);
      }
    });
  });

  describe('setHighContrast / isHighContrast', () => {
    it('enables high contrast', () => {
      const mgr = new A11yManager(game);
      expect(mgr.isHighContrast()).toBe(false);
      mgr.setHighContrast(true);
      expect(mgr.isHighContrast()).toBe(true);
    });

    it('disables high contrast', () => {
      const mgr = new A11yManager(game, { highContrast: true });
      mgr.setHighContrast(false);
      expect(mgr.isHighContrast()).toBe(false);
    });
  });

  describe('reducedMotion', () => {
    it('detects prefers-reduced-motion from matchMedia', () => {
      (globalThis as Record<string, unknown>).window = { matchMedia: vi.fn(() => ({ matches: true })) };
      const mgr = new A11yManager(game);
      expect(mgr.isReducedMotion()).toBe(true);
      delete (globalThis as Record<string, unknown>).window;
    });

    it('defaults to false when matchMedia returns false', () => {
      (globalThis as Record<string, unknown>).window = { matchMedia: vi.fn(() => ({ matches: false })) };
      const mgr = new A11yManager(game);
      expect(mgr.isReducedMotion()).toBe(false);
      delete (globalThis as Record<string, unknown>).window;
    });

    it('can be set manually', () => {
      const mgr = new A11yManager(game);
      mgr.setReducedMotion(true);
      expect(mgr.isReducedMotion()).toBe(true);
    });

    it('animDuration returns 0 when reduced motion is on', () => {
      const mgr = new A11yManager(game, { reducedMotion: true });
      expect(mgr.animDuration(500)).toBe(0);
    });

    it('animDuration returns normal value when reduced motion is off', () => {
      const mgr = new A11yManager(game, { reducedMotion: false });
      expect(mgr.animDuration(500)).toBe(500);
    });
  });

  describe('fontScale', () => {
    it('sets font scale', () => {
      const mgr = new A11yManager(game);
      mgr.setFontScale(1.5);
      expect(mgr.getFontScale()).toBe(1.5);
    });

    it('clamps font scale to minimum 0.5', () => {
      const mgr = new A11yManager(game);
      mgr.setFontScale(0.1);
      expect(mgr.getFontScale()).toBe(0.5);
    });

    it('clamps font scale to maximum 2', () => {
      const mgr = new A11yManager(game);
      mgr.setFontScale(5);
      expect(mgr.getFontScale()).toBe(2);
    });

    it('scaledFontSize returns correct string', () => {
      const mgr = new A11yManager(game, { fontScale: 1.5 });
      expect(mgr.scaledFontSize(16)).toBe('24px');
      expect(mgr.scaledFontSize(20)).toBe('30px');
    });
  });

  describe('adjustColor', () => {
    it('returns original color when mode is none', () => {
      const mgr = new A11yManager(game);
      const color = 0xff0000;
      expect(mgr.adjustColor(color)).toBe(color);
    });

    it('adjusts color for deuteranopia', () => {
      const mgr = new A11yManager(game, { colorBlindMode: 'deuteranopia' });
      const red = 0xff0000; // pure red
      const result = mgr.adjustColor(red);
      // r=255, g=0, b=0 → nr=round(255*0.625+0*0.375)=159, ng=round(255*0.7+0*0.3)=179, nb=round(0*0.8+0*0.2)=0
      expect(result).toBe((159 << 16) | (179 << 8) | 0);
    });

    it('adjusts color for protanopia', () => {
      const mgr = new A11yManager(game, { colorBlindMode: 'protanopia' });
      const red = 0xff0000;
      const result = mgr.adjustColor(red);
      // nr=round(255*0.567)=145, ng=round(255*0.558)=142, nb=round(0*0.9+0*0.1)=0
      expect(result).toBe((145 << 16) | (142 << 8) | 0);
    });

    it('adjusts color for tritanopia', () => {
      const mgr = new A11yManager(game, { colorBlindMode: 'tritanopia' });
      const blue = 0x0000ff; // r=0, g=0, b=255
      const result = mgr.adjustColor(blue);
      // nr=round(0*0.95+0*0.05)=0, ng=round(0*0.433+255*0.567)=145, nb=round(0*0.475+255*0.525)=134
      expect(result).toBe((0 << 16) | (145 << 8) | 134);
    });

    it('adjusts a mixed color for deuteranopia', () => {
      const mgr = new A11yManager(game, { colorBlindMode: 'deuteranopia' });
      const color = 0x80ff40; // r=128, g=255, b=64
      const result = mgr.adjustColor(color);
      const nr = Math.round(128 * 0.625 + 255 * 0.375); // 176
      const ng = Math.round(128 * 0.7 + 255 * 0.3); // 166
      const nb = Math.round(64 * 0.8 + 255 * 0.2); // 102
      expect(result).toBe((nr << 16) | (ng << 8) | nb);
    });
  });

  describe('getConfig', () => {
    it('returns a copy of the config', () => {
      const mgr = new A11yManager(game);
      const config1 = mgr.getConfig();
      const config2 = mgr.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });
});
