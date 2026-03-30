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
import { RadioGroup, type RadioGroupConfig } from '../../src/ui/RadioGroup';

const defaultOptions = [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
];

function makeConfig(overrides?: Partial<RadioGroupConfig>): RadioGroupConfig {
  return { x: 0, y: 0, options: defaultOptions, ...overrides };
}

describe('RadioGroup', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs with no selection by default', () => {
    const rg = new RadioGroup(scene, makeConfig());
    expect(rg.selectedValue).toBeNull();
  });

  it('constructs with a pre-selected value', () => {
    const rg = new RadioGroup(scene, makeConfig({ selected: 'md' }));
    expect(rg.selectedValue).toBe('md');
  });

  it('select() updates the selected value', () => {
    const rg = new RadioGroup(scene, makeConfig());
    rg.select('lg');
    expect(rg.selectedValue).toBe('lg');
  });

  it('select() is mutually exclusive', () => {
    const rg = new RadioGroup(scene, makeConfig());
    rg.select('sm');
    expect(rg.selectedValue).toBe('sm');
    rg.select('lg');
    expect(rg.selectedValue).toBe('lg');
  });

  it('select() ignores duplicate selection', () => {
    const onChange = vi.fn();
    const rg = new RadioGroup(scene, makeConfig({ onChange }));
    rg.select('md');
    rg.select('md'); // same value again
    // onChange should only fire once
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onChange callback fires on selection change', () => {
    const onChange = vi.fn();
    const rg = new RadioGroup(scene, makeConfig({ onChange }));
    rg.select('sm');
    expect(onChange).toHaveBeenCalledWith('sm');
    rg.select('lg');
    expect(onChange).toHaveBeenCalledWith('lg');
  });

  it('setSelected() is chainable', () => {
    const rg = new RadioGroup(scene, makeConfig());
    expect(rg.setSelected('md')).toBe(rg);
    expect(rg.selectedValue).toBe('md');
  });

  it('creates circles and text for each option', () => {
    new RadioGroup(scene, makeConfig());
    // 3 options * 1 circle per option (outer)
    expect(scene.add.circle).toHaveBeenCalledTimes(6); // 3 outer + 3 inner
    // 3 labels
    expect(scene.add.text).toHaveBeenCalledTimes(3);
  });

  it('supports horizontal layout', () => {
    const rg = new RadioGroup(scene, makeConfig({ layout: 'horizontal' }));
    expect(rg.selectedValue).toBeNull();
    // Should still create all options
    expect(scene.add.circle).toHaveBeenCalledTimes(6);
  });
});
