/** Player character: WASD movement, mouse aim, crowbar on left mouse button. */
import Phaser from 'phaser';
import { PLAYER, CROWBAR } from '../config.js';
import { swingCrowbar } from './weapons.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);

    // Circular body slides around corners instead of catching on them.
    const r = PLAYER.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);

    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    this.aimAngle = 0;
    this.hits = 0;
    this.dead = false;
    this.invulnerableUntil = 0;
    this.knockbackUntil = 0;
    this.nextSwingAt = 0;
  }

  update(time) {
    if (this.dead) return;
    const scene = this.scene;
    const pointer = scene.input.activePointer;

    // Recompute the pointer's world position each frame; the camera moves
    // independently of the mouse.
    const aim = pointer.positionToCamera(scene.cameras.main);
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y);
    this.setRotation(this.aimAngle);

    // Invulnerability flicker.
    this.setAlpha(time < this.invulnerableUntil && Math.floor(time / 70) % 2 ? 0.35 : 1);

    // Knockback decays before control returns.
    if (time < this.knockbackUntil) {
      this.body.velocity.scale(0.86);
      return;
    }

    // Normalised so diagonal movement is not faster.
    const k = this.keys;
    const dir = new Phaser.Math.Vector2((k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0), (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0));
    dir.normalize().scale(PLAYER.speed);
    this.setVelocity(dir.x, dir.y);

    if (pointer.leftButtonDown() && time >= this.nextSwingAt) {
      this.nextSwingAt = time + CROWBAR.cooldownMs;
      swingCrowbar(scene, this);
    }
  }

  /** Applies an enemy hit. Returns false while invulnerable or dead. */
  takeHit(source) {
    const time = this.scene.time.now;
    if (this.dead || time < this.invulnerableUntil) return false;

    this.hits += 1;
    this.invulnerableUntil = time + PLAYER.invulnerableMs;
    this.knockbackUntil = time + 160;
    const away = Phaser.Math.Angle.Between(source.x, source.y, this.x, this.y);
    this.setVelocity(Math.cos(away) * PLAYER.knockback, Math.sin(away) * PLAYER.knockback);

    if (this.hits > PLAYER.hitsSurvived) {
      this.dead = true;
      this.setVelocity(0, 0);
      this.setAlpha(1);
      this.scene.onPlayerDied();
    } else {
      this.scene.onPlayerHit(this.hits);
    }
    return true;
  }
}
