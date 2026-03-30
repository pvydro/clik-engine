import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

// Mock Phaser so the Container superclass is a simple stub
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
import { Checkbox, type CheckboxConfig } from '../../src/ui/Checkbox';

function makeConfig(overrides?: Partial<CheckboxConfig>): CheckboxConfig {
  return { x: 50, y: 50, ...overrides };
}

describe('Checkbox', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs unchecked by default', () => {
    const cb = new Checkbox(scene, makeConfig());
    expect(cb.checked).toBe(false);
  });

  it('constructs checked when config says so', () => {
    const cb = new Checkbox(scene, makeConfig({ checked: true }));
    expect(cb.checked).toBe(true);
  });

  it('toggle() flips checked state', () => {
    const cb = new Checkbox(scene, makeConfig());
    cb.toggle();
    expect(cb.checked).toBe(true);
    cb.toggle();
    expect(cb.checked).toBe(false);
  });

  it('setChecked(true) sets to checked', () => {
    const cb = new Checkbox(scene, makeConfig());
    cb.setChecked(true);
    expect(cb.checked).toBe(true);
  });

  it('setChecked(false) sets to unchecked', () => {
    const cb = new Checkbox(scene, makeConfig({ checked: true }));
    cb.setChecked(false);
    expect(cb.checked).toBe(false);
  });

  it('setChecked with same value does not toggle', () => {
    const onChange = vi.fn();
    const cb = new Checkbox(scene, makeConfig({ checked: true, onChange }));
    cb.setChecked(true);
    // onChange should not be called because state did not change
    expect(onChange).not.toHaveBeenCalled();
    expect(cb.checked).toBe(true);
  });

  it('onChange callback fires on toggle', () => {
    const onChange = vi.fn();
    const cb = new Checkbox(scene, makeConfig({ onChange }));
    cb.toggle();
    expect(onChange).toHaveBeenCalledWith(true);
    cb.toggle();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('returns this from setChecked for chaining', () => {
    const cb = new Checkbox(scene, makeConfig());
    expect(cb.setChecked(true)).toBe(cb);
  });

  it('creates a label text when label is provided', () => {
    new Checkbox(scene, makeConfig({ label: 'Accept terms' }));
    // The text factory should be called for checkmark + label = 2 text calls
    expect(scene.add.text).toHaveBeenCalledTimes(2);
  });

  it('creates only checkmark text when no label', () => {
    new Checkbox(scene, makeConfig());
    // Only the checkmark text
    expect(scene.add.text).toHaveBeenCalledTimes(1);
  });
});
