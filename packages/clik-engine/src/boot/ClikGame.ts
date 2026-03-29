import Phaser from 'phaser';
import type { ClikGameConfig } from '../utils/types';
import { getScaleConfig } from './defaults';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { DebugOverlay } from '../debug/DebugOverlay';
import { StateInspector } from '../debug/StateInspector';
import { GridOverlay } from '../debug/GridOverlay';

export function createGame(config: ClikGameConfig): Phaser.Game {
  ConsoleReporter.engine(`Creating game: ${config.name}`);

  // Startup validation
  if (!config.scenes.length) {
    ConsoleReporter.error('No scenes defined in ClikGameConfig', 'Add at least one scene to the scenes array.');
  }
  const sceneKeys = config.scenes.map(s => s.key);
  const duplicateKeys = sceneKeys.filter((k, i) => sceneKeys.indexOf(k) !== i);
  if (duplicateKeys.length > 0) {
    ConsoleReporter.error(`Duplicate scene keys: ${duplicateKeys.join(', ')}`, 'Each scene must have a unique key.');
  }
  if (config.devStartScene && !sceneKeys.includes(config.devStartScene)) {
    ConsoleReporter.error(
      `devStartScene '${config.devStartScene}' not found in scenes`,
      `Available scenes: ${sceneKeys.join(', ')}`
    );
  }

  const scalePreset = config.scale ?? 'auto';
  const scaleConfig = getScaleConfig(scalePreset);
  const debug = config.debug ?? false;

  const defaultScene = config.devStartScene
    ?? config.scenes.find(s => s.default)?.key
    ?? config.scenes[0]?.key;

  const scenes = config.scenes.map(entry => entry.class) as unknown as Phaser.Types.Scenes.SceneType[];

  // Add debug scenes when debug mode is on
  if (debug) {
    scenes.push(DebugOverlay, StateInspector, GridOverlay);
  }

  const physicsConfig: Phaser.Types.Core.PhysicsConfig = {};
  if (config.physics === 'arcade') {
    physicsConfig.default = 'arcade';
    physicsConfig.arcade = {
      gravity: { x: 0, y: 0 },
      debug,
    };
  } else if (config.physics === 'matter') {
    physicsConfig.default = 'matter';
    physicsConfig.matter = {
      gravity: { x: 0, y: 0 },
      debug,
    };
  }

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: config.parent ?? 'game',
    width: config.width ?? scaleConfig.width,
    height: config.height ?? scaleConfig.height,
    backgroundColor: config.backgroundColor ?? '#000000',
    scale: {
      mode: scaleConfig.mode,
      autoCenter: scaleConfig.autoCenter,
      expandParent: true,
      parent: config.parent ?? 'game',
    },
    physics: physicsConfig,
    scene: scenes,
    pixelArt: config.pixelArt ?? false,
  };

  const game = new Phaser.Game(phaserConfig);

  // Store clik config on the game instance for access from scenes
  (game as ClikGameInstance).__clikConfig = config;

  // Expose game globally in dev for debugging
  if (debug) {
    (globalThis as Record<string, unknown>).__CLIK_GAME = game;
  }

  game.events.once(Phaser.Core.Events.READY, () => {
    // Launch debug overlay scenes in parallel (they render on top)
    if (debug) {
      game.scene.start('__clik_debug_overlay');
      game.scene.start('__clik_state_inspector');
      game.scene.start('__clik_grid_overlay');
      // Keep debug scenes on top
      game.scene.bringToTop('__clik_debug_overlay');
      game.scene.bringToTop('__clik_state_inspector');
    }

    if (defaultScene && defaultScene !== config.scenes[0]?.key) {
      // Jump to devStartScene if specified
      ConsoleReporter.engine(`Jumping to devStartScene: ${defaultScene}`);
      game.scene.start(defaultScene);
    }
  });

  ConsoleReporter.engine('Game created', {
    scale: scalePreset,
    physics: config.physics ?? 'none',
    debug,
    scenes: config.scenes.map(s => s.key),
    defaultScene,
  });

  return game;
}

export interface ClikGameInstance extends Phaser.Game {
  __clikConfig: ClikGameConfig;
}
