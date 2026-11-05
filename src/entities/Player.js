/** Player character: WASD movement, mouse aim, item in hand on left mouse button. */
import Phaser from 'phaser';
import { PLAYER, INVENTORY, DEPTH } from '../config.js';
import Inventory from '../items/Inventory.js';

const STEP_LENGTH = 6; // pixels travelled per animation frame
const FOOTSTEP_EVERY = 2; // animation frames per dust puff
const SWING_MS = 130;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', 'empty-0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);

    // Circular body slides around corners instead of catching on them.
    const r = PLAYER.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);

    this.keys = scene.input.keyboard.addKeys('W,A,S,D,ONE,TWO,THREE');
    this.inventory = new Inventory();
    this.held = scene.add.image(x, y, 'held-crowbar').setDepth(DEPTH.held);

    this.aimAngle = 0;
    this.hits = 0;
    this.dead = false;
    this.frozen = false; // control suspended (level end)
    this.invulnerableUntil = 0;
    this.knockbackUntil = 0;
    this.readyAt = {}; // per-item cooldowns
    this.equipReadyAt = 0;
    this.beamEnabled = true;
    this.swingStart = -Infinity;
    this.swingHalf = 0;
    this.walked = 0;
    this.lastStep = 0;

    const onWheel = (_p, _o, _dx, dy) => this.equip(this.inventory.cycle(dy > 0 ? 1 : -1));
    scene.input.on('wheel', onWheel);
    scene.events.once('shutdown', () => scene.input.off('wheel', onWheel));
    this.refreshHeld();
  }

  get item() {
    return this.inventory.active;
  }

  equip(changed) {
    if (!changed) return;
    this.equipReadyAt = this.scene.time.now + INVENTORY.swapMs;
    this.refreshHeld();
  }

  refreshHeld() {
    const item = this.item;
    this.held.setVisible(Boolean(item));
    if (item) this.held.setTexture(item.held).setOrigin(...item.heldOrigin);
  }

  /** True while the flashlight is in hand, switched on and ready. */
  isBeamOn() {
    return !this.dead && this.beamEnabled && this.item?.emitsLight && this.scene.time.now >= this.equipReadyAt;
  }

  /** World position of the flashlight lens. */
  beamOrigin() {
    return this.localToWorld(12, 0);
  }

  startSwing(time, half) {
    this.swingStart = time;
    this.swingHalf = half;
  }

  localToWorld(lx, ly) {
    const c = Math.cos(this.aimAngle);
    const s = Math.sin(this.aimAngle);
    return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c };
  }

  update(time, delta) {
    if (this.dead || this.frozen) return;
    const scene = this.scene;
    const pointer = scene.input.activePointer;
    const k = this.keys;

    // Item selection
    const JustDown = Phaser.Input.Keyboard.JustDown;
    if (JustDown(k.ONE)) this.equip(this.inventory.select(0));
    if (JustDown(k.TWO)) this.equip(this.inventory.select(1));
    if (JustDown(k.THREE)) this.equip(this.inventory.select(2));

    // Aim. Recompute the pointer's world position each frame; the camera
    // moves independently of the mouse.
    const aim = pointer.positionToCamera(scene.cameras.main);
    this.aimAngle = Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y);
    this.setRotation(this.aimAngle);

    // Invulnerability flicker.
    this.setAlpha(time < this.invulnerableUntil && Math.floor(time / 70) % 2 ? 0.35 : 1);

    if (time < this.knockbackUntil) {
      this.body.velocity.scale(0.86); // knockback decays before control returns
    } else {
      const dir = new Phaser.Math.Vector2((k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0), (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0));
      dir.normalize().scale(PLAYER.speed);
      this.setVelocity(dir.x, dir.y);

      const item = this.item;
      if (item && pointer.leftButtonDown() && time >= (this.readyAt[item.id] ?? 0) && time >= this.equipReadyAt) {
        this.readyAt[item.id] = time + item.cooldownMs;
        item.use(scene, this, time);
      }
    }

    if (scene.floor.isPitAt(this.x, this.y)) {
      this.fall();
      return;
    }

    this.animate(time, delta);
  }

  /** Steps into a pit: drops out of sight and ends the run. */
  fall() {
    this.dead = true;
    this.body.enable = false;
    this.held.setVisible(false);
    this.setAlpha(1);
    this.scene.tweens.add({ targets: this, scale: 0.15, angle: this.angle + 240, alpha: 0, duration: 650, ease: 'Quad.easeIn' });
    this.scene.onPlayerDied('fall');
  }

  /** Restores the sprite after a fall, before the rewind plays. */
  resetPose() {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1).setAlpha(1);
  }

  animate(time, delta) {
    const speed = this.body.velocity.length();
    let step = 0;
    if (speed > 5) {
      this.walked += (speed * delta) / 1000;
      step = Math.floor(this.walked / STEP_LENGTH) % 4;
      const stepCount = Math.floor(this.walked / (STEP_LENGTH * FOOTSTEP_EVERY));
      if (stepCount !== this.lastStep) {
        this.lastStep = stepCount;
        this.scene.effects.footstep(this.x, this.y);
      }
    }
    this.setFrame(`${this.item?.pose ?? 'empty'}-${step}`);

    // Held item: follows the grip; lowered while switching; sweeps during a swing.
    const item = this.item;
    if (!item) return;
    const grip = this.localToWorld(...item.grip);
    const equipT = Phaser.Math.Clamp(1 - (this.equipReadyAt - time) / INVENTORY.swapMs, 0, 1);
    let offset = 0;
    const swingT = (time - this.swingStart) / SWING_MS;
    if (swingT >= 0 && swingT < 1) {
      offset = Phaser.Math.Linear(-this.swingHalf * 1.1, this.swingHalf, Phaser.Math.Easing.Cubic.Out(swingT));
    } else if (swingT >= 1 && swingT < 2) {
      offset = Phaser.Math.Linear(this.swingHalf, 0, swingT - 1);
    }
    this.held
      .setPosition(grip.x, grip.y)
      .setRotation(this.aimAngle + offset - (1 - equipT) * 1.2)
      .setAlpha(this.alpha * (0.3 + 0.7 * equipT));
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
      this.held.setVisible(false);
      this.scene.onPlayerDied();
    } else {
      this.scene.onPlayerHit(this.hits);
    }
    return true;
  }

  destroy(fromScene) {
    this.held?.destroy();
    super.destroy(fromScene);
  }
}
