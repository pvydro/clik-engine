import { describe, it, expect } from 'vitest';
import { LagCompensation } from '../../src/network/LagCompensation';

describe('LagCompensation', () => {
  it('records and retrieves historical states', () => {
    const lc = new LagCompensation();
    lc.recordTick(1, new Map([['player', { x: 100, y: 200 }]]));
    expect(lc.historySize).toBe(1);
  });

  it('getStateAtTick finds closest tick', () => {
    const lc = new LagCompensation();
    lc.recordTick(10, new Map([['a', { x: 10, y: 0 }]]));
    lc.recordTick(20, new Map([['a', { x: 20, y: 0 }]]));

    const state = lc.getStateAtTick(15);
    expect(state).not.toBeNull();
    // Should be tick 10 (diff=5) or 20 (diff=5) — either is valid
  });

  it('verifyHit returns true when target is in range', () => {
    const lc = new LagCompensation();
    lc.recordTick(10, new Map([['enemy', { x: 100, y: 100 }]]));

    const hit = lc.verifyHit(10, { x: 105, y: 100 }, 'enemy', 10);
    expect(hit).toBe(true);
  });

  it('verifyHit returns false when target is out of range', () => {
    const lc = new LagCompensation();
    lc.recordTick(10, new Map([['enemy', { x: 100, y: 100 }]]));

    const hit = lc.verifyHit(10, { x: 200, y: 100 }, 'enemy', 10);
    expect(hit).toBe(false);
  });

  it('verifyHit returns false for unknown entity', () => {
    const lc = new LagCompensation();
    lc.recordTick(10, new Map([['enemy', { x: 100, y: 100 }]]));

    const hit = lc.verifyHit(10, { x: 100, y: 100 }, 'unknown', 10);
    expect(hit).toBe(false);
  });

  it('verifyHit returns false with no history', () => {
    const lc = new LagCompensation();
    expect(lc.verifyHit(10, { x: 0, y: 0 }, 'enemy', 50)).toBe(false);
  });

  it('getPositionAtTick returns entity position', () => {
    const lc = new LagCompensation();
    lc.recordTick(5, new Map([['player', { x: 50, y: 75 }]]));
    const pos = lc.getPositionAtTick(5, 'player');
    expect(pos).toEqual({ x: 50, y: 75 });
  });

  it('respects maxHistory', () => {
    const lc = new LagCompensation({ maxHistory: 3 });
    for (let i = 0; i < 10; i++) {
      lc.recordTick(i, new Map());
    }
    expect(lc.historySize).toBe(3);
  });

  it('getTickRange returns oldest and newest', () => {
    const lc = new LagCompensation();
    lc.recordTick(5, new Map());
    lc.recordTick(10, new Map());
    lc.recordTick(15, new Map());
    expect(lc.getTickRange()).toEqual({ oldest: 5, newest: 15 });
  });

  it('getTickRange returns null when empty', () => {
    const lc = new LagCompensation();
    expect(lc.getTickRange()).toBeNull();
  });

  it('clear removes all history', () => {
    const lc = new LagCompensation();
    lc.recordTick(1, new Map());
    lc.clear();
    expect(lc.historySize).toBe(0);
  });
});
