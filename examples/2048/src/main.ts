import { createGame, ScalePreset } from 'clik-engine';
import { GameScene } from './scenes/GameScene';

createGame({
  name: '2048',
  scale: ScalePreset.MOBILE_PORTRAIT,
  physics: 'none',
  debug: import.meta.env.DEV,
  scenes: [
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      up:    { keys: ['UP', 'W'], touch: 'swipe_up' },
      down:  { keys: ['DOWN', 'S'], touch: 'swipe_down' },
      left:  { keys: ['LEFT', 'A'], touch: 'swipe_left' },
      right: { keys: ['RIGHT', 'D'], touch: 'swipe_right' },
    },
  },
  save: { slots: 1, version: 1 },
});
