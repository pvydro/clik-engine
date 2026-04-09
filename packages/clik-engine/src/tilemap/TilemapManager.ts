import type Phaser from 'phaser';
import { ConsoleReporter } from '../debug/ConsoleReporter';

export interface TilemapConfig {
  /** Key used in AssetManifest for the Tiled JSON */
  key: string;
  /** Map of tileset name (in Tiled) → texture key (in Phaser) */
  tilesets: Record<string, string>;
}

export interface SpawnPoint {
  name: string;
  x: number;
  y: number;
  type?: string;
  properties?: Record<string, unknown>;
}

export class TilemapManager {
  private scene: Phaser.Scene;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layers: Map<string, Phaser.Tilemaps.TilemapLayer> = new Map();
  private tilesets: Phaser.Tilemaps.Tileset[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Load and create a tilemap from a Tiled JSON asset.
   */
  load(config: TilemapConfig): Phaser.Tilemaps.Tilemap {
    this.map = this.scene.make.tilemap({ key: config.key });

    for (const [tilesetName, textureKey] of Object.entries(config.tilesets)) {
      const tileset = this.map.addTilesetImage(tilesetName, textureKey);
      if (tileset) {
        this.tilesets.push(tileset);
      } else {
        ConsoleReporter.error(
          `Tileset '${tilesetName}' not found in map '${config.key}'`,
          `Check that the tileset name matches what's in your Tiled file.`
        );
      }
    }

    ConsoleReporter.engine(`Tilemap loaded: ${config.key}`, {
      width: this.map.width,
      height: this.map.height,
      tileWidth: this.map.tileWidth,
      tileHeight: this.map.tileHeight,
      layers: this.map.layers.map(l => l.name),
    });

    return this.map;
  }

  /**
   * Create a visible tile layer from the map.
   */
  createLayer(layerName: string, depth?: number): Phaser.Tilemaps.TilemapLayer | null {
    if (!this.map) {
      ConsoleReporter.error('No tilemap loaded', 'Call tilemapManager.load(config) before accessing tilemap features.');
      return null;
    }

    const layer = this.map.createLayer(layerName, this.tilesets);
    if (!layer) {
      ConsoleReporter.error(
        `Layer '${layerName}' not found in tilemap`,
        `Available layers: ${this.map.layers.map(l => l.name).join(', ')}`
      );
      return null;
    }

    if (depth !== undefined) {
      layer.setDepth(depth);
    }

    this.layers.set(layerName, layer);
    ConsoleReporter.engine(`Tile layer created: ${layerName}`);
    return layer;
  }

  /**
   * Set collision on a layer by tile property or index range.
   */
  setCollision(layerName: string, options?: {
    /** Collide on tiles with this property set to true in Tiled */
    property?: string;
    /** Collide on specific tile indices */
    indices?: number[];
    /** Collide on all non-empty tiles */
    all?: boolean;
  }): void {
    const layer = this.layers.get(layerName);
    if (!layer) {
      ConsoleReporter.error(`Layer '${layerName}' not found for collision setup`);
      return;
    }

    if (options?.all) {
      layer.setCollisionByExclusion([-1]);
    } else if (options?.property) {
      layer.setCollisionByProperty({ [options.property]: true });
    } else if (options?.indices) {
      layer.setCollision(options.indices);
    } else {
      // Default: collide all non-empty
      layer.setCollisionByExclusion([-1]);
    }

    ConsoleReporter.engine(`Collision set on layer: ${layerName}`);
  }

  /**
   * Add arcade physics collision between a game object and a tile layer.
   */
  addCollider(
    layerName: string,
    object: Phaser.GameObjects.GameObject | Phaser.GameObjects.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): Phaser.Physics.Arcade.Collider | null {
    const layer = this.layers.get(layerName);
    if (!layer || !this.scene.physics) return null;
    return this.scene.physics.add.collider(object, layer, callback);
  }

  /**
   * Get spawn points from a Tiled object layer.
   */
  getSpawnPoints(objectLayerName: string): SpawnPoint[] {
    if (!this.map) return [];

    const objectLayer = this.map.getObjectLayer(objectLayerName);
    if (!objectLayer) {
      ConsoleReporter.error(
        `Object layer '${objectLayerName}' not found`,
        `Available object layers: ${this.map.objects.map(o => o.name).join(', ')}`
      );
      return [];
    }

    return objectLayer.objects.map(obj => {
      const props: Record<string, unknown> = {};
      if (obj.properties) {
        for (const prop of obj.properties as Array<{ name: string; value: unknown }>) {
          props[prop.name] = prop.value;
        }
      }

      return {
        name: obj.name,
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        type: obj.type,
        properties: props,
      };
    });
  }

  /**
   * Get a single spawn point by name.
   */
  getSpawnPoint(objectLayerName: string, name: string): SpawnPoint | null {
    return this.getSpawnPoints(objectLayerName).find(sp => sp.name === name) ?? null;
  }

  /**
   * Get the tilemap's world bounds (useful for camera bounds).
   */
  getWorldBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.map) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: 0,
      y: 0,
      width: this.map.widthInPixels,
      height: this.map.heightInPixels,
    };
  }

  /** Get a layer by name */
  getLayer(name: string): Phaser.Tilemaps.TilemapLayer | undefined {
    return this.layers.get(name);
  }

  /** Get the raw Phaser tilemap */
  getMap(): Phaser.Tilemaps.Tilemap | null {
    return this.map;
  }

  /** Get tile at world position */
  getTileAt(layerName: string, worldX: number, worldY: number): Phaser.Tilemaps.Tile | null {
    const layer = this.layers.get(layerName);
    if (!layer) return null;
    return layer.getTileAtWorldXY(worldX, worldY);
  }

  /**
   * Set parallax scroll factor on a layer for depth effect.
   * Values < 1 scroll slower (background), > 1 scroll faster (foreground).
   */
  setParallax(layerName: string, scrollFactorX: number, scrollFactorY?: number): void {
    const layer = this.layers.get(layerName);
    if (!layer) {
      ConsoleReporter.error(`Layer '${layerName}' not found for parallax`);
      return;
    }
    layer.setScrollFactor(scrollFactorX, scrollFactorY ?? scrollFactorX);
    ConsoleReporter.engine(`Parallax set on '${layerName}': ${scrollFactorX}`);
  }

  /** Set depth (z-order) on a layer */
  setLayerDepth(layerName: string, depth: number): void {
    const layer = this.layers.get(layerName);
    if (layer) layer.setDepth(depth);
  }

  /** Set alpha on a layer */
  setLayerAlpha(layerName: string, alpha: number): void {
    const layer = this.layers.get(layerName);
    if (layer) layer.setAlpha(alpha);
  }

  /** Get all layer names */
  getLayerNames(): string[] {
    return Array.from(this.layers.keys());
  }

  /** Replace a tile at a grid position */
  replaceTile(layerName: string, tileX: number, tileY: number, newIndex: number): void {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.putTileAt(newIndex, tileX, tileY);
    }
  }

  /** Remove a tile at a grid position */
  removeTile(layerName: string, tileX: number, tileY: number): void {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.removeTileAt(tileX, tileY);
    }
  }

  /** Check if a tile at a position has a specific property */
  tileHasProperty(layerName: string, worldX: number, worldY: number, property: string): boolean {
    const tile = this.getTileAt(layerName, worldX, worldY);
    if (!tile) return false;
    return tile.properties?.[property] === true;
  }
}
