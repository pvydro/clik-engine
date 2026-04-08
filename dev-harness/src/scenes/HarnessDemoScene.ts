import { BaseScene, getRandom } from 'clik-engine';

/**
 * Tiny scene used by the multi-instance harness demo (multi.html).
 *
 * No assets, no UI — just a deterministic mini-simulation:
 *  - On `create()` we pick a random target X from the per-instance seeded RNG
 *  - Each frame we honour the `left` / `right` actions to move a virtual pos
 *  - We expose `score = -|target - pos|` via `inspectState` so the harness can
 *    read it from the run snapshot
 *  - A run "wins" when `pos` reaches `target` (within 4 px)
 */
export class HarnessDemoScene extends BaseScene {
  private pos = 0;
  private target = 0;
  private won = false;

  constructor() {
    super({ key: 'harness-demo' });
  }

  create(): void {
    super.create();

    const rng = getRandom(this);
    this.target = rng ? rng.nextInt(-200, 200) : Math.floor(Math.random() * 400) - 200;
    this.pos = 0;
    this.won = false;

    this.inspectState('demo', () => ({
      pos: this.pos,
      target: this.target,
      score: -Math.abs(this.target - this.pos),
      won: this.won,
    }));
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.won) return;
    if (this.actions.isDown('left')) this.pos -= 2;
    if (this.actions.isDown('right')) this.pos += 2;
    if (Math.abs(this.target - this.pos) <= 4) {
      this.won = true;
    }
  }
}
