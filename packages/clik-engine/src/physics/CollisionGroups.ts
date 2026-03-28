/**
 * Named collision categories for organized physics interactions.
 * Uses bitfield categories — each group is a power of 2.
 *
 * Usage:
 * ```
 * const groups = new CollisionGroups();
 * const PLAYER = groups.create('player');
 * const ENEMY = groups.create('enemy');
 * const BULLET = groups.create('bullet');
 *
 * // Bullets collide with enemies but not players
 * groups.setCollides('bullet', ['enemy']);
 * ```
 */
export class CollisionGroups {
  private categories: Map<string, number> = new Map();
  private nextBit = 0;
  private collisionMasks: Map<string, number> = new Map();

  /** Create a new collision category. Returns the category bitmask. */
  create(name: string): number {
    if (this.nextBit >= 32) {
      throw new Error('CollisionGroups: maximum 32 categories reached');
    }
    const category = 1 << this.nextBit;
    this.categories.set(name, category);
    this.collisionMasks.set(name, 0xffffffff); // Collides with everything by default
    this.nextBit++;
    return category;
  }

  /** Get the category bitmask for a named group */
  get(name: string): number {
    return this.categories.get(name) ?? 0;
  }

  /** Set which groups a category collides with */
  setCollides(name: string, collidesWithNames: string[]): void {
    let mask = 0;
    for (const other of collidesWithNames) {
      const cat = this.categories.get(other);
      if (cat) mask |= cat;
    }
    this.collisionMasks.set(name, mask);
  }

  /** Add collision with another group */
  addCollision(name: string, otherName: string): void {
    const current = this.collisionMasks.get(name) ?? 0;
    const otherCat = this.categories.get(otherName) ?? 0;
    this.collisionMasks.set(name, current | otherCat);
  }

  /** Remove collision with another group */
  removeCollision(name: string, otherName: string): void {
    const current = this.collisionMasks.get(name) ?? 0;
    const otherCat = this.categories.get(otherName) ?? 0;
    this.collisionMasks.set(name, current & ~otherCat);
  }

  /** Get the collision mask for a category */
  getMask(name: string): number {
    return this.collisionMasks.get(name) ?? 0xffffffff;
  }

  /**
   * Get category + mask pair for use with Matter.js collisionFilter.
   * Returns { category, mask } for Body.collisionFilter.
   */
  getFilter(name: string): { category: number; mask: number } {
    return {
      category: this.categories.get(name) ?? 0,
      mask: this.collisionMasks.get(name) ?? 0xffffffff,
    };
  }

  /** Check if two groups can collide */
  canCollide(nameA: string, nameB: string): boolean {
    const catA = this.categories.get(nameA) ?? 0;
    const catB = this.categories.get(nameB) ?? 0;
    const maskA = this.collisionMasks.get(nameA) ?? 0;
    const maskB = this.collisionMasks.get(nameB) ?? 0;
    return (catA & maskB) !== 0 && (catB & maskA) !== 0;
  }

  /** List all registered category names */
  getNames(): string[] {
    return Array.from(this.categories.keys());
  }
}
