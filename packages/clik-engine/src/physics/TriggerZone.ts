import type { Entity } from '../entity/Entity';
import type { EntityRegistry } from '../entity/EntityRegistry';

export type TriggerShape = 'aabb' | 'circle';

export interface TriggerZoneConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  shape?: TriggerShape;
  /** Only trigger for entities with these tags */
  filterTags?: string[];
  /** Only trigger for entities of these types */
  filterTypes?: string[];
}

export type TriggerCallback = (entity: Entity) => void;

/**
 * Non-physical collision area with enter/stay/exit lifecycle.
 * Does not apply forces — purely detection-based.
 *
 * Usage:
 * ```
 * const zone = new TriggerZone({
 *   x: 100, y: 200, width: 64, height: 64, shape: 'aabb',
 *   filterTags: ['player'],
 * });
 * zone.onEnter(entity => console.log('entered'));
 * zone.onExit(entity => console.log('exited'));
 * zone.update(registry); // call each frame
 * ```
 */
export class TriggerZone {
  private config: Required<Pick<TriggerZoneConfig, 'x' | 'y' | 'shape'>> & TriggerZoneConfig;
  private inside: Set<Entity> = new Set();
  private enterCallbacks: TriggerCallback[] = [];
  private stayCallbacks: TriggerCallback[] = [];
  private exitCallbacks: TriggerCallback[] = [];
  private _enabled = true;

  constructor(config: TriggerZoneConfig) {
    this.config = {
      shape: 'aabb',
      width: 0,
      height: 0,
      radius: 0,
      ...config,
    };
  }

  onEnter(cb: TriggerCallback): this { this.enterCallbacks.push(cb); return this; }
  onStay(cb: TriggerCallback): this { this.stayCallbacks.push(cb); return this; }
  onExit(cb: TriggerCallback): this { this.exitCallbacks.push(cb); return this; }

  /** Check all entities against this zone. Call each frame. */
  update(registry: EntityRegistry): void {
    if (!this._enabled) return;

    const candidates = registry.isSpatialEnabled
      ? registry.getNearby(this.config.x, this.config.y, Math.max(this.config.width ?? 0, this.config.height ?? 0, this.config.radius ?? 0) + 100)
      : registry.getAll();

    const currentlyInside = new Set<Entity>();

    for (const entity of candidates) {
      if (!entity.active) continue;
      if (!this.passesFilter(entity)) continue;

      if (this.contains(entity.x, entity.y)) {
        currentlyInside.add(entity);

        if (!this.inside.has(entity)) {
          // Enter
          for (const cb of this.enterCallbacks) cb(entity);
        } else {
          // Stay
          for (const cb of this.stayCallbacks) cb(entity);
        }
      }
    }

    // Check exits
    for (const entity of this.inside) {
      if (!currentlyInside.has(entity)) {
        for (const cb of this.exitCallbacks) cb(entity);
      }
    }

    this.inside = currentlyInside;
  }

  /** Check if a point is inside this zone */
  contains(px: number, py: number): boolean {
    if (this.config.shape === 'circle') {
      const dx = px - this.config.x;
      const dy = py - this.config.y;
      return dx * dx + dy * dy <= (this.config.radius ?? 0) * (this.config.radius ?? 0);
    }
    // AABB
    const hw = (this.config.width ?? 0) / 2;
    const hh = (this.config.height ?? 0) / 2;
    return px >= this.config.x - hw && px <= this.config.x + hw &&
           py >= this.config.y - hh && py <= this.config.y + hh;
  }

  /** Move the zone */
  setPosition(x: number, y: number): this {
    this.config.x = x;
    this.config.y = y;
    return this;
  }

  /** Resize the zone */
  setSize(width: number, height: number): this {
    this.config.width = width;
    this.config.height = height;
    return this;
  }

  setRadius(radius: number): this {
    this.config.radius = radius;
    return this;
  }

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) {
    this._enabled = v;
    if (!v) {
      // Fire exit for all inside entities
      for (const entity of this.inside) {
        for (const cb of this.exitCallbacks) cb(entity);
      }
      this.inside.clear();
    }
  }

  /** Get entities currently inside */
  getEntitiesInside(): Entity[] {
    return Array.from(this.inside);
  }

  get entityCount(): number {
    return this.inside.size;
  }

  private passesFilter(entity: Entity): boolean {
    if (this.config.filterTags && this.config.filterTags.length > 0) {
      if (!this.config.filterTags.some(tag => entity.hasTag(tag))) return false;
    }
    if (this.config.filterTypes && this.config.filterTypes.length > 0) {
      if (!this.config.filterTypes.includes(entity.entityType)) return false;
    }
    return true;
  }
}
