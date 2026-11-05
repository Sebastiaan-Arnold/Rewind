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
};

export const FLOOR_GEN = {
  corridorMin: 2, // tiles
  corridorMax: 5, // tiles
  padding: 2, // tiles of empty space around the floor
  safeRadius: 110, // no enemy spawns within this distance of the player start
};

export const FX = {
  hitstopMs: 60,
};
