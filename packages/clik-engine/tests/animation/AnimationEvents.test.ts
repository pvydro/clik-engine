import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), scene: vi.fn(), state: vi.fn(), audio: vi.fn(), save: vi.fn(), asset: vi.fn(), log: vi.fn() },
}));

vi.mock('phaser', () => ({
  default: {
    Animations: {
      Events: {
        ANIMATION_UPDATE: 'animationupdate',
        ANIMATION_START: 'animationstart',
      },
    },
  },
}));

import { AnimationEventSystem } from '../../src/animation/AnimationEvents';

function makeSprite() {
  const listeners = new Map<string, Function[]>();
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(handler);
      return this;
    }),
    off: vi.fn((event: string, handler: Function) => {
      const fns = listeners.get(event);
      if (fns) {
        const idx = fns.indexOf(handler);
        if (idx >= 0) fns.splice(idx, 1);
      }
    }),
    _emit(event: string, ...args: unknown[]) {
      const fns = listeners.get(event);
      if (fns) fns.forEach((fn) => fn(...args));
    },
    _listeners: listeners,
  } as unknown as Phaser.GameObjects.Sprite & { _emit: Function; _listeners: Map<string, Function[]> };
}

function makeScene() {
  return {
    sound: { play: vi.fn() },
    cameras: {
      main: {
        shake: vi.fn(),
      },
    },
  } as unknown as Phaser.Scene;
}

describe('AnimationEventSystem', () => {
  let scene: Phaser.Scene;
  let system: AnimationEventSystem;

  beforeEach(() => {
    scene = makeScene();
    system = new AnimationEventSystem(scene);
  });

  // ── on() ────────────────────────────────────────────────────────────────

  describe('on()', () => {
    it('registers an event and returns this for chaining', () => {
      const result = system.on('walk', 2, vi.fn());
      expect(result).toBe(system);
    });

    it('registers multiple events on same animKey', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      system.on('walk', 1, cb1);
      system.on('walk', 3, cb2);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'walk' }, { index: 1 });
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).not.toHaveBeenCalled();

      sprite._emit('animationupdate', { key: 'walk' }, { index: 3 });
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('registers once events that only fire one time per animation loop', () => {
      const cb = vi.fn();
      system.on('attack', 2, cb, true);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'attack' }, { index: 2 });
      sprite._emit('animationupdate', { key: 'attack' }, { index: 2 });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('once events reset when animation restarts', () => {
      const cb = vi.fn();
      system.on('attack', 2, cb, true);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'attack' }, { index: 2 });
      expect(cb).toHaveBeenCalledTimes(1);

      // Simulate animation restart
      sprite._emit('animationstart', { key: 'attack' });

      sprite._emit('animationupdate', { key: 'attack' }, { index: 2 });
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  // ── bind() ──────────────────────────────────────────────────────────────

  describe('bind()', () => {
    it('attaches update and start listeners to sprite', () => {
      const sprite = makeSprite();
      const result = system.bind(sprite);
      expect(result).toBe(system);
      expect(sprite.on).toHaveBeenCalledWith('animationupdate', expect.any(Function));
      expect(sprite.on).toHaveBeenCalledWith('animationstart', expect.any(Function));
    });

    it('fires callbacks when sprite emits matching animation frame', () => {
      const cb = vi.fn();
      system.on('run', 4, cb);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'run' }, { index: 4 });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('does not fire callbacks for non-matching animation keys', () => {
      const cb = vi.fn();
      system.on('run', 4, cb);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'idle' }, { index: 4 });
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not fire callbacks for non-matching frame index', () => {
      const cb = vi.fn();
      system.on('run', 4, cb);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'run' }, { index: 2 });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── unbind() ────────────────────────────────────────────────────────────

  describe('unbind()', () => {
    it('removes listeners from sprite and returns this', () => {
      const sprite = makeSprite();
      system.bind(sprite);

      const result = system.unbind(sprite);
      expect(result).toBe(system);
      expect(sprite.off).toHaveBeenCalledWith('animationupdate', expect.any(Function));
      expect(sprite.off).toHaveBeenCalledWith('animationstart', expect.any(Function));
    });

    it('stops firing callbacks after unbind', () => {
      const cb = vi.fn();
      system.on('run', 1, cb);

      const sprite = makeSprite();
      system.bind(sprite);
      system.unbind(sprite);

      sprite._emit('animationupdate', { key: 'run' }, { index: 1 });
      expect(cb).not.toHaveBeenCalled();
    });

    it('is a no-op for sprites that were never bound', () => {
      const sprite = makeSprite();
      const result = system.unbind(sprite);
      expect(result).toBe(system);
      expect(sprite.off).not.toHaveBeenCalled();
    });
  });

  // ── clear() ─────────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('removes all events for a given animation key', () => {
      const cb = vi.fn();
      system.on('walk', 1, cb);
      system.clear('walk');

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'walk' }, { index: 1 });
      expect(cb).not.toHaveBeenCalled();
    });

    it('returns this for chaining', () => {
      expect(system.clear('walk')).toBe(system);
    });
  });

  // ── clearAll() ──────────────────────────────────────────────────────────

  describe('clearAll()', () => {
    it('removes all events and unbinds all sprites', () => {
      const cb = vi.fn();
      system.on('walk', 1, cb);
      system.on('run', 2, cb);

      const sprite1 = makeSprite();
      const sprite2 = makeSprite();
      system.bind(sprite1);
      system.bind(sprite2);

      system.clearAll();

      expect(sprite1.off).toHaveBeenCalledWith('animationupdate', expect.any(Function));
      expect(sprite1.off).toHaveBeenCalledWith('animationstart', expect.any(Function));
      expect(sprite2.off).toHaveBeenCalledWith('animationupdate', expect.any(Function));
      expect(sprite2.off).toHaveBeenCalledWith('animationstart', expect.any(Function));
    });

    it('prevents previously registered events from firing', () => {
      const cb = vi.fn();
      system.on('walk', 1, cb);

      const sprite = makeSprite();
      system.bind(sprite);
      system.clearAll();

      sprite._emit('animationupdate', { key: 'walk' }, { index: 1 });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── onSound() ───────────────────────────────────────────────────────────

  describe('onSound()', () => {
    it('plays sound on the specified frame', () => {
      system.onSound('attack', 3, 'slash_sfx');

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'attack' }, { index: 3 });
      expect(scene.sound.play).toHaveBeenCalledWith('slash_sfx', { volume: 1 });
    });

    it('plays sound with custom volume', () => {
      system.onSound('attack', 3, 'slash_sfx', 0.5);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'attack' }, { index: 3 });
      expect(scene.sound.play).toHaveBeenCalledWith('slash_sfx', { volume: 0.5 });
    });

    it('returns this for chaining', () => {
      expect(system.onSound('attack', 3, 'slash_sfx')).toBe(system);
    });
  });

  // ── onShake() ───────────────────────────────────────────────────────────

  describe('onShake()', () => {
    it('shakes camera on the specified frame', () => {
      system.onShake('impact', 1);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'impact' }, { index: 1 });
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(100, 0.005);
    });

    it('shakes camera with custom duration and intensity', () => {
      system.onShake('impact', 1, 200, 0.01);

      const sprite = makeSprite();
      system.bind(sprite);

      sprite._emit('animationupdate', { key: 'impact' }, { index: 1 });
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(200, 0.01);
    });

    it('returns this for chaining', () => {
      expect(system.onShake('impact', 1)).toBe(system);
    });
  });
});
