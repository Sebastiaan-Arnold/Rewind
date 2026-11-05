// A slow zombie. Its brain is a small "state machine": it is always in
// exactly one state, and each state has simple rules for what to do and
// when to switch to another state.
//
//   idle    - shuffles around aimlessly until it sees the player
//   chase   - walks straight at the player while it can see them
//   search  - lost sight: walks to where it last saw the player
//   windup  - close enough: stops and flashes red (the warning!)
//   recover - just attacked, catching its breath
//   stunned - just got hit by the crowbar, knocked back
import Phaser from 'phaser';
import { ZOMBIE } from '../config.js';

export default class Zombie extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'zombie');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9);

    const r = ZOMBIE.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.pushable = false; // the player can't shove zombies around
    this.hitRadius = r;

    this.hp = ZOMBIE.hp;
    this.dead = false;
    this.ai = 'idle';
    this.aiUntil = 0;
    this.flashUntil = 0;
    this.lastSeen = null;
    this.speed = ZOMBIE.speed * Phaser.Math.FloatBetween(0.85, 1.15); // not all identical
    this.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
  }

  update(time, player, floor) {
    if (this.dead) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const sees = !player.dead && dist < ZOMBIE.sightRange && floor.hasLineOfSight(this.x, this.y, player.x, player.y);
    if (sees) this.lastSeen = { x: player.x, y: player.y };

    switch (this.ai) {
      case 'stunned':
        this.body.velocity.scale(0.85); // knockback slows down
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
        // Reached the spot, or searched too long (maybe stuck on a wall)? Give up.
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
          // Every so often: either stand still or shuffle a few steps.
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

    this.updateTint(time);
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

  // White flash when hit, blinking red during the attack wind-up.
  updateTint(time) {
    if (time < this.flashUntil) {
      this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else if (this.ai === 'windup' && Math.floor(time / 60) % 2 === 0) {
      this.setTint(0xff3b3b).setTintMode(Phaser.TintModes.FILL);
    } else {
      this.clearTint();
    }
  }

  takeHit(fromAngle, damage, knockback) {
    if (this.dead) return;
    const time = this.scene.time.now;
    this.hp -= damage;
    this.flashUntil = time + 80;
    this.setVelocity(Math.cos(fromAngle) * knockback, Math.sin(fromAngle) * knockback);
    this.ai = 'stunned';
    this.aiUntil = time + ZOMBIE.stunMs;
    this.updateTint(time);
    if (this.hp <= 0) this.die(fromAngle);
  }

  die(fromAngle) {
    this.dead = true;
    this.body.enable = false;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    // Topple over and fade, then remove.
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
}
