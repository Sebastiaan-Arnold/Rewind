/**
 * A single run: generates the floor, spawns actors and drives gameplay.
 * On player death the scene restarts with a new seed (new layout).
 */
import Phaser from 'phaser';
import { FX } from '../config.js';
import { createRng, randomSeed } from '../utils/rng.js';
import { readRoomTemplate } from '../world/RoomTemplate.js';
import { generateFloor } from '../world/FloorGenerator.js';
import Floor from '../world/Floor.js';
import Player from '../entities/Player.js';
import Zombie from '../entities/Zombie.js';
import VhsEffect from '../fx/VhsFilter.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.seed = data.seed;
  }

  create() {
    console.log(`Rewind run seed: ${this.seed}   (replay with ?seed=${this.seed})`);
    this.input.mouse?.disableContextMenu();

    // Floor
    const rng = createRng(this.seed);
    const templates = this.registry.get('roomKeys').map((key) => readRoomTemplate(this, key));
    const plan = generateFloor(templates, rng);
    this.floor = new Floor(this, plan);
    console.log('Room order:', plan.rooms.map((r) => r.template.label).join(' -> '));

    this.physics.world.resume(); // previous run may have ended paused
    this.physics.world.setBounds(0, 0, this.floor.widthPx, this.floor.heightPx);
    this.cameras.main.setBounds(0, 0, this.floor.widthPx, this.floor.heightPx);

    // Actors
    this.player = new Player(this, this.floor.playerSpawn.x, this.floor.playerSpawn.y);
    this.enemies = this.add.group();
    for (const spawn of this.floor.enemySpawns) {
      if (spawn.kind === 'zombie') this.enemies.add(new Zombie(this, spawn.x, spawn.y));
    }

    // Collisions
    this.physics.add.collider(this.player, this.floor.layer);
    this.physics.add.collider(this.enemies, this.floor.layer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player, this.enemies);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Post-processing
    this.vhs = new VhsEffect(this);

    // HUD overlay (separate scene, unaffected by the VHS filter)
    this.runStartedAt = this.time.now;
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    else this.scene.get('Hud').resetRun();
  }

  update(time, delta) {
    this.player.update(time);
    for (const enemy of this.enemies.getChildren()) enemy.update(time, this.player, this.floor);
    this.vhs.update(time, delta);
  }

  /** Briefly pauses physics on impact to add weight to hits. */
  hitstop(ms = FX.hitstopMs) {
    const world = this.physics.world;
    if (world.isPaused) return;
    world.pause();
    this.time.delayedCall(ms, () => {
      if (!this.player.dead) world.resume();
    });
  }

  onPlayerHit(hits) {
    this.vhs.setDamage(hits);
    this.cameras.main.shake(160, 0.006);
    this.hitstop(90);
  }

  onPlayerDied() {
    this.physics.world.pause();
    this.vhs.setDamage(3);
    this.vhs.hold(1.2);
    this.cameras.main.shake(400, 0.01);
    this.scene.get('Hud').showMessage('TRACKING LOST');
    this.time.delayedCall(900, () => this.scene.get('Hud').showMessage('<< REWIND'));
    // Restart the era with a new layout.
    this.time.delayedCall(1800, () => this.scene.restart({ seed: randomSeed() }));
  }
}
