// Boot
export { createGame } from './boot/ClikGame';
export type { ClikGameInstance } from './boot/ClikGame';
export { ScalePreset, getScaleConfig } from './boot/defaults';

// Scenes
export { BaseScene } from './scenes/BaseScene';
export { SceneDirector } from './scenes/SceneDirector';
export { Transitions } from './scenes/transitions';
export type { TransitionConfig } from './scenes/transitions';

// Debug
export { ConsoleReporter, ClikLogChannel } from './debug/ConsoleReporter';
export { DebugOverlay } from './debug/DebugOverlay';
export { StateInspector } from './debug/StateInspector';
export { GridOverlay } from './debug/GridOverlay';

// Input
export { InputManager } from './input/InputManager';
export { ActionMap } from './input/ActionMap';
export { VirtualControls } from './input/VirtualControls';
export type { VirtualControlsConfig } from './input/VirtualControls';

// UI
export { UIScene } from './ui/UIScene';
export { Button } from './ui/Button';
export type { ButtonConfig } from './ui/Button';
export { Panel } from './ui/Panel';
export type { PanelConfig } from './ui/Panel';
export { Dialog } from './ui/Dialog';
export type { DialogConfig } from './ui/Dialog';
export { Label } from './ui/Label';
export type { LabelConfig } from './ui/Label';
export { ProgressBar } from './ui/ProgressBar';
export type { ProgressBarConfig } from './ui/ProgressBar';

// Assets
export { Preloader } from './assets/Preloader';
export { loadManifestTier, getAllEntries, loadDeferred } from './assets/AssetManifest';

// Audio
export { AudioManager } from './audio/AudioManager';

// Save
export { SaveManager } from './save/SaveManager';
export { SaveMigrator } from './save/migration';
export type { MigrationFn } from './save/migration';

// Physics
export { PhysicsHelper } from './physics/PhysicsHelper';

// FSM
export { StateMachine } from './fsm/StateMachine';
export type { StateHooks, TransitionRule } from './fsm/State';

// Tween
export { tween, tweenSequence, TweenPresets } from './tween/TweenHelper';
export { Ease } from './tween/easings';
export type { EaseName } from './tween/easings';

// Camera
export { CameraManager } from './camera/CameraManager';
export type { FollowConfig } from './camera/CameraManager';

// Particles
export { ParticleManager, ParticlePresets } from './particles/ParticleManager';
export type { ParticlePresetConfig } from './particles/ParticleManager';

// Animation
export { AnimationHelper, AnimationStateController } from './animation/AnimationManager';
export type { AnimationDef, AnimationSet } from './animation/AnimationManager';

// Tilemap
export { TilemapManager } from './tilemap/TilemapManager';
export type { TilemapConfig, SpawnPoint } from './tilemap/TilemapManager';

// Entity
export { Entity } from './entity/Entity';
export { Component } from './entity/Component';
export { EntityRegistry } from './entity/EntityRegistry';
export { Health } from './entity/components/Health';
export { Movement } from './entity/components/Movement';

// Scaling
export { ResponsiveManager } from './scaling/ResponsiveManager';

// Utils
export { clamp, lerp, randomRange, randomInt } from './utils/math';
export { Vector2 } from './utils/vector';
export type { Vec2 } from './utils/vector';
export { Color } from './utils/color';
export { pick, shuffle, weightedRandom, SeededRandom } from './utils/random';
export { ObjectPool } from './utils/pool';
export { delay, interval } from './utils/timer';

// Types
export type {
  ClikGameConfig,
  SceneEntry,
  ActionBinding,
  InputConfig,
  SaveConfig,
  AssetEntry,
  AssetManifest,
  ScalePresetType,
  PhysicsType,
} from './utils/types';

// Re-export Phaser
export { default as Phaser } from 'phaser';
