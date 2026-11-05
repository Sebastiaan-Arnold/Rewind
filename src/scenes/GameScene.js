/**
 * Plays one level. On player death the tape rewinds to the level start.
 */
import Phaser from 'phaser';
import { FX, CAMERA, VIEW_W, VIEW_H, ZOMBIE, STEALTH, FLASHLIGHT, LEVELS } from '../config.js';
import { readLevel } from '../world/Level.js';
import Floor from '../world/Floor.js';
import Player from '../entities/Player.js';
import Zombie from '../entities/Zombie.js';
import Device from '../entities/Device.js';
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
    this.levelName = data.level ?? LEVELS[0];
    this.restarting = false;
  }

  create() {
    this.input.mouse?.disableContextMenu();

    // Level
    this.floor = new Floor(this, readLevel(this, `level:${this.levelName}`));

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

    this.device = this.floor.device ? new Device(this, this.floor.device.x, this.floor.device.y) : null;

    // Collisions
    this.physics.add.collider(this.player, this.floor.layers);
    this.physics.add.collider(this.enemies, this.floor.layers);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player, this.enemies);

    // Camera
    this.look = new Phaser.Math.Vector2();
    this.cameras.main.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);

    // Lighting and post-processing
    this.lighting = new Lighting(this, this.floor);
    this.vhs = new VhsEffect(this);

    // HUD overlay (separate scene, unaffected by the VHS filter)
    this.runStartedAt = null; // set on the first frame (game loop time)
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    else this.scene.get('Hud').resetRun();
  }

  update(time, delta) {
    this.runStartedAt ??= time;
    if (this.rewinding) {
      if (!this.rewind.step(this.player)) this.restartRun();
    } else {
      this.player.update(time, delta);
      this.rewind.record(time, this.player);
    }
    const sightRange = this.zombieSightRange();
    for (const enemy of this.enemies.getChildren()) enemy.update(time, delta, this.player, this.floor, sightRange);

    if (this.device) {
      this.device.update(time);
      if (!this.player.dead && !this.player.frozen && this.device.touches(this.player)) this.completeLevel();
    }

    this.updateCamera();
    this.lighting.update(time, this.cameras.main, this.player, this.device ? [this.device.light()] : []);
    this.vhs.update(time, delta);
  }

  /** Zombie detection range for the player's current visibility. */
  zombieSightRange() {
    const p = this.player;
    this.playerLight = this.floor.lightLevelAt(p.x, p.y);
    const factor = Phaser.Math.Clamp(STEALTH.base + this.playerLight * STEALTH.gain, STEALTH.minFactor, 1);
    const range = ZOMBIE.sightRange * factor;
    return p.isBeamOn() ? Math.max(range, FLASHLIGHT.attractRange) : range;
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

  /** @param {'hit' | 'fall'} cause */
  onPlayerDied(cause = 'hit') {
    const hud = this.scene.get('Hud');
    this.physics.world.pause();
    this.vhs.setDamage(3);
    this.vhs.hold(1.2);
    this.cameras.main.shake(cause === 'fall' ? 250 : 400, 0.01);
    hud.showMessage(cause === 'fall' ? 'SIGNAL LOST' : 'TRACKING LOST');

    this.time.delayedCall(REWIND_DELAY_MS, () => {
      hud.showMessage('<< REWIND');
      this.vhs.hold(0.7);
      this.player.resetPose();
      this.rewind.start(REWIND_FRAMES);
      this.rewinding = true;
    });
    this.time.delayedCall(REWIND_DELAY_MS + REWIND_MAX_MS, () => this.restartRun());
  }

  /** The device was reached: end the tape and return to the title screen. */
  completeLevel() {
    const hud = this.scene.get('Hud');
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    this.physics.world.pause();
    this.vhs.hold(0.9);
    hud.showMessage('TAPE 01  END');
    this.time.delayedCall(1600, () => hud.showMessage('EJECT'));
    this.time.delayedCall(2600, () => {
      this.scene.stop('Hud');
      this.scene.start('Title');
    });
  }

  restartRun() {
    if (this.restarting) return;
    this.restarting = true;
    this.scene.restart({ level: this.levelName });
  }
}
