import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { makeTestScene } from '../helpers/TestScene';
import { ToastManager } from '../../src/ui/ToastManager';

describe('ToastManager', () => {
  let scene: Phaser.Scene;
  let tm: ToastManager;

  beforeEach(() => {
    scene = makeTestScene();
    tm = new ToastManager(scene);
  });

  it('starts with zero active and zero queued', () => {
    expect(tm.activeCount).toBe(0);
    expect(tm.queuedCount).toBe(0);
  });

  it('show() creates an active toast', () => {
    tm.show({ message: 'Hello' });
    expect(tm.activeCount).toBe(1);
    expect(scene.add.text).toHaveBeenCalled();
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('queues toasts when maxVisible is reached', () => {
    // Default maxVisible is 3
    tm.show({ message: 'A' });
    tm.show({ message: 'B' });
    tm.show({ message: 'C' });
    tm.show({ message: 'D' });
    expect(tm.activeCount).toBe(3);
    expect(tm.queuedCount).toBe(1);
  });

  it('respects custom maxVisible', () => {
    const tm2 = new ToastManager(scene, { maxVisible: 1 });
    tm2.show({ message: 'First' });
    tm2.show({ message: 'Second' });
    expect(tm2.activeCount).toBe(1);
    expect(tm2.queuedCount).toBe(1);
  });

  it('setMaxVisible updates the limit', () => {
    tm.setMaxVisible(1);
    tm.show({ message: 'A' });
    tm.show({ message: 'B' });
    expect(tm.activeCount).toBe(1);
    expect(tm.queuedCount).toBe(1);
  });

  it('clear() removes all active toasts and empties queue', () => {
    tm.show({ message: 'A' });
    tm.show({ message: 'B' });
    tm.show({ message: 'C' });
    tm.show({ message: 'D' }); // queued
    tm.clear();
    expect(tm.activeCount).toBe(0);
    expect(tm.queuedCount).toBe(0);
  });

  it('destroy() clears everything', () => {
    tm.show({ message: 'A' });
    tm.show({ message: 'B' });
    tm.destroy();
    expect(tm.activeCount).toBe(0);
    expect(tm.queuedCount).toBe(0);
  });

  it('uses custom position and duration from config', () => {
    const tm2 = new ToastManager(scene, { position: 'top', defaultDuration: 5000 });
    tm2.show({ message: 'Top toast' });
    expect(tm2.activeCount).toBe(1);
  });

  it('per-toast options are accepted', () => {
    tm.show({
      message: 'Custom',
      duration: 1000,
      backgroundColor: 0xff0000,
      color: '#00ff00',
      fontSize: '20px',
      position: 'center',
    });
    expect(tm.activeCount).toBe(1);
  });
});
