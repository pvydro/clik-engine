import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LatencyMonitor } from '../../src/network/LatencyMonitor';

describe('LatencyMonitor', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sendPing returns incrementing IDs', () => {
    const monitor = new LatencyMonitor();
    expect(monitor.sendPing()).toBe(0);
    expect(monitor.sendPing()).toBe(1);
  });

  it('receivePong computes RTT', () => {
    const monitor = new LatencyMonitor();
    const id = monitor.sendPing();
    vi.advanceTimersByTime(50);
    const rtt = monitor.receivePong(id);
    expect(rtt).toBe(50);
  });

  it('getRTT averages samples', () => {
    const monitor = new LatencyMonitor();

    const id1 = monitor.sendPing();
    vi.advanceTimersByTime(40);
    monitor.receivePong(id1);

    const id2 = monitor.sendPing();
    vi.advanceTimersByTime(60);
    monitor.receivePong(id2);

    expect(monitor.getRTT()).toBe(50);
  });

  it('getJitter computes standard deviation', () => {
    const monitor = new LatencyMonitor();

    const id1 = monitor.sendPing();
    vi.advanceTimersByTime(40);
    monitor.receivePong(id1);

    const id2 = monitor.sendPing();
    vi.advanceTimersByTime(60);
    monitor.receivePong(id2);

    expect(monitor.getJitter()).toBeGreaterThan(0);
  });

  it('getOneWayLatency is RTT/2', () => {
    const monitor = new LatencyMonitor();
    const id = monitor.sendPing();
    vi.advanceTimersByTime(100);
    monitor.receivePong(id);
    expect(monitor.getOneWayLatency()).toBe(50);
  });

  it('getStats returns min/max/avg/jitter', () => {
    const monitor = new LatencyMonitor();
    const id = monitor.sendPing();
    vi.advanceTimersByTime(30);
    monitor.receivePong(id);

    const stats = monitor.getStats();
    expect(stats.min).toBe(30);
    expect(stats.max).toBe(30);
    expect(stats.avg).toBe(30);
    expect(stats.samples).toBe(1);
  });

  it('returns zero stats when empty', () => {
    const monitor = new LatencyMonitor();
    expect(monitor.getRTT()).toBe(0);
    expect(monitor.getJitter()).toBe(0);
    expect(monitor.getStats().samples).toBe(0);
  });

  it('receivePong returns -1 for unknown ping', () => {
    const monitor = new LatencyMonitor();
    expect(monitor.receivePong(999)).toBe(-1);
  });

  it('respects maxSamples', () => {
    const monitor = new LatencyMonitor(3);
    for (let i = 0; i < 10; i++) {
      const id = monitor.sendPing();
      vi.advanceTimersByTime(10);
      monitor.receivePong(id);
    }
    expect(monitor.getSamples()).toHaveLength(3);
  });

  it('pendingCount tracks unanswered pings', () => {
    const monitor = new LatencyMonitor();
    monitor.sendPing();
    monitor.sendPing();
    expect(monitor.pendingCount).toBe(2);
  });

  it('clear resets everything', () => {
    const monitor = new LatencyMonitor();
    const id = monitor.sendPing();
    vi.advanceTimersByTime(50);
    monitor.receivePong(id);
    monitor.clear();
    expect(monitor.getRTT()).toBe(0);
    expect(monitor.pendingCount).toBe(0);
  });
});
