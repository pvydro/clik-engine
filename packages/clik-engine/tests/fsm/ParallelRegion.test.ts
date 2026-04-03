import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { HierarchicalStateMachine } from '../../src/fsm/HierarchicalStateMachine';
import { ParallelRegion } from '../../src/fsm/ParallelRegion';

describe('ParallelRegion', () => {
  let ctx: { hp: number };
  let locomotion: HierarchicalStateMachine<typeof ctx>;
  let combat: HierarchicalStateMachine<typeof ctx>;

  beforeEach(() => {
    ctx = { hp: 100 };

    locomotion = new HierarchicalStateMachine(ctx, 'locomotion');
    locomotion.addState('idle', {}).addState('running', {});
    locomotion.start('idle');

    combat = new HierarchicalStateMachine(ctx, 'combat');
    combat.addState('ready', {}).addState('attacking', { tags: ['busy'] });
    combat.start('ready');
  });

  it('adds and retrieves regions', () => {
    const parallel = new ParallelRegion('player');
    parallel.addRegion('locomotion', locomotion);
    parallel.addRegion('combat', combat);

    expect(parallel.getRegionNames()).toContain('locomotion');
    expect(parallel.getRegionNames()).toContain('combat');
    expect(parallel.getRegion('locomotion')).toBe(locomotion);
  });

  it('updates all regions', () => {
    const locoUpdate = vi.fn();
    locomotion.addState('idle', { hooks: { update: locoUpdate } });
    locomotion.start('idle'); // re-start with updated hooks

    const parallel = new ParallelRegion();
    parallel.addRegion('locomotion', locomotion);
    parallel.addRegion('combat', combat);
    parallel.update(16);

    expect(locoUpdate).toHaveBeenCalled();
  });

  it('getRegionState returns current state of a region', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('locomotion', locomotion);
    parallel.addRegion('combat', combat);

    expect(parallel.getRegionState('locomotion')).toBe('idle');
    expect(parallel.getRegionState('combat')).toBe('ready');
  });

  it('isRegionInState checks cross-region state', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('locomotion', locomotion);
    parallel.addRegion('combat', combat);

    expect(parallel.isRegionInState('locomotion', 'idle')).toBe(true);
    expect(parallel.isRegionInState('combat', 'attacking')).toBe(false);
  });

  it('hasTag checks all regions', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('locomotion', locomotion);
    parallel.addRegion('combat', combat);

    expect(parallel.hasTag('busy')).toBe(false);

    combat.transitionTo('attacking');
    expect(parallel.hasTag('busy')).toBe(true);
  });

  it('getTags aggregates all region tags', () => {
    locomotion = new HierarchicalStateMachine(ctx, 'loco');
    locomotion.addState('idle', { tags: ['grounded'] });
    locomotion.start('idle');

    combat.transitionTo('attacking'); // has tag 'busy'

    const parallel = new ParallelRegion();
    parallel.addRegion('locomotion', locomotion);
    parallel.addRegion('combat', combat);

    const tags = parallel.getTags();
    expect(tags).toContain('grounded');
    expect(tags).toContain('busy');
  });

  it('sendEvent broadcasts to all regions', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('combat', combat);

    combat.addEventTransition('ready', 'attack_input', { to: 'attacking' });

    parallel.sendEvent({ type: 'attack_input' });
    parallel.update(16);

    expect(combat.getCurrent()).toBe('attacking');
  });

  it('removeRegion removes it', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('combat', combat);
    parallel.removeRegion('combat');
    expect(parallel.getRegionNames()).not.toContain('combat');
  });

  it('returns null for unknown region state', () => {
    const parallel = new ParallelRegion();
    expect(parallel.getRegionState('nonexistent')).toBeNull();
  });

  it('getDebugState returns all regions', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('locomotion', locomotion);
    const debug = parallel.getDebugState();
    expect(debug).toHaveProperty('locomotion');
  });

  it('destroy clears all regions', () => {
    const parallel = new ParallelRegion();
    parallel.addRegion('a', locomotion);
    parallel.destroy();
    expect(parallel.getRegionNames()).toHaveLength(0);
  });
});
