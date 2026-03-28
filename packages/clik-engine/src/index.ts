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
export { Profiler, profiler } from './debug/Profiler';

// Input
export { InputManager } from './input/InputManager';
export { ActionMap } from './input/ActionMap';
export { VirtualControls } from './input/VirtualControls';
export type { VirtualControlsConfig } from './input/VirtualControls';
export { GestureDetector } from './input/GestureDetector';
export type { GestureType, GestureEvent, GestureConfig } from './input/GestureDetector';
export { InputRecorder } from './input/InputRecorder';

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
export { ScrollContainer } from './ui/ScrollContainer';
export type { ScrollContainerConfig } from './ui/ScrollContainer';
export { GridLayout } from './ui/GridLayout';
export type { GridLayoutConfig } from './ui/GridLayout';
export { TabBar } from './ui/TabBar';
export type { TabConfig, TabBarConfig } from './ui/TabBar';
export { Slider } from './ui/Slider';
export type { SliderConfig } from './ui/Slider';
export { Toggle } from './ui/Toggle';
export type { ToggleConfig } from './ui/Toggle';
export { Toast } from './ui/Toast';
export type { ToastConfig } from './ui/Toast';
export { UIAnimator } from './ui/UIAnimator';
export type { UIAnimationType, UIAnimationConfig } from './ui/UIAnimator';
export { setTheme, getTheme, DarkTheme, LightTheme, RetroTheme, NeonTheme } from './ui/Theme';
export type { Theme, ThemeColors } from './ui/Theme';

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
export { Raycast } from './physics/Raycast';
export type { RaycastHit } from './physics/Raycast';
export { MatterHelper } from './physics/MatterHelper';

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

// Effects
export { ShaderManager } from './effects/ShaderManager';

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
export { Timer as TimerComponent } from './entity/components/Timer';
export { Collectible } from './entity/components/Collectible';
export { Spawner } from './entity/components/Spawner';
export { DragDrop } from './entity/components/DragDrop';

// Analytics
export { AnalyticsManager } from './analytics/AnalyticsManager';
export type { AnalyticsEvent, AnalyticsBackend } from './analytics/AnalyticsManager';

// i18n
export { I18nManager } from './i18n/I18nManager';
export type { TranslationData } from './i18n/I18nManager';

// Dialogue
export { DialogueManager } from './dialogue/DialogueManager';
export type { DialogueLine, DialogueTree, DialogueDisplayConfig } from './dialogue/DialogueManager';

// Accessibility
export { A11yManager } from './accessibility/A11yManager';
export type { A11yConfig, ColorBlindMode } from './accessibility/A11yManager';

// Platform
export { PlatformManager } from './platform/PlatformManager';
export type { SafeArea } from './platform/PlatformManager';

// Network
export { NetworkManager } from './network/NetworkManager';
export type { NetworkConfig, ConnectionState } from './network/NetworkManager';
export { Room } from './network/Room';
export type { RoomPlayer } from './network/Room';

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
