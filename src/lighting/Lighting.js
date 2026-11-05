/**
 * Screen-space lightmap.
 *
 * Each frame a view-sized render texture is filled with darkness, area
 * ambient levels are drawn in, and lights are added on top (additive). The
 * texture is then multiplied over the scene: black hides, white reveals.
 *
 * Static lights are rendered once into their own textures at floor build and
 * stamped each frame with their flicker level. The player's lights are
 * rebuilt every frame because they move.
 */
import Phaser from 'phaser';
import { VIEW_W, VIEW_H, LIGHTING, FLASHLIGHT, DEPTH } from '../config.js';
import { drawLightShape } from './lightShape.js';

let bakeId = 0;

export default class Lighting {
  constructor(scene, floor) {
    this.scene = scene;
    this.floor = floor;

    this.lightmap = scene.add
      .renderTexture(0, 0, VIEW_W, VIEW_H)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.lightmap)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.ambient = scene.make.graphics({}, false);
    for (const area of floor.ambientAreas) {
      this.ambient.fillStyle(area.color, 1).fillRect(area.x, area.y, area.w, area.h);
    }

    this.dynamic = scene.make.graphics({}, false).setBlendMode(Phaser.BlendModes.ADD);
    this.lights = floor.lights.map((def) => this.bake(def));

    scene.events.once('shutdown', () => this.destroy());
  }

  /** Renders a static light (with shadows) into its own texture. */
  bake(def) {
    const pad = 2;
    const size = Math.ceil(def.radius * 2 + pad * 2);
    const ox = def.x - def.radius - pad;
    const oy = def.y - def.radius - pad;

    const g = this.scene.make.graphics({}, false);
    drawLightShape(g, this.floor, { ...def, rays: LIGHTING.rays }, ox, oy);
    const key = `light-baked-${bakeId++}`;
    const texture = this.scene.textures.addDynamicTexture(key, size, size);
    texture.draw(g, 0, 0);
    texture.render();
    g.destroy();

    let glow = null;
    if (def.glow) {
      glow = this.scene.add
        .image(def.x, def.y, 'fx-glow')
        .setTint(def.color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.emissive)
        .setScale(0.9)
        .setAlpha(0.4);
    }

    return { def, key, x: ox, y: oy, size, glow, level: 1, nextChange: 0, offUntil: 0 };
  }

  /** Flicker patterns: none, subtle (hum), broken (stutters and drops out), fire. */
  flicker(light, time) {
    const mode = light.def.flicker;
    if (mode === 'fire') return 0.72 + Math.sin(time * 0.017 + light.x) * 0.1 + Math.random() * 0.18;
    if (mode === 'subtle') return 0.9 + Math.sin(time * 0.013 + light.x) * 0.04 + Math.random() * 0.06;
    if (mode === 'broken') {
      if (time < light.offUntil) return Math.random() < 0.12 ? 0.6 : 0.05;
      if (time >= light.nextChange) {
        light.nextChange = time + Phaser.Math.Between(900, 3200);
        light.offUntil = time + Phaser.Math.Between(80, 700);
      }
      return 0.95 + Math.random() * 0.05;
    }
    return 1;
  }

  /** @param {object[]} extra  additional dynamic lights for this frame */
  update(time, camera, player, extra = []) {
    const cx = Math.round(camera.scrollX);
    const cy = Math.round(camera.scrollY);
    const rt = this.lightmap;

    rt.clear();
    rt.fill(LIGHTING.void, 1);
    rt.draw(this.ambient, -cx, -cy);

    for (const light of this.lights) {
      const level = this.flicker(light, time);
      if (light.glow) light.glow.setAlpha(0.4 * level);
      if (level <= 0.02) continue;
      if (light.x > cx + VIEW_W || light.y > cy + VIEW_H || light.x + light.size < cx || light.y + light.size < cy) {
        continue;
      }
      rt.stamp(light.key, null, light.x - cx, light.y - cy, {
        originX: 0,
        originY: 0,
        alpha: level,
        blendMode: Phaser.BlendModes.ADD,
      });
    }

    this.dynamic.clear();
    for (const light of extra) drawLightShape(this.dynamic, this.floor, light);
    this.drawPlayerLights(player);
    rt.draw(this.dynamic, -cx, -cy);
    rt.render();
  }

  drawPlayerLights(player) {
    const g = this.dynamic;
    if (player.dead) return;

    if (player.isBeamOn()) {
      const half = Phaser.Math.DegToRad(FLASHLIGHT.halfAngleDeg);
      const origin = player.beamOrigin();
      drawLightShape(g, this.floor, {
        x: origin.x,
        y: origin.y,
        radius: FLASHLIGHT.range,
        color: FLASHLIGHT.color,
        intensity: FLASHLIGHT.intensity,
        falloff: FLASHLIGHT.falloff,
        start: player.aimAngle - half,
        end: player.aimAngle + half,
        rays: 40,
      });
      drawLightShape(g, this.floor, {
        x: player.x,
        y: player.y,
        radius: FLASHLIGHT.nearRadius,
        color: FLASHLIGHT.color,
        intensity: FLASHLIGHT.nearIntensity,
        rays: 24,
      });
    } else {
      drawLightShape(g, this.floor, {
        x: player.x,
        y: player.y,
        radius: LIGHTING.personalRadius,
        color: LIGHTING.personalColor,
        intensity: LIGHTING.personalIntensity,
        rays: 28,
      });
    }
  }

  destroy() {
    for (const light of this.lights) this.scene.textures.remove(light.key);
    this.ambient.destroy();
    this.dynamic.destroy();
  }
}
