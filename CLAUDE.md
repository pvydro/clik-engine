# clik-engine

Claude-native game engine built on PhaserJS. Designed for building games collaboratively with Claude using the Preview MCP tools.

## Quick Start

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start the dev harness (Vite on port 5173)
npm run test --workspace=packages/clik-engine  # Run unit tests
```

## Project Structure

- `packages/clik-engine/` — Core engine (npm package)
- `packages/create-clik-game/` — CLI scaffolding tool
- `dev-harness/` — Engine development playground
- `.claude/skills/` — Claude skills for game development

## Key Conventions

- All scenes extend `BaseScene` and must call `super.create()` and `super.update(time, delta)`
- Use `this.actions` for input, `this.director` for scene transitions, `this.audio` for sound, `this.save` for persistence
- All UI components are Phaser-native (rendered on canvas, visible in screenshots)
- Structured console logging uses `[CLIK:*]` prefixes — filter with `preview_console_logs`
- Debug overlay shows FPS, scene, entities in top-left; state inspector in top-right
- Use `this.inspectState()` to register debug state visible in screenshots

## Engine Systems

Boot, Scenes, Input (keyboard/touch/gamepad), UI (12 components + themes + animations), Assets (tiered manifest + preloader), Audio (crossfade, per-channel), Save (versioned slots), Physics (Arcade + Matter.js + Raycast), FSM, Tweens (promise-based + presets), Camera (follow/zoom/shake), Particles (presets), Animation (declarative + state controller), Tilemap (Tiled JSON), Entity/Component (6 built-in components), i18n, Dialogue (branching + typewriter), Network (WebSocket + rooms), Platform (lifecycle + safe area), A11y (color blind + font scale), Analytics, Profiler, Pathfinding (A*), Shader Effects.

## Testing

```bash
npm run test --workspace=packages/clik-engine       # Run once
npm run test:watch --workspace=packages/clik-engine  # Watch mode
```

## Creating a Game

```bash
npx create-clik-game my-game                          # Default template
npx create-clik-game my-game --template=platformer    # Platformer
npx create-clik-game my-game --template=puzzle        # Puzzle
```
