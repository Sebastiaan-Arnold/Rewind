/**
 * Zombie: slow melee enemy driven by a finite state machine.
 *
 *   idle    - wanders until the player is in sight
 *   chase   - moves directly toward the visible player
 *   search  - moves to the player's last known position, with a timeout
 *   windup  - telegraphed attack (red flash); connects if the player stays in reach
 *   recover - post-attack cooldown
 *   stunned - knocked back after taking damage
 *
 * Detection range is supplied each frame by the scene and depends on how
 * visible the player is (light level, flashlight).
 */
import Phaser from 'phaser';
import { ZOMBIE, DEPTH } from '../config.js';

const STEP_LENGTH = 5;

export default class Zombie extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'zombie', 'walk-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);

    const r = ZOMBIE.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.pushable = false;
    this.hitRadius = r;

    // Faintly glowing eyes stay visible in the dark.
    this.eyes = scene.add
      .image(x, y, 'fx-eyes')
      .setTint(0xf2ffb4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.emissive)
      .setAlpha(0.55);

    this.hp = ZOMBIE.hp;
    this.dead = false;
    this.ai = 'idle';
    this.aiUntil = 0;
    this.flashUntil = 0;
    this.lastSeen = null;
    this.walked = Math.random() * 20;
    this.speed = ZOMBIE.speed * Phaser.Math.FloatBetween(0.85, 1.15); // per-instance variance
    this.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
  }

  update(time, delta, player, floor, sightRange) {
    if (this.dead) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const sees = !player.dead && dist < sightRange && floor.hasLineOfSight(this.x, this.y, player.x, player.y);
    if (sees) this.lastSeen = { x: player.x, y: player.y };

    switch (this.ai) {
      case 'stunned':
        this.body.velocity.scale(0.85); // knockback decay
        if (time >= this.aiUntil) this.afterAction(sees, time);
        break;

      case 'windup':
        this.setVelocity(0, 0);
        this.face(player.x, player.y);
        if (time >= this.aiUntil) {
          if (dist <= ZOMBIE.attackReach) player.takeHit(this);
          this.ai = 'recover';
          this.aiUntil = time + ZOMBIE.recoverMs;
        }
        break;

      case 'recover':
        this.setVelocity(0, 0);
        if (time >= this.aiUntil) this.afterAction(sees, time);
        break;

      case 'chase':
        if (!sees) { this.startSearch(time); break; }
        if (dist <= ZOMBIE.attackRange) {
          this.ai = 'windup';
          this.aiUntil = time + ZOMBIE.windupMs;
          break;
        }
        this.moveToward(player.x, player.y, this.speed);
        break;

      case 'search':
        if (sees) { this.ai = 'chase'; break; }
        // End search on arrival or timeout.
        if (!this.lastSeen || time >= this.aiUntil ||
            Phaser.Math.Distance.Between(this.x, this.y, this.lastSeen.x, this.lastSeen.y) < 6) {
          this.ai = 'idle';
          this.setVelocity(0, 0);
          break;
        }
        this.moveToward(this.lastSeen.x, this.lastSeen.y, this.speed);
        break;

      default: // idle
        if (sees) { this.ai = 'chase'; break; }
        if (time >= this.aiUntil) {
          // Alternate between pausing and short random walks.
          if (Math.random() < 0.5) {
            this.setVelocity(0, 0);
          } else {
            const a = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
            this.setVelocity(Math.cos(a) * this.speed * 0.4, Math.sin(a) * this.speed * 0.4);
            this.setRotation(a);
          }
          this.aiUntil = time + Phaser.Math.Between(700, 2200);
        }
    }

    this.animate(time, delta);
  }

  afterAction(sees, time) {
    if (sees) this.ai = 'chase';
    else this.startSearch(time);
  }

  startSearch(time) {
    this.ai = 'search';
    this.aiUntil = time + 4000;
  }

  moveToward(x, y, speed) {
    const a = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    this.setRotation(a);
  }

  face(x, y) {
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, x, y));
  }

  animate(time, delta) {
    this.walked += (this.body.velocity.length() * delta) / 1000;
    if (this.ai === 'windup') this.setFrame('windup');
    else this.setFrame(`walk-${Math.floor(this.walked / STEP_LENGTH) % 4}`);

    // Hit flash (white) takes priority over the wind-up telegraph (red).
    if (time < this.flashUntil) {
      this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else if (this.ai === 'windup' && Math.floor(time / 60) % 2 === 0) {
      this.setTint(0xff3b3b).setTintMode(Phaser.TintModes.FILL);
    } else {
      this.clearTint();
    }

    const eyeX = this.x + Math.cos(this.rotation) * 2;
    const eyeY = this.y + Math.sin(this.rotation) * 2;
    this.eyes.setPosition(eyeX, eyeY).setRotation(this.rotation);
  }

  takeHit(fromAngle, damage, knockback) {
    if (this.dead) return;
    const time = this.scene.time.now;
    this.hp -= damage;
    this.flashUntil = time + 80;
    this.setVelocity(Math.cos(fromAngle) * knockback, Math.sin(fromAngle) * knockback);
    this.ai = 'stunned';
    this.aiUntil = time + ZOMBIE.stunMs;
    this.animate(time, 0);
    if (this.hp <= 0) this.die(fromAngle);
  }

  die(fromAngle) {
    this.dead = true;
    this.body.enable = false;
    this.eyes.setVisible(false);
    this.scene.effects.splatter(this.x, this.y, fromAngle);
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this,
      x: this.x + Math.cos(fromAngle) * 10,
      y: this.y + Math.sin(fromAngle) * 10,
      scaleX: 1.4,
      scaleY: 0.4,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
    this.scene.time.delayedCall(70, () => this.active && this.setTint(0x2f3f27).setTintMode(Phaser.TintModes.FILL));
  }

  destroy(fromScene) {
    this.eyes?.destroy();
    super.destroy(fromScene);
  }
}
