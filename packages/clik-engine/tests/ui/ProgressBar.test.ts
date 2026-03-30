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
import { ProgressBar, type ProgressBarConfig } from '../../src/ui/ProgressBar';

function makeConfig(overrides?: Partial<ProgressBarConfig>): ProgressBarConfig {
  return { x: 100, y: 50, width: 200, height: 20, ...overrides };
}

describe('ProgressBar', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs at the specified position', () => {
    const bar = new ProgressBar(scene, makeConfig());
    expect(bar.x).toBe(100);
    expect(bar.y).toBe(50);
  });

  it('defaults value to 0', () => {
    const bar = new ProgressBar(scene, makeConfig());
    expect(bar.value).toBe(0);
  });

  it('accepts an initial value from config', () => {
    const bar = new ProgressBar(scene, makeConfig({ value: 0.75 }));
    expect(bar.value).toBe(0.75);
  });

  it('setValue updates value and returns this', () => {
    const bar = new ProgressBar(scene, makeConfig());
    const result = bar.setValue(0.5);
    expect(bar.value).toBe(0.5);
    expect(result).toBe(bar);
  });

  it('setValue clamps to 0-1 range', () => {
    const bar = new ProgressBar(scene, makeConfig());
    bar.setValue(1.5);
    expect(bar.value).toBe(1);
    bar.setValue(-0.5);
    expect(bar.value).toBe(0);
  });

  it('setFillColor returns this for chaining', () => {
    const bar = new ProgressBar(scene, makeConfig());
    expect(bar.setFillColor(0xff0000)).toBe(bar);
  });

  it('setFillColor calls setFillStyle on the fill rectangle', () => {
    const bar = new ProgressBar(scene, makeConfig());
    bar.setFillColor(0xff0000);
    // The second rectangle created is the fill rect
    const fillRect = (scene.add.rectangle as ReturnType<typeof vi.fn>).mock.results[1].value;
    expect(fillRect.setFillStyle).toHaveBeenCalledWith(0xff0000);
  });

  it('creates label text when label config is provided', () => {
    new ProgressBar(scene, makeConfig({ label: 'HP' }));
    expect(scene.add.text).toHaveBeenCalled();
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const labelCall = calls.find((c: unknown[]) => c[2] === 'HP');
    expect(labelCall).toBeTruthy();
  });

  it('creates percentage text when showPercentage is true', () => {
    new ProgressBar(scene, makeConfig({ showPercentage: true, value: 0.5 }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const pctCall = calls.find((c: unknown[]) => c[2] === '50%');
    expect(pctCall).toBeTruthy();
  });

  it('setLabel updates label text', () => {
    const bar = new ProgressBar(scene, makeConfig({ label: 'HP' }));
    bar.setLabel('MP');
    const labelText = (scene.add.text as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(labelText.setText).toHaveBeenCalledWith('MP');
  });
});
