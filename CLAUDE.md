# clik-engine

Claude-native game engine built on PhaserJS. Designed for building games collaboratively with Claude using the Preview MCP tools.

## Quick Start

```bash
npm install                                          # Install all workspace dependencies
npm run dev                                          # Dev harness (port 5173)
npm run dev:cards                                    # Card Match example (port 5176)
npm run dev:2048                                     # 2048 example (port 5174)
npm run dev:shooter                                  # Space Shooter example (port 5175)
npm run test                                         # Run 212 unit tests
npm run build                                        # Build engine library (111 modules)
npm run docs --workspace=packages/clik-engine        # Generate API docs (TypeDoc)
```

## Project Structure

```
clik/
├── packages/clik-engine/        # Core engine (npm package, 91 source files)
│   ├── src/
│   │   ├── accessibility/       # A11yManager (color blind, font scale, reduced motion)
│   │   ├── analytics/           # AnalyticsManager (events, backends, sessions)
│   │   ├── animation/           # AnimationHelper, SpriteAnimator, AnimationStateController
│   │   ├── assets/              # AssetManifest (tiered loading), Preloader
│   │   ├── audio/               # AudioManager (crossfade, per-channel mute, loop count)
│   │   ├── boot/                # createGame() factory, scale presets, startup validation
│   │   ├── camera/              # CameraManager (follow, zoom, shake, pan, path, bounds)
│   │   ├── debug/               # DebugOverlay, StateInspector, ConsoleReporter, Profiler,
│   │   │                        #   GridOverlay, SceneInspector (DOM), HotState
│   │   ├── dialogue/            # DialogueManager (branching trees, typewriter, choices)
│   │   ├── effects/             # ShaderManager (blur, bloom, vignette, pixelate, CRT)
│   │   ├── entity/              # Entity, Component, EntityRegistry
│   │   │   └── components/      # Health, Movement, Timer, Collectible, Spawner, DragDrop,
│   │   │                        #   Follower, Lifetime, Oscillator, FlashOnHit, Patrol
│   │   ├── fsm/                 # StateMachine (states, transitions, guards, history)
│   │   ├── i18n/                # I18nManager (locales, interpolation, dot-notation)
│   │   ├── input/               # InputManager, ActionMap, GestureDetector, VirtualControls,
│   │   │                        #   InputRecorder, ComboDetector
│   │   ├── network/             # NetworkManager (WebSocket, reconnect), Room, StateSync, Lobby
│   │   ├── particles/           # ParticleManager + presets (explosion, sparkle, trail, rain)
│   │   ├── physics/             # PhysicsHelper (Arcade), MatterHelper, Raycast
│   │   ├── platform/            # PlatformManager (OS, lifecycle, safe area, fullscreen)
│   │   ├── save/                # SaveManager (localStorage slots), SaveMigrator
│   │   ├── scaling/             # ResponsiveManager (breakpoints, DPI, orientation)
│   │   ├── scenes/              # BaseScene, SceneDirector, Transitions (7 types), SceneUtils
│   │   ├── tilemap/             # TilemapManager (layers, collision, spawn points, parallax)
│   │   ├── tween/               # TweenHelper (promise-based), Ease constants, TweenPresets
│   │   ├── ui/                  # 14 components (see UI section below)
│   │   └── utils/               # Vector2, Color, Random, ObjectPool, Grid2D, PriorityQueue,
│   │                            #   SpatialHash, findPath (A*), format helpers
│   └── tests/                   # 17 test files, 136 tests (Vitest)
│
├── packages/create-clik-game/   # CLI: npx create-clik-game <name> [--template=...]
│   └── templates/               # default, platformer, puzzle
│
├── packages/clik-server/         # WebSocket matchmaking server (Node.js)
├── dev-harness/                 # Engine playground (SandboxScene, TransitionTest, KitchenSink)
│
├── examples/
│   ├── 2048/                    # Full 2048 game (grid logic, scoring, save, swipe)
│   ├── shooter/                 # Space shooter (physics, spawning, explosions, difficulty)
│   └── cards/                   # Card matching game (flip, match, moves, save best)
│
└── .claude/
    ├── launch.json              # Preview MCP configs for all dev servers
    └── skills/                  # 4 Claude skills (scaffold, playtest, build, debug)
```

## Key Conventions

