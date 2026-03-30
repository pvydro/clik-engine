import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

vi.mock('phaser', () => {
  class MockContainer {
    scene: unknown;
    x: number;
    y: number;
    list: unknown[] = [];
    depth = 0;
    active = true;
    visible = true;

    constructor(scene: unknown, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    add(items: unknown) {
      if (Array.isArray(items)) this.list.push(...items);
      else this.list.push(items);
      return this;
    }

    remove() { return this; }
    setSize() { return this; }
    setDepth(d: number) { this.depth = d; return this; }
    setAlpha() { return this; }
    setVisible() { return this; }
    setOrigin() { return this; }
    setInteractive() { return this; }
    on() { return this; }
    off() { return this; }
    emit() { return false; }
    destroy() {}
  }

  return {
    default: {
      GameObjects: {
        Container: MockContainer,
      },
    },
  };
});

import { makeTestScene } from '../helpers/TestScene';
import { Panel, type PanelConfig } from '../../src/ui/Panel';

function makeConfig(overrides?: Partial<PanelConfig>): PanelConfig {
  return { x: 100, y: 100, width: 300, height: 400, ...overrides };
}

describe('Panel', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs at the specified position', () => {
    const panel = new Panel(scene, makeConfig());
    expect(panel.x).toBe(100);
    expect(panel.y).toBe(100);
  });

  it('creates a background rectangle with specified dimensions', () => {
    new Panel(scene, makeConfig({ width: 300, height: 400 }));
    expect(scene.add.rectangle).toHaveBeenCalledWith(0, 0, 300, 400, expect.any(Number), expect.any(Number));
  });

  it('uses default backgroundColor when not specified', () => {
    new Panel(scene, makeConfig());
    expect(scene.add.rectangle).toHaveBeenCalledWith(0, 0, 300, 400, 0x111111, 0.9);
  });

  it('uses custom backgroundColor and alpha', () => {
    new Panel(scene, makeConfig({ backgroundColor: 0xff0000, backgroundAlpha: 0.5 }));
    expect(scene.add.rectangle).toHaveBeenCalledWith(0, 0, 300, 400, 0xff0000, 0.5);
  });

  it('addItem returns this for chaining', () => {
    const panel = new Panel(scene, makeConfig());
    const item = { setPosition: vi.fn(), getBounds: vi.fn(() => ({ height: 40, width: 100 })) };
    expect(panel.addItem(item as unknown as Phaser.GameObjects.GameObject)).toBe(panel);
  });

  it('addItem calls setPosition on the item for layout', () => {
    const panel = new Panel(scene, makeConfig());
    const item = { setPosition: vi.fn(), getBounds: vi.fn(() => ({ height: 40, width: 100 })) };
    panel.addItem(item as unknown as Phaser.GameObjects.GameObject);
    expect(item.setPosition).toHaveBeenCalled();
  });

  it('removeItem returns this for chaining', () => {
    const panel = new Panel(scene, makeConfig());
    const item = { setPosition: vi.fn(), getBounds: vi.fn(() => ({ height: 40, width: 100 })) };
    panel.addItem(item as unknown as Phaser.GameObjects.GameObject);
    expect(panel.removeItem(item as unknown as Phaser.GameObjects.GameObject)).toBe(panel);
  });

  it('clearItems returns this for chaining', () => {
    const panel = new Panel(scene, makeConfig());
    expect(panel.clearItems()).toBe(panel);
  });

  it('horizontal layout positions items along x axis', () => {
    const panel = new Panel(scene, makeConfig({ layout: 'horizontal' }));
    const item = { setPosition: vi.fn(), getBounds: vi.fn(() => ({ height: 40, width: 100 })) };
    panel.addItem(item as unknown as Phaser.GameObjects.GameObject);
    const [x] = item.setPosition.mock.calls[0];
    // Horizontal layout starts at -width/2 + padding
    expect(x).toBeLessThan(0);
  });
});
