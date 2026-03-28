import { createGame, ScalePreset } from 'clik-engine';
import { GameScene } from './scenes/GameScene';

createGame({
  name: 'card-match',
  scale: ScalePreset.MOBILE_PORTRAIT,
  physics: 'none',
  debug: import.meta.env.DEV,
  scenes: [{ key: 'game', class: GameScene, default: true }],
  input: { actions: {} },
  save: { slots: 1, version: 1 },
});
