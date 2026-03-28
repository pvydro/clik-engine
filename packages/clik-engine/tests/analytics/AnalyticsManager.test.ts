import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: {
    engine: vi.fn(),
  },
}));

import { AnalyticsManager } from '../../src/analytics/AnalyticsManager';

describe('AnalyticsManager', () => {
  it('tracks events', () => {
    const analytics = new AnalyticsManager();
    analytics.track('test_event', { value: 42 });
    expect(analytics.getEvents()).toHaveLength(1);
    expect(analytics.getEvents()[0].name).toBe('test_event');
    expect(analytics.getEvents()[0].data).toEqual({ value: 42 });
  });

  it('sends events to backends', () => {
    const backend = vi.fn();
    const analytics = new AnalyticsManager();
    analytics.addBackend(backend);
    analytics.track('click', { button: 'play' });
    expect(backend).toHaveBeenCalledWith(expect.objectContaining({ name: 'click' }));
  });

  it('tracks scene views', () => {
    const analytics = new AnalyticsManager();
    analytics.trackSceneView('menu');
    expect(analytics.getEventCount('scene_view')).toBe(1);
  });

  it('tracks game events', () => {
    const analytics = new AnalyticsManager();
    analytics.trackGameEvent('level_complete', { level: 3 });
    expect(analytics.getEvents()[0].name).toBe('game_level_complete');
  });

  it('can be disabled', () => {
    const analytics = new AnalyticsManager();
    analytics.setEnabled(false);
    analytics.track('should_not_track');
    expect(analytics.getEvents()).toHaveLength(0);
  });

  it('tracks session duration', () => {
    const analytics = new AnalyticsManager();
    expect(analytics.getSessionDuration()).toBeGreaterThanOrEqual(0);
  });

  it('generates session ID', () => {
    const a1 = new AnalyticsManager();
    const a2 = new AnalyticsManager();
    expect(a1.getSessionId()).not.toBe(a2.getSessionId());
  });

  it('clears events', () => {
    const analytics = new AnalyticsManager();
    analytics.track('a');
    analytics.track('b');
    analytics.clear();
    expect(analytics.getEvents()).toHaveLength(0);
  });

  it('handles backend errors gracefully', () => {
    const analytics = new AnalyticsManager();
    analytics.addBackend(() => { throw new Error('backend crash'); });
    // Should not throw
    expect(() => analytics.track('test')).not.toThrow();
    expect(analytics.getEvents()).toHaveLength(1);
  });
});
