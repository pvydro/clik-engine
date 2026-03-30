// Boot
export { createGame } from './boot/ClikGame';
export type { ClikGameInstance } from './boot/ClikGame';
export { ScalePreset, getScaleConfig } from './boot/defaults';

// Scenes
export { BaseScene } from './scenes/BaseScene';
export { SceneDirector } from './scenes/SceneDirector';
export { Transitions } from './scenes/transitions';
export type { TransitionConfig } from './scenes/transitions';
export { SceneUtils } from './scenes/SceneUtils';
export { ScreenTransition } from './scenes/ScreenTransition';
export { SceneStack } from './scenes/SceneStack';

// Debug
export { ConsoleReporter, ClikLogChannel } from './debug/ConsoleReporter';
export { DebugOverlay } from './debug/DebugOverlay';
export { StateInspector } from './debug/StateInspector';
export { GridOverlay } from './debug/GridOverlay';
export { Profiler, profiler } from './debug/Profiler';
export { SceneInspector } from './debug/SceneInspector';
export type { InspectorConfig } from './debug/SceneInspector';
export { HotState } from './debug/HotState';
export type { HotStateConfig } from './debug/HotState';
export { LeakDetector, leakDetector } from './debug/LeakDetector';
export { VisualTest } from './debug/VisualTest';

// Input
export { InputManager } from './input/InputManager';
export { ActionMap } from './input/ActionMap';
export { VirtualControls } from './input/VirtualControls';
export type { VirtualControlsConfig } from './input/VirtualControls';
export { GestureDetector } from './input/GestureDetector';
export type { GestureType, GestureEvent, GestureConfig } from './input/GestureDetector';
export { ComboDetector } from './input/ComboDetector';
export type { ComboDefinition } from './input/ComboDetector';
export { InputRecorder } from './input/InputRecorder';

// UI
export { UIScene } from './ui/UIScene';
export { TextInput } from './ui/TextInput';
export type { TextInputConfig } from './ui/TextInput';
export { Button } from './ui/Button';
export type { ButtonConfig } from './ui/Button';
export { SpriteButton } from './ui/SpriteButton';
export type { SpriteButtonConfig } from './ui/SpriteButton';
export { Panel } from './ui/Panel';
export type { PanelConfig } from './ui/Panel';
export { NineSlicePanel } from './ui/NineSlicePanel';
export type { NineSlicePanelConfig } from './ui/NineSlicePanel';
export { Dialog } from './ui/Dialog';
export type { DialogConfig } from './ui/Dialog';
export { Label } from './ui/Label';
export type { LabelConfig } from './ui/Label';
export { ProgressBar } from './ui/ProgressBar';
export type { ProgressBarConfig } from './ui/ProgressBar';
export { SpriteProgressBar } from './ui/SpriteProgressBar';
export type { SpriteProgressBarConfig } from './ui/SpriteProgressBar';
export { ScrollContainer } from './ui/ScrollContainer';
export type { ScrollContainerConfig } from './ui/ScrollContainer';
export { GridLayout } from './ui/GridLayout';
export type { GridLayoutConfig } from './ui/GridLayout';
export { TabBar } from './ui/TabBar';
export type { TabConfig, TabBarConfig } from './ui/TabBar';
export { Slider } from './ui/Slider';
export type { SliderConfig } from './ui/Slider';
export { ListView } from './ui/ListView';
export type { ListViewConfig } from './ui/ListView';
export { Toggle } from './ui/Toggle';
export type { ToggleConfig } from './ui/Toggle';
export { Toast } from './ui/Toast';
export type { ToastConfig } from './ui/Toast';
export { UIAnimator } from './ui/UIAnimator';
export type { UIAnimationType, UIAnimationConfig } from './ui/UIAnimator';
export { FocusManager } from './ui/FocusManager';
export { Tooltip } from './ui/Tooltip';
export type { TooltipConfig } from './ui/Tooltip';
export { Notification } from './ui/Notification';
export type { NotificationConfig } from './ui/Notification';
export { Anchor } from './ui/Anchor';
export type { AnchorPosition, AnchorConfig } from './ui/Anchor';
export { ConfirmDialog } from './ui/ConfirmDialog';
export { LayeredTile } from './ui/LayeredTile';
export type { LayeredTileConfig } from './ui/LayeredTile';
export { DepthRenderer } from './ui/DepthRenderer';
export type { DepthPanelConfig, DepthCellConfig, DepthGridConfig } from './ui/DepthRenderer';
export { ScorePopup } from './ui/ScorePopup';
export type { ScorePopupConfig } from './ui/ScorePopup';
export { ComboDisplay } from './ui/ComboDisplay';
export type { ComboDisplayConfig } from './ui/ComboDisplay';
export { AnimatedHUD } from './ui/AnimatedHUD';
export type { HUDCounterConfig } from './ui/AnimatedHUD';
export { NumberInput } from './ui/NumberInput';
export type { NumberInputConfig } from './ui/NumberInput';
export type { ConfirmDialogConfig } from './ui/ConfirmDialog';
export { setTheme, getTheme, DarkTheme, LightTheme, RetroTheme, NeonTheme } from './ui/Theme';
export type { Theme, ThemeColors, ThemeSprites } from './ui/Theme';

