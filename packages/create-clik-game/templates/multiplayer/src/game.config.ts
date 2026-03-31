import { ClikGameConfig, ScalePreset } from 'clik-engine';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';

export const config: ClikGameConfig = {
  name: '{{name}}',
  scale: ScalePreset.AUTO,
  physics: 'arcade',
  debug: import.meta.env.DEV,
  scenes: [
    { key: 'lobby', class: LobbyScene, default: true },
    { key: 'game', class: GameScene },
  ],
  network: {
    url: 'ws://localhost:8080',
  },
  input: {
    actions: {
      up:    { keys: ['UP', 'W'] },
      down:  { keys: ['DOWN', 'S'] },
      left:  { keys: ['LEFT', 'A'] },
      right: { keys: ['RIGHT', 'D'] },
    },
  },
};
