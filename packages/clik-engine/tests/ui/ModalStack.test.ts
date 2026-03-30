import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { makeTestScene } from '../helpers/TestScene';
import { ModalStack } from '../../src/ui/ModalStack';

function makeModal(scene: Phaser.Scene) {
  return {
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    depth: 0,
  } as unknown as Phaser.GameObjects.Container;
}

describe('ModalStack', () => {
  let scene: Phaser.Scene;
  let stack: ModalStack;

  beforeEach(() => {
    scene = makeTestScene();
    stack = new ModalStack(scene);
  });

  it('starts with no modals open', () => {
    expect(stack.isOpen).toBe(false);
    expect(stack.count).toBe(0);
    expect(stack.getTop()).toBeNull();
  });

  it('push() adds a modal and increments count', () => {
    const modal = makeModal(scene);
    stack.push(modal);
    expect(stack.isOpen).toBe(true);
    expect(stack.count).toBe(1);
    expect(stack.getTop()).toBe(modal);
  });

  it('push() sets depth on each modal', () => {
    const m1 = makeModal(scene);
    const m2 = makeModal(scene);
    stack.push(m1);
    stack.push(m2);
    expect(m1.setDepth).toHaveBeenCalledWith(9000);
    expect(m2.setDepth).toHaveBeenCalledWith(9010);
  });

  it('pop() removes and destroys the top modal', () => {
    const m1 = makeModal(scene);
    const m2 = makeModal(scene);
    stack.push(m1);
    stack.push(m2);
    const popped = stack.pop();
    expect(popped).toBe(m2);
    expect(m2.destroy).toHaveBeenCalled();
    expect(stack.count).toBe(1);
    expect(stack.getTop()).toBe(m1);
  });

  it('pop() returns null when stack is empty', () => {
    expect(stack.pop()).toBeNull();
  });

  it('closeAll() destroys all modals', () => {
    const m1 = makeModal(scene);
    const m2 = makeModal(scene);
    const m3 = makeModal(scene);
    stack.push(m1);
    stack.push(m2);
    stack.push(m3);
    stack.closeAll();
    expect(stack.count).toBe(0);
    expect(stack.isOpen).toBe(false);
    expect(m1.destroy).toHaveBeenCalled();
    expect(m2.destroy).toHaveBeenCalled();
    expect(m3.destroy).toHaveBeenCalled();
  });

  it('getTop() returns top without removing it', () => {
    const modal = makeModal(scene);
    stack.push(modal);
    expect(stack.getTop()).toBe(modal);
    expect(stack.count).toBe(1);
  });

  it('ESC key handler is registered on keyboard', () => {
    expect(scene.input.keyboard!.on).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('ESC key pops the top modal', () => {
    const modal = makeModal(scene);
    stack.push(modal);

    // Extract the keydown handler that was registered
    const onCall = (scene.input.keyboard!.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'keydown',
    );
    expect(onCall).toBeTruthy();
    const handler = onCall![1] as (event: KeyboardEvent) => void;

    handler({ key: 'Escape' } as KeyboardEvent);
    expect(stack.count).toBe(0);
    expect(modal.destroy).toHaveBeenCalled();
  });

  it('ESC does nothing when stack is empty', () => {
    const onCall = (scene.input.keyboard!.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'keydown',
    );
    const handler = onCall![1] as (event: KeyboardEvent) => void;

    // Should not throw
    handler({ key: 'Escape' } as KeyboardEvent);
    expect(stack.count).toBe(0);
  });

  it('destroy() closes all modals and removes keyboard listener', () => {
    const modal = makeModal(scene);
    stack.push(modal);
    stack.destroy();
    expect(stack.count).toBe(0);
    expect(modal.destroy).toHaveBeenCalled();
    expect(scene.input.keyboard!.off).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
