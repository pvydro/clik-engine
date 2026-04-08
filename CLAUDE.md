# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm install                                          # Install all workspace dependencies
npm run dev                                          # Dev harness (port 5173)
npm run dev:2048                                     # 2048 example (port 5174)
npm run dev:shooter                                  # Space Shooter example (port 5175)
npm run dev:cards                                    # Card Match example (port 5176)

# Build & Quality
npm run build                                        # Build engine library (Vite, ~200 ES modules)
npm run typecheck --workspace=packages/clik-engine   # TypeScript type checking (tsc --noEmit)
npm run lint --workspace=packages/clik-engine        # ESLint (src/*.ts only)
npm run format --workspace=packages/clik-engine      # Prettier (semi, singleQuote, 120 printWidth)
npm run docs --workspace=packages/clik-engine        # TypeDoc API docs

# Testing (Vitest)
npm run test                                         # Run all tests (~165 files, ~1784 tests)
npm run test -- tests/utils/Vector2.test.ts          # Run a single test file
npm run test -- -t "pattern"                         # Filter by test name
npm run test:watch --workspace=packages/clik-engine  # Watch mode
```

## Architecture

**Monorepo** (npm workspaces) with these packages:

- `packages/clik-engine/` — Core engine library. Built with Vite in library mode (`es` format), Phaser is an external peer dependency. Entry: `src/index.ts` → `dist/clik-engine.js`. Published as `clik-engine` on npm.
- `packages/create-clik-game/` — CLI scaffolder (`npx create-clik-game <name> [--template=...]`)
- `packages/clik-server/` — WebSocket matchmaking server (Node.js)
- `dev-harness/` — Engine playground (SandboxScene, TransitionTest, KitchenSink)
- `examples/` — Three complete games: 2048, shooter, cards

The engine has 27 system directories under `packages/clik-engine/src/` (boot, scenes, input, ui, entity, physics, animation, camera, particles, audio, tilemap, fsm, tween, save, assets, network, i18n, dialogue, effects, platform, accessibility, analytics, scaling, debug, utils, plugin, ai). Each is a self-contained module — read its directory to understand it.

### BaseScene Lazy Accessor Pattern

All scenes extend `BaseScene`. Engine managers are instantiated lazily via private fields + protected getters:

```
private _actions: InputManager | undefined;
protected get actions(): InputManager {
  if (!this._actions) this._actions = new InputManager(this, ...);
  return this._actions;
}
```

This means: `this.actions`, `this.director`, `this.audio`, `this.save`, `this.entities` — each manager only exists if the scene actually uses it. Cleanup in `shutdown()` destroys and nullifies each. Accessing a manager during shutdown throws.

### Entity/Component System

`Entity` extends Phaser Container. Components are added via `entity.addComponent()`. `EntityRegistry` maintains O(1) indexes by type, tag, and component name — use `getByType()` / `getByTag()` / `getByComponent()` instead of filtering. `BaseScene.update()` automatically calls `entityRegistry.updateAll()`.

**Pooling:** `EntityPool` reuses entities without create/destroy overhead. `Entity.activate(x, y)` resets position/tags/components, `Entity.deactivate()` hides without destroying. All components implement `reset()` for pool compatibility. `EntityFactory.createPool()` / `acquirePooled()` / `releasePooled()` manage pools.

**Spatial queries:** `EntityRegistry.enableSpatial({ cellSize })` connects the `SpatialHash`. Tag entities with `'spatial'` for tracking. Query with `getNearby(x, y, radius)` and `getInRect(x, y, w, h)`.

**Combat system:** `Hitbox` / `Hurtbox` components define AABB collision volumes. `CombatManager` does broad-phase via spatial + component index, narrow-phase AABB. `Health.takeDamage(DamageEvent)` supports type modifiers, shields, and invincibility frames.

**Movement components:** `Movement` (velocity+friction), `HomingMovement`, `SineMovement`, `CircularMovement`, `SplineMovement` (Catmull-Rom), `AcceleratingMovement` (with easing), `CullOffscreen` (auto-despawn, pool-aware).

**Bullet patterns:** `BulletEmitter` component with 7 pattern types (radial, aimed, spiral, ring, shotgun, stream, random-spread). `WaveManager` sequences enemy spawns with delayBefore/delayAfter and wave completion detection.

### Network System

Client-side multiplayer via `NetworkManager` (WebSocket, auto-reconnect, heartbeat), `Lobby` (browse/create/join rooms), `Room` (player management, game actions, state sync), and `StateSync` (entity interpolation with configurable buffer/delay). Matches `clik-server` wire protocol.

### Plugin System

Extensible via `ClikPlugin` interface (init/destroy lifecycle) and `ClikScenePlugin` (scene hooks: onSceneCreate/Update/Shutdown). Register plugins in `ClikGameConfig.plugins`. `PluginManager` handles dependency resolution, error isolation, reverse-order destroy.

### AI System

`BehaviorTree` with `Blackboard` shared data, 8 node types (Sequence, Selector, Parallel, Inverter, Succeeder, Repeater, Wait, Action, Condition). `Steering` behaviors (seek, flee, arrive, pursue, evade, wander, obstacle avoidance, separation, alignment, cohesion). `SteeringCalculator` for weighted force composition.

**Advanced AI:** `PathSteering` combines A* pathfinding with steering for smooth path following. `SquadCoordinator` manages attack tokens, formations (circle/line), and roles (attacker/flanker/supporter). `UtilityAI` scores actions via consideration curves. `DirectorAI` monitors player performance and adjusts difficulty dynamically (L4D-style). `GOAPPlanner` plans action sequences via A* over world state. `AIAnimationAdapter` bridges AI decisions with `AnimationStateMachine`.

### Animation System

`SpriteAnimator` for basic play/chain/face. `AnimationEventSystem` for frame-accurate gameplay callbacks. `AnimationStateMachine` with cancel windows, priority levels, and auto-transitions. `BlendTree1D`/`BlendTree2D` for parameter-driven animation selection. `AnimationLayerStack` for multi-layer animation (legs + torso). `CancelWindow` + `ComboGraph` for fighting-game combo routing with `InputBuffer` integration. `DirectionalResolver` for 4-way/8-way animation variants with flipX fallback. `AnimatorComponent` wraps ASM for entity attachment.

### Hierarchical FSM

`HierarchicalStateMachine` extends the flat `StateMachine` with composite states (child FSMs), event-driven transitions with priority queue, timeout transitions, state tags (`hasTag('invincible')`), and shallow/deep history for re-entry. `ParallelRegion` runs multiple FSMs simultaneously with cross-region guards. `AnimationBinding` declaratively syncs HFSM states with `AnimationStateMachine`.

### Visual Effects

`ShaderManager` with post-FX presets (blur, bloom, vignette, pixelate, CRT, dream). `ImpactDistortion` for screen ripple. `ChromaticAberration` for RGB offset pulses. `MotionBlur` for velocity-based blur. `GlitchEffect` for pixelation + hue shift. `ColorGrading` with presets (normal, desaturated, warm, cold, noir, toxic). `TimeEffects` for hitstop (frame freeze) and slow-motion. `EffectComposer` chains effects with presets: criticalHit, heavyImpact, death, dashBurst, corruption.

### Camera System

`CameraManager` with follow (lerp, deadzone), shake presets, pan/zoom/fade/flash. **Camera prediction** (velocity-based look-ahead). **Directional shake** (`shakeDirectional`, `shakeFrom`). **Screen boundary framing** (`lockToBounds`, `transitionBounds`). `DynamicZoom` auto-adjusts zoom to frame multiple weighted targets. `ParallaxManager` for multi-layer scroll rates. `OrbitalCamera` for cinematic orbits with `transitionToFollow()`. `MultiCamera` for split-screen and minimap.

### Physics Enhancements

`PhysicsBody`, `CollisionBuilder`, `CollisionGroups`, `Raycast`, `PhysicsPool`, `MovingPlatform` (existing). **New:** `TriggerZone` for enter/stay/exit detection (AABB + circle, tag/type filtering). `CollisionEventTracker` for per-pair enter/stay/exit lifecycle. `ContinuousCollision` (swept AABB) prevents fast-projectile tunneling. `Destructible` component for breakable environment (health stages, callbacks). `VerletChain` for rope/chain physics.

### Audio Enhancements

`AudioManager`, `ProceduralAudio`, `ProceduralMusic` (existing). **New:** `SpatialAudio` for position-based panning + volume falloff. `SoundPool` for pre-allocated simultaneous playback with voice stealing. `AudioMixer` for ducking profiles (auto-lower music on loud SFX). `BeatSync` for rhythm-based gameplay (BPM callbacks, beat progress, quantization).

### Particles

`ParticleManager`, `GraphicsParticles`, `TrailRenderer` (existing). **New:** `GPUParticleEmitter` with flat Float32Array pool for zero-allocation gameplay (5K-10K particles). `ParticleCollision` for AABB bouncing. `ForceField` (attractor, repeller, vortex, wind, turbulence). `CombatParticlePresets` (slashSparks, bulletSparks, dashTrail, shieldBreak, healGlow, explosionCore, explosionDebris, bloodSplatter).

### Tilemap Enhancements

`TilemapManager` (existing). **New:** `TileEffects` for property-based enter/stay/exit lifecycle (hazard, ice, slow). `DestructibleTiles` with per-tile health and visual damage stages. `AnimatedTiles` for frame cycling. `CollisionRebuilder` for batched collision updates. `TileLighting` with flood-fill light propagation, dynamic sources, opaque blocking.

### Network / Multiplayer

`NetworkManager`, `Lobby`, `Room`, `StateSync` (existing). **New:** `InputPrediction` for client-side input with server correction. `RollbackManager` for GGPO-style frame snapshots and re-simulation. `LagCompensation` for server-side historical hit verification. `DeltaCompression` for changed-field-only bandwidth reduction. `LatencyMonitor` for RTT/jitter measurement.

### PCG Enhancements

`DungeonGenerator`, `PlatformerGenerator`, `ArenaGenerator` (existing). **New:** `EncounterPlacer` for topology-aware enemy/boss placement. `LootGenerator` with weighted rarity tables. `BiomeGenerator` for themed regions with transition blending. `PathBrancher` for optional treasure/challenge/secret corridors. `HazardPlacer` for environmental hazards with spacing rules. `PCGValidator` for multi-constraint validation with auto-repair.

### Input Provider Architecture

`InputManager` delegates to three providers: `KeyboardProvider`, `TouchProvider`, `GamepadProvider`. Each implements `InputProvider` interface. `InputBuffer` for fighting-game input sequences. `RemapHelper` for settings menu key rebinding. Action bindings support `keys`, `touch` (tap/swipe gestures), `pointer: 'down'` (mouse click, fires immediately and stays active while held), and `gamepad`. Additional providers can be added at runtime via `inputManager.addProvider(provider)`.

### Multi-Instance Headless Test Harness

`harness/` boots many headless game instances in parallel for bulk seed sweeps, scripted regression tests, random-input fuzzing, and Claude-driven exploration. `HeadlessRunner` drives one game via `game.loop.step()` at fixed delta, forcing `headless: true` and injecting a `ScriptedProvider` so scenarios press actions without touching the DOM. `InstancePool` caps memory with bounded concurrency. `HarnessRunner.run({ config, scenario, seeds, concurrency })` is the one-call entry point; `HarnessReporter.install()` mounts a singleton on `window.__CLIK_HARNESS` so Claude can launch sweeps and read summaries via `preview_eval`. Strategies: `ScriptedStrategy` (deterministic timeline), `RandomFuzzStrategy` (seeded toggles), `PolicyStrategy` (async `(ctx) => actions`). Scenes opt into determinism via `getRandom(this)` from `RandomService`. Use the `/clik-bulk-test` skill to drive it.

## Key Conventions

- All scenes extend `BaseScene` and **must** call `super.create()` and `super.update(time, delta)`
- Use `this.actions` for input (never raw `this.input.keyboard`)
- Use `this.director` for scene transitions
- Use `this.audio` for music/SFX
- Use `this.save` for localStorage persistence
- All UI is Phaser-native (rendered on canvas, visible in screenshots — no DOM)
- Game instance exposed as `window.__CLIK_GAME` when `debug: true`
- Set `devStartScene` in config to skip menus during development
- `createGame(config)` — single declarative config object creates entire game
- Config is validated at boot (name, scenes, dimensions, scale, physics, colors, save slots)
- BaseScene has `runSafe()` error boundary — catches crashes, shows red debug banner, pauses update loop
- UI components: Button, Slider, Toggle, TextInput, Dialog, ConfirmDialog, Toast, ToastManager, ModalStack, Dropdown, Checkbox, RadioGroup, ScrollContainer, GridLayout, TabBar, ListView, Label, Panel, ProgressBar, Tooltip, Notification, Anchor, ComboDisplay, ScorePopup, AnimatedHUD, LayeredTile, DepthRenderer

## Debug & Logging

Structured logging with `ConsoleReporter` — filter with `preview_console_logs(search: "[CLIK:")`:

| Prefix | Purpose |
|--------|---------|
| `[CLIK:ENGINE]` | Engine lifecycle, config |
| `[CLIK:SCENE]` | Scene init/create/shutdown/transitions |
| `[CLIK:STATE]` | Game state changes |
| `[CLIK:INPUT]` | Action pressed/released, gestures, combos |
| `[CLIK:ERROR]` | Errors with fix suggestions |
| `[CLIK:ASSET]` | Asset loading progress |
| `[CLIK:AUDIO]` | Music/SFX events |
| `[CLIK:SAVE]` | Save/load operations |
| `[CLIK:HARNESS]` | Multi-instance test harness boot/step/summary |

Channels can be individually disabled: `ConsoleReporter.disableChannel(ClikLogChannel.INPUT)`

Debug overlay (when `debug: true`): FPS/scene/entities in top-left, state inspector in top-right. Register state with `this.inspectState('label', () => ({ key: value }))`.

## Claude Skills

- `/clik-scaffold` — generate scenes, entities, input configs, UI layouts following engine conventions
- `/clik-playtest` — boot game via Preview, play-test, find bugs, fix, verify
- `/clik-build` — production build, bundle size check, release bundle
- `/clik-debug` — diagnose issues via console logs, screenshots, state inspection
- `/clik-bulk-test` — run many headless game instances in parallel for bulk seed sweeps, scripted regression tests, and input fuzzing
