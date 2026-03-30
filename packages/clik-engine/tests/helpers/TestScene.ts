/**
 * Lightweight Phaser.Scene mock for unit tests.
 * Provides stub implementations of every scene subsystem used by engine classes,
 * so any component / manager / UI element can be constructed in tests without
 * a real Phaser game instance.
 *
 * Usage:
 *   import { makeTestScene } from '../helpers/TestScene';
 *   const scene = makeTestScene();
 *   const btn = new Button(scene, { x: 0, y: 0, text: 'Hi' });
 */

import { vi } from 'vitest';

// ── Primitive stubs ────────────────────────────────────────────────────────

const makeGameObject = (extra: Record<string, unknown> = {}) => ({
  setOrigin: vi.fn().mockReturnThis(),
  setPosition: vi.fn().mockReturnThis(),
  setAlpha: vi.fn().mockReturnThis(),
  setDepth: vi.fn().mockReturnThis(),
  setVisible: vi.fn().mockReturnThis(),
  setInteractive: vi.fn().mockReturnThis(),
  setSize: vi.fn().mockReturnThis(),
  setScale: vi.fn().mockReturnThis(),
  setColor: vi.fn().mockReturnThis(),
  setTint: vi.fn().mockReturnThis(),
  setTintFill: vi.fn().mockReturnThis(),
  clearTint: vi.fn().mockReturnThis(),
  setStrokeStyle: vi.fn().mockReturnThis(),
  setFillStyle: vi.fn().mockReturnThis(),
  setDisplaySize: vi.fn().mockReturnThis(),
  setBounds: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  emit: vi.fn(),
  destroy: vi.fn(),
  getBounds: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 40, contains: vi.fn(() => false) })),
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  alpha: 1,
  depth: 0,
  active: true,
  visible: true,
  text: '',
  setText: vi.fn().mockReturnThis(),
  ...extra,
});

const makeRectangle = () => makeGameObject({ setOrigin: vi.fn().mockReturnThis() });
const makeText = () => makeGameObject({ setText: vi.fn().mockReturnThis(), text: '' });
const makeCircle = () => makeGameObject({ x: 0 });
const makeGraphics = () => ({
  ...makeGameObject(),
  clear: vi.fn().mockReturnThis(),
  fillStyle: vi.fn().mockReturnThis(),
  lineStyle: vi.fn().mockReturnThis(),
  fillRect: vi.fn().mockReturnThis(),
  fillRoundedRect: vi.fn().mockReturnThis(),
  strokeRoundedRect: vi.fn().mockReturnThis(),
  fillCircle: vi.fn().mockReturnThis(),
  lineBetween: vi.fn().mockReturnThis(),
  strokeRect: vi.fn().mockReturnThis(),
});
const makeImage = () => makeGameObject({ setDisplaySize: vi.fn().mockReturnThis() });

const makeContainer = () => {
  const children: unknown[] = [];
  return {
    ...makeGameObject(),
    list: children,
    add: vi.fn((items: unknown) => {
      if (Array.isArray(items)) children.push(...items);
      else children.push(items);
    }),
    remove: vi.fn(),
    bringToTop: vi.fn(),
    setSize: vi.fn().mockReturnThis(),
    getLength: vi.fn(() => children.length),
  };
};

// ── Tween stub ─────────────────────────────────────────────────────────────

const makeTween = () => ({
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  destroy: vi.fn(),
  isPlaying: vi.fn(() => false),
});

// ── TimerEvent stub ────────────────────────────────────────────────────────

const makeTimerEvent = () => ({
  destroy: vi.fn(),
  remove: vi.fn(),
  elapsed: 0,
});

// ── Sound stub ────────────────────────────────────────────────────────────

const makeSound = () => ({
  play: vi.fn(),
  stop: vi.fn(),
  destroy: vi.fn(),
  isPlaying: false,
  volume: 1,
  on: vi.fn().mockReturnThis(),
  off: vi.fn(),
  once: vi.fn(),
});

// ── Body stub ─────────────────────────────────────────────────────────────

const makeArcadeBody = () => ({
  setVelocity: vi.fn(),
  setVelocityX: vi.fn(),
  setVelocityY: vi.fn(),
  setMaxVelocity: vi.fn(),
  setDrag: vi.fn(),
  setBounce: vi.fn(),
  setFriction: vi.fn(),
  setGravityY: vi.fn(),
  setCircle: vi.fn(),
  setSize: vi.fn(),
  setOffset: vi.fn(),
  setCollideWorldBounds: vi.fn(),
  reset: vi.fn(),
  velocity: { x: 0, y: 0 },
  allowGravity: true,
  immovable: false,
  moves: true,
  enable: true,
  blocked: { down: false, up: false, left: false, right: false },
  x: 0, y: 0, width: 32, height: 32,
  top: 0, bottom: 32,
});

// ── Main TestScene factory ────────────────────────────────────────────────

