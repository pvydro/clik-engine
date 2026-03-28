---
name: clik-scaffold
description: Generate clik-engine game scenes, entities, input configs, animations, tilemaps, and UI layouts following engine conventions
---

## What I do

- Create new game scenes extending `BaseScene` with proper lifecycle hooks
- Create entities with components (Health, Movement, custom)
- Set up sprite animations from atlas/spritesheet definitions
- Wire up input actions with keyboard, touch gestures, and gamepad
- Configure tilemaps from Tiled JSON with collision and spawn points
- Build UI layouts using engine components (Button, Panel, Slider, Toggle, Dialog, Toast)
- Set up camera follow, zoom, and bounds
- Configure particle emitters with presets
- Create state machines for game logic
- Set up physics colliders, bodies, and groups

## When to use me

Use `/clik-scaffold` when:
- Starting a new game or adding features to an existing clik-engine game
- Creating new scenes, entities, or UI screens
- Setting up input, animation, physics, or tilemap systems

---

## Engine Architecture

### Game Config (`game.config.ts`)
```typescript
import { createGame, ScalePreset } from 'clik-engine';

createGame({
  name: 'my-game',
  scale: ScalePreset.AUTO,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  devStartScene: 'game',
  scenes: [
    { key: 'preload', class: PreloadScene },
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      move_left:  { keys: ['LEFT', 'A'], touch: 'swipe_left' },
      move_right: { keys: ['RIGHT', 'D'], touch: 'swipe_right' },
      jump:       { keys: ['SPACE', 'UP'], touch: 'tap', gamepad: '0' },
    }
  },
  save: { slots: 3, version: 1 },
});
```

### Scene Pattern
```typescript
import { BaseScene, ConsoleReporter } from 'clik-engine';

export class GameScene extends BaseScene {
  constructor() { super({ key: 'game' }); }

  create(): void {
    super.create(); // REQUIRED

    // All systems available via this.*:
    // this.actions  — InputManager (keyboard/touch/gamepad)
    // this.director — SceneDirector (transitions)
    // this.audio    — AudioManager (music/sfx)
    // this.save     — SaveManager (localStorage slots)

    this.inspectState('game', () => ({ score: 0 })); // Debug overlay
  }

  update(time: number, delta: number): void {
    super.update(time, delta); // REQUIRED — polls input

    if (this.actions.justPressed('jump')) { /* ... */ }
    const { x, y } = this.actions.axis('move_left', 'move_right', 'move_up', 'move_down');
  }
}
```

### Entity/Component System
```typescript
import { Entity, Health, Movement, Component } from 'clik-engine';

class Player extends Entity {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.entityType = 'player';
    this.addComponent('health', new Health(100).onDeath(() => this.die()));
    this.addComponent('movement', new Movement(200));
    const sprite = scene.add.sprite(0, 0, 'player');
    this.add(sprite);
  }
}
```

### Animation
```typescript
import { AnimationHelper } from 'clik-engine';

const anims = new AnimationHelper(this);
anims.register({
  idle: { key: 'player-idle', atlas: 'sprites', prefix: 'idle_', start: 0, end: 3, frameRate: 8 },
  run:  { key: 'player-run', atlas: 'sprites', prefix: 'run_', start: 0, end: 5, frameRate: 12 },
});
await anims.play(sprite, 'player-idle');
```

### Camera
```typescript
import { CameraManager } from 'clik-engine';

const cam = new CameraManager(this);
cam.follow(player, { lerpX: 0.1, lerpY: 0.1, deadzone: { width: 100, height: 50 } });
cam.setBounds(0, 0, worldWidth, worldHeight);
await cam.shake(200, 0.01); // Hit effect
await cam.zoomTo(2, 500);   // Zoom in
```

### Tilemap
```typescript
import { TilemapManager } from 'clik-engine';

const tilemap = new TilemapManager(this);
tilemap.load({ key: 'level1', tilesets: { 'terrain': 'tiles' } });
tilemap.createLayer('ground');
tilemap.createLayer('platforms');
tilemap.setCollision('platforms', { property: 'collides' });
tilemap.addCollider('platforms', player);
const spawn = tilemap.getSpawnPoint('objects', 'player_start');
```

### Particles
```typescript
import { ParticleManager, ParticlePresets } from 'clik-engine';

const particles = new ParticleManager(this);
particles.createEmitter('explosion', ParticlePresets.explosion('particle'));
particles.burst('explosion', enemy.x, enemy.y);
```

### State Machine
```typescript
import { StateMachine } from 'clik-engine';

const fsm = new StateMachine(this, 'player')
  .addState('idle', { enter: () => anim.play(sprite, 'idle') })
  .addState('run',  { enter: () => anim.play(sprite, 'run'), update: (ctx, dt) => { /* move */ } })
  .addState('jump', { enter: () => sprite.body.setVelocityY(-400) })
  .addTransition('idle', 'run', () => isMoving)
  .addTransition('run', 'idle', () => !isMoving)
  .start('idle');
// Call fsm.update(delta) in scene update
```

### Tweens
```typescript
import { tween, TweenPresets, Ease } from 'clik-engine';

await tween(this, sprite, { y: 100 }, { duration: 500, ease: Ease.BounceOut });
await TweenPresets.popIn(this, sprite);
await TweenPresets.shake(this, sprite, 5, 200);
TweenPresets.float(this, sprite, 8, 2000); // continuous
```

### UI Components
```typescript
import { Button, Slider, Toggle, Toast, Dialog, ProgressBar, Label } from 'clik-engine';

new Button(this, { x: 400, y: 300, text: 'Play', onClick: () => {} });
new Slider(this, { x: 100, y: 50, width: 200, value: 0.5, onChange: v => {} });
new Toggle(this, { x: 100, y: 100, label: 'Music', value: true, onChange: v => {} });
Toast.show(this, { message: 'Level Complete!', position: 'top' });

const dialog = new Dialog({ scene: this, title: 'Game Over', message: 'Score: 100' });
dialog.addButton('Retry', () => { dialog.close(); this.scene.restart(); });
```

### Physics
```typescript
import { PhysicsHelper } from 'clik-engine';

PhysicsHelper.enableBody(this, sprite);
PhysicsHelper.setVelocity(sprite, 200, 0);
PhysicsHelper.setBounce(sprite, 0.5);
PhysicsHelper.setCollideWorldBounds(sprite);
PhysicsHelper.addCollider(this, player, enemies, onHit);
```

### Gestures
```typescript
import { GestureDetector } from 'clik-engine';

const gestures = new GestureDetector(this);
gestures.on('swipe_left', (e) => moveLeft());
gestures.on('double_tap', (e) => specialAttack());
gestures.on('long_press', (e) => openMenu());
```

## Key Conventions
1. Always call `super.create()` and `super.update(time, delta)` in BaseScene subclasses
2. Use `this.actions` for input, `this.director` for scene changes, `this.audio` for sound, `this.save` for persistence
3. Use `this.inspectState()` to register debug state visible in screenshots
4. Use `ConsoleReporter` for logging — Claude reads via `[CLIK:*]` prefixes
5. All UI is Phaser-native (no DOM)
6. Set `devStartScene` to skip menus during development
