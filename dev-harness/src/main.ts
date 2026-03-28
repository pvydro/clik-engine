import { createGame, ScalePreset, ConsoleReporter } from 'clik-engine';
import { SandboxScene } from './scenes/SandboxScene';
import { TransitionTestScene } from './scenes/TransitionTestScene';
import { KitchenSink } from './scenes/KitchenSink';

ConsoleReporter.engine('Dev harness booting...');

const game = createGame({
  name: 'clik-dev-harness',
  scale: ScalePreset.DESKTOP,
  physics: 'arcade',
  debug: true,
  scenes: [
    { key: 'sandbox', class: SandboxScene, default: true },
    { key: 'transition-test', class: TransitionTestScene },
    { key: 'kitchen-sink', class: KitchenSink },
  ],
  input: { actions: {} },
});
