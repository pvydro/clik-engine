# Changelog

All notable changes to `@pvydro/clik-engine` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Config validation across createGame() and managers (name, scenes, dimensions, scale, physics, colors, save)
- BaseScene error boundary with runSafe() and red debug banner
- Canvas renderer detection with graceful degradation warning
- Vitest coverage with @vitest/coverage-v8
- Test count: 40 files / 401 tests → 65 files / 797 tests

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
