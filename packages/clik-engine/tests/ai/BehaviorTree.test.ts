import { describe, it, expect, vi } from 'vitest';
import { BehaviorTree, Blackboard, NodeStatus } from '../../src/ai/BehaviorTree';
import {
  Sequence, Selector, Parallel, Inverter, Succeeder, Repeater, Wait,
  Action, Condition,
} from '../../src/ai/nodes/index';

describe('Blackboard', () => {
  it('stores and retrieves values', () => {
    const bb = new Blackboard();
    bb.set('hp', 100);
    expect(bb.get<number>('hp')).toBe(100);
    expect(bb.has('hp')).toBe(true);
  });

  it('returns undefined for missing keys', () => {
    const bb = new Blackboard();
    expect(bb.get('missing')).toBeUndefined();
  });

  it('deletes and clears', () => {
    const bb = new Blackboard();
    bb.set('a', 1);
    bb.set('b', 2);
    bb.delete('a');
    expect(bb.has('a')).toBe(false);
    bb.clear();
    expect(bb.keys()).toHaveLength(0);
  });
});

describe('Action', () => {
  it('executes callback and returns status', () => {
    const action = new Action(() => NodeStatus.SUCCESS);
    expect(action.tick(new Blackboard(), 16)).toBe(NodeStatus.SUCCESS);
  });

  it('receives blackboard and delta', () => {
    const fn = vi.fn(() => NodeStatus.SUCCESS);
    const bb = new Blackboard();
    new Action(fn).tick(bb, 32);
    expect(fn).toHaveBeenCalledWith(bb, 32);
  });
});

describe('Condition', () => {
  it('returns SUCCESS when true', () => {
    const bb = new Blackboard();
    bb.set('ready', true);
    const cond = new Condition(b => b.get<boolean>('ready')!);
    expect(cond.tick(bb, 0)).toBe(NodeStatus.SUCCESS);
  });

  it('returns FAILURE when false', () => {
    const cond = new Condition(() => false);
    expect(cond.tick(new Blackboard(), 0)).toBe(NodeStatus.FAILURE);
  });
});

describe('Sequence', () => {
  it('returns SUCCESS when all children succeed', () => {
    const seq = new Sequence([
      new Action(() => NodeStatus.SUCCESS),
      new Action(() => NodeStatus.SUCCESS),
    ]);
    expect(seq.tick(new Blackboard(), 16)).toBe(NodeStatus.SUCCESS);
  });

  it('returns FAILURE on first child failure', () => {
    const third = vi.fn(() => NodeStatus.SUCCESS);
    const seq = new Sequence([
      new Action(() => NodeStatus.SUCCESS),
      new Action(() => NodeStatus.FAILURE),
      new Action(third),
    ]);
    expect(seq.tick(new Blackboard(), 16)).toBe(NodeStatus.FAILURE);
    expect(third).not.toHaveBeenCalled();
  });

  it('returns RUNNING and resumes from running child', () => {
    let calls = 0;
    const seq = new Sequence([
      new Action(() => NodeStatus.SUCCESS),
      new Action(() => { calls++; return calls >= 2 ? NodeStatus.SUCCESS : NodeStatus.RUNNING; }),
    ]);
    const bb = new Blackboard();
    expect(seq.tick(bb, 16)).toBe(NodeStatus.RUNNING);
    expect(seq.tick(bb, 16)).toBe(NodeStatus.SUCCESS);
  });
});

describe('Selector', () => {
  it('returns SUCCESS on first child success', () => {
    const sel = new Selector([
      new Action(() => NodeStatus.FAILURE),
      new Action(() => NodeStatus.SUCCESS),
    ]);
    expect(sel.tick(new Blackboard(), 16)).toBe(NodeStatus.SUCCESS);
  });

  it('returns FAILURE when all children fail', () => {
    const sel = new Selector([
      new Action(() => NodeStatus.FAILURE),
      new Action(() => NodeStatus.FAILURE),
    ]);
    expect(sel.tick(new Blackboard(), 16)).toBe(NodeStatus.FAILURE);
  });
});

