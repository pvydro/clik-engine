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

function makeTestGame() {
  return {
    input: {
      keyboard: {
        on: vi.fn(),
        off: vi.fn(),
        addKey: vi.fn(() => ({ isDown: false })),
        removeKey: vi.fn(),
        createCursorKeys: vi.fn(() => ({})),
      },
      on: vi.fn(),
      off: vi.fn(),
    },
  };
}

describe('KeyboardProvider', () => {
  let game: ReturnType<typeof makeTestGame>;
  let actionMap: ActionMap;
  let provider: KeyboardProvider;

  beforeEach(() => {
    game = makeTestGame();
    actionMap = new ActionMap({
      actions: {
        jump: { keys: ['SPACE'] },
        fire: { keys: ['Z', 'X'] },
      },
    });
    provider = new KeyboardProvider(game as any, actionMap);
  });

  it('registers keyboard keys via addKey for each action binding', () => {
    const addKey = game.input.keyboard.addKey;
    // jump has 1 key, fire has 2 keys → 3 addKey calls
    expect(addKey).toHaveBeenCalledTimes(3);
  });

  it('isActionDown returns false when key is not pressed', () => {
    expect(provider.isActionDown('jump')).toBe(false);
    expect(provider.isActionDown('fire')).toBe(false);
  });

  it('isActionDown returns true when key.isDown is true', () => {
    const keyObj = { isDown: true };
    const addKeyMock = game.input.keyboard.addKey as ReturnType<typeof vi.fn>;
    addKeyMock.mockReturnValue(keyObj);

    // Recreate to capture the new key stubs
    provider = new KeyboardProvider(game as any, actionMap);
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
    provider.destroy();
    expect(game.input.keyboard.removeKey).toHaveBeenCalledTimes(3);
  });
});
