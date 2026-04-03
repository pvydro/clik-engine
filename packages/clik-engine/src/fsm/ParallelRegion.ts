import type { HierarchicalStateMachine, FSMEvent } from './HierarchicalStateMachine';

/**
 * Runs multiple state machines simultaneously in parallel regions.
 * Useful for: locomotion + combat + item-use running at the same time.
 *
 * Usage:
 * ```
 * const parallel = new ParallelRegion(context, 'player');
 * parallel.addRegion('locomotion', locomotionFSM);
 * parallel.addRegion('combat', combatFSM);
 * parallel.start();
 * // In update loop:
 * parallel.update(delta);
 * ```
 */
export class ParallelRegion<TContext = unknown> {
  private regions: Map<string, HierarchicalStateMachine<TContext>> = new Map();
  private debugLabel: string;

  constructor(debugLabel = 'parallel') {
    this.debugLabel = debugLabel;
  }

  /** Add a region */
  addRegion(name: string, fsm: HierarchicalStateMachine<TContext>): this {
    this.regions.set(name, fsm);
    return this;
  }

  /** Remove a region */
  removeRegion(name: string): this {
    this.regions.delete(name);
    return this;
  }

  /** Update all regions */
  update(delta: number): void {
    for (const region of this.regions.values()) {
      region.update(delta);
    }
  }

  /** Send an event to all regions */
  sendEvent(event: FSMEvent): void {
    for (const region of this.regions.values()) {
      region.sendEvent(event);
    }
  }

  /** Get a specific region */
  getRegion(name: string): HierarchicalStateMachine<TContext> | undefined {
    return this.regions.get(name);
  }

  /** Get the current state of a specific region */
  getRegionState(name: string): string | null {
    return this.regions.get(name)?.getCurrent() ?? null;
  }

  /** Check if any region has a given tag */
  hasTag(tag: string): boolean {
    for (const region of this.regions.values()) {
      if (region.hasTag(tag)) return true;
    }
    return false;
  }

  /** Get all tags across all regions */
  getTags(): string[] {
    const tags: string[] = [];
    for (const region of this.regions.values()) {
      tags.push(...region.getTags());
    }
    return tags;
  }

  /** Cross-region guard: check if a region is in a specific state */
  isRegionInState(regionName: string, stateName: string): boolean {
    return this.regions.get(regionName)?.is(stateName) ?? false;
  }

  /** Get all region names */
  getRegionNames(): string[] {
    return Array.from(this.regions.keys());
  }

  /** Get debug state for all regions */
  getDebugState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const [name, region] of this.regions) {
      state[name] = region.getDebugState();
    }
    return state;
  }

  /** Destroy all regions */
  destroy(): void {
    this.regions.clear();
  }
}
