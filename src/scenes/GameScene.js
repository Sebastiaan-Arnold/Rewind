/**
 * A single run: generates the floor, spawns actors and drives gameplay.
 * On player death the tape rewinds and the scene restarts with a new seed.
 */
import Phaser from 'phaser';
import { FX, CAMERA, DEPTH, VIEW_W, VIEW_H } from '../config.js';
import { createRng, randomSeed } from '../utils/rng.js';
import { readRoomTemplate } from '../world/RoomTemplate.js';
import { generateFloor } from '../world/FloorGenerator.js';
import Floor from '../world/Floor.js';
import Player from '../entities/Player.js';
import Zombie from '../entities/Zombie.js';
import Lighting from '../lighting/Lighting.js';
import Effects from '../fx/Effects.js';
import Rewind from '../fx/Rewind.js';
import VhsEffect from '../fx/VhsFilter.js';

const REWIND_DELAY_MS = 700;
const REWIND_FRAMES = 54; // playback length at 60 fps
const REWIND_MAX_MS = 1400;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.seed = data.seed;
    this.restarting = false;
  }

  create() {
    console.log(`Rewind run seed: ${this.seed}   (replay with ?seed=${this.seed})`);
    this.input.mouse?.disableContextMenu();

    // Floor
    const rng = createRng(this.seed);
    const templates = this.registry.get('roomKeys').map((key) => readRoomTemplate(this, key));
    const plan = generateFloor(templates, rng);
    this.floor = new Floor(this, plan);
    this.floor.layer.setDepth(DEPTH.floor);
    console.log('Room order:', plan.rooms.map((r) => r.template.label).join(' -> '));

    this.physics.world.resume(); // previous run may have ended paused
    this.physics.world.setBounds(0, 0, this.floor.widthPx, this.floor.heightPx);
    this.cameras.main.setBounds(0, 0, this.floor.widthPx, this.floor.heightPx);

    // Systems
    this.effects = new Effects(this);
    this.rewind = new Rewind();
    this.rewinding = false;

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
    this.look = new Phaser.Math.Vector2();
    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);

    // Lighting and post-processing
    this.lighting = new Lighting(this, this.floor);
    this.vhs = new VhsEffect(this);

    // HUD overlay (separate scene, unaffected by the VHS filter)
    this.runStartedAt = this.time.now;
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    else this.scene.get('Hud').resetRun();
  }

  update(time, delta) {
    if (this.rewinding) {
      if (!this.rewind.step(this.player)) this.restartRun();
    } else {
      this.player.update(time, delta);
      this.rewind.record(time, this.player);
    }
    for (const enemy of this.enemies.getChildren()) enemy.update(time, delta, this.player, this.floor);

    this.updateCamera();
    this.lighting.update(time, this.cameras.main, this.player);
    this.vhs.update(time, delta);
  }

  /** Leads the camera toward the aim direction. */
  updateCamera() {
    const target = new Phaser.Math.Vector2();
    if (!this.player.dead) {
      const pointer = this.input.activePointer;
      const dx = pointer.x - VIEW_W / 2;
      const dy = pointer.y - VIEW_H / 2;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const k = (Math.min(1, len / (VIEW_H / 2)) * CAMERA.lookAhead) / len;
        target.set(dx * k, dy * k);
      }
    }
    this.look.lerp(target, 0.06);
    this.cameras.main.setFollowOffset(-this.look.x, -this.look.y);
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
    const hud = this.scene.get('Hud');
    this.physics.world.pause();
    this.vhs.setDamage(3);
    this.vhs.hold(1.2);
    this.cameras.main.shake(400, 0.01);
    hud.showMessage('TRACKING LOST');

    this.time.delayedCall(REWIND_DELAY_MS, () => {
      hud.showMessage('<< REWIND');
      this.vhs.hold(0.7);
      this.rewind.start(REWIND_FRAMES);
      this.rewinding = true;
    });
    this.time.delayedCall(REWIND_DELAY_MS + REWIND_MAX_MS, () => this.restartRun());
  }

  restartRun() {
    if (this.restarting) return;
    this.restarting = true;
    this.scene.restart({ seed: randomSeed() });
  }
}
