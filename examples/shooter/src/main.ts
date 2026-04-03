import { createGame, ScalePreset, PlaytestReporter } from 'clik-engine';
import { GameScene } from './scenes/GameScene';

createGame({
  name: 'space-shooter',
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
      move_up:    { keys: ['UP', 'W'] },
      move_down:  { keys: ['DOWN', 'S'] },
      shoot:      { keys: ['SPACE'], pointer: 'down' },
    },
  },
  plugins: [
    { plugin: new PlaytestReporter({ trackEvents: ['player:death', 'enemy:killed', 'score:changed'] }) },
  ],
});
