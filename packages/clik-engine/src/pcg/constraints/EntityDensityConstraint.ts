import type { LevelConstraint, GeneratedLevel, PCGConfig, ConstraintResult } from '../PCGTypes';

/**
 * Checks that no grid region has too many entities.
 * Prevents unplayable clusters of enemies.
 */
export class EntityDensityConstraint implements LevelConstraint {
  readonly name = 'entity-density';
  private regionSize: number;
  private maxPerRegion: number;

  constructor(regionSize = 8, maxPerRegion = 4) {
    this.regionSize = regionSize;
    this.maxPerRegion = maxPerRegion;
  }

  validate(level: GeneratedLevel, _config: PCGConfig): ConstraintResult {
    const regions = this.getRegionCounts(level);
    const overloaded = Array.from(regions.entries()).filter(([, count]) => count > this.maxPerRegion);

    if (overloaded.length === 0) {
      return { passed: true, message: 'Entity density within limits' };
    }

    return {
      passed: false,
      message: `${overloaded.length} region(s) exceed max ${this.maxPerRegion} entities`,
      details: overloaded.map(([key, count]) => ({ region: key, count })),
    };
  }

  repair(level: GeneratedLevel, _config: PCGConfig): GeneratedLevel {
    const regions = this.getRegionCounts(level);
    const spawnDist = (e: { x: number; y: number }) =>
      Math.abs(e.x - level.spawn.x) + Math.abs(e.y - level.spawn.y);

    for (const [regionKey, count] of regions) {
      if (count <= this.maxPerRegion) continue;
      const [rx, ry] = regionKey.split(',').map(Number);
      const regionX = rx * this.regionSize;
      const regionY = ry * this.regionSize;

      // Find entities in this region, sort by distance from spawn (farthest first)
      const inRegion = level.entities
        .filter(e =>
          e.x >= regionX && e.x < regionX + this.regionSize &&
          e.y >= regionY && e.y < regionY + this.regionSize,
        )
        .sort((a, b) => spawnDist(b) - spawnDist(a));

      // Remove excess
      const excess = count - this.maxPerRegion;
      for (let i = 0; i < excess && i < inRegion.length; i++) {
        const idx = level.entities.indexOf(inRegion[i]);
        if (idx !== -1) level.entities.splice(idx, 1);
      }
    }

    return level;
  }

  private getRegionCounts(level: GeneratedLevel): Map<string, number> {
    const regions = new Map<string, number>();
    for (const entity of level.entities) {
      const rx = Math.floor(entity.x / this.regionSize);
      const ry = Math.floor(entity.y / this.regionSize);
      const key = `${rx},${ry}`;
      regions.set(key, (regions.get(key) ?? 0) + 1);
    }
    return regions;
  }
}
