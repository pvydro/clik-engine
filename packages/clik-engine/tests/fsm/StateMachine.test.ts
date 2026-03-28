import { describe, it, expect, vi } from 'vitest';

// Mock ConsoleReporter before importing StateMachine
vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    state: vi.fn(),
    error: vi.fn(),
    engine: vi.fn(),
  },
}));

import { StateMachine } from '../../src/fsm/StateMachine';

describe('StateMachine', () => {
  it('starts in the initial state', () => {
    const fsm = new StateMachine({}, 'test').addState('idle', {}).start('idle');
    expect(fsm.getCurrent()).toBe('idle');
  });

  it('transitions between states', () => {
    const fsm = new StateMachine({}, 'test')
      .addState('idle', {})
      .addState('run', {})
      .start('idle');

    expect(fsm.transitionTo('run')).toBe(true);
    expect(fsm.getCurrent()).toBe('run');
    expect(fsm.getPrevious()).toBe('idle');
  });

  it('calls enter and exit hooks', () => {
    const enter = vi.fn();
    const exit = vi.fn();

    const fsm = new StateMachine({}, 'test')
      .addState('a', { exit })
      .addState('b', { enter })
      .start('a');

    fsm.transitionTo('b');
    expect(exit).toHaveBeenCalled();
    expect(enter).toHaveBeenCalled();
  });

  it('calls update on current state', () => {
    const update = vi.fn();

    const fsm = new StateMachine({}, 'test')
      .addState('idle', { update })
      .start('idle');

    fsm.update(16);
    expect(update).toHaveBeenCalledWith(expect.anything(), 16);
  });

  it('handles automatic transitions', () => {
    let shouldRun = false;
    const fsm = new StateMachine({}, 'test')
      .addState('idle', {})
      .addState('run', {})
      .addTransition('idle', 'run', () => shouldRun)
      .start('idle');

    fsm.update(16);
    expect(fsm.getCurrent()).toBe('idle');

    shouldRun = true;
    fsm.update(16);
    expect(fsm.getCurrent()).toBe('run');
  });

  it('respects transition guards', () => {
    const fsm = new StateMachine({}, 'test')
      .addState('idle', {})
      .addState('run', {})
      .addTransition('idle', 'run', () => true, () => false) // condition true, guard false
      .start('idle');

    fsm.update(16);
    expect(fsm.getCurrent()).toBe('idle'); // guard blocked it
  });

  it('refuses transition to unknown state', () => {
    const fsm = new StateMachine({}, 'test')
      .addState('idle', {})
      .start('idle');

    expect(fsm.transitionTo('nonexistent')).toBe(false);
    expect(fsm.getCurrent()).toBe('idle');
  });

  it('refuses transition to same state', () => {
    const fsm = new StateMachine({}, 'test')
      .addState('idle', {})
      .start('idle');

    expect(fsm.transitionTo('idle')).toBe(false);
  });

  it('tracks history', () => {
    const fsm = new StateMachine({}, 'test')
      .addState('a', {})
      .addState('b', {})
      .addState('c', {})
      .start('a');

    fsm.transitionTo('b');
    fsm.transitionTo('c');
    expect(fsm.getHistory()).toEqual(['a', 'b', 'c']);
  });

  it('is() and isAny() work correctly', () => {
    const fsm = new StateMachine({}, 'test')
      .addState('idle', {})
      .addState('run', {})
      .start('idle');

    expect(fsm.is('idle')).toBe(true);
    expect(fsm.is('run')).toBe(false);
    expect(fsm.isAny('idle', 'run')).toBe(true);
    expect(fsm.isAny('run', 'jump')).toBe(false);
  });
});
