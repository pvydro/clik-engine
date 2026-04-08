// Harness — multi-instance headless test harness for clik-engine games.
//
// Boot many headless game instances from one script for bulk seed sweeps,
// scripted scenario tests, random-input fuzzing, and Claude-driven exploration.
//
//   const report = await HarnessRunner.run({
//     config: myGameConfig,
//     scenario: {
//       strategy: new RandomFuzzStrategy({ actions: ['jump','left','right'] }),
//       maxFrames: 600,
//       collectMetrics: ctx => ({ score: ctx.snapshot().score }),
//     },
//     seeds: { count: 100 },
//     concurrency: 8,
//   });
//
// In a browser, install the reporter once so Claude can drive runs via
// `preview_eval`:
//
//   HarnessReporter.install();
//   await window.__CLIK_HARNESS.run({ … });
//   window.__CLIK_HARNESS.summary();

export { HeadlessRunner } from './HeadlessRunner';
export type { HeadlessRunnerOpts } from './HeadlessRunner';
export { InstancePool } from './InstancePool';
export type { PoolOpts } from './InstancePool';
export { HarnessRunner } from './HarnessRunner';
export type { RunOpts } from './HarnessRunner';
export { HarnessReporter } from './HarnessReporter';
export { installRandom, getRandom, getSeed, HARNESS_RANDOM_KEY, HARNESS_SEED_KEY } from './RandomService';
export type { Scenario, ScenarioContext, ScenarioStrategy, RunResult, HarnessReport } from './Scenario';
export { ScriptedStrategy } from './strategies/ScriptedStrategy';
export type { ScriptStep } from './strategies/ScriptedStrategy';
export { RandomFuzzStrategy } from './strategies/RandomFuzzStrategy';
export type { FuzzOpts } from './strategies/RandomFuzzStrategy';
export { PolicyStrategy } from './strategies/PolicyStrategy';
export type { PolicyFn } from './strategies/PolicyStrategy';
