import Phaser from 'phaser';
import { makeCharacterTextures } from '../art/characters.js';
import { LEVELS } from '../config.js';
import { params } from '../utils/params.js';

/** Loads shared assets and levels, then opens the title screen. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('tiles', 'assets/tiles/mall-placeholder.png');
    for (const name of LEVELS) this.load.tilemapTiledJSON(`level:${name}`, `levels/${name}.json`);
  }

  create() {
    makeCharacterTextures(this);
    // `?play` skips the title screen during development.
    if (params.has('play')) this.scene.start('Game', { level: LEVELS[0] });
    else this.scene.start('Title');
  }
}
