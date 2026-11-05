import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config.js';
import { params } from './utils/params.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: params.has('debug'),
    },
  },
  scene: [BootScene, GameScene, HudScene],
});

// Development builds expose the game instance for console inspection.
if (import.meta.env.DEV) window.__rewind = game;
