# Entity-Component System

Composition-based game object architecture.

## Core Concepts

**Entity** extends `Phaser.GameObjects.Container`. Add behavior via **Components**.
**EntityRegistry** provides O(1) queries by type and tag.

## Creating Entities

```typescript
import { Entity, Health, Movement, Lifetime } from '@pvydro/clik-engine';

const enemy = new Entity(this, 100, 200);
enemy.entityType = 'enemy';
enemy.addTag('hostile');

enemy.addComponent('health', new Health(50));
enemy.addComponent('movement', new Movement(120));
enemy.addComponent('lifetime', new Lifetime(10000)); // auto-destroy after 10s

this.entities.add(enemy);
```

## Querying Entities

```typescript
// By type (O(1) index lookup)
const enemies = this.entities.getByType('enemy');

// By tag
const hostiles = this.entities.getByTag('hostile');
```

## Built-in Components

| Component | Purpose |
|-----------|---------|
| `Health` | HP tracking, damage/heal, death callbacks |
| `Movement` | Velocity-based movement with friction |
| `Lifetime` | Auto-destroy after duration |
| `Timer` | Countdown with callback |
| `Collectible` | Item collection pattern |
| `Spawner` | Spawn entities on interval |
| `DragDrop` | Drag-to-reposition with snap-back |
| `Follower` | Follow target with easing |
| `Oscillator` | Bob/drift animations |
| `Interactable` | Click/hover detection zones |
| `FlashOnHit` | Visual damage feedback (tint flash) |
| `Patrol` | Waypoint-based patrolling |
| `BehaviorTreeComponent` | AI decision-making (ticks BehaviorTree) |
| `SteeringComponent` | Physics-based NPC movement |
| `NetworkSync` | Multiplayer entity synchronization |

## Custom Components

```typescript
import { Component } from '@pvydro/clik-engine';

class Inventory extends Component {
  private items: string[] = [];

  onAttach() {
    // Called when added to entity
    console.log('Inventory attached to', this.entity.entityType);
  }

  update(delta: number) {
    // Called each frame (via EntityRegistry.updateAll)
  }

  onDetach() {
    // Called when removed or entity destroyed
    this.items = [];
  }

  addItem(item: string) { this.items.push(item); }
  hasItem(item: string) { return this.items.includes(item); }
}

// Usage
entity.addComponent('inventory', new Inventory());
entity.getComponent<Inventory>('inventory')?.addItem('key');
```

## EntityFactory

Pre-define entity blueprints:

```typescript
import { EntityFactory } from '@pvydro/clik-engine';

const factory = new EntityFactory();
factory.register('enemy', (scene, x, y) => {
  const e = new Entity(scene, x, y);
  e.entityType = 'enemy';
  e.addComponent('health', new Health(50));
  e.addComponent('movement', new Movement(100));
  return e;
});

// Spawn anywhere
const enemy = factory.create(this, 'enemy', 200, 300);
this.entities.add(enemy);
```