- All scenes extend `BaseScene` and MUST call `super.create()` and `super.update(time, delta)`
- Use `this.actions` for input (never raw `this.input.keyboard`)
- Use `this.director` for scene transitions
- Use `this.audio` for music/SFX
- Use `this.save` for localStorage persistence
- All UI is Phaser-native (rendered on canvas, visible in screenshots — no DOM)
- Structured logging: `ConsoleReporter.state()`, `.scene()`, `.input()`, `.error()` etc.
- Filter logs with `preview_console_logs(search: "[CLIK:")`
- Debug overlay: FPS/scene/entities in top-left, state inspector in top-right
- Register debug state with `this.inspectState('label', () => ({ key: value }))`
- Set `devStartScene` in config to skip menus during development
- Game instance exposed as `window.__CLIK_GAME` when `debug: true`

## Engine Systems (25 directories, 111 build modules)

### Boot & Scenes
- `createGame(config)` — single declarative config object creates entire game
- `BaseScene` — wires up input, audio, save, director automatically
- `SceneDirector` — 7 transition types (fade, slideLeft/Right/Up/Down, zoom, wipe, custom)
- `SceneUtils` — hitStop, slowMotion, countdown, screenFlash, wipe helpers
- `ScreenTransition` — fadeThrough, irisWipe, pixelate (scene change overlays)
- Scale presets: `MOBILE_PORTRAIT`, `MOBILE_LANDSCAPE`, `DESKTOP`, `AUTO`

### Input (6 modules)
- `InputManager` — unified keyboard/touch/gamepad with action map
- `ActionMap` — declarative bindings, runtime rebinding
- `GestureDetector` — tap, double-tap, long-press, swipe (4-dir)
- `VirtualControls` — D-pad, floating joystick, configurable buttons
- `InputRecorder` — record/playback for replays and testing
- `ComboDetector` — fighting game-style input sequences

### UI (14 components)
- `Button` — interactive with hover/press states
- `Label` — styled text with optional background
- `Panel` — layout container (vertical/horizontal)
- `Dialog` — modal with backdrop, buttons
- `ProgressBar` — fill bar with configurable colors
- `Slider` — draggable range input
- `Toggle` — on/off switch with label
- `Toast` — animated notification popup
- `TextInput` — editable text field with cursor, placeholder
- `ScrollContainer` — drag/wheel scrolling with momentum
- `GridLayout` — auto-position items in columns
- `TabBar` — tabbed navigation
- `ListView` — virtualized scrolling list (handles 1000+ items)
- `FocusManager` — keyboard/gamepad UI navigation
- `Tooltip` — hover-triggered tooltip with delay
- `Notification` — slide-in notification panel (4 corners)
- `Anchor` — responsive screen positioning (9 anchor points)
- `UIAnimator` — 8 animation types + staggered lists
- `Theme` — 4 built-in themes (dark, light, retro, neon)

### Entity/Component (11 components)
- `Entity` — Container with components, tags, debug state
- `EntityRegistry` — query by type/tag, update all, prune
- Built-in components:
  - `Health` — damage/heal with death callback
  - `Movement` — velocity-based movement with friction
  - `Timer` — named one-shot and repeating timers
  - `Collectible` — collect-once pattern with value
  - `Spawner` — interval-based entity spawning with max limit
  - `DragDrop` — drag with snap-back-on-fail
  - `Follower` — chase/flee toward target
  - `Lifetime` — auto-destroy after duration with fade-out
  - `Oscillator` — sinusoidal bob/sway
  - `FlashOnHit` — tint-flash damage feedback
  - `Patrol` — waypoint movement with wait times
  - `Interactable` — hover/click/proximity interaction for NPCs/items

### Physics (5 modules)
- `PhysicsHelper` — full Arcade wrapper (velocity, drag, bounce, bodies, groups, one-way platforms, impulse)
- `MatterHelper` — Matter.js bodies, constraints, pins, sensors, collision filters
- `Raycast` — ray casting, line-of-sight, circle/rect queries, nearest-object, debug draw
- `MovingPlatform` — waypoint-based platforms with rider support
- `PhysicsPool` — recycling physics group with auto-spawn/despawn

### Animation (4 modules)
- `AnimationHelper` — declarative registration from atlas/spritesheet
- `AnimationStateController` — map FSM states to animations
- `SpriteAnimator` — simplified play/chain/face API
- `AnimationEventSystem` — frame callbacks (hitbox timing, footstep sounds)

### Camera
- `CameraManager` — follow (lerp, deadzone), zoom, pan, shake (3 presets), flash, fade, path following, visible bounds check, rotation
- `MultiCamera` — split screen (2/4 player), minimap, picture-in-picture

