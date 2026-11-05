/**
 * Gameplay tuning.
 * Distances in pixels, speeds in pixels per second, durations in milliseconds,
 * unless noted otherwise.
 */

/** Internal render resolution; scaled to fit the window. */
export const VIEW_W = 480;
export const VIEW_H = 270;

/** Tile size in pixels. */
export const TILE = 16;

/** Levels in play order; each is public/levels/<name>.json. */
export const LEVELS = ['mall'];

export const PLAYER = {
  speed: 95,
  radius: 5,
  hitsSurvived: 3,
  invulnerableMs: 1200,
  knockback: 200,
};

export const CROWBAR = {
  range: 24,
  arcDegrees: 110,
  cooldownMs: 320,
  damage: 1,
  knockback: 230,
};

export const ZOMBIE = {
  speed: 32,
  hp: 3,
  radius: 6,
  sightRange: 150, // in full light; scaled down in darkness (see STEALTH)
  attackRange: 15, // distance at which the attack wind-up starts
  attackReach: 19, // distance within which the attack connects
  windupMs: 380,
  recoverMs: 650,
  stunMs: 260,
};

/**
 * How visible the player is. Zombie sight range is scaled by the light level
 * at the player's position (0 = pitch black, 1 = fully lit):
 *   factor = clamp(base + level * gain, minFactor, 1)
 * A lit flashlight overrides this: zombies notice the beam from afar.
 */
export const STEALTH = {
  base: 0.35,
  gain: 1.6,
  minFactor: 0.35,
};

export const FLASHLIGHT = {
  range: 190,
  halfAngleDeg: 25,
  intensity: 1.5, // values above 1 saturate near the lens for a hot core
  falloff: 0.9,
  color: 0xfff0d2,
  nearRadius: 42, // ambient spill around the player while the beam is on
  nearIntensity: 0.5,
  toggleCooldownMs: 250,
  attractRange: 260, // zombies with line of sight notice a lit beam from this far
};

export const LIGHTING = {
  void: 0x000000,
  corridorAmbient: 0x0e1015,
  personalRadius: 56, // faint light around the player without a light source
  personalIntensity: 0.36,
  personalColor: 0xc8ccd8,
  rays: 72, // rays per baked light; more = smoother shadows
};

export const INVENTORY = {
  slots: 3,
  swapMs: 160,
  start: ['crowbar', 'flashlight', null],
};

export const CAMERA = {
  lerp: 0.1,
  lookAhead: 34, // pixels the camera leads toward the aim direction
};

/** Render order. The lightmap multiplies everything below it. */
export const DEPTH = {
  floor: 0,
  decals: 1,
  floorFx: 2,
  enemies: 9,
  player: 10,
  held: 11,
  fx: 12,
  lightmap: 50,
  emissive: 60,
};

export const FX = {
  hitstopMs: 60,
  // VHS degradation per hits taken (index = hits). Escalates late so the
  // first hit reads as a warning and the third as near-failure.
  damageLevels: [0, 0.12, 0.4, 1],
};
