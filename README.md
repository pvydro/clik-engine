# clik-engine

A Claude-native game engine built on [PhaserJS](https://phaser.io). Designed from the ground up for building games collaboratively with AI using Claude's Preview MCP tools.

**33 commits | 114 source files | 11,400+ lines | 111 build modules | 212 tests | 217KB bundle**

## Why clik-engine?

Traditional game engines aren't designed for AI-assisted development. clik-engine is. Every system is built around three principles:

1. **Everything renders on canvas** — Claude sees the game through screenshots. No DOM overlays, no hidden state. Every UI component, debug overlay, and error message is visible in a screenshot.

2. **Structured console logging** — Every engine system logs with `[CLIK:*]` prefixes. Claude filters these programmatically to understand game state without taking screenshots.

3. **Declarative configuration** — A single `createGame()` call with a flat config object defines the entire game. Claude reads one file and understands the full architecture.

## Quick Start

```bash
# Install
npm install

# Run the dev harness
npm run dev

# Run an example game
npm run dev:2048
npm run dev:shooter
npm run dev:cards

# Run tests
npm run test

# Build the engine
npm run build

# Generate API docs
npm run docs --workspace=packages/clik-engine
```

## Create a New Game

```bash
npx create-clik-game my-game                        # Empty template
npx create-clik-game my-game --template=platformer   # Side-scroller with physics
npx create-clik-game my-game --template=puzzle        # Grid-based puzzle game
```

Each template includes a `.claude/launch.json` for instant Preview MCP integration.

## Architecture

```
clik/
├── packages/
│   ├── clik-engine/          # Core engine (npm package)
│   ├── create-clik-game/     # CLI scaffolding tool
│   └── clik-server/          # WebSocket matchmaking server
├── dev-harness/              # Engine development playground
├── examples/
│   ├── 2048/                 # Full 2048 clone
│   ├── shooter/              # Space shooter
│   └── cards/                # Card matching game
└── .claude/
    ├── launch.json           # Preview MCP server configs
    └── skills/               # 4 Claude skills
```

## The Config-Driven Approach

Every clik-engine game starts with a single config:

```typescript
import { createGame, ScalePreset } from 'clik-engine';
import { GameScene } from './scenes/GameScene';

createGame({
  name: 'my-game',
  scale: ScalePreset.AUTO,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  devStartScene: 'game',
  scenes: [
    { key: 'preload', class: PreloadScene },
    { key: 'menu', class: MenuScene },
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      move_left:  { keys: ['LEFT', 'A'], touch: 'swipe_left' },
      move_right: { keys: ['RIGHT', 'D'], touch: 'swipe_right' },
      jump:       { keys: ['SPACE'], touch: 'tap', gamepad: '0' },
    },
  },
  save: { slots: 3, version: 1 },
});
```

## Scene Pattern

All scenes extend `BaseScene`, which automatically wires up input, audio, save, and scene management:

```typescript
import { BaseScene, ConsoleReporter } from 'clik-engine';

export class GameScene extends BaseScene {
  create(): void {
    super.create(); // Required — sets up all engine systems

    // All systems available:
    // this.actions  — InputManager (keyboard/touch/gamepad)
    // this.director — SceneDirector (transitions)
    // this.audio    — AudioManager (music/SFX)
    // this.save     — SaveManager (localStorage)

    // Register debug state (visible in screenshots)
    this.inspectState('game', () => ({
      score: this.score,
      lives: this.lives,
    }));
  }

  update(time: number, delta: number): void {
    super.update(time, delta); // Required — polls input

    if (this.actions.justPressed('jump')) {
      // Action-based input, not raw keys
    }
  }
}
```

## Engine Systems

### 25 System Directories, 111 Build Modules

| System | What it does |
|--------|-------------|
| **Boot** | `createGame()` factory, scale presets, startup validation |
| **Scenes** | `BaseScene`, `SceneDirector` (7 transitions), `SceneStack` (push/pop), `SceneUtils` (hitStop, slowMotion, countdown), `ScreenTransition` (fade, iris, pixelate) |
| **Input** | `InputManager` (keyboard/touch/gamepad), `ActionMap` (rebinding), `GestureDetector` (tap, swipe, pinch, long-press), `VirtualControls` (floating joystick), `ComboDetector` (fighting game combos), `InputRecorder` (replay) |
| **UI** | 22 components: Button, Label, Panel, Dialog, ProgressBar, Slider, Toggle, Toast, TextInput, ScrollContainer, GridLayout, TabBar, ListView, NumberInput, ConfirmDialog, Tooltip, Notification, FocusManager, Anchor, UIAnimator, Theme (4 presets) |
| **Entity** | `Entity`/`Component`/`EntityRegistry` + 12 built-in components: Health, Movement, Timer, Collectible, Spawner, DragDrop, Follower, Lifetime, Oscillator, FlashOnHit, Patrol, Interactable. `EntityFactory` for prefabs |
| **Physics** | `PhysicsHelper` (full Arcade wrapper), `MatterHelper`, `Raycast` (line-of-sight, area queries), `MovingPlatform`, `PhysicsPool` (recycling), `CollisionGroups` |
| **Animation** | `AnimationHelper` (declarative registration, auto-detect from atlas), `SpriteAnimator`, `AnimationStateController` (FSM integration), `AnimationEventSystem` (frame callbacks) |
| **Camera** | `CameraManager` (follow, deadzone, zoom, pan, shake presets, flash, fade, path), `MultiCamera` (split screen, minimap, PIP) |
| **Particles** | `ParticleManager` + presets (explosion, sparkle, trail, rain) |
| **Audio** | `AudioManager` (crossfade, per-channel mute, loop count) |
| **Tilemap** | `TilemapManager` (Tiled JSON, collision, spawn points, parallax, tile replacement) |
| **FSM** | `StateMachine` (states, transitions, guards, history) |
| **Tween** | `TweenHelper` (promise-based), `Ease` constants, presets (popIn, shake, pulse, float, bounceIn) |
| **Save** | `SaveManager` (versioned localStorage slots), `SaveMigrator` |
| **Assets** | `AssetManifest` (tiered: boot/main/deferred), `Preloader`, `ManifestValidator` |
| **Network** | `NetworkManager` (WebSocket, auto-reconnect), `Room`, `StateSync` (interpolation), `Lobby` (quick match) |
| **i18n** | `I18nManager` (locales, dot-notation keys, interpolation) |
| **Dialogue** | `DialogueManager` (branching trees, typewriter, choices, emotions) |
| **Effects** | `ShaderManager` (blur, bloom, vignette, pixelate, CRT barrel), `EffectPresets` (dream, underwater, frozen, damage) |
| **Platform** | `PlatformManager` (OS, lifecycle, safe area, fullscreen), `CapacitorHelper` (mobile native) |
| **Accessibility** | `A11yManager` (color blind modes, font scale, reduced motion) |
| **Analytics** | `AnalyticsManager` (events, pluggable backends, sessions) |
| **Scaling** | `ResponsiveManager` (breakpoints, DPI), `Letterbox` (cinematic bars) |
| **Debug** | `DebugOverlay`, `StateInspector`, `ConsoleReporter` (per-channel), `Profiler`, `SceneInspector` (DOM editor), `HotState` (HMR preservation), `LeakDetector`, `VisualTest` |
| **Utils** | `Vector2`, `Color`, `SeededRandom`, `ObjectPool`, `Grid2D`, `PriorityQueue`, `SpatialHash`, `findPath` (A*), `GameTimer`, `Cooldown`, `EventBus`, format helpers |

## Debug & Claude Integration

### Console Log Channels

Every engine system logs with structured prefixes that Claude can filter:

```
[CLIK:ENGINE]  — Engine lifecycle, config
[CLIK:SCENE]   — Scene init/create/shutdown/transitions
[CLIK:STATE]   — Game state changes (score, health, FSM)
[CLIK:INPUT]   — Actions, gestures, combos, button clicks
[CLIK:ERROR]   — Errors with fix suggestions
[CLIK:ASSET]   — Asset loading progress
[CLIK:AUDIO]   — Music/SFX events
[CLIK:SAVE]    — Save/load operations
```

Claude reads these with `preview_console_logs(search: "[CLIK:")` to understand game state without screenshots.

### Debug Overlay

When `debug: true`, the canvas shows:
- **Top-left**: FPS, active scene, entity count, memory
- **Top-right**: Registered state from `inspectState()` (player HP, position, FSM state)
- **Red banner**: Error messages with fix suggestions

### Scene Inspector

A DOM-based property editor for live-editing game objects:
```typescript
import { SceneInspector } from 'clik-engine';
new SceneInspector(game).show(); // Toggle with .toggle()
```

## Example Games

### 2048
Full implementation with grid logic, merge mechanics, swipe/keyboard input, score persistence, and game over detection.

### Space Shooter
Physics-based with player movement, shooting, enemy spawning with difficulty scaling, explosions, starfield parallax, and lives system.

### Card Match
Memory matching game with card flip animations, match detection, move counter, win detection, and best score persistence.

## Multiplayer

### Client
```typescript
import { NetworkManager, Room, Lobby } from 'clik-engine';

const network = new NetworkManager({ url: 'ws://localhost:8080' });
network.connect();

const lobby = new Lobby(network);
lobby.quickMatch('my-game');

const room = new Room(network);
room.onPlayerJoin(player => console.log(`${player.name} joined`));
room.sendAction('move', { x: 100, y: 200 });
```

### Server
```bash
cd packages/clik-server
npm install
npm start  # WebSocket server on port 8080
```

Features: room creation/joining, player tracking, host migration, state synchronization, lobby with quick match.

## Mobile (Capacitor)

A `capacitor.config.tmpl.ts` template is included in every generated game:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init my-game com.example.mygame
npx cap add android
npm run build && npx cap sync
```

The engine handles touch input, responsive scaling, app lifecycle (pause/resume), safe area insets, and audio unlock automatically.

## Claude Skills

Four skills are included for AI-assisted development:

| Skill | Purpose |
|-------|---------|
| `/clik-scaffold` | Generate scenes, entities, input configs, UI layouts following engine conventions |
| `/clik-playtest` | Boot game via Preview, play-test autonomously, find and fix bugs |
| `/clik-build` | Production build, bundle optimization, mobile deployment |
| `/clik-debug` | Diagnose issues via console logs, screenshots, state inspection |

## Testing

```bash
npm run test                                         # Run all 212 tests
npm run test:watch --workspace=packages/clik-engine  # Watch mode
```

212 tests covering: math, Vector2, Color, Random, ObjectPool, Grid2D, PriorityQueue, SpatialHash, A* pathfinding, StateMachine, SaveManager, SaveMigrator, I18nManager, AnalyticsManager, ConsoleReporter, InputRecorder, ComboDetector, ActionMap, LeakDetector, GameTimer, Cooldown, EventBus, CollisionGroups, EntityFactory, SceneStack, ManifestValidator, and format utils.

## API Documentation

```bash
npm run docs --workspace=packages/clik-engine
# Opens at packages/clik-engine/docs/index.html
```

Generated with TypeDoc — full class reference for all 111 modules.

## Tech Stack

- **[PhaserJS](https://phaser.io)** v3.90 — Rendering, physics, audio
- **[Vite](https://vitejs.dev)** — Build tooling, HMR
- **[TypeScript](https://www.typescriptlang.org)** — Full type safety
- **[Vitest](https://vitest.dev)** — Unit testing
- **[TypeDoc](https://typedoc.org)** — API documentation
- **npm workspaces** — Monorepo management

## License

MIT
