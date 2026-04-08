# Multi-Instance Headless Test Harness

Run many headless clik-engine game instances in parallel for bulk seed sweeps, scripted regression tests, random-input fuzzing, and Claude-driven policy exploration — all without rendering a single canvas.

*Added in `v2.3.0`. Source: [`packages/clik-engine/src/harness/`](../../packages/clik-engine/src/harness).*

---

## What it's for

| Use case | Strategy | Example |
|---|---|---|
| **Bulk seed sweep** — find bad seeds in a roguelike | `RandomFuzzStrategy` or a scripted "play-to-end" | "Which of these 500 dungeon seeds are unwinnable?" |
| **Scripted regression** — assert fixed inputs still produce a fixed outcome | `ScriptedStrategy` | "Frame 30 jump, frame 60 attack, score should be ≥ 5000" |
| **Input fuzz / stability** — smash random inputs, watch for crashes | `RandomFuzzStrategy` | "Run 100 instances smashing every action at random for 10s" |
| **Claude-driven exploration** — step-by-step policy | `PolicyStrategy` | `async ctx => { /* read snapshot, return actions */ }` |

The harness is designed to be driven from Claude via `preview_eval` against a singleton mounted on `window.__CLIK_HARNESS`, but everything works equally well from a Vitest suite or a plain JS script.

---

## How it works

### Boot path

