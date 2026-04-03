import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../src/debug/ConsoleReporter', () => ({
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

import { HierarchicalStateMachine } from '../../src/fsm/HierarchicalStateMachine';
import { AnimationStateMachine } from '../../src/animation/AnimationStateMachine';
import { AnimationBinding } from '../../src/fsm/AnimationBinding';

describe('AnimationBinding', () => {
  let ctx: {};
  let fsm: HierarchicalStateMachine<typeof ctx>;
  let asm: AnimationStateMachine;
  let binding: AnimationBinding<typeof ctx>;

  beforeEach(() => {
    ctx = {};
    fsm = new HierarchicalStateMachine(ctx, 'test');
    fsm.addState('idle', {}).addState('run', {}).addState('attack', {});

    const sprite = makeMockSprite();
    asm = new AnimationStateMachine(sprite as any);
    asm.addState('idle', { animKey: 'idle', loop: true });
    asm.addState('run', { animKey: 'run', loop: true });
    asm.addState('attack', { animKey: 'attack', loop: false });

    binding = new AnimationBinding(fsm, asm);
  });

  it('syncs animation state to FSM state', () => {
    binding.bind({ fsmState: 'idle', animState: 'idle' });
    binding.bind({ fsmState: 'run', animState: 'run' });

    fsm.start('idle');
    binding.sync();
    expect(asm.getCurrent()).toBe('idle');

    fsm.transitionTo('run');
    binding.sync();
    expect(asm.getCurrent()).toBe('run');
  });

  it('does not re-sync if FSM state unchanged', () => {
    binding.bind({ fsmState: 'idle', animState: 'idle' });
    fsm.start('idle');
    binding.sync();

    const spy = vi.spyOn(asm, 'setState');
    binding.sync(); // same state, should not call
    expect(spy).not.toHaveBeenCalled();
  });

  it('bindAll adds multiple bindings', () => {
    binding.bindAll([
      { fsmState: 'idle', animState: 'idle' },
      { fsmState: 'run', animState: 'run' },
    ]);
    expect(binding.getBoundStates()).toContain('idle');
    expect(binding.getBoundStates()).toContain('run');
  });

  it('getBinding returns config', () => {
    binding.bind({ fsmState: 'attack', animState: 'attack', onComplete: 'idle' });
    const config = binding.getBinding('attack');
    expect(config?.animState).toBe('attack');
    expect(config?.onComplete).toBe('idle');
  });

  it('clear removes all bindings', () => {
    binding.bind({ fsmState: 'idle', animState: 'idle' });
    binding.clear();
    expect(binding.getBoundStates()).toHaveLength(0);
  });
});
