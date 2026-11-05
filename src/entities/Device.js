/**
 * The era's exit device (Era 01: a CRT television). Flickers with static,
 * ghosts in red and cyan, and emits a pulsing light. Touching it ends the tape.
 */
import Phaser from 'phaser';
import { DEPTH } from '../config.js';

const TRIGGER_RADIUS = 14;

export default class Device {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.sprite = scene.add.sprite(x, y, 'device-crt', 'static-0').setDepth(DEPTH.enemies);
    this.ghosts = [0xff3050, 0x30e0ff].map((tint) =>
      scene.add.sprite(x, y, 'device-crt', 'static-0').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setDepth(DEPTH.emissive),
    );
    this.glow = scene.add
      .image(x, y - 1, 'fx-glow')
      .setTint(0xbfe6ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.emissive)
      .setScale(0.6);
    this.pulse = 1;
  }

  update(time) {
    const frame = `static-${Math.floor(time / 70) % 4}`;
    this.sprite.setFrame(frame);
    const glitching = Math.random() < 0.15;
    this.ghosts.forEach((g, i) => {
      const jitter = glitching ? Phaser.Math.Between(1, 3) : 1;
      g.setFrame(frame).setPosition(this.x + (i ? jitter : -jitter), this.y + (glitching ? Phaser.Math.Between(-1, 1) : 0));
    });
    this.pulse = 0.75 + Math.sin(time * 0.006) * 0.15 + (glitching ? 0.25 : 0);
    this.glow.setAlpha(0.5 * this.pulse);
  }

  /** Dynamic light for the lightmap. */
  light() {
    return { x: this.x, y: this.y, radius: 90, color: 0xbfe6ff, intensity: 0.9 * this.pulse, rays: 32 };
  }

  touches(player) {
    return Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < TRIGGER_RADIUS;
  }
}
