import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: { Keyboard: { KeyCodes: {} } },
    Math: { Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max) },
  },
}));

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { engine: vi.fn(), error: vi.fn(), input: vi.fn(), log: vi.fn() },
}));

import { KeyboardProvider } from '../../../src/input/providers/KeyboardProvider';
import { ActionMap } from '../../../src/input/ActionMap';

function makeTestScene() {
  return {
    input: {
      keyboard: {
        addKey: vi.fn(() => ({ isDown: false, enabled: true })),
        removeKey: vi.fn(),
      },
    },
  };
}

describe('KeyboardProvider', () => {
  let scene: ReturnType<typeof makeTestScene>;
  let actionMap: ActionMap;
  let provider: KeyboardProvider;

  beforeEach(() => {
    scene = makeTestScene();
    actionMap = new ActionMap({
      actions: {
        jump: { keys: ['SPACE'] },
        fire: { keys: ['Z', 'X'] },
      },
    });
    provider = new KeyboardProvider(actionMap);
    provider.initFromScene(scene as any);
  });

  it('registers keyboard keys via addKey for each action binding', () => {
    const addKey = scene.input.keyboard.addKey;
    // jump has 1 key, fire has 2 keys → 3 addKey calls
    expect(addKey).toHaveBeenCalledTimes(3);
  });

  it('isActionDown returns false when key is not pressed', () => {
    expect(provider.isActionDown('jump')).toBe(false);
    expect(provider.isActionDown('fire')).toBe(false);
  });

  it('isActionDown returns true when key.isDown is true', () => {
    const keyObj = { isDown: true, enabled: true };
    const addKeyMock = scene.input.keyboard.addKey as ReturnType<typeof vi.fn>;
    addKeyMock.mockReturnValue(keyObj);

    // Recreate to capture the new key stubs
    provider = new KeyboardProvider(actionMap);
    provider.initFromScene(scene as any);
    expect(provider.isActionDown('jump')).toBe(true);
  });

  it('isActionDown returns false for unknown actions', () => {
    expect(provider.isActionDown('nonexistent')).toBe(false);
  });

  it('consumeAction always returns false for keyboard', () => {
    expect(provider.consumeAction('jump')).toBe(false);
    expect(provider.consumeAction('fire')).toBe(false);
  });

  it('initFromScene re-binds when called with a new scene', () => {
    const scene2 = makeTestScene();
    provider.initFromScene(scene2 as any);
    // Should rebind to the new scene
    expect(scene2.input.keyboard.addKey).toHaveBeenCalledTimes(3);
  });

  it('destroy clears internal map', () => {
    provider.destroy();
    expect(provider.isActionDown('jump')).toBe(false);
  });
});
