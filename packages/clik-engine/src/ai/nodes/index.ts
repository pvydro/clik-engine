import { BTNode, NodeStatus } from '../BehaviorTree';
import type { Blackboard } from '../BehaviorTree';

// ── Composite Nodes ───────────────────────────────────────────────────────

/** Runs children in order. Returns SUCCESS if all succeed, FAILURE on first failure. */
export class Sequence extends BTNode {
  private children: BTNode[];
  private currentIndex = 0;

  constructor(children: BTNode[]) {
    super();
    this.children = children;
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(bb, delta);
      if (status === NodeStatus.RUNNING) return NodeStatus.RUNNING;
      if (status === NodeStatus.FAILURE) {
        this.currentIndex = 0;
        return NodeStatus.FAILURE;
      }
      this.currentIndex++;
    }
    this.currentIndex = 0;
    return NodeStatus.SUCCESS;
  }

  reset(): void {
    this.currentIndex = 0;
    for (const child of this.children) child.reset();
  }
}

/** Runs children in order. Returns SUCCESS on first success, FAILURE if all fail. */
export class Selector extends BTNode {
  private children: BTNode[];
  private currentIndex = 0;

  constructor(children: BTNode[]) {
    super();
    this.children = children;
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(bb, delta);
      if (status === NodeStatus.RUNNING) return NodeStatus.RUNNING;
      if (status === NodeStatus.SUCCESS) {
        this.currentIndex = 0;
        return NodeStatus.SUCCESS;
      }
      this.currentIndex++;
    }
    this.currentIndex = 0;
    return NodeStatus.FAILURE;
  }

  reset(): void {
    this.currentIndex = 0;
    for (const child of this.children) child.reset();
  }
}

/** Runs all children simultaneously. Configurable success/failure policies. */
export class Parallel extends BTNode {
  private children: BTNode[];
  private successThreshold: number;

  constructor(children: BTNode[], successThreshold?: number) {
    super();
    this.children = children;
    this.successThreshold = successThreshold ?? children.length; // All must succeed by default
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    let successes = 0;
    let failures = 0;
    let running = false;

    for (const child of this.children) {
      const status = child.tick(bb, delta);
      if (status === NodeStatus.SUCCESS) successes++;
      else if (status === NodeStatus.FAILURE) failures++;
      else running = true;
    }

    if (successes >= this.successThreshold) return NodeStatus.SUCCESS;
    if (failures > this.children.length - this.successThreshold) return NodeStatus.FAILURE;
    return running ? NodeStatus.RUNNING : NodeStatus.FAILURE;
  }

  reset(): void {
    for (const child of this.children) child.reset();
  }
}

// ── Decorator Nodes ───────────────────────────────────────────────────────

/** Inverts the child's result (SUCCESS ↔ FAILURE, RUNNING unchanged). */
export class Inverter extends BTNode {
  private child: BTNode;

  constructor(child: BTNode) {
    super();
    this.child = child;
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    const status = this.child.tick(bb, delta);
    if (status === NodeStatus.SUCCESS) return NodeStatus.FAILURE;
    if (status === NodeStatus.FAILURE) return NodeStatus.SUCCESS;
    return NodeStatus.RUNNING;
  }

  reset(): void { this.child.reset(); }
}

/** Always returns SUCCESS regardless of child result. */
export class Succeeder extends BTNode {
  private child: BTNode;

  constructor(child: BTNode) {
    super();
    this.child = child;
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    this.child.tick(bb, delta);
    return NodeStatus.SUCCESS;
  }

  reset(): void { this.child.reset(); }
}

/** Repeats child a fixed number of times. Returns RUNNING while repeating. */
export class Repeater extends BTNode {
  private child: BTNode;
  private maxRepeats: number;
  private count = 0;

  constructor(child: BTNode, maxRepeats = Infinity) {
    super();
    this.child = child;
    this.maxRepeats = maxRepeats;
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    if (this.count >= this.maxRepeats) return NodeStatus.SUCCESS;

    const status = this.child.tick(bb, delta);
    if (status === NodeStatus.RUNNING) return NodeStatus.RUNNING;

    this.count++;
    if (this.count >= this.maxRepeats) return NodeStatus.SUCCESS;

    this.child.reset();
    return NodeStatus.RUNNING;
  }

  reset(): void {
    this.count = 0;
    this.child.reset();
  }
}

/** Waits for a duration before succeeding. */
export class Wait extends BTNode {
  private durationMs: number;
  private elapsed = 0;

  constructor(durationMs: number) {
    super();
    this.durationMs = durationMs;
  }

  tick(_bb: Blackboard, delta: number): NodeStatus {
    this.elapsed += delta;
    if (this.elapsed >= this.durationMs) {
      this.elapsed = 0;
      return NodeStatus.SUCCESS;
    }
    return NodeStatus.RUNNING;
  }

  reset(): void { this.elapsed = 0; }
}

// ── Leaf Nodes ────────────────────────────────────────────────────────────

/** Executes a callback. Return NodeStatus from the callback. */
export class Action extends BTNode {
  private fn: (bb: Blackboard, delta: number) => NodeStatus;

  constructor(fn: (bb: Blackboard, delta: number) => NodeStatus) {
    super();
    this.fn = fn;
  }

  tick(bb: Blackboard, delta: number): NodeStatus {
    return this.fn(bb, delta);
  }
}

/** Checks a boolean condition. Returns SUCCESS if true, FAILURE if false. */
export class Condition extends BTNode {
  private fn: (bb: Blackboard) => boolean;

  constructor(fn: (bb: Blackboard) => boolean) {
    super();
    this.fn = fn;
  }

  tick(bb: Blackboard, _delta: number): NodeStatus {
    return this.fn(bb) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  }
}
