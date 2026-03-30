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
      Math: {
        Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
      },
    },
  };
});

import { makeTestScene } from '../helpers/TestScene';
import { Slider, type SliderConfig } from '../../src/ui/Slider';

function makeConfig(overrides?: Partial<SliderConfig>): SliderConfig {
  return { x: 100, y: 50, ...overrides };
}

describe('Slider', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs at the specified position', () => {
    const slider = new Slider(scene, makeConfig());
    expect(slider.x).toBe(100);
    expect(slider.y).toBe(50);
  });

  it('defaults value to 0.5', () => {
    const slider = new Slider(scene, makeConfig());
    expect(slider.value).toBe(0.5);
  });

  it('accepts an initial value from config', () => {
    const slider = new Slider(scene, makeConfig({ value: 0.8 }));
    expect(slider.value).toBe(0.8);
  });

  it('setValue updates the value and returns this', () => {
    const slider = new Slider(scene, makeConfig());
    const result = slider.setValue(0.3);
    expect(slider.value).toBe(0.3);
    expect(result).toBe(slider);
  });

  it('setValue clamps to min/max range', () => {
    const slider = new Slider(scene, makeConfig({ min: 0, max: 1 }));
    slider.setValue(1.5);
    expect(slider.value).toBe(1);
    slider.setValue(-0.5);
    expect(slider.value).toBe(0);
  });

  it('supports custom min/max range', () => {
    const slider = new Slider(scene, makeConfig({ min: 10, max: 20, value: 15 }));
    expect(slider.value).toBe(15);
    slider.setValue(25);
    expect(slider.value).toBe(20);
    slider.setValue(5);
    expect(slider.value).toBe(10);
  });

  it('creates track, fill, and thumb elements', () => {
    new Slider(scene, makeConfig());
    // track + fill = 2 rectangle calls, thumb = 1 circle call
    expect((scene.add.rectangle as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    expect((scene.add.circle as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('registers drag handler on the thumb', () => {
    new Slider(scene, makeConfig());
    const thumb = (scene.add.circle as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(thumb.on).toHaveBeenCalledWith('drag', expect.any(Function));
  });
});
