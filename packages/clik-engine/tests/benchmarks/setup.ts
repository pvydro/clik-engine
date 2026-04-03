/**
 * Shared setup for benchmarks.
 * Provides Phaser mocking and entity creation helpers.
 */
import { vi } from 'vitest';

// Mock Phaser before any engine imports
vi.mock('phaser', () => {
  class MockContainer {
    x: number;
    y: number;
    scene: unknown;
    active = true;
    visible = true;
    depth = 0;
    alpha = 1;
    list: unknown[] = [];
    constructor(scene: unknown, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }
    destroy() {
      this.active = false;
    }
    setDepth() {
      return this;
    }
    setAlpha(a: number) {
      this.alpha = a;
      return this;
    }
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    }
    add(child: unknown) {
      this.list.push(child);
      return this;
    }
  }
  return {
    default: {
      GameObjects: { Container: MockContainer },
      Math: {
        Between: (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1)),
        Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
      },
    },
  };
});

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    engine: vi.fn(),
    error: vi.fn(),
    input: vi.fn(),
    scene: vi.fn(),
    log: vi.fn(),
    state: vi.fn(),
  },
}));

/** Minimal mock scene for benchmarks */
export function makeBenchScene(): Phaser.Scene {
  const mockGraphics = {
    clear: () => mockGraphics,
    fillStyle: () => mockGraphics,
    fillCircle: () => mockGraphics,
    fillRect: () => mockGraphics,
    lineStyle: () => mockGraphics,
    lineBetween: () => mockGraphics,
    strokeRect: () => mockGraphics,
    setDepth: () => mockGraphics,
    destroy: () => {},
  };

  return {
    add: {
      existing: () => {},
      graphics: () => mockGraphics,
      rectangle: () => ({ setOrigin: () => ({}), setDepth: () => ({}) }),
      text: () => ({ setOrigin: () => ({}), setText: () => ({}) }),
      container: () => ({ add: () => {}, list: [] }),
    },
    physics: {
      add: { existing: () => {} },
      world: { gravity: { x: 0, y: 0 } },
    },
    scale: { width: 1280, height: 800 },
    cameras: { main: { scrollX: 0, scrollY: 0, width: 1280, height: 800 } },
  } as unknown as Phaser.Scene;
}
