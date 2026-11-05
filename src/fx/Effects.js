/** Particle and decal effects. One instance per run. */
import Phaser from 'phaser';
import { DEPTH } from '../config.js';
import { P } from '../art/palette.js';

const MAX_DECALS = 40;
const deg = Phaser.Math.RadToDeg;

export default class Effects {
  constructor(scene) {
    this.scene = scene;
    this.decals = [];

    this.dust = scene.add
      .particles(0, 0, 'fx-dot', {
        emitting: false,
        lifespan: { min: 350, max: 600 },
        speed: { min: 4, max: 14 },
        scale: { start: 1, end: 0.4 },
        alpha: { start: 0.35, end: 0 },
        tint: 0x8f979c,
      })
      .setDepth(DEPTH.floorFx);

    this.sparks = scene.add
      .particles(0, 0, 'fx-spark', {
        emitting: false,
        lifespan: { min: 120, max: 260 },
        speed: { min: 70, max: 170 },
        scale: { start: 1, end: 0 },
        tint: [0xffffff, 0xffe39a, 0xffc060],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.emissive);

    this.goo = scene.add
      .particles(0, 0, 'fx-dot', {
        emitting: false,
        lifespan: { min: 250, max: 520 },
        speed: { min: 20, max: 90 },
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        tint: [P.goo, 0x2b3618],
      })
      .setDepth(DEPTH.fx);
  }

  footstep(x, y) {
    this.dust.emitParticleAt(x, y, 2);
  }

  /** Crowbar contact: sparks fly back toward the attacker, goo forward. */
  impact(x, y, angle) {
    this.sparks.setEmitterAngle({ min: deg(angle + Math.PI) - 50, max: deg(angle + Math.PI) + 50 });
    this.sparks.emitParticleAt(x, y, 7);
    this.goo.setEmitterAngle({ min: deg(angle) - 35, max: deg(angle) + 35 });
    this.goo.emitParticleAt(x, y, 5);
  }

  /** Kill: goo burst plus a persistent floor decal. */
  splatter(x, y, angle) {
    this.goo.setEmitterAngle({ min: deg(angle) - 60, max: deg(angle) + 60 });
    this.goo.emitParticleAt(x, y, 12);
    const decal = this.scene.add
      .image(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6, 'fx-splat')
      .setTint(P.goo)
      .setAlpha(0.85)
      .setRotation(Math.random() * Math.PI * 2)
      .setDepth(DEPTH.decals);
    this.decals.push(decal);
    if (this.decals.length > MAX_DECALS) this.decals.shift().destroy();
  }

  /** Flashlight burst: a brief bloom in front of the lens. */
  flash(x, y, angle) {
    const glow = this.scene.add
      .image(x + Math.cos(angle) * 22, y + Math.sin(angle) * 22, 'fx-glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.emissive)
      .setRotation(angle)
      .setScale(1.8, 1.1)
      .setAlpha(0.75);
    this.scene.tweens.add({ targets: glow, alpha: 0, scaleX: 2.4, duration: 180, onComplete: () => glow.destroy() });
  }
}
