import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { scene: vi.fn(), error: vi.fn() },
}));

import { SceneStack } from '../../src/scenes/SceneStack';

function mockGame() {
  const scenes = new Map<string, { paused: boolean; stopped: boolean }>();
  return {
    scene: {
      start(key: string) { scenes.set(key, { paused: false, stopped: false }); },
      stop(key: string) { const s = scenes.get(key); if (s) s.stopped = true; },
      getScene(key: string) {
        return {
          scene: {
            pause() { const s = scenes.get(key); if (s) s.paused = true; },
            resume() { const s = scenes.get(key); if (s) s.paused = false; },
          },
        };
      },
    },
    _scenes: scenes,
  };
}

describe('SceneStack', () => {
  it('pushes scenes onto the stack', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('menu');
    expect(stack.current).toBe('menu');
    expect(stack.depth).toBe(1);
  });

  it('pauses previous scene on push', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('game');
    stack.push('pause');
    expect(stack.depth).toBe(2);
    expect(stack.current).toBe('pause');
    expect(game._scenes.get('game')?.paused).toBe(true);
  });

  it('pops scenes and resumes previous', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('game');
    stack.push('inventory');
    const popped = stack.pop();
    expect(popped).toBe('inventory');
    expect(stack.current).toBe('game');
    expect(stack.depth).toBe(1);
  });

  it('refuses to pop the last scene', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('game');
    expect(stack.pop()).toBeNull();
    expect(stack.depth).toBe(1);
  });

  it('replaces top scene', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('menu');
    stack.replace('game');
    expect(stack.current).toBe('game');
    expect(stack.depth).toBe(1);
  });

  it('pops to root', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('game');
    stack.push('inventory');
    stack.push('item-detail');
    stack.popToRoot();
    expect(stack.current).toBe('game');
    expect(stack.depth).toBe(1);
  });

  it('checks if scene is in stack', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('a');
    stack.push('b');
    expect(stack.has('a')).toBe(true);
    expect(stack.has('c')).toBe(false);
  });

  it('clears the stack', () => {
    const game = mockGame();
    const stack = new SceneStack(game as any);
    stack.push('a');
    stack.push('b');
    stack.clear();
    expect(stack.depth).toBe(0);
    expect(stack.current).toBeNull();
  });
});
