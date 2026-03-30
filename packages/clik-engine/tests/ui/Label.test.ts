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
      Display: {
        Color: {
          HexStringToColor: (hex: string) => ({ color: parseInt(hex.replace('#', ''), 16) }),
        },
      },
    },
  };
});

import { makeTestScene } from '../helpers/TestScene';
import { Label, type LabelConfig } from '../../src/ui/Label';

function makeConfig(overrides?: Partial<LabelConfig>): LabelConfig {
  return { x: 100, y: 50, text: 'Hello', ...overrides };
}

describe('Label', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs at the specified position', () => {
    const label = new Label(scene, makeConfig());
    expect(label.x).toBe(100);
    expect(label.y).toBe(50);
  });

  it('creates a text object with the given text', () => {
    new Label(scene, makeConfig({ text: 'Score' }));
    expect(scene.add.text).toHaveBeenCalled();
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const textCall = calls.find((c: unknown[]) => c[2] === 'Score');
    expect(textCall).toBeTruthy();
  });

  it('setText returns this for chaining', () => {
    const label = new Label(scene, makeConfig());
    expect(label.setText('New')).toBe(label);
  });

  it('setColor returns this for chaining', () => {
    const label = new Label(scene, makeConfig());
    expect(label.setColor('#ff0000')).toBe(label);
  });

  it('setColor calls setColor on the inner text', () => {
    const label = new Label(scene, makeConfig());
    label.setColor('#ff0000');
    // The internal label.setColor should have been called on the text mock
    const textMock = (scene.add.text as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(textMock.setColor).toHaveBeenCalledWith('#ff0000');
  });

  it('creates a background rectangle when backgroundColor is provided', () => {
    new Label(scene, makeConfig({ backgroundColor: '#333333' }));
    expect(scene.add.rectangle).toHaveBeenCalled();
  });

  it('does not create a background rectangle without backgroundColor', () => {
    new Label(scene, makeConfig());
    expect(scene.add.rectangle).not.toHaveBeenCalled();
  });

  it('applies custom font size', () => {
    new Label(scene, makeConfig({ fontSize: '24px' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const styleArg = calls[0][3] as { fontSize: string };
    expect(styleArg.fontSize).toBe('24px');
  });
});
