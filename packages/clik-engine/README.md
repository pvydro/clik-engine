# clik-engine

A Claude-native game engine built on [PhaserJS](https://phaser.io). Designed from the ground up for building games collaboratively with AI using Claude's Preview MCP tools.

**180+ source files | 19,000+ lines | 1,148+ tests | 394KB bundle**

**[Live Examples](https://pvydro.github.io/clik-engine/)** — Play the example games in your browser

## Why clik-engine?

Traditional game engines aren't designed for AI-assisted development. clik-engine is. Every system is built around three principles:

1. **Everything renders on canvas** — Claude sees the game through screenshots. No DOM overlays, no hidden state. Every UI component, debug overlay, and error message is visible in a screenshot.

2. **Structured console logging** — Every engine system logs with `[CLIK:*]` prefixes. Claude filters these programmatically to understand game state without taking screenshots.

3. **Declarative configuration** — A single `createGame()` call with a flat config object defines the entire game. Claude reads one file and understands the full architecture.

## Quick Start

```bash
npx create-clik-game my-game
cd my-game
npm install
npm run dev
```

Templates: `default`, `platformer`, `puzzle`, `multiplayer`

```bash
npx create-clik-game my-game --template=multiplayer
```

## Installing as a Dependency

```bash
npm install clik-engine phaser
```

```typescript
import { createGame, BaseScene, ScalePreset } from 'clik-engine';
```

## The Config-Driven Approach

```typescript
createGame({
  name: 'my-game',
  scale: ScalePreset.AUTO,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  scenes: [
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      left:  { keys: ['LEFT', 'A'], touch: 'swipe_left' },
      right: { keys: ['RIGHT', 'D'], touch: 'swipe_right' },
      jump:  { keys: ['SPACE'], touch: 'tap', gamepad: '0' },
    },
  },
  save: { slots: 3, version: 1 },
  network: { url: 'ws://localhost:8080' },           // optional
  accessibility: { fontScale: 1, reducedMotion: false }, // optional
  plugins: [{ plugin: MyPlugin, config: { ... } }],     // optional
});
```

## Scene Pattern

```typescript
export class GameScene extends BaseScene {
  create(): void {
    super.create();

    // All systems available via lazy accessors:
    // this.actions  — InputManager (keyboard/touch/gamepad)
    // this.director — SceneDirector (transitions)
    // this.audio    — AudioManager (music/SFX/procedural)
    // this.save     — SaveManager (localStorage)
    // this.entities — EntityRegistry (O(1) type/tag queries)
    // this.network  — NetworkManager (WebSocket multiplayer)
    // this.lobby    — Lobby (browse/create/join rooms)
    // this.room     — Room (players, actions, state sync)
    // this.a11y     — A11yManager (color blind, font scale, reduced motion)

    this.inspectState('game', () => ({ score: this.score }));
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.actions.justPressed('jump')) { /* ... */ }
  }
}
```

## Engine Systems

### 28 System Directories

| System | Key Modules |
|--------|-------------|
| **Boot** | `createGame()`, scale presets, config validation |
| **Scenes** | `BaseScene`, `SceneDirector` (7 transitions), `SceneStack`, `SceneUtils` (hitStop, slowMotion, countdown), `ScreenTransition` |
| **Input** | `InputManager` with provider architecture (`KeyboardProvider`, `TouchProvider`, `GamepadProvider`), `ActionMap`, `GestureDetector`, `VirtualControls`, `ComboDetector`, `InputRecorder`, `InputBuffer`, `RemapHelper` |
| **UI** | 30+ components: Button, Label, Panel, Dialog, ConfirmDialog, ProgressBar, Slider, Toggle, Toast, ToastManager, ModalStack, Dropdown, Checkbox, RadioGroup, TextInput, NumberInput, ScrollContainer, GridLayout, TabBar, ListView, Tooltip, Notification, FocusManager, Anchor, UIAnimator, ComboDisplay, ScorePopup, AnimatedHUD, LayeredTile, DepthRenderer. Theme system (4 presets) |
| **Entity** | `Entity`/`Component`/`EntityRegistry` + 15 built-in components: Health, Movement, Timer, Collectible, Spawner, DragDrop, Follower, Lifetime, Oscillator, FlashOnHit, Patrol, Interactable, BehaviorTreeComponent, SteeringComponent, NetworkSync |
| **Physics** | `PhysicsHelper`, `MatterHelper`, `Raycast`, `MovingPlatform`, `PhysicsPool`, `CollisionGroups`, `CollisionBuilder` |
| **Animation** | `AnimationHelper`, `SpriteAnimator`, `AnimationStateController`, `AnimationEventSystem`, `AnimationBlender` |
| **Camera** | `CameraManager` (follow, deadzone, zoom, pan, shake, flash, fade, path), `MultiCamera` (split screen, minimap, PIP) |
| **Particles** | `ParticleManager` + presets, `GraphicsParticles` (procedural, pooled), `TrailRenderer`, `AdvancedParticlePresets` (fire, smoke, snow, confetti, dust, magic, lightning, blood) |
| **Audio** | `AudioManager`, `ProceduralAudio` (synthesis), `ProceduralMusic` (generative) |
| **Network** | `NetworkManager` (WebSocket, auto-reconnect, heartbeat), `Lobby`, `Room`, `StateSync` (entity interpolation) |
| **AI** | `BehaviorTree` with `Blackboard` (Sequence, Selector, Parallel, Inverter, Repeater, Wait, Action, Condition), `SteeringBehaviors` (seek, flee, arrive, pursue, evade, wander, obstacle avoidance, flocking), `SteeringCalculator` |
| **Plugin** | `ClikPlugin`/`ClikScenePlugin` interfaces, `PluginManager` (dependency resolution, error isolation, reverse-order destroy) |
| **Effects** | `ShaderManager` (blur, bloom, vignette, pixelate, CRT barrel), `EffectPresets`, `CustomShaderPipeline` |
| **Tilemap** | `TilemapManager` (Tiled JSON, collision, spawn points, parallax) |
| **FSM** | `StateMachine` (states, transitions, guards, 10-deep history) |
| **Tween** | `TweenHelper`, `GameFeelPresets` (mergeSquash, impactPop, spawnIn, despawn, flashGlow, numberRoll, slideTo), `Ease` constants |
| **Save** | `SaveManager` (versioned localStorage slots), `SaveMigrator` |
| **i18n** | `I18nManager` (locales, interpolation, fallback) |
| **Dialogue** | `DialogueManager` (branching trees, typewriter, choices) |
| **Platform** | `PlatformManager` (OS, lifecycle, safe area, fullscreen), `CapacitorHelper`, `HapticFeedback` |
| **Accessibility** | `A11yManager` (color blind modes, font scale, reduced motion — integrated into UIAnimator) |
| **Analytics** | `AnalyticsManager` (events, pluggable backends) |
| **Scaling** | `ResponsiveManager` (breakpoints, DPI), `Letterbox` |
| **PCG** | `PCGRegistry` (strategy pattern), 3 generators (`DungeonGenerator`, `PlatformerGenerator`, `ArenaGenerator`), 3 constraints (`ReachabilityConstraint`, `EntityDensityConstraint`, `DifficultyConstraint`), `LevelApplier` (Phaser bridge), `PCGPlugin` |
| **Debug** | `DebugConsole` (Quake-style command console, 15 commands), `DebugOverlay`, `StateInspector`, `ProfilerDashboard` (FPS graph), `ConsoleReporter`, `Profiler`, `SceneInspector`, `HotState`, `LeakDetector`, `GridOverlay`, `VisualTest` |
| **Playtest** | `PlaytestReporter` (session recording, input/scene/entity/performance metrics, structured reports for AI analysis) |
| **Harness** | Multi-instance headless test harness: `HeadlessRunner`, `InstancePool`, `HarnessRunner`, `HarnessReporter`, `ScriptedStrategy`, `RandomFuzzStrategy`, `PolicyStrategy`, `ScriptedProvider`, per-instance seeded RNG. Runs N games at once for bulk seed sweeps, scripted regression tests, and input fuzzing |
| **Utils** | `Vector2`, `Color`, `SeededRandom`, `ObjectPool`, `Grid2D`, `PriorityQueue`, `SpatialHash`, `findPath` (A*), `GameTimer`, `Cooldown`, `EventBus`, format helpers, validation utilities |

## Multiplayer

```typescript
// In your scene:
this.network.connect();
this.lobby.quickMatch('my-game');

this.room.onPlayerJoined(p => console.log(`${p.name} joined`));
this.room.sendAction('move', { x: 100, y: 200 });

// Entity sync with interpolation:
const sync = new StateSync(this.network, { syncRate: 50, interpolationDelay: 100 });
entity.addComponent('netSync', new NetworkSync(sync, 'player1', true));
```

Server: `cd packages/clik-server && npm start`

## AI

```typescript
const tree = new Selector([
  new Sequence([
    new Condition(bb => bb.get('enemyVisible')),
    new Action(bb => { chase(); return NodeStatus.RUNNING; }),
  ]),
  new Action(bb => { patrol(); return NodeStatus.RUNNING; }),
]);

entity.addComponent('ai', new BehaviorTreeComponent(tree));
entity.addComponent('steering', new SteeringComponent(100, 50));
```

## Debug Console

Toggle with backtick (`` ` ``) when `debug: true`. 15 built-in commands, custom command registration.

```
> help                    # list all commands
> entities                # list entities with types/tags/components
> spawn enemy 400 300     # spawn entity at position
> kill all                # destroy all entities
> set score 999           # set game registry value
> timescale 0.5           # half speed
> scene list              # list scenes
> playtest                # show playtest report
> fps                     # FPS and frame timing
```

Programmatic access: `window.__CLIK_CONSOLE.exec('entities')`

Register custom commands:
```typescript
window.__CLIK_CONSOLE.register('god', () => {
  player.health = Infinity;
}, 'Enable god mode');
```

## Playtest Reporter

Records gameplay sessions and produces structured reports for AI-assisted game design feedback.

```typescript
import { PlaytestReporter } from 'clik-engine';

createGame({
  plugins: [
    { plugin: new PlaytestReporter({ trackEvents: ['player:death', 'score:changed'] }) },
  ],
  // ...
});
```

```typescript
// Get human-readable summary (designed for Claude to parse)
reporter.getSummary();
// === Playtest Report ===
// Duration: 45.2s | Avg FPS: 58.3 | FPS drops: 2
// Scenes: MenuScene (3.1s) → GameScene (38.4s) → GameOverScene (3.7s)
// Input: 342 actions (7.6/s) | Top: shoot (189), move_left (82)
// Entities: peak 24 (Enemy: 18, Bullet: 6)
// Events: player:death x2, score:changed x47
// Errors: 0

// Structured JSON for programmatic analysis
reporter.getReport();
reporter.exportJSON();
```

## Multi-Instance Test Harness

Boot many headless clik-engine game instances in parallel for bulk seed sweeps, scripted regression tests, random-input fuzzing, and Claude-driven policy exploration. No canvas, no audio, no RAF. One call boots N games, runs them to completion, and returns a structured report.

```typescript
import { HarnessRunner, RandomFuzzStrategy, ScriptedStrategy, type ClikGameConfig } from 'clik-engine';

const report = await HarnessRunner.run({
  config,                                   // your normal createGame() config
  scenario: {
    strategy: new RandomFuzzStrategy({
      actions: ['left', 'right', 'jump', 'attack'],
      toggleChance: 0.3,
    }),
    maxFrames: 600,
    collectMetrics: ctx => ctx.snapshot(),  // scene state via inspectState()
    shouldAbort: ctx => (ctx.snapshot() as any).main?.gameOver && 'died',
    tags: ['fuzz'],
  },
  seeds: { count: 100 },
  concurrency: 8,
});

report.passed;               // 94
report.runs[0].seed;         // 0
report.runs[0].metrics;      // whatever collectMetrics returned
report.runs[0].finalSnapshot; // scene-inspected state at end of run
```

### Strategies

| Strategy | Use it for |
|---|---|
| `ScriptedStrategy` | Deterministic `{ frame, action, value }` timeline — reproducible regression across N seeds |
| `RandomFuzzStrategy` | Seeded per-frame action toggles — same seed reproduces the same crash |
| `PolicyStrategy` | Async `(ctx) => actions` — heuristic AI, external policy calls, or Claude-driven play |

### Browser singleton for `preview_eval`

```typescript
import { HarnessReporter } from 'clik-engine';

HarnessReporter.install();   // mounts window.__CLIK_HARNESS

// From a console or Claude's preview_eval:
await window.__CLIK_HARNESS.run({ config, scenario, seeds: { count: 25 } });
window.__CLIK_HARNESS.summary();    // { passed, failed, durationMs, avgFrames }
window.__CLIK_HARNESS.failures();   // seeds that crashed or aborted early
window.__CLIK_HARNESS.bySeed(42);   // drill into a single run
```

### Determinism

Each runner installs a `SeededRandom(seed)` on `game.registry`. Scenes opt in via `getRandom(this)` — returns `null` in production so real gameplay is unaffected:

```typescript
import { BaseScene, getRandom } from 'clik-engine';

class DungeonScene extends BaseScene {
  create() {
    super.create();
    const rng = getRandom(this);
    const roomCount = rng ? rng.nextInt(4, 12) : randomInt(4, 12);
  }
}
```

### Snapshots

`ctx.snapshot()` returns the scene state registered via the existing `BaseScene.inspectState(label, getter)` hook, mirrored into a registry-backed store so it works with no debug overlay running. Register once in `create()`, read it out of snapshots later — same API as the live debug inspector.

Scripts and scenarios never touch the DOM — a new `ScriptedProvider` input provider injects actions straight into the `InputManager`, so the keyboard/touch/gamepad providers stay idle and the whole pipeline (action map → `InputBuffer` → combo detector) works exactly as it does in a real playthrough.

Claude drives the harness via the [`/clik-bulk-test`](../../.claude/skills/clik-bulk-test/SKILL.md) skill against a `multi.html` page like the one shipped in [`dev-harness/multi.html`](../../dev-harness/multi.html).

Full docs: **[docs/systems/harness.md](../../docs/systems/harness.md)**.

## Procedural Content Generation

Generate playable levels from high-level parameters. Pure data layer (no Phaser dependency except `LevelApplier`), seeded deterministic randomness, constraint-based validation with auto-repair.

```typescript
import { PCGPlugin } from 'clik-engine';

createGame({
  plugins: [{ plugin: new PCGPlugin() }],
  // ...
});

// Generate a dungeon
const level = pcgPlugin.registry.generate('dungeon', {
  width: 50, height: 40, difficulty: 5, seed: 42,
}, ['reachability', 'difficulty']);

// level.grid     — Grid2D<TileType> (FLOOR, WALL, DOOR, SPAWN, EXIT, HAZARD...)
// level.entities — EntityPlacement[] (enemies, items with positions)
// level.spawn    — Vec2 (player start)
// level.exit     — Vec2 (level goal)
// level.metadata — { roomCount, pathLength, generationTimeMs, seed, ... }
```

**3 built-in generators**: `DungeonGenerator` (BSP rooms + corridors), `PlatformerGenerator` (heightmap terrain + platforms), `ArenaGenerator` (symmetric obstacles)

**3 built-in constraints**: `ReachabilityConstraint` (A* path validation + repair), `EntityDensityConstraint` (max per region), `DifficultyConstraint` (enemy count scaling)

Register custom generators and constraints via `registry.registerGenerator()` / `registry.registerConstraint()`.

Debug console: `generate dungeon 50 40 --difficulty 5 --seed 42`

## Example Games

| Game | What it demonstrates |
|------|---------------------|
| **2048** | Grid logic, swipe input, procedural audio/music, visual polish (LayeredTile, ComboDisplay, AnimatedHUD) |
| **Space Shooter** | Physics, procedural particles, combo system, screen effects, difficulty scaling |
| **Card Match** | State machines, card flip animation, score persistence, UI layering |
| **PCG Dungeon** | Procedural generation, BSP dungeons, constraint validation, physics collision, floor progression |

```bash
npm run dev:2048
npm run dev:shooter
npm run dev:cards
npm run dev:dungeon
```

## Architecture

```
clik/
├── packages/
│   ├── clik-engine/          # Core engine (160+ modules)
│   ├── create-clik-game/     # CLI scaffolding (4 templates)
│   └── clik-server/          # WebSocket matchmaking server
├── dev-harness/              # Engine playground
├── examples/                 # 4 complete games
├── docs/                     # System guides
│   ├── getting-started.md
│   ├── migration.md
│   └── systems/              # network, ai, entity, plugins, ui
└── .claude/
    ├── launch.json           # Preview MCP configs
    └── skills/               # Claude skills
```

## Testing

```bash
npm run test                    # 1,148+ tests across 98 files
npm run test:coverage           # Coverage report with thresholds
```

## Claude Skills

| Skill | Purpose |
|-------|---------|
| `/clik-scaffold` | Generate scenes, entities, input configs, UI layouts |
| `/clik-playtest` | Boot, play-test, find and fix bugs autonomously |
| `/clik-build` | Production build, bundle size check, release |
| `/clik-debug` | Diagnose via console logs, screenshots, state inspection |
| `/clik-bulk-test` | Run many headless instances at once for seed sweeps, scripted regression, fuzzing |

## Documentation

- [Getting Started](docs/getting-started.md)
- [Migration Guide](docs/migration.md)
- System Guides: [Network](../../docs/systems/network.md) | [AI](../../docs/systems/ai.md) | [Entity](../../docs/systems/entity.md) | [Plugins](../../docs/systems/plugins.md) | [UI](../../docs/systems/ui.md) | [Harness](../../docs/systems/harness.md)
- [API Reference](https://github.com/pvydro/clik-engine/tree/main/packages/clik-engine/docs) (TypeDoc)
- [Changelog](https://github.com/pvydro/clik-engine/blob/main/CHANGELOG.md)

## Tech Stack

- **[PhaserJS](https://phaser.io)** v3.87 — Rendering, physics, audio
- **[Vite](https://vitejs.dev)** — Build, HMR
- **[TypeScript](https://www.typescriptlang.org)** — Full strict mode
- **[Vitest](https://vitest.dev)** — 1,148+ tests
- **[TypeDoc](https://typedoc.org)** — API docs
- **npm workspaces** — Monorepo

## License

MIT
