/**
 * Procedural character, item and effect textures.
 * Characters face right (angle 0) and are rotated at runtime.
 *
 * Player frames:  <pose>-<step>, pose = empty | light | melee, step = 0..3
 * Zombie frames:  walk-<step>, windup  (textures zombie-0 .. zombie-3, one per outfit)
 */
import { PixelBuffer, mix, noise } from './pixel.js';
import { P } from './palette.js';

const FRAME = 16;
const STRIDE = [0, 2, 0, -2];

function toCanvas(buffer) {
  const canvas = document.createElement('canvas');
  canvas.width = buffer.w;
  canvas.height = buffer.h;
  canvas.getContext('2d').putImageData(new ImageData(buffer.data, buffer.w, buffer.h), 0, 0);
  return canvas;
}

/** Registers a horizontal strip of frames as one texture with named frames. */
function addSheet(scene, key, frames) {
  const names = Object.keys(frames);
  const sheet = new PixelBuffer(FRAME * names.length, FRAME);
  names.forEach((name, i) => sheet.blit(frames[name], i * FRAME, 0));
  const texture = scene.textures.addCanvas(key, toCanvas(sheet));
  names.forEach((name, i) => texture.add(name, 0, i * FRAME, 0, FRAME, FRAME));
}

function addImage(scene, key, buffer) {
  scene.textures.addCanvas(key, toCanvas(buffer));
}

// ------------------------------------------------------------------ player

function drawPlayer(pose, step) {
  const b = new PixelBuffer(FRAME, FRAME);
  const s = STRIDE[step];
  const swing = -s * 0.75;

  // Feet
  b.ellipse(8 + s, 6.2, 1.7, 1.2, P.shoe);
  b.ellipse(8 - s, 9.8, 1.7, 1.2, P.shoe);

  // Arms: [sleeve x, sleeve y, hand x, hand y]
  let left;
  let right;
  if (pose === 'light') {
    left = [10, 5.6, 12, 7.2];
    right = [10, 10.4, 12, 8.8];
  } else if (pose === 'melee') {
    left = [7.5 + swing, 3.8, 9.3 + swing, 3.6];
    right = [10, 11, 12, 10.4];
  } else {
    left = [7.5 + swing, 3.8, 9.3 + swing, 3.6];
    right = [7.5 - swing, 12.2, 9.3 - swing, 12.4];
  }
  for (const [sx, sy, hx, hy] of [left, right]) {
    b.ellipse(sx, sy, 1.8, 1.3, P.jacket);
    b.ellipse(hx, hy, 1.1, 1.1, P.skin);
  }

  // Torso and head
  b.ellipse(7.6, 8, 2.8, 4.7, P.jacket);
  b.ellipse(6.8, 8, 1.4, 3.4, P.jacketLight);
  b.ellipse(8.3, 8, 2.5, 2.5, P.hair);
  b.set(7, 7, P.hairLight).set(8, 7, P.hairLight);
  b.set(10, 7, P.skin).set(10, 8, P.skin);

  return b.rim(0.18).outline(P.ink);
}

// ------------------------------------------------------------------ zombie

/** Zombie outfits: shopper, security guard, store employee, teenager. */
const OUTFITS = [
  { skin: P.zSkin, shirt: P.zShirt, dark: P.zShirtDark },
  { skin: 0x92a07c, shirt: 0x2c3a5a, dark: 0x1c2640 },
  { skin: 0x85987a, shirt: 0x8a2f2f, dark: 0x5a1f1f },
  { skin: 0x97a882, shirt: 0x2f7f7a, dark: 0x1f5552 },
];

