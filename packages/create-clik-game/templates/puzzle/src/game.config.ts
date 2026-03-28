import { ClikGameConfig, ScalePreset } from '@pvydro/clik-engine';
import { GameScene } from './scenes/GameScene';

export const config: ClikGameConfig = {
  name: '{{name}}',
  scale: ScalePreset.MOBILE_PORTRAIT,
  physics: 'none',
  debug: import.meta.env.DEV,
  devStartScene: 'game',
  scenes: [
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      up:    { keys: ['UP', 'W'], touch: 'swipe_up' },
      down:  { keys: ['DOWN', 'S'], touch: 'swipe_down' },
      left:  { keys: ['LEFT', 'A'], touch: 'swipe_left' },
      right: { keys: ['RIGHT', 'D'], touch: 'swipe_right' },
      confirm: { keys: ['SPACE', 'ENTER'], touch: 'tap' },
    },
  },
  save: { slots: 1, version: 1 },
};
