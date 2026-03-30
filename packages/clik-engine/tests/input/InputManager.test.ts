import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../helpers/TestScene';

vi.mock('phaser', () => ({
  default: {
    Input: { Keyboard: { KeyCodes: {} } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
  },
}));

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { InputManager } from '../../src/input/InputManager';
import type { InputConfig } from '../../src/utils/types';

const baseConfig: InputConfig = {
  actions: {
    jump: { keys: ['SPACE'] },
    left: { keys: ['LEFT'] },
    right: { keys: ['RIGHT'] },
    up: { keys: ['UP'] },
    down: { keys: ['DOWN'] },
  },
};

describe('InputManager', () => {
  let scene: ReturnType<typeof makeTestScene>;
  let mgr: InputManager;

  beforeEach(() => {
    scene = makeTestScene();
    // Provide a gamepad stub so GamepadProvider can initialise
    (scene.input as any).gamepad = {
      on: vi.fn(),
      off: vi.fn(),
      total: 0,
      pad1: null,
      getPad: vi.fn(() => null),
    };
    // Provide activePointer for getPointer()
    (scene.input as any).activePointer = { worldX: 10, worldY: 20, isDown: true };
    mgr = new InputManager(scene as any, baseConfig);
  });

  it('constructs and initialises action states', () => {
    expect(mgr.isDown('jump')).toBe(false);
    expect(mgr.isDown('left')).toBe(false);
    expect(mgr.isDown('nonexistent')).toBe(false);
  });

  it('isDown returns true when keyboard key is pressed', () => {
    // The addKey mock returns an object with isDown
    const addKeyMock = scene.input.keyboard!.addKey as ReturnType<typeof vi.fn>;
    const keyObj = { isDown: true };
    addKeyMock.mockReturnValue(keyObj);

    // Recreate manager so the new key stub is captured
    mgr = new InputManager(scene as any, baseConfig);
    mgr.update();

    expect(mgr.isDown('jump')).toBe(true);
  });

  it('justPressed is true only on the frame the action goes down', () => {
    const addKeyMock = scene.input.keyboard!.addKey as ReturnType<typeof vi.fn>;
    const keyObj = { isDown: false };
    addKeyMock.mockReturnValue(keyObj);
    mgr = new InputManager(scene as any, baseConfig);

    mgr.update();
    expect(mgr.justPressed('jump')).toBe(false);

    keyObj.isDown = true;
    mgr.update();
    expect(mgr.justPressed('jump')).toBe(true);

    // Second frame still held — not justPressed any more
    mgr.update();
    expect(mgr.justPressed('jump')).toBe(false);
  });

  it('justReleased is true only on the frame the action goes up', () => {
    const addKeyMock = scene.input.keyboard!.addKey as ReturnType<typeof vi.fn>;
    const keyObj = { isDown: true };
    addKeyMock.mockReturnValue(keyObj);
    mgr = new InputManager(scene as any, baseConfig);

    mgr.update();
    expect(mgr.justReleased('jump')).toBe(false);

    keyObj.isDown = false;
    mgr.update();
    expect(mgr.justReleased('jump')).toBe(true);

    // Next frame — no longer justReleased
    mgr.update();
    expect(mgr.justReleased('jump')).toBe(false);
  });

  it('axis returns digital values from key states', () => {
    const addKeyMock = scene.input.keyboard!.addKey as ReturnType<typeof vi.fn>;
    const leftKey = { isDown: true };
    const rightKey = { isDown: false };
    const upKey = { isDown: false };
    const downKey = { isDown: true };

    // Each call to addKey maps to the keys in order
    let callCount = 0;
    addKeyMock.mockImplementation(() => {
      callCount++;
      // Config order: jump(SPACE), left(LEFT), right(RIGHT), up(UP), down(DOWN)
      if (callCount === 1) return { isDown: false }; // jump
      if (callCount === 2) return leftKey; // left
      if (callCount === 3) return rightKey; // right
      if (callCount === 4) return upKey; // up
      if (callCount === 5) return downKey; // down
      return { isDown: false };
    });

    mgr = new InputManager(scene as any, baseConfig);
    mgr.update();

    const result = mgr.axis('left', 'right', 'up', 'down');
    expect(result.x).toBe(-1);
    expect(result.y).toBe(1);
  });

  it('axis without gamepad returns just digital values', () => {
    mgr.update();
    const result = mgr.axis('left', 'right');
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('getPointer returns active pointer data', () => {
    const ptr = mgr.getPointer();
    expect(ptr.x).toBe(10);
    expect(ptr.y).toBe(20);
    expect(ptr.isDown).toBe(true);
  });

  it('hasGamepad returns false when no gamepad', () => {
    expect(mgr.hasGamepad()).toBe(false);
  });

  it('setSwipeThreshold delegates to touch provider', () => {
    // Should not throw
    mgr.setSwipeThreshold(100, 500);
  });

  it('getActionMap returns the ActionMap instance', () => {
    const map = mgr.getActionMap();
    expect(map.allActions()).toEqual(expect.arrayContaining(['jump', 'left', 'right']));
  });

  it('destroy clears states and does not throw', () => {
    // Ensure removeKey exists on keyboard stub so KeyboardProvider.destroy works
    (scene.input.keyboard as any).removeKey = vi.fn();
    mgr.destroy();
    // After destroy, isDown should still return false (states cleared)
    expect(mgr.isDown('jump')).toBe(false);
  });
});
