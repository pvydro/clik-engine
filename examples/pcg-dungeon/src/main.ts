import { createGame, ScalePreset, PlaytestReporter, PCGPlugin } from 'clik-engine';
import { GameScene } from './scenes/GameScene';

const pcgPlugin = new PCGPlugin();
const playtestReporter = new PlaytestReporter({ trackEvents: ['floor:complete', 'item:collect', 'player:death'] });

createGame({
  name: 'pcg-dungeon',
  scale: ScalePreset.DESKTOP,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  scenes: [
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      move_up: { keys: ['W', 'UP'] },
      move_down: { keys: ['S', 'DOWN'] },
      move_left: { keys: ['A', 'LEFT'] },
      move_right: { keys: ['D', 'RIGHT'] },
      regenerate: { keys: ['R'] },
      next_level: { keys: ['N'] },
      difficulty_up: { keys: ['PLUS', 'EQUAL'] },
      difficulty_down: { keys: ['MINUS'] },
    },
  },
  plugins: [
    { plugin: pcgPlugin },
    { plugin: playtestReporter },
  ],
});

// Expose for console/Claude access
(globalThis as Record<string, unknown>).__PCG_PLUGIN = pcgPlugin;
