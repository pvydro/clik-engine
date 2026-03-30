import { Component } from '../Component';
import { BehaviorTree, Blackboard } from '../../ai/BehaviorTree';
import type { BTNode } from '../../ai/BehaviorTree';

/**
 * Entity component that runs a BehaviorTree each frame.
 * Auto-seeds the Blackboard with entity position and state.
 */
export class BehaviorTreeComponent extends Component {
  private tree: BehaviorTree;

  constructor(rootNode: BTNode, blackboard?: Blackboard) {
    super();
    this.tree = new BehaviorTree(blackboard);
    this.tree.setRoot(rootNode);
  }

  onAttach(): void {
    // Seed blackboard with entity reference
    this.tree.getBlackboard().set('entity', this.entity);
    this.tree.getBlackboard().set('scene', this.entity.scene);
  }

  update(delta: number): void {
    // Update blackboard with current entity state
    const bb = this.tree.getBlackboard();
    bb.set('x', this.entity.x);
    bb.set('y', this.entity.y);

    this.tree.tick(delta);
  }

  /** Get the behavior tree instance for direct manipulation */
  getTree(): BehaviorTree {
    return this.tree;
  }

  /** Get the blackboard for reading/writing shared data */
  getBlackboard(): Blackboard {
    return this.tree.getBlackboard();
  }

  /** Reset the tree to initial state */
  reset(): void {
    this.tree.reset();
  }

  onDetach(): void {
    this.tree.reset();
  }
}
