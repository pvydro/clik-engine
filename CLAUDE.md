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
npm run build                                        # Build engine library (Vite, ~120 ES modules)
npm run typecheck --workspace=packages/clik-engine   # TypeScript type checking (tsc --noEmit)
npm run lint --workspace=packages/clik-engine        # ESLint (src/*.ts only)
npm run format --workspace=packages/clik-engine      # Prettier (semi, singleQuote, 120 printWidth)
npm run docs --workspace=packages/clik-engine        # TypeDoc API docs

# Testing (Vitest)
npm run test                                         # Run all tests (~88 files, ~1050 tests)
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

`Entity` extends Phaser Container. Components are added via `entity.addComponent()`. `EntityRegistry` maintains O(1) indexes by type and tag — use `getByType()` / `getByTag()` instead of filtering. `BaseScene.update()` automatically calls `entityRegistry.updateAll()`.

### Network System

Client-side multiplayer via `NetworkManager` (WebSocket, auto-reconnect, heartbeat), `Lobby` (browse/create/join rooms), `Room` (player management, game actions, state sync), and `StateSync` (entity interpolation with configurable buffer/delay). Matches `clik-server` wire protocol.

### Plugin System

Extensible via `ClikPlugin` interface (init/destroy lifecycle) and `ClikScenePlugin` (scene hooks: onSceneCreate/Update/Shutdown). Register plugins in `ClikGameConfig.plugins`. `PluginManager` handles dependency resolution, error isolation, reverse-order destroy.

### AI System

`BehaviorTree` with `Blackboard` shared data, 8 node types (Sequence, Selector, Parallel, Inverter, Succeeder, Repeater, Wait, Action, Condition). `Steering` behaviors (seek, flee, arrive, pursue, evade, wander, obstacle avoidance, separation, alignment, cohesion). `SteeringCalculator` for weighted force composition.

### Input Provider Architecture

`InputManager` delegates to three providers: `KeyboardProvider`, `TouchProvider`, `GamepadProvider`. Each implements `InputProvider` interface. `InputBuffer` for fighting-game input sequences. `RemapHelper` for settings menu key rebinding.

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

Channels can be individually disabled: `ConsoleReporter.disableChannel(ClikLogChannel.INPUT)`

Debug overlay (when `debug: true`): FPS/scene/entities in top-left, state inspector in top-right. Register state with `this.inspectState('label', () => ({ key: value }))`.

## Claude Skills

- `/clik-scaffold` — generate scenes, entities, input configs, UI layouts following engine conventions
- `/clik-playtest` — boot game via Preview, play-test, find bugs, fix, verify
- `/clik-build` — production build, bundle size check, release bundle
- `/clik-debug` — diagnose issues via console logs, screenshots, state inspection
