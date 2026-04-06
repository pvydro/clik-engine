# Changelog

All notable changes to `clik-engine` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-04-05

### Changed — Centralized Input Architecture

- **InputManager is now game-level**: created once at boot and stored in `game.registry` as `__clikInputManager`. Survives scene transitions and restarts. Previously it was per-scene, which broke input on `scene.restart()` because keyboard/pointer listeners got destroyed mid-frame.
- **Provider lazy init**: `KeyboardProvider`, `TouchProvider`, and `GamepadProvider` now use `initFromScene(scene)` to bind to scene input plugins. Can be called multiple times to rebind on scene restart.
- **BaseScene.actions**: getter now reads from registry instead of creating a new InputManager. `shutdown()` no longer destroys the InputManager.

### Fixed

- **SceneUtils.hitStop / slowMotion**: were using `scene.time.delayedCall` which respects `timeScale` — when `timeScale` was set to 0, the restore callback never fired, permanently freezing the scene. Now uses `setTimeout` (real time).
- **TimeEffects.slowMo**: same bug — both instant and gradual modes now use `setTimeout`/`setInterval` instead of scene timers.
- **CullOffscreen spatial tag**: `EntityPool.acquire()` now re-applies prefab tags (like `'spatial'`) after `activate()` clears them. Fixes pooled bullets/enemies losing their spatial tag and becoming invisible to `CombatManager` spatial queries.
- **Lifetime pool support**: `Lifetime.usePool()` releases entities to pool on expire instead of destroying them. Prevents crashes when pool reacquires entities with cleared components.
- **Toast.dismissAll()**: added static method to clear active toasts; toasts now use `setScrollFactor(0)` so they stay fixed on screen during camera shake/zoom.

### Breaking

- `InputManager` constructor signature changed from `(scene, config)` to `(config)`. Scenes using `BaseScene.actions` are unaffected. Games instantiating `InputManager` directly need to update.
- `KeyboardProvider`, `TouchProvider`, `GamepadProvider` constructors changed from `(scene, actionMap, ...)` to `(actionMap, ...)` with a new `initFromScene(scene)` method.

## [2.1.0] - 2026-04-03

### Added

- **CombatManager.setFilter()**: collision pair filtering for team/faction-based combat (prevents friendly fire)
- **Performance benchmarks**: Vitest bench suite for EntityPool (500 entities), GPUParticleEmitter (10K particles), A* pathfinding (100x100 grids), CombatManager (200 hitbox/hurtbox entities)
- **Platformer example**: side-scrolling action with parallel locomotion + combat HSMs, wall-jump, dash, attack combos (CancelWindow + ComboGraph + InputBuffer), DestructibleTiles, TileEffects, ParallaxManager, SquadCoordinator
- **Twin-Stick Shooter example**: top-down arena with BulletEmitter (3 weapon types), WaveManager + DirectorAI adaptive difficulty, GPUParticleEmitter, DynamicZoom, EffectComposer, TimeEffects, SpatialAudio
- **Boss Fight example**: 3-phase boss with HierarchicalStateMachine (child FSMs per phase), OrbitalCamera intro, BeatSync rhythm attacks, ColorGrading transitions, ForceField vortex, DestructibleTiles arena

## [2.0.0] - 2026-04-03

### Added — Action-Game Engine Overhaul (11 workstreams)