- `HeadlessRunner` calls `createGame()` with `headless: true`. `createGame()` switches Phaser to `Phaser.HEADLESS`: no canvas parent, no audio, no RAF, debug overlay scenes skipped.
- A `ScriptedProvider` is appended to the `InputManager` so scenarios can press actions without any real DOM events. The built-in keyboard/touch/gamepad providers remain idle.
- A `SeededRandom(seed)` is installed on `game.registry` at key `__clikHarnessRandom` so scenes can opt into determinism (see [Determinism](#determinism)).
- After boot, `game.loop.stop()` halts Phaser's automatic step loop. The runner drives the game manually via `game.headlessStep(time, delta)` at a fixed delta (default 16.666 ms ≈ 60 fps), so runs fast-forward and never block on RAF.

### Per-frame loop

```
for frame in 0..maxFrames:
  strategy.beforeFrame(ctx)   # may write to ctx.scripted
  game.headlessStep(time, dt) # advances scenes, physics, plugins, etc.
  if scenario.shouldAbort(ctx): break
```

### Pool

`InstancePool.runAll(factories, { concurrency })` runs `concurrency` runners at a time. Each runner is built, run to completion, and **destroyed** before the next one reuses its slot — memory is capped at `concurrency × one-game` regardless of total batch size. Default concurrency is 8.

---

## The top-level API

```ts
import { HarnessRunner, RandomFuzzStrategy, type ClikGameConfig } from 'clik-engine';

const config: ClikGameConfig = { /* your normal game config */ };

const report = await HarnessRunner.run({
  config,
  scenario: {
    strategy: new RandomFuzzStrategy({
      actions: ['left', 'right', 'jump', 'attack'],
      toggleChance: 0.3,
    }),
    maxFrames: 600,
    collectMetrics: ctx => ctx.snapshot(),
    shouldAbort: ctx => (ctx.snapshot() as any)['main']?.gameOver === true ? 'died' : false,
    tags: ['fuzz'],
  },
  seeds: { count: 100 },       // or an explicit [1, 2, 3, ...] array
  concurrency: 8,
  onProgress: (done, total, result) => {
    console.log(`${done}/${total} — seed ${result.seed} ${result.ok ? 'ok' : 'failed'}`);
  },
});

console.log(report);
// {
//   total: 100, passed: 94, failed: 6, durationMs: 12430, avgFrames: 587,
//   runs: [ { ok, seed, frames, durationMs, abortReason?, error?, metrics?, finalSnapshot?, tags? }, ... ]
// }
```

### The browser-side singleton

```ts
import { HarnessReporter } from 'clik-engine';

HarnessReporter.install();   // idempotent — mounts on window.__CLIK_HARNESS

// Then, from a console or preview_eval:
await window.__CLIK_HARNESS.run({ config, scenario, seeds: { count: 25 } });

window.__CLIK_HARNESS.status;       // 'idle' | 'running' | 'done'
window.__CLIK_HARNESS.progress;     // { done, total }
window.__CLIK_HARNESS.summary();    // { status, total, passed, failed, durationMs, avgFrames }
window.__CLIK_HARNESS.lastReport;   // full HarnessReport
window.__CLIK_HARNESS.runs();       // all RunResults
window.__CLIK_HARNESS.failures();   // RunResults where !ok OR abortReason
window.__CLIK_HARNESS.bySeed(42);   // lookup
window.__CLIK_HARNESS.byTag('fuzz'); // filter by scenario.tags
window.__CLIK_HARNESS.abort();      // cooperative flag strategies may read
```

This is the surface Claude uses through the [`/clik-bulk-test`](../../.claude/skills/clik-bulk-test/SKILL.md) skill.

---

## Strategies

A strategy implements `ScenarioStrategy`:

```ts
interface ScenarioStrategy {
  init?(ctx: ScenarioContext): void | Promise<void>;
  beforeFrame(ctx: ScenarioContext): void | Promise<void>;
  done?(ctx: ScenarioContext): void;
}
```

`beforeFrame` runs *before* the game step. Mutate `ctx.scripted` (the `ScriptedProvider`) to apply inputs. The runner `await`s so strategies may be async.

### ScriptedStrategy — deterministic timeline

```ts
import { ScriptedStrategy } from 'clik-engine';

const strategy = new ScriptedStrategy([
  { frame: 30, action: 'jump',   value: true  },
  { frame: 32, action: 'jump',   value: false },
  { frame: 60, action: 'attack', value: true  },
  { frame: 64, action: 'attack', value: false },
]);
```

Steps may be unsorted — the strategy sorts on construction and consumes them in order. Perfect for reproducible regression tests across seeds: the *inputs* stay identical while the *RNG* varies.

### RandomFuzzStrategy — seeded per-frame toggles

```ts
import { RandomFuzzStrategy } from 'clik-engine';

const strategy = new RandomFuzzStrategy({
  actions: ['left', 'right', 'jump', 'attack'],
  toggleChance: 0.3,   // per action per frame
  resetOnInit: true,
});
```

Uses `ctx.random` (the per-instance `SeededRandom`), so **two runs with the same seed produce identical input streams**. This means fuzz failures are reproducible — drop the failing seed into a single-concurrency run to debug.

### PolicyStrategy — async `(ctx) => actions`

```ts
import { PolicyStrategy } from 'clik-engine';

const strategy = new PolicyStrategy(async ctx => {
  const snap = ctx.snapshot() as { 'main': { playerX: number; enemyX: number } };
  const main = snap['main'];
  return {
    left: main.enemyX < main.playerX,
    right: main.enemyX > main.playerX,
    attack: Math.abs(main.enemyX - main.playerX) < 50,
  };
});
```

The returned record is applied as a *full* action state — actions absent from the record are released. Use this for:
- Simple heuristic AI
- External policy calls (HTTP / IPC / `preview_eval`)
- Claude reading state each frame and deciding the next action

---

## Determinism

### Built-in

Every `HeadlessRunner` is given a `SeededRandom(seed)` and installs it on `game.registry` at `__clikHarnessRandom`. The same seed produces the same RNG stream, every run.

### Opting scenes in

Scenes that call bare `Math.random()` will **not** be deterministic across seeds. To make a scene reproducible:

```ts
import { BaseScene, getRandom } from 'clik-engine';

export class DungeonScene extends BaseScene {
  create() {
    super.create();
    const rng = getRandom(this);   // null when not running under the harness
    const room = rng ? rng.nextInt(1, 10) : randomInt(1, 10);
  }
}
```

`getRandom(scene)` returns `null` in production (no harness) so real gameplay is unaffected.

### What's already deterministic

- `SeededRandom` from `clik-engine` (`utils/random.ts`) — already seedable
- `DungeonGenerator`, `PlatformerGenerator`, `ArenaGenerator`, and all other PCG generators — already take a seed
- Physics: Phaser Arcade physics is deterministic *if* inputs are deterministic
- The `ScriptedProvider` — writes are applied in the order you make them; reads return them until changed

### What isn't

- Bare `Math.random()` calls in gameplay code (fix with `getRandom`)
- `Date.now()` / `performance.now()` used as game state (pass `ctx.time` instead)
- `setTimeout` / `setInterval` — use Phaser `scene.time` or fixed-delta counters
- Anything that talks to the network, localStorage of a shared game name, or the DOM

---

## The `ScenarioContext`

Passed to every strategy hook and the `shouldAbort` / `collectMetrics` callbacks.

| Field | Type | Notes |
|---|---|---|
| `game` | `Phaser.Game` | The headless instance |
| `scripted` | `ScriptedProvider` | Write inputs here (`set`, `pulse`, `apply`, `clear`) |
| `random` | `SeededRandom` | Per-instance RNG |
| `frame` | `number` | Frame counter, increments before each step |
| `time` | `number` | Synthetic clock in ms (frame × fixedDelta) |
| `seed` | `number` | The run seed |
| `snapshot()` | `() => Record<string, unknown>` | Full scene state (see below) |

### Snapshots

`ctx.snapshot()` returns:

```jsonc
{
  "frame": 237,
  "time": 3950.0,
  "seed": 42,
  "main": {           // one entry per active scene
    "stats":  { "hp": 73, "score": 1420 },   // keyed by inspector label
    "combat": { "inCombo": true,  "hits": 7 }
  }
}
```

Scenes populate this via the normal `BaseScene.inspectState(label, getter)` you'd use for the debug overlay — the harness mirrors those getters into a registry-backed store so they work with no inspector scene running. Register once in `create()`, read the values out of snapshots later.

```ts
create() {
  super.create();
  this.inspectState('stats',  () => ({ hp: this.player.hp, score: this.score }));
  this.inspectState('combat', () => ({ inCombo: this.combo.active, hits: this.combo.count }));
}
```

---

## `RunResult` and `HarnessReport`

```ts
interface RunResult {
  ok: boolean;                    // false if scenario threw during step
  seed: number;
  frames: number;                 // how many frames the run actually executed
  durationMs: number;             // wall-clock time for this single run
  abortReason?: string;           // set when shouldAbort() returned truthy
  error?: string;                 // set when a step threw
  metrics?: Record<string, unknown>;  // return value of scenario.collectMetrics
  finalSnapshot?: Record<string, unknown>;  // ctx.snapshot() at end of run
  tags?: string[];                // passthrough from scenario.tags
}

interface HarnessReport {
  total: number;
  passed: number;    // runs with ok=true AND no abortReason
  failed: number;
  durationMs: number;
  avgFrames: number;
  runs: RunResult[];
}
```

---

## Logging

New `[CLIK:HARNESS]` channel via `ConsoleReporter.harness(...)`. Filter with:

```ts
preview_console_logs({ search: "[CLIK:HARNESS]" })
```

You'll see lines like:

```
[CLIK:HARNESS] run starting: 100 instance(s), concurrency=8
[CLIK:HARNESS] runner booted seed=0
[CLIK:HARNESS] runner booted seed=1
...
[CLIK:HARNESS] runner error seed=47 frame=213: Cannot read properties of undefined
[CLIK:HARNESS] pool finished 100/100
[CLIK:HARNESS] run done: 94/100 passed in 12430ms
```

---

## Configuration additions

`ClikGameConfig` grew two optional fields:

```ts
interface ClikGameConfig {
  // ... all the existing fields ...

  /** Boot in Phaser.HEADLESS mode: no canvas, no audio, no rendering. */
  headless?: boolean;

  /** Extra InputProviders appended to the InputManager at boot. */
  inputProviders?: InputProvider[];
}
```

`HeadlessRunner` forces `headless: true`, `debug: false`, and always appends its own `ScriptedProvider` to whatever `inputProviders` you supplied. You normally don't set either field yourself — the runner handles it.

`InputManager` also gained matching methods:

```ts
inputManager.addProvider(provider);
inputManager.removeProvider(provider);
inputManager.getExtraProviders();
```

---

## Usage from Vitest

The harness runs fine in Vitest once you mock Phaser. See [`packages/clik-engine/tests/harness/HeadlessRunner.test.ts`](../../packages/clik-engine/tests/harness/HeadlessRunner.test.ts) for a reference mock with `headlessStep`, `loop.stop`, and `registry.set/get`. Typical Vitest use:

```ts
import { HarnessRunner, RandomFuzzStrategy } from 'clik-engine';

it('100 seeds survive the fuzzer', async () => {
  const report = await HarnessRunner.run({
    config,
    scenario: {
      strategy: new RandomFuzzStrategy({ actions: ['left', 'right', 'jump'] }),
      maxFrames: 600,
    },
    seeds: { count: 100 },
    concurrency: 8,
  });
  expect(report.runs.filter(r => r.error)).toHaveLength(0);
});
```

For pure-JS deterministic tests (no Phaser step) you can use the strategies directly — see [`packages/clik-engine/tests/harness/strategies.test.ts`](../../packages/clik-engine/tests/harness/strategies.test.ts).

---

## Usage from `dev-harness/multi.html`

The engine repo ships a reference demo page at [`dev-harness/multi.html`](../../dev-harness/multi.html) + [`dev-harness/src/multi.ts`](../../dev-harness/src/multi.ts). It boots a tiny `HarnessDemoScene` across 25 seeds under both fuzz and scripted strategies and surfaces the report on `window.__CLIK_HARNESS`. Launch it with:

```bash
npm run dev            # starts the dev harness at :5173
# then navigate to http://localhost:5173/multi.html
```

Under Claude Code:

```
preview_start("dev-harness")
preview_eval("location.href = '/multi.html'")
preview_eval("window.__CLIK_HARNESS.summary()")
```

---

## The `/clik-bulk-test` skill

`/clik-bulk-test` is the user-invocable Claude skill that drives this system end-to-end: boot a `multi.html`, launch a sweep, read failures, and drill into a failing seed. See [`.claude/skills/clik-bulk-test/SKILL.md`](../../.claude/skills/clik-bulk-test/SKILL.md) for the full workflow.

---

## API quick reference

| Symbol | Purpose |
|---|---|
| `HeadlessRunner` | One headless game instance + scenario; manual time stepping |
| `InstancePool.runAll(factories, opts)` | Run a batch with bounded concurrency |
| `HarnessRunner.run(opts)` | Top-level orchestrator: config + scenario + seeds → `HarnessReport` |
| `HarnessReporter.install()` | Mount `window.__CLIK_HARNESS` |
| `ScriptedStrategy` | Deterministic input timeline |
| `RandomFuzzStrategy` | Per-frame random toggles, seeded |
| `PolicyStrategy` | Async `(ctx) => actions` — external / Claude-driven |
| `ScriptedProvider` | `InputProvider` with `set` / `pulse` / `apply` / `clear` |
| `InputManager.addProvider(p)` | Plug an extra provider into any game |
| `installRandom(game, seed)` | Per-instance RNG on `game.registry` |
| `getRandom(scene)` | Read the harness RNG from inside a scene |
| `ClikGameConfig.headless` | Boot in `Phaser.HEADLESS` mode |
| `ClikGameConfig.inputProviders` | Extra providers appended at boot |
| `window.__CLIK_GAMES` | Registry of all currently-live Phaser.Game instances |
| `window.__CLIK_HARNESS` | The singleton reporter surface |

Types exported: `HeadlessRunnerOpts`, `PoolOpts`, `RunOpts`, `Scenario`, `ScenarioContext`, `ScenarioStrategy`, `RunResult`, `HarnessReport`, `ScriptStep`, `FuzzOpts`, `PolicyFn`.
