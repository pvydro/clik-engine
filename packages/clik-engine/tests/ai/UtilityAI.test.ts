import { describe, it, expect } from 'vitest';
import { UtilityAI } from '../../src/ai/UtilityAI';

interface TestContext {
  health: number;
  distance: number;
  ammo: number;
}

describe('UtilityAI', () => {
  it('selects highest-scoring action', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('attack', [
      { name: 'close', inputFn: ctx => 1 - ctx.distance / 200, curve: 'linear' },
    ]);
    ai.addAction('flee', [
      { name: 'lowHP', inputFn: ctx => 1 - ctx.health / 100, curve: 'linear' },
    ]);

    const ctx = { health: 80, distance: 50, ammo: 10 };
    expect(ai.evaluate(ctx)).toBe('attack'); // close + healthy = attack preferred
  });

  it('returns null with no actions', () => {
    const ai = new UtilityAI<TestContext>();
    expect(ai.evaluate({ health: 50, distance: 100, ammo: 5 })).toBeNull();
  });

  it('binary curve creates hard threshold', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('shoot', [
      { name: 'hasAmmo', inputFn: ctx => ctx.ammo > 0 ? 1 : 0, curve: 'binary' },
    ]);

    expect(ai.evaluate({ health: 100, distance: 50, ammo: 0 })).toBe('shoot');
    // With binary, 0 → 0, but score 0 is still the only option
  });

  it('multiple considerations multiply scores', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('attack', [
      { name: 'close', inputFn: () => 0.8, curve: 'linear' },
      { name: 'healthy', inputFn: () => 0.9, curve: 'linear' },
    ]);
    ai.addAction('idle', [
      { name: 'always', inputFn: () => 0.5, curve: 'linear' },
    ]);

    const scores = ai.scoreAll({ health: 100, distance: 50, ammo: 10 });
    expect(scores[0].action).toBe('attack');
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
  });

  it('scoreAll returns sorted by score descending', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('low', [{ name: 'x', inputFn: () => 0.2 }]);
    ai.addAction('high', [{ name: 'x', inputFn: () => 0.9 }]);
    ai.addAction('mid', [{ name: 'x', inputFn: () => 0.5 }]);

    const scores = ai.scoreAll({ health: 100, distance: 50, ammo: 10 });
    expect(scores[0].action).toBe('high');
    expect(scores[1].action).toBe('mid');
    expect(scores[2].action).toBe('low');
  });

  it('clamps inputs to 0-1', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('test', [{ name: 'x', inputFn: () => 5 }]); // exceeds 1
    const scores = ai.scoreAll({ health: 100, distance: 50, ammo: 10 });
    expect(scores[0].score).toBeLessThanOrEqual(1);
  });

  it('weights scale consideration impact', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('weighted', [
      { name: 'x', inputFn: () => 0.5, weight: 2 },
    ]);
    ai.addAction('unweighted', [
      { name: 'x', inputFn: () => 0.5, weight: 1 },
    ]);
    const scores = ai.scoreAll({ health: 100, distance: 50, ammo: 10 });
    expect(scores[0].action).toBe('weighted');
  });

  it('getActionNames returns all registered actions', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('a', []).addAction('b', []);
    expect(ai.getActionNames()).toContain('a');
    expect(ai.getActionNames()).toContain('b');
  });

  it('removeAction removes it', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('a', []);
    ai.removeAction('a');
    expect(ai.getActionNames()).not.toContain('a');
  });

  it('clear removes all actions', () => {
    const ai = new UtilityAI<TestContext>();
    ai.addAction('a', []).addAction('b', []);
    ai.clear();
    expect(ai.getActionNames()).toHaveLength(0);
  });
});
