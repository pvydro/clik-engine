import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser
vi.mock('phaser', () => {
  class MockScene {}
  class MockGame {
    registry = { set: vi.fn(), get: vi.fn() };
    events = { once: vi.fn() };
    scene = { start: vi.fn(), bringToTop: vi.fn() };
  }
  return {
    default: {
      Game: MockGame,
      Scene: MockScene,
      AUTO: 0,
      Scale: { FIT: 1, CENTER_BOTH: 2 },
      Core: { Events: { READY: 'ready' } },
      Input: { Keyboard: { KeyCodes: {} } },
    },
  };
});

vi.mock('../../src/debug/DebugOverlay', () => ({ DebugOverlay: class {} }));
vi.mock('../../src/debug/StateInspector', () => ({ StateInspector: class {} }));
vi.mock('../../src/debug/GridOverlay', () => ({ GridOverlay: class {} }));
vi.mock('../../src/debug/DebugConsole', () => ({ DebugConsole: class {} }));

import { ConsoleReporter } from '../../src/debug/ConsoleReporter';
vi.spyOn(ConsoleReporter, 'error');
vi.spyOn(ConsoleReporter, 'engine').mockImplementation(() => {});

import { createGame } from '../../src/boot/ClikGame';
import type { ClikGameConfig } from '../../src/utils/types';
import Phaser from 'phaser';

class DummyScene extends (Phaser as unknown as { Scene: new () => unknown }).Scene {}

function makeConfig(overrides: Partial<ClikGameConfig> = {}): ClikGameConfig {
  return {
    name: 'test-game',
    scenes: [{ key: 'main', class: DummyScene as unknown as ClikGameConfig['scenes'][0]['class'], default: true }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createGame validation', () => {
  it('creates a game with valid config', () => {
    const game = createGame(makeConfig());
    expect(game).toBeDefined();
    expect(ConsoleReporter.error).not.toHaveBeenCalled();
  });

  it('reports error for empty name', () => {
    createGame(makeConfig({ name: '' }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'name' must be a non-empty string"),
      expect.any(String)
    );
  });

  it('reports error for empty scenes array', () => {
    createGame(makeConfig({ scenes: [] }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining('No scenes defined'),
      expect.any(String)
    );
  });

  it('reports error for duplicate scene keys', () => {
    const scene = { key: 'dup', class: DummyScene as unknown as ClikGameConfig['scenes'][0]['class'] };
    createGame(makeConfig({ scenes: [scene, scene] }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate scene keys'),
      expect.any(String)
    );
  });

  it('reports error for invalid devStartScene', () => {
    createGame(makeConfig({ devStartScene: 'nonexistent' }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("devStartScene 'nonexistent' not found"),
      expect.any(String)
    );
  });

  it('reports error for invalid width', () => {
    createGame(makeConfig({ width: -100 }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'width' must be a positive"),
      expect.any(String)
    );
  });

  it('reports error for invalid scale preset', () => {
    createGame(makeConfig({ scale: 'invalid' as ClikGameConfig['scale'] }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'scale' must be one of"),
      expect.any(String)
    );
  });

  it('reports error for invalid physics type', () => {
    createGame(makeConfig({ physics: 'bad' as ClikGameConfig['physics'] }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'physics' must be one of"),
      expect.any(String)
    );
  });

  it('reports error for invalid backgroundColor', () => {
    createGame(makeConfig({ backgroundColor: 'red' }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'backgroundColor' must be a valid hex color"),
      expect.any(String)
    );
  });

  it('reports error for invalid save config', () => {
    createGame(makeConfig({ save: { slots: -1, version: 0 } }));
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining("'save.slots' must be a positive integer"),
      expect.any(String)
    );
  });

  it('accepts valid optional config values', () => {
    createGame(makeConfig({
      width: 800,
      height: 600,
      scale: 'desktop',
      physics: 'arcade',
      backgroundColor: '#1a2b3c',
      save: { slots: 5, version: 2 },
    }));
    expect(ConsoleReporter.error).not.toHaveBeenCalled();
  });
});
