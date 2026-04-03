import type { Entity } from '../entity/Entity';

export type TileEffectPhase = 'enter' | 'stay' | 'exit';

export interface TileEffectDef {
  /** Tile property name that triggers this effect (e.g., 'hazard', 'ice') */
  property: string;
  /** Expected property value (true, 'spike', etc.) */
  value?: unknown;
  /** Callback when entity is on this tile */
  onEnter?: (entity: Entity, tileX: number, tileY: number) => void;
  onStay?: (entity: Entity, tileX: number, tileY: number, delta: number) => void;
  onExit?: (entity: Entity, tileX: number, tileY: number) => void;
}

/**
 * Registers gameplay effects triggered by tile properties.
 * Check entities against tiles each frame for enter/stay/exit lifecycle.
 *
 * Usage:
 * ```
 * const effects = new TileEffects();
 * effects.register({
 *   property: 'hazard', value: true,
 *   onStay: (entity, tx, ty, delta) => entity.getComponent('health')?.damage(10 * delta / 1000),
 * });
 * effects.register({
 *   property: 'ice', value: true,
 *   onEnter: (entity) => entity.getComponent('movement')?.setFriction(0),
 *   onExit: (entity) => entity.getComponent('movement')?.setFriction(0.5),
 * });
 * // In update: effects.check(entity, getTilePropertiesAt(entity.x, entity.y), delta);
 * ```
 */
export class TileEffects {
  private effects: TileEffectDef[] = [];
  private entityTiles: Map<Entity, Set<string>> = new Map();

  /** Register a tile effect */
  register(def: TileEffectDef): this {
    this.effects.push(def);
    return this;
  }

  /** Remove all effects for a property */
  unregister(property: string): this {
    this.effects = this.effects.filter(e => e.property !== property);
    return this;
  }

  /**
   * Check an entity against tile properties at its position.
   * @param entity The entity to check
   * @param tileProperties Properties of the tile at entity's position
   * @param tileX Tile grid X
   * @param tileY Tile grid Y
   * @param delta Frame delta in ms
   */
  check(
    entity: Entity,
    tileProperties: Record<string, unknown>,
    tileX: number,
    tileY: number,
    delta: number,
  ): void {
    if (!this.entityTiles.has(entity)) {
      this.entityTiles.set(entity, new Set());
    }
    const activeTiles = this.entityTiles.get(entity)!;
    const currentlyActive = new Set<string>();

    for (const def of this.effects) {
      const propValue = tileProperties[def.property];
      const matches = def.value !== undefined ? propValue === def.value : !!propValue;

      const key = def.property;

      if (matches) {
        currentlyActive.add(key);
        if (!activeTiles.has(key)) {
          // Enter
          def.onEnter?.(entity, tileX, tileY);
        } else {
          // Stay
          def.onStay?.(entity, tileX, tileY, delta);
        }
      }
    }

    // Check exits
    for (const key of activeTiles) {
      if (!currentlyActive.has(key)) {
        const def = this.effects.find(e => e.property === key);
        def?.onExit?.(entity, tileX, tileY);
      }
    }

    this.entityTiles.set(entity, currentlyActive);
  }

  /** Remove tracking for an entity (call on entity destroy) */
  removeEntity(entity: Entity): void {
    this.entityTiles.delete(entity);
  }

  /** Get all registered effect properties */
  getRegisteredProperties(): string[] {
    return this.effects.map(e => e.property);
  }

  /** Clear all effects */
  clear(): void {
    this.effects.length = 0;
    this.entityTiles.clear();
  }

  get effectCount(): number {
    return this.effects.length;
  }
}
