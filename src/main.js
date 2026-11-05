// Entry point: creates the Phaser game and lists the scenes.
import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config.js';
import { params } from './utils/params.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO, // WebGL if available (needed for the VHS shader), else Canvas
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#000000',
  pixelArt: true, // keep pixels crisp when scaled up (no blurring)
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT, // scale to fit the window, keeping the 16:9 shape
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade', // simple, fast physics: boxes and circles, no rotation
    arcade: {
      gravity: { x: 0, y: 0 }, // top-down: nothing falls
      debug: params.has('debug'), // add ?debug to the URL to see hitboxes
    },
  },
  // Scenes are like separate "screens" or layers. Boot runs first.
  scene: [BootScene, GameScene, HudScene],
});

// While developing (npm run dev), expose the game in the browser console
// as `__rewind` so you can poke at it. Not included in the published build.
if (import.meta.env.DEV) window.__rewind = game;
