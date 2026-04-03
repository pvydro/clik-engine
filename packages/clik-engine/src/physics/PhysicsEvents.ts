import type { Entity } from '../entity/Entity';

export interface CollisionEvent {
  entityA: Entity;
  entityB: Entity;
  /** Overlap amount on X axis */
  overlapX: number;
  /** Overlap amount on Y axis */
  overlapY: number;
}

export type CollisionPhase = 'enter' | 'stay' | 'exit';
export type CollisionCallback = (event: CollisionEvent, phase: CollisionPhase) => void;

/**
 * Per-pair collision event tracking with enter/stay/exit lifecycle.
 * Wraps the CombatManager or manual collision checks with stateful tracking.
 *
 * Usage:
 * ```
 * const events = new CollisionEventTracker();
 * events.onCollision((event, phase) => {
 *   if (phase === 'enter') applyDamage(event);
 * });
 * // Each frame, report active collision pairs:
 * events.beginFrame();
 * events.reportCollision(entityA, entityB);
 * events.endFrame(); // fires enter/stay/exit callbacks
 * ```
 */
export class CollisionEventTracker {
  private activePairs: Map<string, CollisionEvent> = new Map();
  private framePairs: Map<string, CollisionEvent> = new Map();
  private callbacks: CollisionCallback[] = [];

  onCollision(cb: CollisionCallback): this {
    this.callbacks.push(cb);
    return this;
  }

  /** Call at the start of each frame before reporting collisions */
  beginFrame(): void {
    this.framePairs.clear();
  }

  /** Report a collision between two entities this frame */
  reportCollision(a: Entity, b: Entity, overlapX = 0, overlapY = 0): void {
    const key = this.pairKey(a, b);
    this.framePairs.set(key, { entityA: a, entityB: b, overlapX, overlapY });
  }

  /** Call at the end of each frame to fire enter/stay/exit callbacks */
  endFrame(): void {
    // Check for enter and stay
    for (const [key, event] of this.framePairs) {
      if (this.activePairs.has(key)) {
        this.fire(event, 'stay');
      } else {
        this.fire(event, 'enter');
      }
    }

    // Check for exit
    for (const [key, event] of this.activePairs) {
      if (!this.framePairs.has(key)) {
        this.fire(event, 'exit');
      }
    }

    // Update active pairs
    this.activePairs = new Map(this.framePairs);
  }

  /** Get all currently active collision pairs */
  getActivePairs(): CollisionEvent[] {
    return Array.from(this.activePairs.values());
  }

  /** Check if two entities are currently colliding */
  areColliding(a: Entity, b: Entity): boolean {
    return this.activePairs.has(this.pairKey(a, b));
  }

  /** Clear all tracking */
  clear(): void {
    this.activePairs.clear();
    this.framePairs.clear();
  }

  private fire(event: CollisionEvent, phase: CollisionPhase): void {
    for (const cb of this.callbacks) cb(event, phase);
  }

  private pairKey(a: Entity, b: Entity): string {
    // Use consistent ordering so A-B === B-A
    const idA = a.x * 10000 + a.y;
    const idB = b.x * 10000 + b.y;
    return idA <= idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  }
}
