import { createGame, ScalePreset, PlaytestReporter } from 'clik-engine';
import { IntroScene } from './scenes/IntroScene';
import { GameScene } from './scenes/GameScene';

createGame({
  name: 'boss-fight',
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
      attack:     { keys: ['X', 'J'], pointer: 'down' },
      dodge:      { keys: ['SPACE', 'SHIFT'] },
    },
  },
  plugins: [
    { plugin: new PlaytestReporter({ trackEvents: ['player:death', 'boss:phase', 'boss:defeated'] }) },
  ],
});