describe('Parallel', () => {
  it('runs all children', () => {
    const a = vi.fn(() => NodeStatus.SUCCESS);
    const b = vi.fn(() => NodeStatus.SUCCESS);
    const par = new Parallel([new Action(a), new Action(b)]);
    expect(par.tick(new Blackboard(), 16)).toBe(NodeStatus.SUCCESS);
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it('fails when too many children fail', () => {
    const par = new Parallel([
      new Action(() => NodeStatus.FAILURE),
      new Action(() => NodeStatus.FAILURE),
    ], 1);
    expect(par.tick(new Blackboard(), 16)).toBe(NodeStatus.FAILURE);
  });
});

describe('Inverter', () => {
  it('inverts SUCCESS to FAILURE', () => {
    const inv = new Inverter(new Action(() => NodeStatus.SUCCESS));
    expect(inv.tick(new Blackboard(), 16)).toBe(NodeStatus.FAILURE);
  });

  it('inverts FAILURE to SUCCESS', () => {
    const inv = new Inverter(new Action(() => NodeStatus.FAILURE));
    expect(inv.tick(new Blackboard(), 16)).toBe(NodeStatus.SUCCESS);
  });

  it('passes RUNNING through', () => {
    const inv = new Inverter(new Action(() => NodeStatus.RUNNING));
    expect(inv.tick(new Blackboard(), 16)).toBe(NodeStatus.RUNNING);
  });
});

describe('Succeeder', () => {
  it('always returns SUCCESS', () => {
    const s = new Succeeder(new Action(() => NodeStatus.FAILURE));
    expect(s.tick(new Blackboard(), 16)).toBe(NodeStatus.SUCCESS);
  });
});

describe('Repeater', () => {
  it('repeats child N times', () => {
    let count = 0;
    const rep = new Repeater(new Action(() => { count++; return NodeStatus.SUCCESS; }), 3);
    const bb = new Blackboard();

    expect(rep.tick(bb, 16)).toBe(NodeStatus.RUNNING); // 1st
    expect(rep.tick(bb, 16)).toBe(NodeStatus.RUNNING); // 2nd
    expect(rep.tick(bb, 16)).toBe(NodeStatus.SUCCESS); // 3rd — done
    expect(count).toBe(3);
  });
});

describe('Wait', () => {
  it('returns RUNNING until duration elapsed', () => {
    const wait = new Wait(100);
    const bb = new Blackboard();
    expect(wait.tick(bb, 50)).toBe(NodeStatus.RUNNING);
    expect(wait.tick(bb, 50)).toBe(NodeStatus.SUCCESS);
  });
});

describe('BehaviorTree', () => {
  it('ticks root node', () => {
    const tree = new BehaviorTree();
    tree.setRoot(new Action(() => NodeStatus.SUCCESS));
    expect(tree.tick(16)).toBe(NodeStatus.SUCCESS);
  });

  it('returns FAILURE with no root', () => {
    const tree = new BehaviorTree();
    expect(tree.tick(16)).toBe(NodeStatus.FAILURE);
  });

  it('provides blackboard', () => {
    const bb = new Blackboard();
    bb.set('test', true);
    const tree = new BehaviorTree(bb);
    expect(tree.getBlackboard().get('test')).toBe(true);
  });

  it('complex tree: patrol → chase', () => {
    const bb = new Blackboard();
    bb.set('enemyVisible', false);

    const patrolFn = vi.fn(() => NodeStatus.RUNNING);
    const chaseFn = vi.fn(() => NodeStatus.RUNNING);

    const tree = new BehaviorTree(bb);
    tree.setRoot(new Selector([
      new Sequence([
        new Condition(b => b.get<boolean>('enemyVisible')!),
        new Action(chaseFn),
      ]),
      new Action(patrolFn),
    ]));

    // Enemy not visible → patrol
    tree.tick(16);
    expect(patrolFn).toHaveBeenCalled();
    expect(chaseFn).not.toHaveBeenCalled();

    // Enemy becomes visible → chase
    bb.set('enemyVisible', true);
    tree.reset();
    tree.tick(16);
    expect(chaseFn).toHaveBeenCalled();
  });
});
