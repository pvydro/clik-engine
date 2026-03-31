# Plugin System

Extend the engine with custom systems that hook into the game lifecycle.

## Creating a Plugin

```typescript
import type { ClikPlugin } from 'clik-engine';

const FPSCounterPlugin: ClikPlugin = {
  name: 'fps-counter',
  version: '1.0.0',

  init(game) {
    console.log('FPS Counter initialized');
    // Access Phaser.Game here
  },

  destroy() {
    console.log('FPS Counter destroyed');
  },
};
```

## Scene-Aware Plugins

```typescript
import type { ClikScenePlugin } from 'clik-engine';

const AutoSavePlugin: ClikScenePlugin = {
  name: 'auto-save',
  version: '1.0.0',

  init(game, config) {
    // config comes from ClikGameConfig.plugins[].config
  },

  destroy() {},

  onSceneCreate(scene) {
    console.log(`Scene created: ${scene.scene.key}`);
  },

  onSceneUpdate(scene, time, delta) {
    // Called every frame for every active scene
  },

  onSceneShutdown(scene) {
    // Auto-save when scene shuts down
    scene.save.save(0, { timestamp: Date.now() });
  },
};
```

## Registering Plugins

```typescript
createGame({
  name: 'my-game',
  scenes: [{ key: 'game', class: GameScene, default: true }],
  plugins: [
    { plugin: FPSCounterPlugin },
    { plugin: AutoSavePlugin, config: { interval: 30000 } },
  ],
});
```

## Plugin Dependencies

Plugins can declare dependencies that must be loaded before them:

```typescript
const AdvancedPlugin: ClikPlugin = {
  name: 'advanced',
  version: '1.0.0',
  dependencies: ['fps-counter'], // Must be registered first
  init() {},
  destroy() {},
};
```

## Lifecycle

1. `register()` — Validates names, checks dependencies
2. `init(game, config)` — Called once after game boots
3. `onSceneCreate/Update/Shutdown` — Called for each scene (scene plugins only)
4. `destroy()` — Called in reverse order when game shuts down

Errors in one plugin don't crash others — each lifecycle hook is wrapped in try/catch.
