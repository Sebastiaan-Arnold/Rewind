// The hero: WASD to move, mouse to aim, left click to swing the crowbar.
import Phaser from 'phaser';
import { PLAYER, CROWBAR } from '../config.js';
import { swingCrowbar } from './weapons.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this); // show it
    scene.physics.add.existing(this); // give it a physics body
    this.setDepth(10);

    // A circle collider fits a top-down character better than a box:
    // it slides smoothly around corners instead of snagging.
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

    // Aim: turn toward the mouse. The pointer's screen position is converted
    // to a world position every frame, because the camera keeps moving even
    // when the mouse doesn't.
    const aim = pointer.positionToCamera(scene.cameras.main);
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y);
    this.setRotation(this.aimAngle);

    // Flicker while invulnerable after a hit.
    this.setAlpha(time < this.invulnerableUntil && Math.floor(time / 70) % 2 ? 0.35 : 1);

    // While being knocked back, the shove plays out and fades.
    if (time < this.knockbackUntil) {
      this.body.velocity.scale(0.86);
      return;
    }

    // Movement: combine keys into a direction, then normalise it so moving
    // diagonally isn't faster than moving straight.
    const k = this.keys;
    const dir = new Phaser.Math.Vector2((k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0), (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0));
    dir.normalize().scale(PLAYER.speed);
    this.setVelocity(dir.x, dir.y);

    // Attack: hold or click the left mouse button.
    if (pointer.leftButtonDown() && time >= this.nextSwingAt) {
      this.nextSwingAt = time + CROWBAR.cooldownMs;
      swingCrowbar(scene, this);
    }
  }

  // Called by enemies. Returns true if the hit counted.
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
