# AI System

Behavior trees and steering behaviors for NPC intelligence.

## Behavior Trees

Decision-making framework with composable nodes:

```typescript
import {
  BehaviorTree, Blackboard, NodeStatus,
  Sequence, Selector, Condition, Action, Wait,
  BehaviorTreeComponent,
} from '@pvydro/clik-engine';

// Build a patrol → chase → attack tree
const tree = new Selector([
  // If enemy visible AND in range → attack
  new Sequence([
    new Condition(bb => bb.get<boolean>('enemyVisible')!),
    new Condition(bb => bb.get<number>('distToEnemy')! < 50),
    new Action(bb => { attack(); return NodeStatus.SUCCESS; }),
  ]),
  // If enemy visible → chase
  new Sequence([
    new Condition(bb => bb.get<boolean>('enemyVisible')!),
    new Action(bb => { chaseTarget(); return NodeStatus.RUNNING; }),
  ]),
  // Otherwise → patrol
  new Action(bb => { patrol(); return NodeStatus.RUNNING; }),
]);

// Attach to entity as a component
const enemy = new Entity(this, 100, 100);
enemy.addComponent('ai', new BehaviorTreeComponent(tree));
// Blackboard auto-seeded with entity x, y each frame
```

### Node Types

| Node | Type | Behavior |
|------|------|----------|
| `Sequence` | Composite | Run children in order. Fail on first failure. |
| `Selector` | Composite | Run children in order. Succeed on first success. |
| `Parallel` | Composite | Run all children simultaneously. |
| `Inverter` | Decorator | Flip SUCCESS ↔ FAILURE. |
| `Succeeder` | Decorator | Always return SUCCESS. |
| `Repeater` | Decorator | Repeat child N times. |
| `Wait` | Decorator | Wait for duration, then SUCCESS. |
| `Action` | Leaf | Execute callback, return status. |
| `Condition` | Leaf | Check boolean, SUCCESS if true. |

## Steering Behaviors

Physics-based movement for natural NPC locomotion:

```typescript
import { SteeringComponent } from '@pvydro/clik-engine';

const enemy = new Entity(this, 200, 200);
const steering = new SteeringComponent(100, 50); // maxSpeed, maxForce
enemy.addComponent('steering', steering);

// In update or behavior tree action:
steering.seek({ x: player.x, y: player.y });
steering.separate(otherEnemyPositions, 40);
// Forces are combined and applied automatically each frame
```

### Available Behaviors

| Behavior | What it does |
|----------|-------------|
| `seek(target)` | Steer toward target at max speed |
| `flee(target)` | Steer away from target |
| `arrive(target, slowRadius)` | Seek with deceleration near target |
| `wander()` | Gentle random steering |
| `separate(neighbors)` | Push away from nearby entities |
| `addForce(vec, weight)` | Add any custom force |

### SteeringCalculator (Manual Use)

For more control, use `SteeringCalculator` directly:

```typescript
import { Steering, SteeringCalculator } from '@pvydro/clik-engine';

const calc = new SteeringCalculator(100); // maxForce
calc.add(Steering.seek(pos, target, velocity, maxSpeed), 1.0);
calc.add(Steering.separation(pos, neighbors), 0.5);
const force = calc.calculate(); // Combined, truncated force vector
```
