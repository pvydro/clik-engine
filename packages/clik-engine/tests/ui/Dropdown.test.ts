import { describe, it, expect, vi, beforeEach } from 'vitest';
import Phaser from 'phaser';

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
import { Dropdown, type DropdownConfig } from '../../src/ui/Dropdown';

const defaultOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

function makeConfig(overrides?: Partial<DropdownConfig>): DropdownConfig {
  return { x: 100, y: 50, options: defaultOptions, ...overrides };
}

describe('Dropdown', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs with default placeholder when no selection', () => {
    const dd = new Dropdown(scene, makeConfig());
    expect(dd.selectedValue).toBeNull();
    expect(dd.isOpen).toBe(false);
  });

  it('constructs with a pre-selected value', () => {
    const dd = new Dropdown(scene, makeConfig({ selected: 'banana' }));
    expect(dd.selectedValue).toBe('banana');
  });

  it('open() sets isOpen to true', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.open();
    expect(dd.isOpen).toBe(true);
  });

  it('close() sets isOpen to false', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.open();
    dd.close();
    expect(dd.isOpen).toBe(false);
  });

  it('open() is idempotent when already open', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.open();
    dd.open(); // should not throw or change state
    expect(dd.isOpen).toBe(true);
  });

  it('close() is idempotent when already closed', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.close(); // already closed
    expect(dd.isOpen).toBe(false);
  });

  it('setSelected() updates the selected value', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.setSelected('cherry');
    expect(dd.selectedValue).toBe('cherry');
  });

  it('setSelected() ignores unknown values', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.setSelected('mango');
    expect(dd.selectedValue).toBeNull();
  });

  it('onChange callback fires on selection', () => {
    const onChange = vi.fn();
    const dd = new Dropdown(scene, makeConfig({ onChange }));
    dd.setSelected('apple');
    expect(onChange).toHaveBeenCalledWith('apple', 'Apple');
  });

  it('keyboard ArrowDown/ArrowUp/Enter navigates and selects', () => {
    const onChange = vi.fn();
    const dd = new Dropdown(scene, makeConfig({ onChange }));
    dd.open();

    // Extract the keydown handler
    const keyboardOn = scene.input.keyboard!.on as ReturnType<typeof vi.fn>;
    const keydownCall = keyboardOn.mock.calls.find((c: unknown[]) => c[0] === 'keydown');
    expect(keydownCall).toBeTruthy();
    const handler = keydownCall![1] as (event: KeyboardEvent) => void;

    // Navigate down
    handler({ key: 'ArrowDown' } as KeyboardEvent);
    handler({ key: 'ArrowDown' } as KeyboardEvent);

    // Select with Enter (index 1 = Banana)
    handler({ key: 'Enter' } as KeyboardEvent);
    expect(dd.selectedValue).toBe('banana');
    expect(onChange).toHaveBeenCalledWith('banana', 'Banana');
  });

  it('Escape key closes the dropdown', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.open();

    const keyboardOn = scene.input.keyboard!.on as ReturnType<typeof vi.fn>;
    const keydownCall = keyboardOn.mock.calls.find((c: unknown[]) => c[0] === 'keydown');
    const handler = keydownCall![1] as (event: KeyboardEvent) => void;

    handler({ key: 'Escape' } as KeyboardEvent);
    expect(dd.isOpen).toBe(false);
  });

  it('destroy() cleans up event handlers', () => {
    const dd = new Dropdown(scene, makeConfig());
    dd.destroy();
    expect(scene.input.off).toHaveBeenCalled();
  });
});
