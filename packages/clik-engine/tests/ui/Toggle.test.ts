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
    },
  };
});

import { makeTestScene } from '../helpers/TestScene';
import { Toggle, type ToggleConfig } from '../../src/ui/Toggle';

function makeConfig(overrides?: Partial<ToggleConfig>): ToggleConfig {
  return { x: 100, y: 50, ...overrides };
}

describe('Toggle', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs at the specified position', () => {
    const toggle = new Toggle(scene, makeConfig());
    expect(toggle.x).toBe(100);
    expect(toggle.y).toBe(50);
  });

  it('defaults to off (false)', () => {
    const toggle = new Toggle(scene, makeConfig());
    expect(toggle.value).toBe(false);
  });

  it('accepts initial value from config', () => {
    const toggle = new Toggle(scene, makeConfig({ value: true }));
    expect(toggle.value).toBe(true);
  });

  it('toggle() flips the value', () => {
    const toggle = new Toggle(scene, makeConfig());
    toggle.toggle();
    expect(toggle.value).toBe(true);
    toggle.toggle();
    expect(toggle.value).toBe(false);
  });

  it('onChange callback fires on toggle', () => {
    const onChange = vi.fn();
    const toggle = new Toggle(scene, makeConfig({ onChange }));
    toggle.toggle();
    expect(onChange).toHaveBeenCalledWith(true);
    toggle.toggle();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('setValue sets to the given value', () => {
    const toggle = new Toggle(scene, makeConfig());
    const result = toggle.setValue(true);
    expect(toggle.value).toBe(true);
    expect(result).toBe(toggle);
  });

  it('setValue does not toggle when value is already the same', () => {
    const onChange = vi.fn();
    const toggle = new Toggle(scene, makeConfig({ onChange }));
    toggle.setValue(false); // already false
    expect(onChange).not.toHaveBeenCalled();
  });

  it('creates a label text when label is provided', () => {
    new Toggle(scene, makeConfig({ label: 'Sound' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const labelCall = calls.find((c: unknown[]) => c[2] === 'Sound');
    expect(labelCall).toBeTruthy();
  });

  it('creates bg rectangle and thumb circle', () => {
    new Toggle(scene, makeConfig());
    expect(scene.add.rectangle).toHaveBeenCalledTimes(1);
    expect(scene.add.circle).toHaveBeenCalledTimes(1);
  });
});