// Assets
export { Preloader } from './assets/Preloader';
export { loadManifestTier, getAllEntries, loadDeferred } from './assets/AssetManifest';
export { validateManifest } from './assets/ManifestValidator';
export type { ValidationResult } from './assets/ManifestValidator';

// Audio
export { AudioManager } from './audio/AudioManager';
export { ProceduralAudio } from './audio/ProceduralAudio';
export { ProceduralMusic } from './audio/ProceduralMusic';

// Save
export { SaveManager } from './save/SaveManager';
export { SaveMigrator } from './save/migration';
export type { MigrationFn } from './save/migration';

// Physics
export { PhysicsHelper } from './physics/PhysicsHelper';
export { PhysicsBody } from './physics/PhysicsBody';
export type { PhysicsBodyConfig } from './physics/PhysicsBody';
export { CollisionBuilder } from './physics/CollisionBuilder';
export { Raycast } from './physics/Raycast';
export type { RaycastHit } from './physics/Raycast';
export { MatterHelper } from './physics/MatterHelper';
export { MovingPlatform } from './physics/MovingPlatform';
export type { PlatformWaypoint } from './physics/MovingPlatform';
export { PhysicsPool } from './physics/PhysicsPool';
export { CollisionGroups } from './physics/CollisionGroups';

// FSM
export { StateMachine } from './fsm/StateMachine';
export type { StateHooks, TransitionRule } from './fsm/State';

// Tween
export { tween, tweenSequence, TweenPresets } from './tween/TweenHelper';
export { GameFeelPresets } from './tween/GameFeelPresets';
export { Ease } from './tween/easings';
export type { EaseName } from './tween/easings';

// Camera
export { CameraManager } from './camera/CameraManager';
export type { FollowConfig } from './camera/CameraManager';
export { MultiCamera } from './camera/MultiCamera';
export type { SplitScreenConfig, MinimapConfig } from './camera/MultiCamera';

// Particles
export { ParticleManager, ParticlePresets } from './particles/ParticleManager';
export type { ParticlePresetConfig } from './particles/ParticleManager';
export { GraphicsParticles } from './particles/GraphicsParticles';
export type { ParticleShape } from './particles/GraphicsParticles';

// Effects
export { ShaderManager } from './effects/ShaderManager';
export { EffectPresets } from './effects/EffectPresets';

// Animation
export { AnimationHelper, AnimationStateController } from './animation/AnimationManager';
export type { AnimationDef, AnimationSet } from './animation/AnimationManager';
export { SpriteAnimator } from './animation/SpriteAnimator';
export { AnimationEventSystem } from './animation/AnimationEvents';
export type { AnimationEventDef } from './animation/AnimationEvents';

// Tilemap
export { TilemapManager } from './tilemap/TilemapManager';
export type { TilemapConfig, SpawnPoint } from './tilemap/TilemapManager';

// Entity
export { Entity } from './entity/Entity';
export { Component } from './entity/Component';
export { EntityRegistry } from './entity/EntityRegistry';
export { EntityFactory } from './entity/EntityFactory';
export type { EntityBuilder } from './entity/EntityFactory';
export { Health } from './entity/components/Health';
export { Movement } from './entity/components/Movement';
export { Timer as TimerComponent } from './entity/components/Timer';
export { Collectible } from './entity/components/Collectible';
export { Spawner } from './entity/components/Spawner';
export { DragDrop } from './entity/components/DragDrop';
export { Follower } from './entity/components/Follower';
export { Lifetime } from './entity/components/Lifetime';
export { Oscillator } from './entity/components/Oscillator';
export { Interactable } from './entity/components/Interactable';
export type { InteractableConfig } from './entity/components/Interactable';
export { FlashOnHit } from './entity/components/FlashOnHit';
export { Patrol } from './entity/components/Patrol';
export type { PatrolPoint } from './entity/components/Patrol';
export type { OscillateAxis } from './entity/components/Oscillator';

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
export { CapacitorHelper } from './platform/CapacitorHelper';

// Scaling
export { ResponsiveManager } from './scaling/ResponsiveManager';
export { Letterbox } from './scaling/Letterbox';
export type { Breakpoint, BreakpointConfig } from './scaling/ResponsiveManager';

// Utils
export { clamp, lerp, randomRange, randomInt } from './utils/math';
export { Vector2 } from './utils/vector';
export type { Vec2 } from './utils/vector';
export { Color } from './utils/color';
export { pick, shuffle, weightedRandom, SeededRandom } from './utils/random';
export { ObjectPool } from './utils/pool';
export { delay, interval } from './utils/timer';
export { Grid2D, PriorityQueue } from './utils/structures';
export { findPath } from './utils/pathfinding';
export type { PathNode } from './utils/pathfinding';
export { SpatialHash } from './utils/spatial';
export { GameTimer } from './utils/GameTimer';
export { Cooldown } from './utils/Cooldown';
export { EventBus, eventBus } from './utils/EventBus';
export { formatNumber, formatCompact, formatTime, formatTimePrecise, truncate, padRight, pluralize, ordinal } from './utils/format';
export type { PositionLike, TransformLike, TweenableLike, DepthLike, VisibilityLike, SpawnableLike } from './utils/interfaces';

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
