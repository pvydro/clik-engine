export interface BiomeDef {
  name: string;
  /** Tile palette: maps TileType to visual tile indices */
  tilePalette: Record<string, number>;
  /** Enemy types available in this biome */
  enemyTypes: string[];
  /** Hazard types in this biome */
  hazardTypes?: string[];
  /** Ambient color tint (hex) */
  ambientColor?: number;
  /** Music key for this biome */
  musicKey?: string;
}

export interface BiomeConfig {
  /** Available biomes */
  biomes?: BiomeDef[];
  /** How many tiles for transition zones between biomes */
  transitionWidth?: number;
}

/**
 * Biome system for themed level variation.
 * Assigns biomes to level regions and handles transitions.
 *
 * Usage:
 * ```
 * const biomes = new BiomeGenerator({
 *   biomes: [
 *     { name: 'forest', tilePalette: { floor: 10, wall: 11 }, enemyTypes: ['wolf', 'bear'] },
 *     { name: 'cave', tilePalette: { floor: 20, wall: 21 }, enemyTypes: ['bat', 'spider'] },
 *   ],
 * });
 * const biome = biomes.getBiomeForRegion(regionX, totalRegions);
 * const tileIndex = biome.tilePalette['floor'];
 * ```
 */
export class BiomeGenerator {
  private config: Required<BiomeConfig>;

  constructor(config?: BiomeConfig) {
    this.config = {
      biomes: config?.biomes ?? [
        { name: 'plains', tilePalette: { floor: 1, wall: 2 }, enemyTypes: ['slime'] },
      ],
      transitionWidth: config?.transitionWidth ?? 3,
    };
  }

  /** Get biome for a region index (cycles through available biomes) */
  getBiomeForRegion(regionIndex: number, _totalRegions?: number): BiomeDef {
    const idx = regionIndex % this.config.biomes.length;
    return this.config.biomes[idx];
  }

  /** Get biome by name */
  getBiome(name: string): BiomeDef | undefined {
    return this.config.biomes.find(b => b.name === name);
  }

  /** Check if two region indices are in a transition zone */
  isTransitionZone(tileX: number, regionWidth: number): boolean {
    const posInRegion = tileX % regionWidth;
    return posInRegion < this.config.transitionWidth ||
           posInRegion >= regionWidth - this.config.transitionWidth;
  }

  /**
   * Get blended biome for a tile in a transition zone.
   * Returns the two biomes and a blend factor (0-1).
   */
  getTransitionBlend(
    tileX: number,
    regionWidth: number,
    totalRegions: number,
  ): { biomeA: BiomeDef; biomeB: BiomeDef; blend: number } | null {
    if (!this.isTransitionZone(tileX, regionWidth)) return null;

    const regionIndex = Math.floor(tileX / regionWidth);
    const posInRegion = tileX % regionWidth;

    const biomeA = this.getBiomeForRegion(regionIndex, totalRegions);

    if (posInRegion < this.config.transitionWidth) {
      // Left edge — blend with previous region
      const biomeB = this.getBiomeForRegion(Math.max(0, regionIndex - 1), totalRegions);
      const blend = posInRegion / this.config.transitionWidth;
      return { biomeA: biomeB, biomeB: biomeA, blend };
    } else {
      // Right edge — blend with next region
      const biomeB = this.getBiomeForRegion(regionIndex + 1, totalRegions);
      const blend = (posInRegion - (regionWidth - this.config.transitionWidth)) / this.config.transitionWidth;
      return { biomeA, biomeB, blend };
    }
  }

  /** Get all available biome names */
  getBiomeNames(): string[] {
    return this.config.biomes.map(b => b.name);
  }

  /** Get enemy types for a biome */
  getEnemyTypes(biomeName: string): string[] {
    return this.getBiome(biomeName)?.enemyTypes ?? [];
  }

  /** Get all biomes */
  getAllBiomes(): readonly BiomeDef[] {
    return this.config.biomes;
  }

  get biomeCount(): number {
    return this.config.biomes.length;
  }
}
