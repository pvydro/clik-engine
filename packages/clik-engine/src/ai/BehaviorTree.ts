/**
 * Behavior Tree implementation for game AI.
 *
 * Usage:
 *   const tree = new BehaviorTree(blackboard);
 *   tree.setRoot(new Selector([
 *     new Sequence([
 *       new Condition(bb => bb.get('enemyVisible')),
 *       new Action(bb => { attack(); return NodeStatus.SUCCESS; }),
 *     ]),
 *     new Action(bb => { patrol(); return NodeStatus.RUNNING; }),
 *   ]));
 *   // Each frame:
 *   tree.tick(delta);
 */

export enum NodeStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  RUNNING = 'running',
}

/**
 * Shared data store for behavior tree context.
 */
export class Blackboard {
  private data: Map<string, unknown> = new Map();

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  keys(): string[] {
    return Array.from(this.data.keys());
  }
}

/**
 * Base class for all behavior tree nodes.
 */
export abstract class BTNode {
  abstract tick(blackboard: Blackboard, delta: number): NodeStatus;

  /** Called when the tree resets or this node needs to start fresh */
  reset(): void {}
}

/**
 * Behavior tree runner — ticks the root node each frame.
 */
export class BehaviorTree {
  private root: BTNode | null = null;
  private blackboard: Blackboard;

  constructor(blackboard?: Blackboard) {
    this.blackboard = blackboard ?? new Blackboard();
  }

  setRoot(node: BTNode): this {
    this.root = node;
    return this;
  }

  tick(delta: number): NodeStatus {
    if (!this.root) return NodeStatus.FAILURE;
    return this.root.tick(this.blackboard, delta);
  }

  reset(): void {
    this.root?.reset();
  }

  getBlackboard(): Blackboard {
    return this.blackboard;
  }
}
