import type Phaser from 'phaser';
import type { BaseScene } from '../scenes/BaseScene';
import { Entity } from '../entity/Entity';
import { TileType } from './PCGTypes';
import type { GeneratedLevel } from './PCGTypes';

/** Configuration for how TileType maps to tileset indices */
export interface ApplierConfig {
  tileSize?: number;
  tilesetKey?: string;
  tilesetImage?: string;
  /** Maps TileType enum values to tileset frame indices */
  tileMapping?: Partial<Record<TileType, number>>;
}

const DEFAULT_TILE_SIZE = 32;

const DEFAULT_TILE_MAPPING: Record<TileType, number> = {
  [TileType.EMPTY]: -1,
  [TileType.FLOOR]: 0,
  [TileType.WALL]: 1,
  [TileType.DOOR]: 2,
  [TileType.SPAWN]: 0,
  [TileType.EXIT]: 3,
  [TileType.HAZARD]: 4,
  [TileType.PLATFORM]: 5,
  [TileType.DECORATION]: 6,
};

/**
 * Applies a GeneratedLevel to a Phaser scene.
 * This is the only PCG file with a Phaser dependency.
 */
export class LevelApplier {
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private spawnedEntities: Entity[] = [];

  /**
   * Create a Phaser tilemap from the generated level grid.
   * Requires a tileset image to be preloaded in the scene.
   */
  applyToTilemap(level: GeneratedLevel, scene: BaseScene, config?: ApplierConfig): Phaser.Tilemaps.Tilemap | null {
    const tileSize = config?.tileSize ?? DEFAULT_TILE_SIZE;
    const tilesetKey = config?.tilesetKey ?? 'pcg-tileset';
    const mapping = { ...DEFAULT_TILE_MAPPING, ...config?.tileMapping };

    // Create tilemap data from Grid2D
    const mapData: number[][] = [];
    for (let y = 0; y < level.grid.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < level.grid.width; x++) {
        const tile = level.grid.get(x, y) ?? TileType.EMPTY;
        row.push(mapping[tile] ?? -1);
      }
      mapData.push(row);
    }

    // Build Phaser tilemap
    this.tilemap = scene.make.tilemap({
      data: mapData,
      tileWidth: tileSize,
      tileHeight: tileSize,
    });

    const tileset = this.tilemap.addTilesetImage('tiles', tilesetKey, tileSize, tileSize);
    if (tileset) {
      this.layer = this.tilemap.createLayer(0, tileset, 0, 0);
      // Mark wall tiles as colliding
      const wallIndex = mapping[TileType.WALL];
      if (wallIndex >= 0 && this.layer) {
        this.layer.setCollision(wallIndex);
      }
    }

    return this.tilemap;
  }

  /**
   * Spawn entities from the level's entity placement array.
   * Uses scene's EntityFactory if available, otherwise creates basic Entity instances.
   */
  applyEntities(level: GeneratedLevel, scene: BaseScene): Entity[] {
    const tileSize = DEFAULT_TILE_SIZE;
    this.spawnedEntities = [];

    // Try to use EntityFactory from scene's entity registry
    const registry = scene.getEntityRegistry();
    const factory = registry ? (registry as unknown as Record<string, unknown>)['factory'] as { create?: (type: string, x: number, y: number) => Entity } : undefined;

    for (const placement of level.entities) {
      const worldX = placement.x * tileSize + tileSize / 2;
      const worldY = placement.y * tileSize + tileSize / 2;

      let entity: Entity;
      if (factory?.create) {
        try {
          entity = factory.create(placement.type, worldX, worldY);
        } catch {
          entity = new Entity(scene, worldX, worldY);
          entity.entityType = placement.type;
        }
      } else {
        entity = new Entity(scene, worldX, worldY);
        entity.entityType = placement.type;
      }

      if (placement.properties) {
        entity.setData('pcg_properties', placement.properties);
      }

      this.spawnedEntities.push(entity);
    }

    return this.spawnedEntities;
  }

  /** Remove all tilemap layers and spawned entities */
  clearLevel(scene: BaseScene): void {
    for (const entity of this.spawnedEntities) {
      entity.destroy();
    }
    this.spawnedEntities = [];

    if (this.layer) {
      this.layer.destroy();
      this.layer = null;
    }
    if (this.tilemap) {
      this.tilemap.destroy();
      this.tilemap = null;
    }

    // Clear entity registry if present
    const registry = scene.getEntityRegistry();
    if (registry) {
      registry.clear();
    }
  }
}