function drawZombie(frame, step = 0, outfit = OUTFITS[0]) {
  const b = new PixelBuffer(FRAME, FRAME);
  const s = STRIDE[step] * 0.6;

  b.ellipse(8 + s, 6.2, 1.6, 1.2, outfit.dark);
  b.ellipse(8 - s, 9.8, 1.6, 1.2, outfit.dark);

  // Arms reach forward; the wind-up pulls them back.
  const reach = frame === 'windup' ? [9.5, 9.5] : [12.6 + s * 0.5, 12.6 - s * 0.5];
  const spread = [4.6, 11.4];
  [0, 1].forEach((i) => {
    b.line(7.5, spread[i] + (i ? 0.6 : -0.6), reach[i] - 1, spread[i], outfit.shirt);
    b.ellipse(reach[i], spread[i], 1.2, 1.1, outfit.skin);
  });

  b.ellipse(7.4, 8, 2.9, 4.6, outfit.shirt);
  b.set(6, 6, outfit.dark).set(7, 10, outfit.dark).set(5, 9, outfit.dark);
  b.ellipse(8.8, 8, 2.4, 2.4, outfit.skin);
  b.set(8, 7, P.zSkinDark).set(7, 9, P.zSkinDark);
  b.set(10, 7, P.zEye).set(10, 9, P.zEye);

  return b.rim(0.2).outline(P.ink);
}

// ------------------------------------------------------------------- items

function drawCrowbar() {
  const b = new PixelBuffer(15, 5);
  b.line(1, 2, 11, 2, 0x8e2b26);
  b.line(1, 3, 11, 3, mix(0x8e2b26, P.ink, 0.4));
  b.line(11, 2, 13, 0, P.steel);
  b.set(12, 3, P.steelDark).set(13, 4, P.steelDark);
  return b.outline(P.ink);
}

function drawFlashlight() {
  const b = new PixelBuffer(10, 5);
  b.rect(1, 1, 6, 3, P.steelDark);
  b.rect(1, 1, 6, 1, P.steel);
  b.rect(7, 0, 2, 5, P.steel);
  b.rect(8, 1, 1, 3, P.paper);
  return b.outline(P.ink);
}

function drawIcon(kind) {
  const b = new PixelBuffer(14, 14);
  if (kind === 'crowbar') {
    b.line(2, 12, 10, 4, 0x8e2b26);
    b.line(3, 12, 11, 4, mix(0x8e2b26, P.ink, 0.35));
    b.line(10, 4, 11, 1, P.steelLight);
    b.set(12, 1, P.steelLight);
  } else {
    b.line(2, 11, 7, 6, P.steelDark);
    b.line(3, 12, 8, 7, P.steelDark);
    b.line(2, 12, 7, 7, P.steel);
    b.rect(8, 4, 3, 3, P.steelLight);
    b.set(10, 4, P.paper).set(11, 3, P.paper);
  }
  return b.outline(P.ink);
}

// ------------------------------------------------------------------ device

/** CRT television, front view, with a static-filled screen. */
function drawCrt(frame) {
  const b = new PixelBuffer(FRAME, FRAME);
  b.line(5, 0, 7, 3, P.steelDark);
  b.line(11, 0, 9, 3, P.steelDark);
  b.rect(1, 3, 14, 11, P.ink);
  b.rect(2, 4, 12, 9, 0x8f8a7c);
  b.rect(2, 4, 12, 1, 0xb3ae9e);
  b.rect(3, 5, 8, 7, P.ink);
  for (let y = 6; y < 11; y++) {
    for (let x = 4; x < 10; x++) {
      const n = noise(x, y, frame * 7 + 3);
      b.set(x, y, n < 0.35 ? 0xe8f4ff : n < 0.7 ? 0x7f9db0 : 0x26343e);
    }
  }
  b.set(12, 6, P.ink).set(12, 9, P.ink).set(12, 11, P.neonPink);
  b.rect(3, 14, 2, 1, P.ink).rect(11, 14, 2, 1, P.ink);
  return b;
}

// --------------------------------------------------------------- title art

