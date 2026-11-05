// Loads everything the game needs, then starts the first run.
import Phaser from 'phaser';
import { makePlaceholderTextures } from '../utils/placeholderArt.js';
import { seedFromUrl } from '../utils/params.js';
import { randomSeed } from '../utils/rng.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('tiles', 'assets/tiles/mall-placeholder.png');

    // rooms.json lists the room files. As soon as it arrives, queue each room.
    this.load.json('room-list', 'rooms/rooms.json');
    this.load.on('filecomplete-json-room-list', (_key, _type, data) => {
      for (const name of data.rooms) {
        this.load.tilemapTiledJSON(`room:${name}`, `rooms/${name}.json`);
      }
    });
  }

  create() {
    makePlaceholderTextures(this);
    const names = this.cache.json.get('room-list').rooms;
    // The registry is a shared notebook every scene can read.
    this.registry.set('roomKeys', names.map((n) => `room:${n}`));
    this.scene.start('Game', { seed: seedFromUrl() ?? randomSeed() });
  }
}
