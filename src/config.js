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

/** Global tile IDs used by the floor builder (tileset index + 1). */
export const TILES = {
  FLOOR: 1,
  WALL: 2,
};

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
  sightRange: 150,
  attackRange: 15, // distance at which the attack wind-up starts
  attackReach: 19, // distance within which the attack connects
  windupMs: 380,
  recoverMs: 650,
  stunMs: 260,
  blindSpeed: 9, // drift speed while blinded by the flashlight
};

export const FLOOR_GEN = {
  corridorMin: 2, // tiles
  corridorMax: 5, // tiles
  padding: 2, // tiles of empty space around the floor
  safeRadius: 110, // no enemy spawns within this distance of the player start
};

export const FLASHLIGHT = {
  range: 190,
  halfAngleDeg: 25,
  intensity: 1.5, // values above 1 saturate near the lens for a hot core
  falloff: 0.9,
  color: 0xfff0d2,
  nearRadius: 42, // ambient spill around the player while the beam is on
  nearIntensity: 0.55,
  burstRange: 130,
  burstHalfAngleDeg: 34,
  burstMs: 160,
  burstCooldownMs: 1500,
  blindMs: 1700,
};

export const LIGHTING = {
  void: 0x000000,
  corridorAmbient: 0x14161d,
  personalRadius: 56, // faint light around the player without a light source
  personalIntensity: 0.45,
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
