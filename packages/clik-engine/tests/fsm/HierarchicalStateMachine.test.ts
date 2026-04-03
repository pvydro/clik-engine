import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { HierarchicalStateMachine } from '../../src/fsm/HierarchicalStateMachine';

describe('HierarchicalStateMachine', () => {
  let ctx: { hp: number; speed: number };

  beforeEach(() => {
    ctx = { hp: 100, speed: 0 };
  });

  // ── Basic state management ──────────────────────────────

  it('starts in the initial state', () => {
    const fsm = new HierarchicalStateMachine(ctx, 'test');
    fsm.addState('idle', {});
    fsm.start('idle');
    expect(fsm.getCurrent()).toBe('idle');
  });

  it('transitions between states', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('run', {});
    fsm.start('idle');
    expect(fsm.transitionTo('run')).toBe(true);
    expect(fsm.getCurrent()).toBe('run');
    expect(fsm.getPrevious()).toBe('idle');
  });

  it('rejects unknown state', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).start('idle');
    expect(fsm.transitionTo('nonexistent')).toBe(false);
  });

  it('rejects same-state transition', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).start('idle');
    expect(fsm.transitionTo('idle')).toBe(false);
  });

  it('calls enter/exit hooks', () => {
    const enter = vi.fn();
    const exit = vi.fn();
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('a', { hooks: { exit } });
    fsm.addState('b', { hooks: { enter } });
    fsm.start('a');
    fsm.transitionTo('b');
    expect(exit).toHaveBeenCalled();
    expect(enter).toHaveBeenCalledWith(ctx, 'a');
  });

  it('calls update hooks each frame', () => {
    const update = vi.fn();
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', { hooks: { update } });
    fsm.start('idle');
    fsm.update(16);
    expect(update).toHaveBeenCalledWith(ctx, 16);
  });

  it('tracks history', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('a', {}).addState('b', {}).addState('c', {});
    fsm.start('a');
    fsm.transitionTo('b');
    fsm.transitionTo('c');
    expect(fsm.getHistory()).toEqual(['a', 'b', 'c']);
  });

  // ── State tags ──────────────────────────────────────────

  it('hasTag checks current state tags', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', { tags: ['grounded'] });
    fsm.addState('jump', { tags: ['airborne'] });
    fsm.start('idle');
    expect(fsm.hasTag('grounded')).toBe(true);
    expect(fsm.hasTag('airborne')).toBe(false);
  });

  it('getTags returns all tags', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('attack', { tags: ['busy', 'invincible'] });
    fsm.start('attack');
    expect(fsm.getTags()).toContain('busy');
    expect(fsm.getTags()).toContain('invincible');
  });

  // ── Condition transitions ───────────────────────────────

  it('auto-transitions on condition', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('run', {});
    fsm.addTransition('idle', 'run', (c) => c.speed > 0);
    fsm.start('idle');

    fsm.update(16); // speed=0, no transition
    expect(fsm.getCurrent()).toBe('idle');

    ctx.speed = 100;
    fsm.update(16);
    expect(fsm.getCurrent()).toBe('run');
  });

  it('guards block transitions', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('run', {});
    fsm.addTransition('idle', 'run', () => true, () => false); // always true condition, always false guard
    fsm.start('idle');
    fsm.update(16);
    expect(fsm.getCurrent()).toBe('idle');
  });

  // ── Event-driven transitions ────────────────────────────

  it('transitions on event', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('hitstun', {});
    fsm.addEventTransition('idle', 'damage', { to: 'hitstun' });
    fsm.start('idle');

    fsm.sendEvent({ type: 'damage' });
    fsm.update(16);
    expect(fsm.getCurrent()).toBe('hitstun');
  });

  it('event guards work', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('hitstun', {});
    fsm.addEventTransition('idle', 'damage', { to: 'hitstun', guard: () => false });
    fsm.start('idle');

    fsm.sendEvent({ type: 'damage' });
    fsm.update(16);
    expect(fsm.getCurrent()).toBe('idle');
  });

  it('higher priority events are processed first', () => {
    const order: string[] = [];
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('dodge', {}).addState('hitstun', {});
    fsm.addEventTransition('idle', 'dodge_input', { to: 'dodge' });
    fsm.addEventTransition('idle', 'damage', { to: 'hitstun' });
    fsm.start('idle');

    fsm.sendEvent({ type: 'dodge_input', priority: 1 });
    fsm.sendEvent({ type: 'damage', priority: 5 });
    fsm.update(16);
    // Higher priority 'damage' should be processed first
    expect(fsm.getCurrent()).toBe('hitstun');
  });

  // ── Timeout transitions ─────────────────────────────────

  it('auto-transitions after timeout', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('hitstun', {}).addState('idle', {});
    fsm.addTimeoutTransition('hitstun', { to: 'idle', durationMs: 500 });
    fsm.start('hitstun');

    fsm.update(200);
    expect(fsm.getCurrent()).toBe('hitstun');

    fsm.update(350);
    expect(fsm.getCurrent()).toBe('idle');
  });

  it('getStateElapsed tracks time in current state', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {});
    fsm.start('idle');
    fsm.update(100);
    fsm.update(50);
    expect(fsm.getStateElapsed()).toBe(150);
  });

  it('state elapsed resets on transition', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('a', {}).addState('b', {});
    fsm.start('a');
    fsm.update(100);
    fsm.transitionTo('b');
    expect(fsm.getStateElapsed()).toBe(0);
  });

  // ── Hierarchical (composite) states ─────────────────────

  it('enters child FSM on composite state entry', () => {
    const child = new HierarchicalStateMachine(ctx, 'child');
    child.addState('windup', {}).addState('active', {});

    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {});
    fsm.addState('attack', { children: child, initialChild: 'windup' });
    fsm.start('attack');

    expect(fsm.getCurrent()).toBe('attack');
    expect(fsm.getChildState()).toBe('windup');
  });

  it('getStatePath returns full dot-separated path', () => {
    const child = new HierarchicalStateMachine(ctx, 'child');
    child.addState('windup', {});

    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('attack', { children: child, initialChild: 'windup' });
    fsm.start('attack');

    expect(fsm.getStatePath()).toBe('attack.windup');
  });

  it('updates child FSM', () => {
    const childUpdate = vi.fn();
    const child = new HierarchicalStateMachine(ctx, 'child');
    child.addState('active', { hooks: { update: childUpdate } });

    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('attack', { children: child, initialChild: 'active' });
    fsm.start('attack');
    fsm.update(16);

    expect(childUpdate).toHaveBeenCalledWith(ctx, 16);
  });

  it('child tags bubble up to parent hasTag', () => {
    const child = new HierarchicalStateMachine(ctx, 'child');
    child.addState('active', { tags: ['dealing_damage'] });

    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('attack', { children: child, initialChild: 'active', tags: ['busy'] });
    fsm.start('attack');

    expect(fsm.hasTag('busy')).toBe(true);
    expect(fsm.hasTag('dealing_damage')).toBe(true);
  });

  it('shallow history re-enters last child state', () => {
    const child = new HierarchicalStateMachine(ctx, 'child');
    child.addState('phase1', {}).addState('phase2', {});

    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {});
    fsm.addState('attack', { children: child, initialChild: 'phase1', historyMode: 'shallow' });
    fsm.start('attack');

    // Advance child to phase2
    child.transitionTo('phase2');
    expect(fsm.getChildState()).toBe('phase2');

    // Leave and re-enter
    fsm.transitionTo('idle');
    fsm.transitionTo('attack');
    expect(fsm.getChildState()).toBe('phase2'); // shallow history
  });

  it('no history re-enters initial child', () => {
    const child = new HierarchicalStateMachine(ctx, 'child');
    child.addState('phase1', {}).addState('phase2', {});

    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {});
    fsm.addState('attack', { children: child, initialChild: 'phase1', historyMode: 'none' });
    fsm.start('attack');

    child.transitionTo('phase2');
    fsm.transitionTo('idle');
    fsm.transitionTo('attack');
    expect(fsm.getChildState()).toBe('phase1'); // no history
  });

  // ── Utility ─────────────────────────────────────────────

  it('is() and isAny() check current state', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', {}).addState('run', {});
    fsm.start('idle');
    expect(fsm.is('idle')).toBe(true);
    expect(fsm.is('run')).toBe(false);
    expect(fsm.isAny('idle', 'run')).toBe(true);
    expect(fsm.isAny('run', 'jump')).toBe(false);
  });

  it('getDebugState returns structured info', () => {
    const fsm = new HierarchicalStateMachine(ctx);
    fsm.addState('idle', { tags: ['grounded'] });
    fsm.start('idle');
    const debug = fsm.getDebugState();
    expect(debug.current).toBe('idle');
    expect(debug.tags).toContain('grounded');
  });
});