/** VCR front panel. Display and labels are drawn as text on top at runtime. */
function drawVcr() {
  const W = 300;
  const H = 46;
  const b = new PixelBuffer(W, H);
  b.rect(0, 0, W, H, P.ink);
  b.rect(1, 1, W - 2, H - 2, 0x2b2c31);
  b.rect(1, 1, W - 2, 1, 0x4a4c53);
  b.rect(1, H - 3, W - 2, 2, 0x1b1c20);
  // Tape slot with flap
  b.rect(20, 12, 120, 14, P.ink);
  b.rect(21, 13, 118, 12, 0x17181b);
  b.rect(21, 13, 118, 1, 0x3a3c42);
  // Display window
  b.rect(176, 10, 70, 18, P.ink);
  b.rect(177, 11, 68, 16, 0x061416);
  // Transport buttons
  for (let i = 0; i < 5; i++) {
    const x = 160 + i * 26;
    b.rect(x, 33, 22, 7, P.ink);
    b.rect(x + 1, 34, 20, 5, 0x44464d);
    b.rect(x + 1, 34, 20, 1, 0x5e6068);
  }
  // Power button and LED
  b.rect(258, 12, 30, 12, P.ink);
  b.rect(259, 13, 28, 10, 0x44464d);
  b.rect(272, 30, 3, 2, 0xff3040);
  return b;
}

function drawCassette() {
  const b = new PixelBuffer(110, 10);
  b.rect(0, 0, 110, 10, 0x141418);
  b.rect(1, 1, 108, 8, 0x26262c);
  b.rect(20, 2, 70, 6, P.paper);
  b.rect(20, 4, 70, 1, P.neonPink);
  return b;
}

// ------------------------------------------------------------------ effects

function drawSoftGlow(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function drawSplat() {
  const b = new PixelBuffer(12, 12);
  b.ellipse(6, 6, 3.5, 3, 0xffffff);
  [[2, 3], [10, 4], [3, 10], [9, 9], [6, 1]].forEach(([x, y]) => b.ellipse(x, y, 1.2, 1.2, 0xffffff));
  return b;
}

export function makeCharacterTextures(scene) {
  const playerFrames = {};
  for (const pose of ['empty', 'light', 'melee']) {
    for (let i = 0; i < 4; i++) playerFrames[`${pose}-${i}`] = drawPlayer(pose, i);
  }
  addSheet(scene, 'player', playerFrames);

  OUTFITS.forEach((outfit, v) => {
    const zombieFrames = {};
    for (let i = 0; i < 4; i++) zombieFrames[`walk-${i}`] = drawZombie('walk', i, outfit);
    zombieFrames.windup = drawZombie('windup', 0, outfit);
    addSheet(scene, `zombie-${v}`, zombieFrames);
  });

  const crtFrames = {};
  for (let i = 0; i < 4; i++) crtFrames[`static-${i}`] = drawCrt(i);
  addSheet(scene, 'device-crt', crtFrames);

  addImage(scene, 'vcr', drawVcr());
  addImage(scene, 'cassette', drawCassette());

  addImage(scene, 'held-crowbar', drawCrowbar());
  addImage(scene, 'held-flashlight', drawFlashlight());
  addImage(scene, 'icon-crowbar', drawIcon('crowbar'));
  addImage(scene, 'icon-flashlight', drawIcon('flashlight'));

  addImage(scene, 'fx-dot', new PixelBuffer(2, 2).fill(0xffffff));
  addImage(scene, 'fx-spark', new PixelBuffer(3, 1).fill(0xffffff));
  addImage(scene, 'fx-splat', drawSplat());
  addImage(scene, 'fx-eyes', new PixelBuffer(1, 3).set(0, 0, 0xffffff).set(0, 2, 0xffffff));
  scene.textures.addCanvas('fx-glow', drawSoftGlow(64));

  const cross = new PixelBuffer(9, 9);
  cross.rect(4, 1, 1, 2, 0xf2f2f2).rect(4, 6, 1, 2, 0xf2f2f2).rect(1, 4, 2, 1, 0xf2f2f2).rect(6, 4, 2, 1, 0xf2f2f2);
  cross.set(4, 4, 0xf2f2f2);
  addImage(scene, 'crosshair', cross.outline(0x000000));
}
