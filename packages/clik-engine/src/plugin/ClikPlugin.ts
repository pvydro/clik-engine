import type Phaser from 'phaser';
import type { BaseScene } from '../scenes/BaseScene';

/**
 * Interface for engine-level plugins.
 * Plugins are initialized once when the game boots and destroyed when the game shuts down.
 */
export interface ClikPlugin {
  /** Unique plugin name */
  readonly name: string;
  /** Semver version string */
  readonly version: string;
  /** Optional: names of plugins this depends on (must be loaded first) */
  readonly dependencies?: string[];

  /** Called once after the game boots */
  init(game: Phaser.Game, config?: unknown): void;
  /** Called when the game is being destroyed */
  destroy(): void;
}

/**
 * Interface for scene-aware plugins.
 * Receives lifecycle hooks for every BaseScene in the game.
 */
export interface ClikScenePlugin extends ClikPlugin {
  /** Called after each scene's create() */
  onSceneCreate?(scene: BaseScene): void;
  /** Called each frame during scene update */
  onSceneUpdate?(scene: BaseScene, time: number, delta: number): void;
  /** Called when a scene shuts down */
  onSceneShutdown?(scene: BaseScene): void;
}

/**
 * Plugin configuration for ClikGameConfig.plugins
 */
export interface ClikPluginConfig {
  plugin: ClikPlugin | ClikScenePlugin;
  config?: unknown;
}

/** Type guard to check if a plugin has scene hooks */
export function isScenePlugin(plugin: ClikPlugin): plugin is ClikScenePlugin {
  const p = plugin as ClikScenePlugin;
  return typeof p.onSceneCreate === 'function' ||
         typeof p.onSceneUpdate === 'function' ||
         typeof p.onSceneShutdown === 'function';
}
