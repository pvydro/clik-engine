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
    setVisible() { return this; }
    setOrigin() { return this; }
    setInteractive() { return this; }

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
import { Dialog, type DialogConfig } from '../../src/ui/Dialog';

function makeConfig(overrides?: Partial<DialogConfig>): DialogConfig {
  return { title: 'Test Dialog', message: 'Are you sure?', ...overrides };
}

describe('Dialog', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = makeTestScene();
  });

  it('constructs centered on the screen', () => {
    const dialog = new Dialog(scene, makeConfig());
    expect(dialog.x).toBe(400); // scale.width / 2
    expect(dialog.y).toBe(300); // scale.height / 2
  });

  it('creates a backdrop rectangle', () => {
    new Dialog(scene, makeConfig());
    // First rectangle call is the backdrop, second is the panel
    expect((scene.add.rectangle as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('creates title text when title is provided', () => {
    new Dialog(scene, makeConfig({ title: 'Confirm' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const titleCall = calls.find((c: unknown[]) => c[2] === 'Confirm');
    expect(titleCall).toBeTruthy();
  });

  it('creates message text when message is provided', () => {
    new Dialog(scene, makeConfig({ message: 'Delete file?' }));
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    const msgCall = calls.find((c: unknown[]) => c[2] === 'Delete file?');
    expect(msgCall).toBeTruthy();
  });

  it('does not create title text when title is omitted', () => {
    new Dialog(scene, { message: 'No title' });
    const calls = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls;
    // Only message text should be created, no title
    expect(calls.length).toBe(1);
  });

  it('addButton returns this for chaining', () => {
    const dialog = new Dialog(scene, makeConfig());
    expect(dialog.addButton('OK', vi.fn())).toBe(dialog);
  });

  it('addButton creates a text object for the button', () => {
    const dialog = new Dialog(scene, makeConfig());
    const callsBefore = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls.length;
    dialog.addButton('OK', vi.fn());
    const callsAfter = (scene.add.text as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callsAfter).toBe(callsBefore + 1);
  });

  it('close emits close event and destroys', () => {
    const dialog = new Dialog(scene, makeConfig());
    const closeFn = vi.fn();
    dialog.on('close', closeFn);
    dialog.close();
    expect(closeFn).toHaveBeenCalled();
  });

  it('sets depth to 9000 for overlay', () => {
    const dialog = new Dialog(scene, makeConfig());
    expect(dialog.depth).toBe(9000);
  });
});
