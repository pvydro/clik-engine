# Getting Started with clik-engine

Build 2D games with TypeScript and Phaser 3, powered by clik-engine's component system, visual polish, and built-in multiplayer.

## Quick Start

```bash
npx create-clik-game my-game
cd my-game
npm install
npm run dev
```

This scaffolds a project with Vite dev server, hot reload, and a starter scene.

## Manual Setup

```bash
npm init -y
npm install phaser clik-engine
npm install -D typescript vite
```

Create `src/main.ts`:

```typescript
import { createGame, BaseScene, ScalePreset } from 'clik-engine';

class GameScene extends BaseScene {
  create() {
    super.create();
    this.add.text(400, 300, 'Hello clik!', { fontSize: '32px', color: '#fff' })
      .setOrigin(0.5);
  }

  update(time: number, delta: number) {
    super.update(time, delta);
  }
}

createGame({
  name: 'my-game',
  scale: ScalePreset.DESKTOP,
  scenes: [{ key: 'game', class: GameScene, default: true }],
  debug: true,
});
```

## Adding Input

```typescript
createGame({
  name: 'my-game',
  scenes: [{ key: 'game', class: GameScene, default: true }],
  input: {
    actions: {
      left:  { keys: ['LEFT', 'A'], touch: 'swipe_left' },
      right: { keys: ['RIGHT', 'D'], touch: 'swipe_right' },
      jump:  { keys: ['SPACE', 'UP'], touch: 'tap' },
    },
  },
});
```

Then in your scene:

```typescript
update(time: number, delta: number) {
  super.update(time, delta);
  if (this.actions.justPressed('jump')) {
    // Jump!
  }
  const dir = this.actions.axis('left', 'right');
  // dir.x is -1, 0, or 1
}
```

## Adding Entities

```typescript
import { Entity, Health, Movement } from 'clik-engine';

class GameScene extends BaseScene {
  private player!: Entity;

  create() {
    super.create();
    this.player = new Entity(this, 400, 300);
    this.player.addComponent('health', new Health(100));
    this.player.addComponent('movement', new Movement(200));
    this.entities.add(this.player);
  }
}
```

## Save System

```typescript
// Save
this.save.save(0, { score: 1000, level: 5 });

// Load
const data = this.save.load(0);
if (data) {
  console.log(data.score); // 1000
}
```

## Audio

```typescript
// Procedural sounds (no asset files needed)
this.audio.procedural.click();
this.audio.procedural.merge(3);
this.audio.procedural.explosion();

// Procedural music
this.audio.proceduralMusic.play();
this.audio.proceduralMusic.setIntensity(0.8);
```

## Scene Transitions

```typescript
this.director.go('game', 'menu', {
  type: 'fade',
  duration: 500,
});
```

## Debug

When `debug: true`:
- FPS overlay in top-left corner
- State inspector: `this.inspectState('game', () => ({ score, combo }))`
- Profiler dashboard: press backtick (`) to toggle
- All engine events logged to console with `[CLIK:*]` prefixes

## Next Steps

- [Architecture Overview](./architecture.md)
- [Entity-Component Guide](./systems/entity.md)
- [Network Multiplayer](./systems/network.md)
- [AI System](./systems/ai.md)
- [UI Components](./systems/ui.md)