- **Entity pooling**: `EntityPool` with acquire/release, `Component.reset()`, `Entity.activate()/deactivate()`
- **Spatial queries**: `EntityRegistry.enableSpatial()`, `getNearby()`, `getInRect()`, `getByComponent()`
- **Combat system**: `CombatManager`, `Hitbox`/`Hurtbox`, `Health.takeDamage()` with shields/modifiers/iframes
- **Bullet patterns**: `BulletEmitter` (7 patterns), `WaveManager` with wave completion detection
- **Movement**: `HomingMovement`, `SineMovement`, `CircularMovement`, `SplineMovement`, `AcceleratingMovement`, `CullOffscreen`
- **Animation**: `AnimationStateMachine`, `BlendTree1D`/`2D`, `AnimationLayerStack`, `CancelWindow`, `ComboGraph`, `DirectionalResolver`, `AnimatorComponent`
- **Hierarchical FSM**: `HierarchicalStateMachine` (composite states, events, timeouts, tags, history), `ParallelRegion`, `AnimationBinding`
- **Advanced AI**: `PathSteering`, `SquadCoordinator`, `UtilityAI`, `DirectorAI`, `GOAPPlanner`, `AIAnimationAdapter`
- **Visual effects**: `ImpactDistortion`, `ChromaticAberration`, `MotionBlur`, `GlitchEffect`, `ColorGrading`, `TimeEffects` (hitstop/slow-mo), `EffectComposer` with 5 presets
- **Camera**: prediction, directional shake, `DynamicZoom`, `ParallaxManager`, `OrbitalCamera`, boundary framing
- **Physics**: `TriggerZone`, `CollisionEventTracker`, `ContinuousCollision` (swept AABB), `Destructible`, `VerletChain`
- **Audio**: `SpatialAudio`, `SoundPool`, `AudioMixer` (ducking), `BeatSync`
- **Particles**: `GPUParticleEmitter`, `ParticleCollision`, `ForceField` (5 types), `CombatParticlePresets` (8 presets)
- **Tilemap**: `TileEffects`, `DestructibleTiles`, `AnimatedTiles`, `CollisionRebuilder`, `TileLighting`
- **Network**: `InputPrediction`, `RollbackManager`, `LagCompensation`, `DeltaCompression`, `LatencyMonitor`
- **PCG**: `EncounterPlacer`, `LootGenerator`, `BiomeGenerator`, `PathBrancher`, `HazardPlacer`, `PCGValidator`
- **Input**: `pointer: 'down'` binding for immediate mouse/touch response

### Changed
- Shooter example refactored to entity system
- CI bundle limit raised to 1MB warning-only
- ~70 new source files, ~68 new test files, 1784 total tests (up from 1161)

## [1.2.0] - 2026-03-31

### Added
- **Procedural Content Generation (PCG) plugin**: Complete level generation system with strategy pattern registry, seeded deterministic randomness, and constraint-based validation with auto-repair
- **3 built-in generators**: `DungeonGenerator` (BSP rooms + L-shaped corridors), `PlatformerGenerator` (heightmap terrain + floating platforms), `ArenaGenerator` (symmetric obstacle rings)
- **3 built-in constraints**: `ReachabilityConstraint` (A* path validation, flood-fill repair), `EntityDensityConstraint` (max entities per region), `DifficultyConstraint` (enemy count scaling ±30%)
- **PCGRegistry**: Central registry with `generate()` method — retry logic (up to 3 attempts), constraint repair, ConsoleReporter logging
- **LevelApplier**: Phaser bridge for converting `GeneratedLevel` → tilemap + entities (only Phaser-dependent PCG file)
- **PCGPlugin**: ClikPlugin wrapper that registers all built-ins, exposes `window.__CLIK_PCG` in debug mode
- **SeededUtils**: `shuffleArray`, `weightedPick`, `randomPointInRect`, `noiseSample1D` — all using `SeededRandom`
- **DebugConsole `generate` command**: `generate dungeon 50 40 --difficulty 5 --seed 42 --constraint reachability`
- **PCG Dungeon example** (`examples/pcg-dungeon/`): Playable dungeon crawler with floor progression, item collection, physics collision, difficulty scaling — zero external assets
- **PCG Lab scene** in dev-harness: Visualization tool comparing all 3 generators with constraint toggling, seed/difficulty controls
- 68 new tests across 9 test files (1,148 total)

## [1.1.1] - 2026-03-31

### Fixed
- npm package now explicitly includes README.md, LICENSE, and CHANGELOG.md in the `files` field
- Added MIT LICENSE file to package
- Added `description`, `license`, and `keywords` to package.json
- Fixed broken API Reference link in README
- DebugConsole backtick toggle no longer flickers (replaced Phaser key polling with DOM edge detection)

### Changed
- Publish workflow hardened with 8 pre-publish validation gates (required files, package.json fields, CHANGELOG version match, CHANGELOG sync, npm pack contents, bundle size limits)
- CI workflow now also validates package file presence and package.json completeness
- Bundle size limit aligned between CI and publish workflows (400KB)

## [1.1.0] - 2026-03-31

