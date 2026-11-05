import Phaser from 'phaser';
import { makeCharacterTextures } from '../art/characters.js';
import { seedFromUrl } from '../utils/params.js';
import { randomSeed } from '../utils/rng.js';

/** Loads shared assets and the room manifest, then starts the first run. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('tiles', 'assets/tiles/mall-placeholder.png');

    // Queue every room listed in the manifest as soon as the manifest loads.
    this.load.json('room-list', 'rooms/rooms.json');
    this.load.on('filecomplete-json-room-list', (_key, _type, data) => {
      for (const name of data.rooms) {
        this.load.tilemapTiledJSON(`room:${name}`, `rooms/${name}.json`);
      }
    });
  }

  create() {
    makeCharacterTextures(this);
    const names = this.cache.json.get('room-list').rooms;
    this.registry.set('roomKeys', names.map((n) => `room:${n}`));
    this.scene.start('Game', { seed: seedFromUrl() ?? randomSeed() });
  }
}
