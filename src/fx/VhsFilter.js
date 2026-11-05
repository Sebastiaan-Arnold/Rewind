/**
 * VHS post-processing filter (custom Phaser 4 filter on the main camera).
 *
 * Effects: chroma bleed, scanlines, tracking wobble with a rolling noise band,
 * film grain, desaturation, and transient line tearing on impact.
 *
 * Uniforms:
 *   uIntensity  0..1   persistent tape degradation (scales with hits taken)
 *   uSpike      0..1+  transient burst, decays over time
 *   uTime       seconds, wrapped to preserve shader precision
 */

import Phaser from 'phaser';
import { FX } from '../config.js';

const FRAGMENT_SHADER = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uSpike;
varying vec2 outTexCoord;
#pragma phaserTemplate(fragmentHeader)

// Hash-based pseudo-random value for a 2D coordinate.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;
  float px = 1.0 / uResolution.x;              // horizontal texel size
  float row = floor(uv.y * uResolution.y);     // current pixel row
  float g = clamp(uIntensity + uSpike, 0.0, 1.6);
  float gi = min(uIntensity, 1.0);

  // Tracking wobble: per-row horizontal displacement.
  float wobble = sin(uv.y * 38.0 + uTime * 3.1) * 0.5 + sin(uv.y * 6.0 - uTime * 1.3);
  float offset = wobble * g * 1.4 * px;

  // Rolling noise band, scaled by persistent damage.
  float bandPos = 1.0 - fract(uTime * 0.11);
  float band = (1.0 - smoothstep(0.0, 0.05, abs(uv.y - bandPos))) * gi;
  offset += band * (hash(vec2(row, floor(uTime * 30.0))) - 0.5) * 10.0 * px;

  // Impact tearing: random row strips displaced during a spike.
  float tear = step(1.0 - uSpike * 0.3, hash(vec2(floor(row / 3.0), floor(uTime * 24.0))));
  offset += tear * (hash(vec2(row, uTime)) - 0.5) * 50.0 * px * min(uSpike, 1.0);

  vec2 st = vec2(uv.x + offset, uv.y);

  // Chroma bleed: offset red and blue channels.
  float bleed = (0.7 + g * 2.6) * px;
  vec4 base = boundedSampler(uMainSampler, st);
  float r = boundedSampler(uMainSampler, st + vec2(bleed, 0.0)).r;
  float b = boundedSampler(uMainSampler, st - vec2(bleed, 0.0)).b;
  vec3 col = vec3(r, base.g, b);

  // Horizontal luma smear.
  vec3 smear = boundedSampler(uMainSampler, st - vec2(px * 2.0, 0.0)).rgb;
  col = mix(col, max(col, smear), 0.2 + 0.25 * gi);

  // Desaturation and colour shift with degradation.
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(luma), 0.1 + 0.4 * gi);
  col *= vec3(1.0 + 0.1 * gi, 1.0 - 0.04 * gi, 1.0 + 0.14 * gi);

  // Scanlines.
  col *= 1.0 - mod(row, 2.0) * (0.1 + 0.16 * gi);

  // Grain and static.
  float n = hash(uv * uResolution + fract(uTime * 7.0) * 100.0);
  col += (n - 0.5) * (0.035 + 0.16 * g);
  col = mix(col, vec3(n * 0.8), band * 0.3 + tear * 0.25);

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Render node: executes the fragment shader. */
class VhsRenderNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager) {
    super('FilterVHS', manager, null, FRAGMENT_SHADER);
  }

  setupUniforms(controller, drawingContext) {
    const pm = this.programManager;
    pm.setUniform('uResolution', [drawingContext.width, drawingContext.height]);
    pm.setUniform('uTime', controller.time);
    pm.setUniform('uIntensity', controller.intensity);
    pm.setUniform('uSpike', controller.spike);
  }
}

/** Filter controller: holds the parameters read by the render node. */
class VhsController extends Phaser.Filters.Controller {
  constructor(camera) {
    super(camera, 'FilterVHS');
    this.time = 0;
    this.intensity = 0;
    this.spike = 0;
  }
}

const registered = new WeakSet();

/** Scene-facing API: damage level, spike and per-frame easing. */
export default class VhsEffect {
  constructor(scene) {
    this.level = 0; // target intensity
    this.intensity = 0; // displayed intensity, eased toward level
    this.spike = 0;
    this.holdSpike = 0;
    this.controller = null;

    const renderer = scene.renderer;
    if (renderer.type !== Phaser.WEBGL) {
      console.warn('WebGL not available: VHS effect disabled');
      return;
    }
    // Register the render node once per renderer.
    if (!registered.has(renderer)) {
      renderer.renderNodes.addNodeConstructor('FilterVHS', VhsRenderNode);
      registered.add(renderer);
    }
    // External list: applied in screen space so scanlines stay screen-aligned.
    this.controller = scene.cameras.main.filters.external.add(new VhsController(scene.cameras.main));
  }

  /** Sets degradation from hits taken, using the curve in FX.damageLevels. */
  setDamage(hits) {
    const levels = FX.damageLevels;
    this.level = levels[Math.min(hits, levels.length - 1)];
    this.spike = 1;
  }

  /** Adds a short burst without changing the damage level. */
  kick(amount) {
    this.spike = Math.max(this.spike, amount);
  }

  /** Holds the spike at a minimum value (used on death). */
  hold(amount) {
    this.holdSpike = amount;
  }

  update(time, delta) {
    this.intensity += (this.level - this.intensity) * Math.min(1, delta / 350);
    this.spike = Math.max(this.holdSpike, this.spike - delta / 420);
    if (!this.controller) return;
    this.controller.time = (time / 1000) % 1000;
    this.controller.intensity = this.intensity;
    this.controller.spike = this.spike;
  }
}
