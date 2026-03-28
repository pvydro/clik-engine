import { ClikGameConfig, ScalePreset } from '@pvydro/clik-engine';
import { GameScene } from './scenes/GameScene';

export const config: ClikGameConfig = {
  name: '{{name}}',
  scale: ScalePreset.DESKTOP,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  devStartScene: 'game',
  scenes: [
    { key: 'game', class: GameScene, default: true },
  ],
  input: {
    actions: {
      move_left:  { keys: ['LEFT', 'A'] },
      move_right: { keys: ['RIGHT', 'D'] },
      jump:       { keys: ['SPACE', 'UP', 'W'], touch: 'tap' },
    },
  },
  save: { slots: 1, version: 1 },
};
