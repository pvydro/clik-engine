import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), log: vi.fn(), state: vi.fn() },
}));

import { SceneDirector } from '../../src/scenes/SceneDirector';
import { ConsoleReporter } from '../../src/debug/ConsoleReporter';

function makeSceneMock(key: string) {
  return {
    scene: {
      key,
      start: vi.fn(),
      stop: vi.fn(),
      launch: vi.fn(),
      moveBelow: vi.fn(),
      restart: vi.fn(),
      isActive: vi.fn(() => true),
    },
    cameras: {
      main: {
        setAlpha: vi.fn(),
        setScroll: vi.fn(),
        setZoom: vi.fn(),
      },
    },
    tweens: {
      add: vi.fn((config: any) => {
        // Immediately invoke onComplete to simulate instant tween
        config.onComplete?.();
        return { stop: vi.fn(), destroy: vi.fn() };
      }),
    },
    events: {
      once: vi.fn(),
    },
  };
}

function makeDirector() {
  const fromScene = makeSceneMock('MenuScene');
  const toScene = makeSceneMock('GameScene');

  const scene = {
    scene: {
      key: 'MenuScene',
      start: vi.fn(),
      stop: vi.fn(),
      launch: vi.fn(),
      restart: vi.fn(),
    },
    game: {
      scene: {
        getScene: vi.fn((key: string) => {
          if (key === 'MenuScene') return fromScene;
          if (key === 'GameScene') return toScene;
          return null;
        }),
      },
    },
  } as unknown as Phaser.Scene;

  const director = new SceneDirector(scene);
  return { director, scene, fromScene, toScene };
}

describe('SceneDirector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── go() instant transition ───────────────────────────────────────

  it('go() with no transition does instant scene switch', () => {
    const { director, fromScene } = makeDirector();
    director.go('MenuScene', 'GameScene');
    expect(fromScene.scene.stop).toHaveBeenCalled();
    expect(fromScene.scene.start).toHaveBeenCalledWith('GameScene', undefined);
  });

  it('go() with duration=0 does instant switch', () => {
    const { director, fromScene } = makeDirector();
    director.go('MenuScene', 'GameScene', { duration: 0 });
    expect(fromScene.scene.stop).toHaveBeenCalled();
    expect(fromScene.scene.start).toHaveBeenCalledWith('GameScene', undefined);
  });

  it('go() passes data to scene start', () => {
    const { director, fromScene } = makeDirector();
    const data = { level: 5 };
    director.go('MenuScene', 'GameScene', undefined, data);
    expect(fromScene.scene.start).toHaveBeenCalledWith('GameScene', data);
  });

  it('go() calls onComplete for instant transition', () => {
    const { director, fromScene, toScene } = makeDirector();
    const onComplete = vi.fn();
    director.go('MenuScene', 'GameScene', { duration: 0, onComplete });
    expect(onComplete).toHaveBeenCalledWith(fromScene, toScene);
  });

  // ── go() with transition ──────────────────────────────────────────

  it('go() with transition launches target scene and uses tweens', () => {
    const { director, fromScene, toScene } = makeDirector();
    director.go('MenuScene', 'GameScene', { duration: 500 });
    expect(fromScene.scene.launch).toHaveBeenCalledWith('GameScene', undefined);
    expect(fromScene.scene.moveBelow).toHaveBeenCalledWith('MenuScene', 'GameScene');
    // Our mock tween completes immediately, so transition should be done
    expect(director.isTransitioning()).toBe(false);
  });

  it('go() with transition calls onStart and onComplete callbacks', () => {
    const { director } = makeDirector();
    const onStart = vi.fn();
    const onComplete = vi.fn();
    director.go('MenuScene', 'GameScene', { duration: 300, onStart, onComplete });
    expect(onStart).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  // ── Guard: source not found ───────────────────────────────────────

  it('go() logs error when source scene not found', () => {
    const { director } = makeDirector();
    director.go('NonExistent', 'GameScene');
    expect(ConsoleReporter.error).toHaveBeenCalledWith(expect.stringContaining('NonExistent'));
  });

  // ── Guard: target not found during transition ─────────────────────

  it('go() logs error when target scene not found during animated transition', () => {
    const { director, scene } = makeDirector();
    // Override getScene to return from but not to
    const fromScene = makeSceneMock('MenuScene');
    (scene.game.scene.getScene as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'MenuScene') return fromScene;
      return null;
    });
    director.go('MenuScene', 'Unknown', { duration: 500 });
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining('Unknown'),
      expect.any(String),
    );
  });

  // ── Guard: simultaneous transitions ───────────────────────────────

  it('go() blocks simultaneous transitions', () => {
    const { director, toScene } = makeDirector();
    // Make tween NOT auto-complete so transition stays in progress
    toScene.tweens.add = vi.fn(() => ({ stop: vi.fn(), destroy: vi.fn() })) as any;
    director.go('MenuScene', 'GameScene', { duration: 500 });
    expect(director.isTransitioning()).toBe(true);

    director.go('MenuScene', 'GameScene', { duration: 500 });
    expect(ConsoleReporter.error).toHaveBeenCalledWith(
      expect.stringContaining('already in progress'),
      expect.any(String),
    );
  });

  // ── launch / stop / restart ───────────────────────────────────────

  it('launch delegates to scene.scene.launch', () => {
    const { director, scene } = makeDirector();
    director.launch('HUD', { score: 0 });
    expect(scene.scene.launch).toHaveBeenCalledWith('HUD', { score: 0 });
  });

  it('stop delegates to scene.scene.stop', () => {
    const { director, scene } = makeDirector();
    director.stop('HUD');
    expect(scene.scene.stop).toHaveBeenCalledWith('HUD');
  });

  it('restart delegates to scene.scene.restart', () => {
    const { director, scene } = makeDirector();
    director.restart({ retry: true });
    expect(scene.scene.restart).toHaveBeenCalledWith({ retry: true });
  });

  it('isTransitioning is initially false', () => {
    const { director } = makeDirector();
    expect(director.isTransitioning()).toBe(false);
  });
});