### Networking (4 modules)
- `NetworkManager` — WebSocket with auto-reconnect (exponential backoff), heartbeat
- `Room` — create/join/leave, player tracking, ready state, state sync
- `StateSync` — entity synchronization with interpolation, client prediction
- `Lobby` — room browsing, creation, quick match

### Other Systems
- `AudioManager` — music/SFX, crossfade, per-channel mute, loop count
- `SaveManager` + `SaveMigrator` — versioned localStorage slots with migration chain
- `AssetManifest` + `Preloader` — tiered loading (boot/main/deferred), error handling
- `StateMachine` — FSM with enter/update/exit hooks, auto-transitions, guards, history
- `TweenHelper` — promise-based tweens, sequences, 7 presets (popIn, shake, pulse, etc.)
- `TilemapManager` — Tiled JSON maps, layers, collision, spawn points, parallax, tile replacement
- `ParticleManager` — named emitters, burst/continuous, follow target, 4 presets
- `I18nManager` — locale loading, dot-notation keys, interpolation, browser detection
- `DialogueManager` — branching trees, typewriter effect, choices, emotions, auto-advance
- `ShaderManager` — post-FX (blur, bloom, vignette, pixelate, CRT barrel), per-object FX
- `AnalyticsManager` — event tracking, pluggable backends, session tracking
- `PlatformManager` — OS detection, app lifecycle, safe area, fullscreen
- `A11yManager` — color blind modes, high contrast, font scaling, reduced motion
- `Profiler` — per-section timing, slow frame detection, memory tracking
- `SceneInspector` — DOM-based hierarchy browser with property editor
- `HotState` — sessionStorage state preservation across HMR reloads
- `LeakDetector` — track object creation/destruction, threshold warnings
- `EffectPresets` — CRT, dream, underwater, night vision, frozen, retro, damage

### Utilities
- `Vector2` — full 2D math (normalize, distance, angle, rotate, lerp)
- `Color` — hex/rgb/number conversion, blend, lighten, darken
- `SeededRandom` — deterministic PRNG (mulberry32), weighted random, shuffle
- `ObjectPool` — generic object pooling with factory/reset
- `Grid2D` — 2D grid with neighbors, find, clone
- `PriorityQueue` — min-heap for pathfinding
- `SpatialHash` — broad-phase collision indexing
- `findPath` — A* pathfinding on Grid2D
- `GameTimer` — frame-rate independent countdown/cooldown with pause, extend, repeat
- `Cooldown` — use/isReady pattern for abilities and weapons
- `EventBus` — global decoupled event system (singleton: `eventBus`)
- Format: `formatNumber`, `formatCompact`, `formatTime`, `truncate`, `pluralize`, `ordinal`

## Debug & Development

### Console Log Channels
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

Channels can be individually enabled/disabled:
```typescript
ConsoleReporter.disableChannel(ClikLogChannel.INPUT); // Quiet input logs
```

### Scene Inspector
Toggle with: `new SceneInspector(game).toggle()`
Shows game object hierarchy, editable properties, copy-as-code.

### Profiler
```typescript
profiler.begin('physics');
// ... physics code ...
profiler.end('physics');
profiler.getTimingSummary(); // { physics: "0.5ms avg, 1.2ms max" }
```

## Testing

```bash
npm run test                                         # Run all 212 tests
npm run test:watch --workspace=packages/clik-engine  # Watch mode
```

Test coverage: math, Vector2, Color, Random, ObjectPool, Grid2D, PriorityQueue, SpatialHash, A* pathfinding, StateMachine, SaveManager, SaveMigrator, I18nManager, AnalyticsManager, ConsoleReporter, InputRecorder, ComboDetector, ActionMap, LeakDetector, GameTimer, Cooldown, EventBus, format utils.

## Creating a Game

```bash
npx create-clik-game my-game                          # Default (empty scene)
npx create-clik-game my-game --template=platformer    # Side-scroller with physics
npx create-clik-game my-game --template=puzzle        # Grid-based puzzle
```

Each template includes `.claude/launch.json` for Preview MCP integration.

## Claude Skills

Available in `.claude/skills/` (repo) and `~/.claude/skills/` (machine):

- `/clik-scaffold` — generate scenes, entities, input, UI following engine conventions
- `/clik-playtest` — boot game via Preview, play-test, find bugs, fix, verify
- `/clik-build` — production build, bundle size check, release bundle
- `/clik-debug` — diagnose issues via console logs, screenshots, state inspection
