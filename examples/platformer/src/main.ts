import { createGame, ScalePreset, PlaytestReporter } from 'clik-engine';
import { GameScene } from './scenes/GameScene';

createGame({
  name: 'platformer',
  scale: ScalePreset.DESKTOP,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  scenes: [
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      move_left:  { keys: ['LEFT', 'A'] },
      move_right: { keys: ['RIGHT', 'D'] },
      jump:       { keys: ['SPACE', 'UP', 'W'] },
      attack:     { keys: ['X', 'J'] },
      dash:       { keys: ['SHIFT', 'K'] },
      down:       { keys: ['DOWN', 'S'] },
    },
  },
  plugins: [
    { plugin: new PlaytestReporter({ trackEvents: ['player:death', 'enemy:killed', 'combo:hit'] }) },
  ],
});
