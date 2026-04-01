import type Phaser from 'phaser';
import type { ClikPlugin } from '../plugin/ClikPlugin';
import { PCGRegistry } from './PCGRegistry';
import { DungeonGenerator } from './generators/DungeonGenerator';
import { PlatformerGenerator } from './generators/PlatformerGenerator';
import { ArenaGenerator } from './generators/ArenaGenerator';
import { ReachabilityConstraint } from './constraints/ReachabilityConstraint';
import { EntityDensityConstraint } from './constraints/EntityDensityConstraint';
import { DifficultyConstraint } from './constraints/DifficultyConstraint';

/**
 * ClikPlugin wrapper that sets up the PCG registry with built-in generators and constraints.
 *
 * Usage:
 * ```
 * createGame({
 *   plugins: [{ plugin: new PCGPlugin() }],
 *   ...
 * });
 * ```
 */
export class PCGPlugin implements ClikPlugin {
  readonly name = 'PCGPlugin';
  readonly version = '1.0.0';

  readonly registry = new PCGRegistry();

  init(game: Phaser.Game): void {
    // Register built-in generators
    this.registry.registerGenerator('dungeon', new DungeonGenerator());
    this.registry.registerGenerator('platformer', new PlatformerGenerator());
    this.registry.registerGenerator('arena', new ArenaGenerator());

    // Register built-in constraints
    this.registry.registerConstraint('reachability', new ReachabilityConstraint());
    this.registry.registerConstraint('entity-density', new EntityDensityConstraint());
    this.registry.registerConstraint('difficulty', new DifficultyConstraint());

    // Expose globally in debug mode
    if (game.config.physics?.arcade?.debug || (game as unknown as Record<string, unknown>)['__debug']) {
      (globalThis as Record<string, unknown>).__CLIK_PCG = this.registry;
    }
  }

  destroy(): void {
    delete (globalThis as Record<string, unknown>).__CLIK_PCG;
  }
}
