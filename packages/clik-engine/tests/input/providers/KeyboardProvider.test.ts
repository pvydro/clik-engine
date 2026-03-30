import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTestScene } from '../../helpers/TestScene';

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
    provider = new KeyboardProvider(scene as any, actionMap);
  });

  it('registers keyboard keys via addKey for each action binding', () => {
    const addKey = scene.input.keyboard!.addKey;
    // jump has 1 key, fire has 2 keys → 3 addKey calls
    expect(addKey).toHaveBeenCalledTimes(3);
  });

  it('isActionDown returns false when key is not pressed', () => {
    expect(provider.isActionDown('jump')).toBe(false);
    expect(provider.isActionDown('fire')).toBe(false);
  });

  it('isActionDown returns true when key.isDown is true', () => {
    const keyObj = { isDown: true };
    const addKeyMock = scene.input.keyboard!.addKey as ReturnType<typeof vi.fn>;
    addKeyMock.mockReturnValue(keyObj);

    // Recreate to capture the new key stubs
    provider = new KeyboardProvider(scene as any, actionMap);
    expect(provider.isActionDown('jump')).toBe(true);
  });

  it('isActionDown returns false for unknown actions', () => {
    expect(provider.isActionDown('nonexistent')).toBe(false);
  });

  it('consumeAction always returns false for keyboard', () => {
    expect(provider.consumeAction('jump')).toBe(false);
    expect(provider.consumeAction('fire')).toBe(false);
  });

  it('destroy removes keys and clears internal map', () => {
    // Add removeKey to the keyboard stub
    (scene.input.keyboard as any).removeKey = vi.fn();
    provider.destroy();
    expect((scene.input.keyboard as any).removeKey).toHaveBeenCalledTimes(3);
  });
});
