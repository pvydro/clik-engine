import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Animations: {
      Events: {
        ANIMATION_UPDATE: 'ANIMATION_UPDATE',
        ANIMATION_COMPLETE: 'ANIMATION_COMPLETE',
      },
    },
  },
}));

vi.mock('../../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

function makeMockSprite() {
  return {
    anims: { isPlaying: true, timeScale: 1 },
    play: vi.fn(),
    stop: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  };
}

import { AnimatorComponent } from '../../../src/entity/components/AnimatorComponent';
import { makeEntityMock } from '../../helpers/TestScene';

describe('AnimatorComponent', () => {
  it('wraps AnimationStateMachine', () => {
    const sprite = makeMockSprite();
    const animator = new AnimatorComponent(sprite as any);
    animator.addState('idle', { animKey: 'idle', loop: true, priority: 0 });
    animator.addState('run', { animKey: 'run', loop: true, priority: 1 });

    animator.start('idle');
    expect(animator.getCurrent()).toBe('idle');

    expect(animator.setState('run')).toBe(true);
    expect(animator.getCurrent()).toBe('run');
  });

  it('getStateMachine returns the ASM', () => {
    const sprite = makeMockSprite();
    const animator = new AnimatorComponent(sprite as any);
    expect(animator.getStateMachine()).toBeDefined();
  });

  it('getSprite returns the sprite', () => {
    const sprite = makeMockSprite();
    const animator = new AnimatorComponent(sprite as any);
    expect(animator.getSprite()).toBe(sprite);
  });

  it('canCancel delegates to ASM', () => {
    const sprite = makeMockSprite();
    const animator = new AnimatorComponent(sprite as any);
    animator.addState('attack', { animKey: 'attack', loop: false, priority: 2, cancelAfterFrame: 5 });
    animator.start('attack');
    expect(animator.canCancel()).toBe(false);
  });

  it('forceState ignores priority', () => {
    const sprite = makeMockSprite();
    const animator = new AnimatorComponent(sprite as any);
    animator.addState('attack', { animKey: 'attack', loop: false, priority: 3, cancelAfterFrame: 10 });
    animator.addState('idle', { animKey: 'idle', loop: true, priority: 0 });
    animator.start('attack');
    animator.forceState('idle');
    expect(animator.getCurrent()).toBe('idle');
  });

  it('onDetach destroys ASM', () => {
    const sprite = makeMockSprite();
    const animator = new AnimatorComponent(sprite as any);
    animator.addState('idle', { animKey: 'idle' });
    animator.start('idle');
    animator.onDetach();
    expect(animator.getCurrent()).toBeNull();
  });
});
