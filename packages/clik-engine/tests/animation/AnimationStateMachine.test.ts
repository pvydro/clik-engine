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

function makeSprite() {
  const listeners: Map<string, Function[]> = new Map();
  return {
    anims: { isPlaying: true, timeScale: 1 },
    play: vi.fn(),
    stop: vi.fn(),
    on: vi.fn((event: string, cb: Function) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
    }),
    off: vi.fn((event: string, cb: Function) => {
      const cbs = listeners.get(event);
      if (cbs) listeners.set(event, cbs.filter(c => c !== cb));
    }),
    once: vi.fn((event: string, cb: Function) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
    }),
    _emit: (event: string, ...args: unknown[]) => {
      const cbs = listeners.get(event) ?? [];
      for (const cb of [...cbs]) cb(...args);
    },
    _listeners: listeners,
  };
}

import { AnimationStateMachine } from '../../src/animation/AnimationStateMachine';

describe('AnimationStateMachine', () => {
  let sprite: ReturnType<typeof makeSprite>;
  let asm: AnimationStateMachine;

  beforeEach(() => {
    sprite = makeSprite();
    asm = new AnimationStateMachine(sprite as any);
    asm.addState('idle', { animKey: 'player_idle', loop: true, priority: 0, cancelAfterFrame: 0 });
    asm.addState('attack', { animKey: 'player_attack', loop: false, priority: 2, cancelAfterFrame: 4, next: 'idle' });
    asm.addState('run', { animKey: 'player_run', loop: true, priority: 1, cancelAfterFrame: 0 });
    asm.addState('special', { animKey: 'player_special', loop: false, priority: 3, cancelAfterFrame: 0 });
  });

  it('starts in the given state', () => {
    asm.start('idle');
    expect(asm.getCurrent()).toBe('idle');
    expect(sprite.play).toHaveBeenCalled();
  });

  it('transitions between states', () => {
    asm.start('idle');
    expect(asm.setState('run')).toBe(true);
    expect(asm.getCurrent()).toBe('run');
  });

  it('rejects transition to same state', () => {
    asm.start('idle');
    expect(asm.setState('idle')).toBe(false);
  });

  it('rejects transition to unknown state', () => {
    asm.start('idle');
    expect(asm.setState('nonexistent')).toBe(false);
  });

  it('higher priority can always override', () => {
    asm.start('idle');
    expect(asm.setState('attack')).toBe(true);
    expect(asm.getCurrent()).toBe('attack');
  });

  it('lower priority cannot cancel before cancel frame', () => {
    asm.start('attack'); // priority 2, cancelAfterFrame 4
    // Frame is 0, cancel not allowed for lower/equal priority
    expect(asm.setState('run')).toBe(false); // run is priority 1
    expect(asm.getCurrent()).toBe('attack');
  });

  it('higher priority overrides even before cancel frame', () => {
    asm.start('attack'); // priority 2, cancelAfterFrame 4
    expect(asm.setState('special')).toBe(true); // special is priority 3
    expect(asm.getCurrent()).toBe('special');
  });

  it('lower priority can cancel after cancel frame', () => {
    asm.start('attack');
    // Simulate frame advance to frame 5
    const updateHandler = sprite.on.mock.calls.find(c => c[0] === 'ANIMATION_UPDATE');
    if (updateHandler) {
      updateHandler[1]({}, { index: 5 }); // simulate frame 5
    }
    expect(asm.setState('idle')).toBe(true);
  });

  it('forceState ignores priority and cancel windows', () => {
    asm.start('attack');
    asm.forceState('idle');
    expect(asm.getCurrent()).toBe('idle');
  });

  it('canCancel reflects current frame vs cancelAfterFrame', () => {
    asm.start('attack'); // cancelAfterFrame: 4
    expect(asm.canCancel()).toBe(false); // frame 0

    // Advance frame
    const updateHandler = sprite.on.mock.calls.find(c => c[0] === 'ANIMATION_UPDATE');
    if (updateHandler) {
      updateHandler[1]({}, { index: 4 });
    }
    expect(asm.canCancel()).toBe(true);
  });

  it('canTransitionTo checks priority and cancel state', () => {
    asm.start('attack');
    expect(asm.canTransitionTo('idle')).toBe(false);
    expect(asm.canTransitionTo('special')).toBe(true);
  });

  it('auto-transitions via next on animation complete', () => {
    asm.start('attack'); // next: 'idle'
    // Trigger animation complete
    const onceHandler = sprite.once.mock.calls.find(c => c[0] === 'ANIMATION_COMPLETE');
    expect(onceHandler).toBeDefined();
    onceHandler![1]();
    expect(asm.getCurrent()).toBe('idle');
  });

  it('getCurrentFrame returns 0 initially', () => {
    asm.start('idle');
    expect(asm.getCurrentFrame()).toBe(0);
  });

  it('getStateConfig returns config', () => {
    const config = asm.getStateConfig('idle');
    expect(config).toBeDefined();
    expect(config!.animKey).toBe('player_idle');
  });

  it('destroy clears state', () => {
    asm.start('idle');
    asm.destroy();
    expect(asm.getCurrent()).toBeNull();
  });
});
