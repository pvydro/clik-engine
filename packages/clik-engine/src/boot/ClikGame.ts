import Phaser from 'phaser';
import type { ClikGameConfig, ScalePresetType, PhysicsType } from '../utils/types';
import { getScaleConfig } from './defaults';
import { ConsoleReporter } from '../debug/ConsoleReporter';
import { DebugOverlay } from '../debug/DebugOverlay';
import { StateInspector } from '../debug/StateInspector';
import { GridOverlay } from '../debug/GridOverlay';
import { DebugConsole } from '../debug/DebugConsole';
import {
  validateNonEmptyString,
  validatePositiveNumber,
  validateEnum,
  validateHexColor,
  validatePositiveInt,
} from '../utils/validation';
import { InputManager } from '../input/InputManager';
import { PluginManager } from '../plugin/PluginManager';

const VALID_SCALES: readonly ScalePresetType[] = ['mobile-portrait', 'mobile-landscape', 'desktop', 'auto'];
const VALID_PHYSICS: readonly PhysicsType[] = ['arcade', 'matter', 'none'];

export function createGame(config: ClikGameConfig): Phaser.Game {
  ConsoleReporter.engine(`Creating game: ${config.name}`);

  // Config validation
  validateNonEmptyString(config.name, 'name', 'ClikGameConfig');

  if (!config.scenes || !config.scenes.length) {
    ConsoleReporter.error('No scenes defined in ClikGameConfig', 'Add at least one scene to the scenes array.');
  }

  for (const entry of config.scenes) {
    validateNonEmptyString(entry.key, 'scenes[].key', 'ClikGameConfig');
    if (!entry.class) {
      ConsoleReporter.error(
        `Scene '${entry.key}' is missing a class`,
        'Each scene entry must have a class that extends Phaser.Scene.'
      );
    }
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

  if (config.width !== undefined) validatePositiveNumber(config.width, 'width', 'ClikGameConfig');
  if (config.height !== undefined) validatePositiveNumber(config.height, 'height', 'ClikGameConfig');
  if (config.scale !== undefined) validateEnum(config.scale, VALID_SCALES, 'scale', 'ClikGameConfig');
  if (config.physics !== undefined) validateEnum(config.physics, VALID_PHYSICS, 'physics', 'ClikGameConfig');
  if (config.backgroundColor !== undefined) validateHexColor(config.backgroundColor, 'backgroundColor', 'ClikGameConfig');

  if (config.save) {
    if (config.save.slots !== undefined) validatePositiveInt(config.save.slots, 'save.slots', 'ClikGameConfig');
    if (config.save.version !== undefined) validatePositiveInt(config.save.version, 'save.version', 'ClikGameConfig');
  }

  const scalePreset = config.scale ?? 'auto';
  const scaleConfig = getScaleConfig(scalePreset);
  const debug = config.debug ?? false;

  const defaultScene = config.devStartScene
    ?? config.scenes.find(s => s.default)?.key
    ?? config.scenes[0]?.key;

  // Phaser's SceneType doesn't perfectly match our constructor signature — this
  // boundary cast is intentional and the only place we bridge clik → Phaser types.
  const scenes = config.scenes.map(entry => entry.class) as unknown as Phaser.Types.Scenes.SceneType[];

  // Add debug scenes when debug mode is on
  if (debug) {
    (scenes as unknown[]).push(DebugOverlay, StateInspector, GridOverlay, DebugConsole);
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

  // Store clik config in Phaser's registry for access from scenes
  game.registry.set('__clikConfig', config);

  // Create game-level InputManager immediately (before any scene create)
  const inputManager = new InputManager(config.input);
  game.registry.set('__clikInputManager', inputManager);

  // Initialize plugin system
  const pluginManager = new PluginManager();
  if (config.plugins?.length) {
    pluginManager.register(config.plugins);
    pluginManager.init(game, config.plugins);
  }
  game.registry.set('__clikPluginManager', pluginManager);

  // Expose game globally in dev for debugging
  if (debug) {
    (globalThis as Record<string, unknown>).__CLIK_GAME = game;
  }

  game.events.once(Phaser.Core.Events.READY, () => {
    // Warn about Canvas renderer limitations
    if (game.renderer.type === Phaser.CANVAS) {
      ConsoleReporter.engine(
        'Running with Canvas renderer — post-processing effects (blur, bloom, vignette, etc.) will be disabled. ' +
        'Use a WebGL-capable browser for full visual effects.'
      );
    }

    // Launch debug overlay scenes in parallel (they render on top)
    if (debug) {
      game.scene.start('__clik_debug_overlay');
      game.scene.start('__clik_state_inspector');
      game.scene.start('__clik_grid_overlay');
      game.scene.start('__clik_debug_console');
      // Keep debug scenes on top
      game.scene.bringToTop('__clik_debug_overlay');
      game.scene.bringToTop('__clik_state_inspector');
      game.scene.bringToTop('__clik_debug_console');
      // Expose console globally for programmatic access (e.g. Claude Preview tools)
      (globalThis as Record<string, unknown>).__CLIK_CONSOLE = game.scene.getScene('__clik_debug_console');
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

/** @deprecated Use `game.registry.get('__clikConfig')` instead */
export interface ClikGameInstance extends Phaser.Game {
  __clikConfig: ClikGameConfig;
}
