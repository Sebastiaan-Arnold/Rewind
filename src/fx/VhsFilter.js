// The VHS look: a custom screen filter (a "shader") applied to the camera.
//
// A shader is a small program that runs on the graphics card for EVERY
// pixel on screen, every frame. It's written in GLSL (a C-like language).
// Ours reads the finished game image and messes it up like a worn tape:
//   - colour bleed: red and blue drift sideways from the picture
//   - scanlines: every other row is darker
//   - tracking wobble: rows slide left/right, plus a rolling noisy band
//   - grain/static, and the colour fades as the tape degrades
//   - "spike": a short burst of tearing when you get hit
//
// The JavaScript side just feeds it a few numbers ("uniforms") each frame:
//   intensity 0..1  how damaged the tape is (goes up with each hit)
//   spike     0..1+ a temporary burst that fades out
//   time            makes the wobble and noise move

import Phaser from 'phaser';

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

// Cheap pseudo-random number from a 2D position.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = outTexCoord;
  float px = 1.0 / uResolution.x;              // one pixel, horizontally
  float row = floor(uv.y * uResolution.y);     // which pixel row we're on
  float g = clamp(uIntensity + uSpike, 0.0, 1.6);
  float gi = min(uIntensity, 1.0);

  // --- Tracking wobble: whole rows slide sideways ---
  float wobble = sin(uv.y * 38.0 + uTime * 3.1) * 0.5 + sin(uv.y * 6.0 - uTime * 1.3);
  float offset = wobble * g * 1.4 * px;

  // A noisy band that rolls slowly down the screen (only once damaged).
  float bandPos = 1.0 - fract(uTime * 0.11);
  float band = (1.0 - smoothstep(0.0, 0.05, abs(uv.y - bandPos))) * gi;
  offset += band * (hash(vec2(row, floor(uTime * 30.0))) - 0.5) * 10.0 * px;

  // Hit spike: random strips of rows tear far sideways.
  float tear = step(1.0 - uSpike * 0.3, hash(vec2(floor(row / 3.0), floor(uTime * 24.0))));
  offset += tear * (hash(vec2(row, uTime)) - 0.5) * 50.0 * px * min(uSpike, 1.0);

  vec2 st = vec2(uv.x + offset, uv.y);

  // --- Colour bleed: sample red and blue a little off to the sides ---
  float bleed = (0.7 + g * 2.6) * px;
  vec4 base = boundedSampler(uMainSampler, st);
  float r = boundedSampler(uMainSampler, st + vec2(bleed, 0.0)).r;
  float b = boundedSampler(uMainSampler, st - vec2(bleed, 0.0)).b;
  vec3 col = vec3(r, base.g, b);

  // Bright things smear to the right, like VHS does.
  vec3 smear = boundedSampler(uMainSampler, st - vec2(px * 2.0, 0.0)).rgb;
  col = mix(col, max(col, smear), 0.2 + 0.25 * gi);

  // --- Colour fades and shifts as the tape wears out ---
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(luma), 0.1 + 0.4 * gi);
  col *= vec3(1.0 + 0.1 * gi, 1.0 - 0.04 * gi, 1.0 + 0.14 * gi);

  // --- Scanlines ---
  col *= 1.0 - mod(row, 2.0) * (0.1 + 0.16 * gi);

  // --- Grain and static ---
  float n = hash(uv * uResolution + fract(uTime * 7.0) * 100.0);
  col += (n - 0.5) * (0.035 + 0.16 * g);
  col = mix(col, vec3(n * 0.8), band * 0.3 + tear * 0.25);

  gl_FragColor = vec4(col, 1.0);
}
`;

// The "render node": the part that actually runs the shader on the GPU.
class VhsRenderNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager) {
    super('FilterVHS', manager, null, FRAGMENT_SHADER);
  }

  // Copies the controller's numbers into the shader before it runs.
  setupUniforms(controller, drawingContext) {
    const pm = this.programManager;
    pm.setUniform('uResolution', [drawingContext.width, drawingContext.height]);
    pm.setUniform('uTime', controller.time);
    pm.setUniform('uIntensity', controller.intensity);
    pm.setUniform('uSpike', controller.spike);
  }
}

// The "controller": the object our game code talks to.
class VhsController extends Phaser.Filters.Controller {
  constructor(camera) {
    super(camera, 'FilterVHS');
    this.time = 0;
    this.intensity = 0;
    this.spike = 0;
  }
}

const registered = new WeakSet();

// Friendly wrapper used by the game scene.
export default class VhsEffect {
  constructor(scene) {
    this.level = 0; // where intensity is heading
    this.intensity = 0; // what's shown right now (eases toward level)
    this.spike = 0;
    this.holdSpike = 0;
    this.controller = null;

    const renderer = scene.renderer;
    if (renderer.type !== Phaser.WEBGL) {
      console.warn('WebGL not available: VHS effect disabled');
      return;
    }
    // The shader only needs registering once per game.
    if (!registered.has(renderer)) {
      renderer.renderNodes.addNodeConstructor('FilterVHS', VhsRenderNode);
      registered.add(renderer);
    }
    // "external" = applied in screen space, so scanlines stay level.
    this.controller = scene.cameras.main.filters.external.add(new VhsController(scene.cameras.main));
  }

  // 0 hits = light base VHS look, 3 hits = heavily damaged tape.
  setDamage(hits) {
    this.level = Math.min(hits, 3) / 3;
    this.spike = 1;
  }

  // Keep the spike at a minimum level (used on death).
  hold(amount) {
    this.holdSpike = amount;
  }

  update(time, delta) {
    this.intensity += (this.level - this.intensity) * Math.min(1, delta / 350);
    this.spike = Math.max(this.holdSpike, this.spike - delta / 420);
    if (!this.controller) return;
    this.controller.time = (time / 1000) % 1000; // keep the number small for the GPU
    this.controller.intensity = this.intensity;
    this.controller.spike = this.spike;
  }
}
