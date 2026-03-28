import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { error: vi.fn(), engine: vi.fn() },
}));

import { LeakDetector } from '../../src/debug/LeakDetector';

describe('LeakDetector', () => {
  it('tracks created and destroyed counts', () => {
    const ld = new LeakDetector();
    ld.register('bullet');
    ld.created('bullet');
    ld.created('bullet');
    ld.destroyed('bullet');

    const stats = ld.getStats();
    expect(stats.bullet.created).toBe(2);
    expect(stats.bullet.destroyed).toBe(1);
    expect(stats.bullet.current).toBe(1);
  });

  it('tracks peak count', () => {
    const ld = new LeakDetector();
    ld.register('enemy');
    ld.created('enemy');
    ld.created('enemy');
    ld.created('enemy');
    ld.destroyed('enemy');
    ld.destroyed('enemy');

    expect(ld.getStats().enemy.peak).toBe(3);
    expect(ld.getStats().enemy.current).toBe(1);
  });

  it('auto-registers unknown types on created', () => {
    const ld = new LeakDetector();
    ld.created('newType');
    expect(ld.getStats().newType.current).toBe(1);
  });

  it('does not go below zero on extra destroys', () => {
    const ld = new LeakDetector();
    ld.register('particle');
    ld.created('particle');
    ld.destroyed('particle');
    ld.destroyed('particle');
    expect(ld.getStats().particle.current).toBe(0);
  });

  it('resets all tracking', () => {
    const ld = new LeakDetector();
    ld.created('a');
    ld.created('b');
    ld.reset();
    expect(Object.keys(ld.getStats())).toHaveLength(0);
  });

  it('warns when threshold exceeded', async () => {
    const reporter = await import('../../src/debug/ConsoleReporter');
    const ld = new LeakDetector(3);
    ld.register('widget');
    ld.created('widget');
    ld.created('widget');
    ld.created('widget');
    ld.created('widget'); // exceeds threshold of 3

    expect(reporter.ConsoleReporter.error).toHaveBeenCalled();
  });
});