### Added
- **DebugConsole**: Quake-style in-game command console toggled with backtick key. 14 built-in commands (help, spawn, kill, set/get, scene, timescale, pause/resume, entities, fps, inspect, playtest, clear). Custom command registration, command history, tab autocomplete. Exposed as `window.__CLIK_CONSOLE` in debug mode.
- **PlaytestReporter**: ClikScenePlugin that records gameplay sessions — input patterns, scene transitions, entity lifecycle, FPS/performance, EventBus events, and errors. Produces structured JSON reports (`getReport()`) and human-readable summaries (`getSummary()`) for Claude-assisted game design feedback. Integrated into all example games.
- **ConsoleReporter**: New CONSOLE and PLAYTEST log channels, error listener hooks (`addErrorListener`/`removeErrorListener`)
- **BaseScene**: `getEntityRegistry()` public accessor (reads without lazy-init)

### Changed
- ProfilerDashboard toggle key changed from backtick to F3 (backtick now used by DebugConsole)

## [1.0.0] - 2026-03-30

### Added
- **Network system**: NetworkManager (WebSocket, auto-reconnect, heartbeat), Lobby, Room, StateSync with entity interpolation
- **Plugin system**: ClikPlugin/ClikScenePlugin interfaces, PluginManager with dependency resolution, error isolation, BaseScene lifecycle hooks
- **AI system**: BehaviorTree with Blackboard, 8 node types (Sequence, Selector, Parallel, Inverter, Succeeder, Repeater, Wait, Action, Condition), SteeringBehaviors (seek, flee, arrive, pursue, evade, wander, obstacle avoidance, flocking), SteeringCalculator
- **UI components**: ToastManager (queued), ModalStack (z-ordered), Dropdown, Checkbox, RadioGroup
- **Input refactoring**: InputProvider architecture (KeyboardProvider, TouchProvider, GamepadProvider), InputBuffer for fighting-game sequences, RemapHelper for key rebinding
- **Advanced particles**: TrailRenderer, 8 new presets (fire, smoke, snow, confetti, dust, magic, lightning, blood)
- **Animation**: AnimationBlender (crossfade between animations)
- **Effects**: CustomShaderPipeline with typed uniforms, ShaderEffects presets (chromatic aberration, scanlines, heat wave, outline)

### Changed
- InputManager refactored from monolithic class to provider-based compositor (backward compatible)
- getScaleConfig() now falls back to 'auto' preset for invalid input

### Fixed
- Listener leaks across 8 files (TextInput, ScrollContainer, Anchor, DragDrop, Interactable, GestureDetector, ResponsiveManager, AnimationEvents)
- ESLint flat config for ESLint v10 (was broken with legacy --ext syntax)

### Infrastructure
- GitHub Actions CI workflow (typecheck, lint, test+coverage, build, bundle-size check)
- CI: server tests, CLI build, all example builds in pipeline
- Config validation across createGame() and managers
- BaseScene error boundary with runSafe() and red debug banner
- Canvas renderer detection with graceful degradation warning
- Vitest coverage with @vitest/coverage-v8
- clik-server: refactored to ClikServer class with graceful shutdown, rate limiting, health check, room timeouts, README
- Theme: ui/themed.ts DRY helper — Dropdown, Checkbox, RadioGroup, ToastManager use getTheme()
- A11y: UIAnimator respects reducedMotion (skips tweens, applies final state instantly)
- BaseScene: network, lobby, room, a11y lazy accessors
- Entity components: BehaviorTreeComponent, SteeringComponent, NetworkSync
- ClikGameConfig: network and accessibility config fields
- Test count: 40 files / 401 tests → 88 files / 1061 tests

## [0.4.0] - 2025-05-01

### Added
- Visual polish system with 9 new modules (LayeredTile, DepthRenderer, GraphicsParticles, ProceduralAudio, ProceduralMusic, GameFeelPresets, ScorePopup, ComboDisplay, AnimatedHUD)
- Sprite-based UI components for pixel art games
- All three example games rewritten to use visual polish system

## [0.3.0] - 2025-04-15

### Added
- Visual polish release with initial LayeredTile and DepthRenderer

## [0.2.0] - 2025-04-01

### Added
- Entity/component system with 12 built-in components
- Input system with keyboard, touch/swipe, and gamepad support
- Scene management with transitions
- Audio manager with procedural synthesis
- Save system with versioned slots
- FSM (StateMachine)
- Physics helpers (Arcade + Matter)
- Camera manager with follow, shake, zoom
- Particle system with presets
- Debug overlay, state inspector, console reporter
- Responsive scaling with breakpoints
- i18n, accessibility, analytics, dialogue systems
- Tilemap manager with Tiled JSON support

## [0.1.0] - 2025-03-15

### Added
- Initial release with BaseScene, createGame, and core architecture
