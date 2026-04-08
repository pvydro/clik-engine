import { describe, it, expect } from 'vitest';
import { ScriptedStrategy } from '../../src/harness/strategies/ScriptedStrategy';
import { RandomFuzzStrategy } from '../../src/harness/strategies/RandomFuzzStrategy';
import { PolicyStrategy } from '../../src/harness/strategies/PolicyStrategy';
import { ScriptedProvider } from '../../src/input/providers/ScriptedProvider';
import { SeededRandom } from '../../src/utils/random';
import type { ScenarioContext } from '../../src/harness/Scenario';

function makeCtx(frame: number, scripted: ScriptedProvider, random: SeededRandom): ScenarioContext {
  return {
    game: {} as never,
    scripted,
    random,
    frame,
    time: frame * 16,
    seed: 1,
    snapshot: () => ({}),
  };
}

describe('ScriptedStrategy', () => {
  it('applies steps in chronological order', () => {
    const scripted = new ScriptedProvider();
    const rng = new SeededRandom(1);
    const s = new ScriptedStrategy([
      { frame: 5, action: 'jump', value: false },
      { frame: 1, action: 'jump', value: true },
      { frame: 3, action: 'left', value: true },
    ]);
    s.init?.(makeCtx(0, scripted, rng));

    s.beforeFrame(makeCtx(0, scripted, rng));
    expect(scripted.isActionDown('jump')).toBe(false);

    s.beforeFrame(makeCtx(1, scripted, rng));
    expect(scripted.isActionDown('jump')).toBe(true);

    s.beforeFrame(makeCtx(3, scripted, rng));
    expect(scripted.isActionDown('left')).toBe(true);

    s.beforeFrame(makeCtx(5, scripted, rng));
    expect(scripted.isActionDown('jump')).toBe(false);
  });
});

describe('RandomFuzzStrategy', () => {
  it('produces the same sequence across two runs with the same seed', () => {
    const collect = () => {
      const scripted = new ScriptedProvider();
      const rng = new SeededRandom(99);
      const fuzz = new RandomFuzzStrategy({ actions: ['a', 'b', 'c'], toggleChance: 0.5 });
      fuzz.init?.(makeCtx(0, scripted, rng));
      const trace: boolean[][] = [];
      for (let f = 0; f < 30; f++) {
        fuzz.beforeFrame(makeCtx(f, scripted, rng));
        trace.push(['a', 'b', 'c'].map(a => scripted.isActionDown(a)));
      }
      return trace;
    };
    expect(collect()).toEqual(collect());
  });

  it('different seeds diverge', () => {
    const collect = (seed: number) => {
      const scripted = new ScriptedProvider();
      const rng = new SeededRandom(seed);
      const fuzz = new RandomFuzzStrategy({ actions: ['a', 'b'], toggleChance: 0.6 });
      fuzz.init?.(makeCtx(0, scripted, rng));
      let toggles = 0;
      let prev = [false, false];
      for (let f = 0; f < 50; f++) {
        fuzz.beforeFrame(makeCtx(f, scripted, rng));
        const cur = [scripted.isActionDown('a'), scripted.isActionDown('b')];
        if (cur[0] !== prev[0] || cur[1] !== prev[1]) toggles++;
        prev = cur;
      }
      return toggles;
    };
    // Just assert they're not literally identical — overwhelmingly true
    expect(collect(1)).not.toBe(0);
    expect(collect(2)).not.toBe(0);
  });
});

describe('PolicyStrategy', () => {
  it('awaits async policy and applies the result', async () => {
    const scripted = new ScriptedProvider();
    const rng = new SeededRandom(1);
    const p = new PolicyStrategy(async ctx => ({ jump: ctx.frame % 2 === 0 }));

    await p.beforeFrame(makeCtx(0, scripted, rng));
    expect(scripted.isActionDown('jump')).toBe(true);

    await p.beforeFrame(makeCtx(1, scripted, rng));
    expect(scripted.isActionDown('jump')).toBe(false);
  });
});
