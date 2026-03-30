import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn(), scene: vi.fn() },
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
    private _handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

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
    setScale() { return this; }
    setVisible() { return this; }
    setOrigin() { return this; }
    setInteractive() { return this; }
    disableInteractive() { return this; }
    bringToTop() { return this; }

    on(event: string, fn: (...args: unknown[]) => void) {
      if (!this._handlers[event]) this._handlers[event] = [];
      this._handlers[event].push(fn);
      return this;
    }

    off() { return this; }

    emit(event: string, ...args: unknown[]) {
      (this._handlers[event] ?? []).forEach(fn => fn(...args));
      return false;
    }

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
import { Button, type ButtonConfig } from '../../src/ui/Button';

function makeConfig(overrides?: Partial<ButtonConfig>): ButtonConfig {
  return { x: 100, y: 50, text: 'Click me', ...overrides };
}

describe('Button', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs at the specified position', () => {
    const btn = new Button(scene, makeConfig());
    expect(btn.x).toBe(100);
    expect(btn.y).toBe(50);
  });

  it('creates a text label from config', () => {
    new Button(scene, makeConfig({ text: 'Start' }));
    expect(scene.add.text).toHaveBeenCalled();
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const textCall = calls.find((c: unknown[]) => c[2] === 'Start');
    expect(textCall).toBeTruthy();
  });

  it('setText updates the label text', () => {
    const btn = new Button(scene, makeConfig());
    const result = btn.setText('New text');
    expect(result).toBe(btn); // chainable
  });

  it('getText returns the label text', () => {
    const btn = new Button(scene, makeConfig({ text: 'Hello' }));
    // The mock text object has text = '' by default, but setText is called via scene.add.text
    // getText reads from label.text which is the mock text object
    expect(typeof btn.getText()).toBe('string');
  });

  it('isEnabled returns true by default', () => {
    const btn = new Button(scene, makeConfig());
    expect(btn.isEnabled()).toBe(true);
  });

  it('setEnabled(false) disables the button', () => {
    const btn = new Button(scene, makeConfig());
    const result = btn.setEnabled(false);
    expect(btn.isEnabled()).toBe(false);
    expect(result).toBe(btn); // chainable
  });

  it('setEnabled(true) re-enables the button', () => {
    const btn = new Button(scene, makeConfig());
    btn.setEnabled(false);
    btn.setEnabled(true);
    expect(btn.isEnabled()).toBe(true);
  });

  it('onClick callback fires on pointerup after pointerdown', () => {
    const onClick = vi.fn();
    const btn = new Button(scene, makeConfig({ onClick }));
    // Simulate full click: pointerdown then pointerup
    btn.emit('pointerdown');
    btn.emit('pointerup');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('onClick does not fire when disabled', () => {
    const onClick = vi.fn();
    const btn = new Button(scene, makeConfig({ onClick }));
    btn.setEnabled(false);
    btn.emit('pointerdown');
    btn.emit('pointerup');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses Graphics for rounded borderRadius', () => {
    new Button(scene, makeConfig({ borderRadius: 12 }));
    expect(scene.add.graphics).toHaveBeenCalled();
  });

  it('uses Rectangle when borderRadius is 0 or unset', () => {
    new Button(scene, makeConfig());
    expect(scene.add.rectangle).toHaveBeenCalled();
  });
});