export function makeTestScene() {
  const arcadeBody = makeArcadeBody();

  const scene = {
    // add
    add: {
      existing: vi.fn(),
      rectangle: vi.fn(() => makeRectangle()),
      text: vi.fn(() => makeText()),
      circle: vi.fn(() => makeCircle()),
      graphics: vi.fn(() => makeGraphics()),
      image: vi.fn(() => makeImage()),
      container: vi.fn(() => makeContainer()),
      tween: vi.fn(() => makeTween()),
    },

    // input
    input: {
      keyboard: {
        on: vi.fn(),
        off: vi.fn(),
        addKey: vi.fn(() => ({ isDown: false })),
        createCursorKeys: vi.fn(() => ({})),
      },
      on: vi.fn(),
      off: vi.fn(),
      setDraggable: vi.fn(),
    },

    // tweens
    tweens: {
      add: vi.fn(() => makeTween()),
      addCounter: vi.fn(() => makeTween()),
    },

    // time
    time: {
      addEvent: vi.fn(() => makeTimerEvent()),
      delayedCall: vi.fn(() => makeTimerEvent()),
      removeEvent: vi.fn(),
    },

    // sound
    sound: {
      add: vi.fn(() => makeSound()),
      play: vi.fn(),
      stopByKey: vi.fn(),
      mute: false,
      locked: false,
      once: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },

    // physics
    physics: {
      add: {
        existing: vi.fn((_obj: Record<string, unknown>) => {
          _obj['body'] = arcadeBody;
        }),
        group: vi.fn(() => ({
          add: vi.fn(),
          getFirstDead: vi.fn(() => null),
          getLength: vi.fn(() => 0),
          maxSize: 50,
          countActive: vi.fn(() => 0),
          getChildren: vi.fn(() => []),
        })),
        collider: vi.fn(() => ({ active: true })),
        overlap: vi.fn(() => ({ active: true })),
        staticGroup: vi.fn(() => ({})),
      },
      world: {
        gravity: { set: vi.fn(), x: 0, y: 980 },
        setBounds: vi.fn(),
        on: vi.fn(),
      },
    },

    // scale
    scale: { width: 800, height: 600 },

    // cameras
    cameras: {
      main: {
        scrollX: 0,
        scrollY: 0,
        width: 800,
        height: 600,
        zoom: 1,
        startFollow: vi.fn(),
        stopFollow: vi.fn(),
        setDeadzone: vi.fn(),
        setBounds: vi.fn(),
        setScroll: vi.fn(),
        setZoom: vi.fn(),
        setRotation: vi.fn(),
        setAlpha: vi.fn(),
        shake: vi.fn((_dur: number, _int: number, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
        flash: vi.fn((_dur: number, _r: number, _g: number, _b: number, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
        fadeIn: vi.fn((_dur: number, _r: number, _g: number, _b: number, cb: (c: unknown, p: number) => void) => cb(null, 1)),
        fadeOut: vi.fn((_dur: number, _r: number, _g: number, _b: number, cb: (c: unknown, p: number) => void) => cb(null, 1)),
        zoomTo: vi.fn((_zoom: number, _dur: number, _ease: string, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
        pan: vi.fn((_x: number, _y: number, _dur: number, _ease: string, _reset: boolean, cb: (c: unknown, p: number) => void) => cb(null, 1)),
        getWorldPoint: vi.fn((x: number, y: number) => ({ x, y })),
        blocked: { down: false, up: false, left: false, right: false },
      },
    },

    // game
    game: {
      registry: {
        get: vi.fn(),
        set: vi.fn(),
      },
      sound: {
        locked: false,
        mute: false,
        once: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
      scene: {
        getScene: vi.fn(() => null),
        getScenes: vi.fn(() => []),
      },
    },

    // scene manager
    scene: {
      key: 'TestScene',
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      get: vi.fn(),
    },

    // expose the body stub so tests can inspect it
    _arcadeBody: arcadeBody,
  };

  return scene as unknown as Phaser.Scene & { _arcadeBody: ReturnType<typeof makeArcadeBody> };
}

/**
 * Create a minimal Entity-like mock suitable for testing Components.
 * Pass this as `component.entity` before calling component methods.
 */
export function makeEntityMock(x = 0, y = 0, scene?: Phaser.Scene) {
  const mockScene = scene ?? makeTestScene();
  return {
    x,
    y,
    alpha: 1,
    depth: 0,
    active: true,
    entityType: 'mock',
    scene: mockScene,
    list: [] as unknown[],
    setAlpha: vi.fn().mockImplementation(function(this: { alpha: number }, a: number) { this.alpha = a; return this; }),
    setDepth: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    destroy: vi.fn().mockImplementation(function(this: { active: boolean }) { this.active = false; }),
    on: vi.fn().mockReturnThis(),
    off: vi.fn(),
    emit: vi.fn(),
  };
}
