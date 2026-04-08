import {
  ConsoleReporter,
  HarnessReporter,
  RandomFuzzStrategy,
  ScriptedStrategy,
  ScalePreset,
  type ClikGameConfig,
} from 'clik-engine';
import { HarnessDemoScene } from './scenes/HarnessDemoScene';

ConsoleReporter.engine('Multi-instance harness page booting...');

const reporter = HarnessReporter.install();

const baseConfig: ClikGameConfig = {
  name: 'clik-harness-demo',
  scale: ScalePreset.DESKTOP,
  width: 800,
  height: 600,
  scenes: [{ key: 'harness-demo', class: HarnessDemoScene, default: true }],
  input: {
    actions: {
      left: { keys: ['LEFT'] },
      right: { keys: ['RIGHT'] },
      jump: { keys: ['SPACE'] },
    },
  },
};

const status = document.getElementById('status') as HTMLDivElement;
const out = document.getElementById('out') as HTMLPreElement;
const runFuzzBtn = document.getElementById('run-fuzz') as HTMLButtonElement;
const runScriptBtn = document.getElementById('run-script') as HTMLButtonElement;
const dumpBtn = document.getElementById('dump') as HTMLButtonElement;

function setBusy(busy: boolean): void {
  runFuzzBtn.disabled = busy;
  runScriptBtn.disabled = busy;
}

async function runFuzz(): Promise<void> {
  setBusy(true);
  status.textContent = 'Running fuzz x25...';
  try {
    const report = await reporter.run({
      config: baseConfig,
      scenario: {
        strategy: new RandomFuzzStrategy({ actions: ['left', 'right', 'jump'], toggleChance: 0.3 }),
        maxFrames: 240,
        collectMetrics: ctx => {
          const snap = ctx.snapshot() as { 'harness-demo'?: { score: number; won: boolean; pos: number; target: number } };
          return snap['harness-demo'] ?? {};
        },
        tags: ['fuzz'],
      },
      seeds: { count: 25 },
      concurrency: 8,
      onProgress: (done, total) => {
        status.textContent = `fuzz ${done}/${total}...`;
      },
    });
    status.textContent = `fuzz done: ${report.passed}/${report.total} ok in ${report.durationMs.toFixed(0)}ms`;
    out.textContent = JSON.stringify(reporter.summary(), null, 2);
  } catch (err) {
    status.textContent = `error: ${(err as Error).message}`;
  } finally {
    setBusy(false);
  }
}

async function runScripted(): Promise<void> {
  setBusy(true);
  status.textContent = 'Running scripted x25...';
  try {
    const report = await reporter.run({
      config: baseConfig,
      scenario: {
        strategy: new ScriptedStrategy([
          { frame: 0,   action: 'right', value: true  },
          { frame: 120, action: 'right', value: false },
          { frame: 120, action: 'left',  value: true  },
          { frame: 240, action: 'left',  value: false },
        ]),
        maxFrames: 240,
        collectMetrics: ctx => {
          const snap = ctx.snapshot() as { 'harness-demo'?: Record<string, unknown> };
          return snap['harness-demo'] ?? {};
        },
        tags: ['scripted'],
      },
      seeds: { count: 25 },
      concurrency: 8,
      onProgress: (done, total) => {
        status.textContent = `scripted ${done}/${total}...`;
      },
    });
    status.textContent = `scripted done: ${report.passed}/${report.total} ok in ${report.durationMs.toFixed(0)}ms`;
    out.textContent = JSON.stringify(reporter.summary(), null, 2);
  } catch (err) {
    status.textContent = `error: ${(err as Error).message}`;
  } finally {
    setBusy(false);
  }
}

runFuzzBtn.addEventListener('click', runFuzz);
runScriptBtn.addEventListener('click', runScripted);
dumpBtn.addEventListener('click', () => {
  out.textContent = JSON.stringify(reporter.lastReport, null, 2);
});

// Expose the game config so Claude / console users can run ad-hoc sweeps
// via the /clik-bulk-test skill:
//   await window.__CLIK_HARNESS.run({ config: window.__HARNESS_CONFIG, ... })
(globalThis as Record<string, unknown>).__HARNESS_CONFIG = baseConfig;

ConsoleReporter.harness('multi.html ready — window.__CLIK_HARNESS installed');
