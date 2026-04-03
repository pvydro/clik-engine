import { describe, it, expect } from 'vitest';
import { GOAPPlanner } from '../../src/ai/GOAP';

describe('GOAPPlanner', () => {
  it('finds a single-action plan', () => {
    const planner = new GOAPPlanner();
    planner.addAction({
      name: 'attack',
      cost: 1,
      preconditions: { hasWeapon: true },
      effects: { enemyDead: true },
    });

    const plan = planner.plan(
      { hasWeapon: true, enemyDead: false },
      { enemyDead: true },
    );
    expect(plan).toEqual(['attack']);
  });

  it('finds a multi-step plan', () => {
    const planner = new GOAPPlanner();
    planner.addAction({
      name: 'pickUpWeapon',
      cost: 1,
      preconditions: { nearWeapon: true },
      effects: { hasWeapon: true },
    });
    planner.addAction({
      name: 'attack',
      cost: 1,
      preconditions: { hasWeapon: true },
      effects: { enemyDead: true },
    });

    const plan = planner.plan(
      { nearWeapon: true, hasWeapon: false, enemyDead: false },
      { enemyDead: true },
    );
    expect(plan).toEqual(['pickUpWeapon', 'attack']);
  });

  it('returns empty when no plan is possible', () => {
    const planner = new GOAPPlanner();
    planner.addAction({
      name: 'attack',
      cost: 1,
      preconditions: { hasWeapon: true },
      effects: { enemyDead: true },
    });

    const plan = planner.plan(
      { hasWeapon: false, enemyDead: false },
      { enemyDead: true },
    );
    expect(plan).toEqual([]);
  });

  it('prefers lower cost plan', () => {
    const planner = new GOAPPlanner();
    planner.addAction({
      name: 'cheapAttack',
      cost: 1,
      preconditions: {},
      effects: { enemyDead: true },
    });
    planner.addAction({
      name: 'expensiveAttack',
      cost: 10,
      preconditions: {},
      effects: { enemyDead: true },
    });

    const plan = planner.plan({ enemyDead: false }, { enemyDead: true });
    expect(plan).toEqual(['cheapAttack']);
  });

  it('returns empty when goal is already met', () => {
    const planner = new GOAPPlanner();
    const plan = planner.plan({ enemyDead: true }, { enemyDead: true });
    expect(plan).toEqual([]);
  });

  it('handles multiple goal conditions', () => {
    const planner = new GOAPPlanner();
    planner.addAction({
      name: 'getWeapon',
      cost: 1,
      preconditions: {},
      effects: { hasWeapon: true },
    });
    planner.addAction({
      name: 'getShield',
      cost: 1,
      preconditions: {},
      effects: { hasShield: true },
    });

    const plan = planner.plan(
      { hasWeapon: false, hasShield: false },
      { hasWeapon: true, hasShield: true },
    );
    expect(plan).toHaveLength(2);
    expect(plan).toContain('getWeapon');
    expect(plan).toContain('getShield');
  });

  it('respects maxSteps', () => {
    const planner = new GOAPPlanner();
    // Create a chain that requires 5 steps
    for (let i = 0; i < 5; i++) {
      planner.addAction({
        name: `step${i}`,
        cost: 1,
        preconditions: i === 0 ? {} : { [`stage${i - 1}`]: true },
        effects: { [`stage${i}`]: true },
      });
    }

    const plan = planner.plan({}, { stage4: true }, 3);
    expect(plan).toEqual([]); // can't reach in 3 steps
  });

  it('getActions returns registered actions', () => {
    const planner = new GOAPPlanner();
    planner.addAction({ name: 'a', cost: 1, preconditions: {}, effects: {} });
    planner.addAction({ name: 'b', cost: 1, preconditions: {}, effects: {} });
    expect(planner.getActions()).toHaveLength(2);
  });

  it('removeAction removes it', () => {
    const planner = new GOAPPlanner();
    planner.addAction({ name: 'a', cost: 1, preconditions: {}, effects: {} });
    planner.removeAction('a');
    expect(planner.getActions()).toHaveLength(0);
  });

  it('clear removes all actions', () => {
    const planner = new GOAPPlanner();
    planner.addAction({ name: 'a', cost: 1, preconditions: {}, effects: {} });
    planner.clear();
    expect(planner.getActions()).toHaveLength(0);
  });
});
