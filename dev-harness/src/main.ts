import { createGame, ScalePreset, ConsoleReporter, PlaytestReporter, PCGPlugin } from 'clik-engine';
import { SandboxScene } from './scenes/SandboxScene';
import { TransitionTestScene } from './scenes/TransitionTestScene';
import { KitchenSink } from './scenes/KitchenSink';
import { PCGLabScene } from './scenes/PCGLabScene';

ConsoleReporter.engine('Dev harness booting...');

const playtestReporter = new PlaytestReporter();
const pcgPlugin = new PCGPlugin();

const game = createGame({
  name: 'clik-dev-harness',
  scale: ScalePreset.DESKTOP,
  physics: 'arcade',
  debug: true,
  scenes: [
    { key: 'sandbox', class: SandboxScene, default: true },
    { key: 'transition-test', class: TransitionTestScene },
    { key: 'kitchen-sink', class: KitchenSink },
    { key: 'pcg-lab', class: PCGLabScene },
  ],
  input: {
    actions: {
      pcg_gen_1: { keys: ['ONE'] },
      pcg_gen_2: { keys: ['TWO'] },
      pcg_gen_3: { keys: ['THREE'] },
      pcg_regen: { keys: ['R'] },
      pcg_diff_up: { keys: ['F'] },
      pcg_diff_down: { keys: ['D'] },
      pcg_constraints: { keys: ['C'] },
    },
  },
  plugins: [
    { plugin: pcgPlugin },
    { plugin: playtestReporter },
  ],
});

// Expose globally for Claude Preview tools and console access
(globalThis as Record<string, unknown>).__PLAYTEST = playtestReporter;
