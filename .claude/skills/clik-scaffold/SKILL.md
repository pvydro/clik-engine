---
name: clik-scaffold
description: Generate clik-engine game scenes, objects, input configs, asset manifests, and UI layouts following engine conventions
---

## What I do

- Create new game scenes extending `BaseScene` with proper lifecycle hooks
- Add game objects with sprites, physics bodies, and input bindings
- Wire up input actions in the `ClikGameConfig` action map
- Add assets to the `AssetManifest` with proper tier placement
- Generate UI layouts (menus, HUD, dialogs) using engine's Phaser-native UI components
- Create complete game configs with `createGame()` factory pattern

## When to use me

Use `/clik-scaffold` when:
- Starting a new game or adding features to an existing clik-engine game
- Creating new scenes, game objects, or UI screens
- Setting up input bindings for a new game mechanic
- Adding assets to the manifest

---

## Engine Architecture

### Game Config (`game.config.ts`)
Every game has a single declarative config file. This is the source of truth:

```typescript
import { createGame, ScalePreset, ClikGameConfig } from 'clik-engine';

export const config: ClikGameConfig = {
  name: 'my-game',
  scale: ScalePreset.AUTO,           // MOBILE_PORTRAIT | MOBILE_LANDSCAPE | DESKTOP | AUTO
  physics: 'arcade',                 // 'arcade' | 'matter' | 'none'
  debug: import.meta.env.DEV,
  devStartScene: 'game',             // Skip to this scene during dev
  scenes: [
    { key: 'preload', class: PreloadScene },
    { key: 'menu', class: MenuScene },
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      move_left:  { keys: ['LEFT', 'A'] },
      move_right: { keys: ['RIGHT', 'D'] },
      jump:       { keys: ['SPACE', 'UP'], touch: 'tap' },
    }
  },
  save: { slots: 3, version: 1 },
};
```

### Scene Pattern
All scenes extend `BaseScene`:

```typescript
import { BaseScene, ConsoleReporter } from 'clik-engine';
import Phaser from 'phaser';

export class GameScene extends BaseScene {
  private player!: Phaser.GameObjects.Sprite;
  private score = 0;

  constructor() {
    super({ key: 'game' });
  }

  create(): void {
    super.create(); // REQUIRED — logs lifecycle, sets up input

    const { width, height } = this.scale;

    // Create game objects
    this.player = this.add.sprite(width / 2, height / 2, 'player');

    // Register debug state (visible in screenshots when debug=true)
    this.inspectState('game', () => ({
      score: this.score,
      playerX: this.player.x,
      playerY: this.player.y,
    }));
  }

  update(time: number, delta: number): void {
    super.update(time, delta); // REQUIRED — updates InputManager

    // Use action-based input (not raw keys)
    if (this.actions.isDown('move_left')) {
      this.player.x -= 200 * (delta / 1000);
    }
    if (this.actions.justPressed('jump')) {
      ConsoleReporter.state('player jumped');
    }
  }
}
```

### Asset Manifest
Declare assets in tiers:

```typescript
import { AssetManifest } from 'clik-engine';

export const manifest: AssetManifest = {
  boot: [
    { type: 'image', key: 'logo', path: 'assets/logo.png' },
  ],
  main: [
    { type: 'atlas', key: 'sprites', path: 'assets/sprites.png', atlasPath: 'assets/sprites.json' },
    { type: 'audio', key: 'bgm', path: ['assets/bgm.ogg', 'assets/bgm.mp3'] },
    { type: 'spritesheet', key: 'tiles', path: 'assets/tiles.png', frameConfig: { frameWidth: 32, frameHeight: 32 } },
  ],
  deferred: [
    { type: 'image', key: 'credits_bg', path: 'assets/credits.png' },
  ],
};
```

### UI Components (Phaser-native, visible in screenshots)

```typescript
import { Button, Label, Panel, Dialog, ProgressBar } from 'clik-engine';

// Button
new Button(this, { x: 400, y: 300, text: 'Play', onClick: () => this.scene.start('game') });

// Label
new Label(this, { x: 400, y: 100, text: 'Score: 0', color: '#00ff88' });

// Panel with layout
const panel = new Panel(this, { x: 400, y: 300, width: 300, height: 400, layout: 'vertical' });

// Dialog
const dialog = new Dialog({ scene: this, title: 'Game Over', message: 'You scored 100!' });
dialog.addButton('Retry', () => { dialog.close(); this.scene.restart(); });

// Progress bar
const hpBar = new ProgressBar(this, { x: 50, y: 20, width: 200, height: 16, fillColor: 0xff0000 });
hpBar.setValue(0.75);
```

## Key Conventions

1. **Always call `super.create()` and `super.update()`** in BaseScene subclasses
2. **Use `this.actions`** for input, never raw `this.input.keyboard`
3. **Use `this.inspectState()`** to register debug state visible in screenshots
4. **Use `ConsoleReporter`** for logging — Claude reads these via console log tools
5. **All UI is Phaser-native** — no DOM elements (they don't show in screenshots)
6. **Set `devStartScene`** in config to skip menus during development
7. **Assets go in `public/assets/`** and are referenced in the manifest

## File Locations

- Game config: `src/game.config.ts`
- Asset manifest: `src/assets.ts`
- Scenes: `src/scenes/*.ts`
- Entry point: `src/main.ts`
- Static assets: `public/assets/`
