import { createGame, ScalePreset, ConsoleReporter } from 'clik-engine';
import { SandboxScene } from './scenes/SandboxScene';

ConsoleReporter.engine('Dev harness booting...');

const game = createGame({
  name: 'clik-dev-harness',
  scale: ScalePreset.DESKTOP,
  physics: 'arcade',
  debug: true,
  scenes: [
    { key: 'sandbox', class: SandboxScene, default: true },
  ],
  input: { actions: {} },
});
