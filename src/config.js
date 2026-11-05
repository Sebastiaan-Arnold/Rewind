// All the numbers that shape how the game feels, in one place.
// Tweak these freely: save the file and the browser reloads with the change.

// The game is drawn at this small size, then scaled up to fill the window.
// That's what gives the chunky low-res pixel look.
export const VIEW_W = 480;
export const VIEW_H = 270;

// Every tile in Tiled is 16x16 pixels.
export const TILE = 16;

// Tile numbers as they appear in Tiled's map data (tileset position + 1).
export const TILES = {
  FLOOR: 1,
  WALL: 2,
};

export const PLAYER = {
  speed: 95, // pixels per second
  radius: 5, // size of the collision circle
  hitsSurvived: 3, // the 4th hit ends the run
  invulnerableMs: 1200, // grace period after being hit
  knockback: 200, // how hard a hit shoves you
};

export const CROWBAR = {
  range: 24, // reach in pixels
  arcDegrees: 110, // width of the swing
  cooldownMs: 320, // time between swings
  damage: 1,
  knockback: 230,
};

export const ZOMBIE = {
  speed: 32, // much slower than the player
  hp: 3, // crowbar hits to kill
  radius: 6,
  sightRange: 150, // how far they notice you (if no wall is in the way)
  attackRange: 15, // start the attack wind-up within this distance
  attackReach: 19, // the hit lands if you're still this close
  windupMs: 380, // the telegraph: your window to back off or strike first
  recoverMs: 650,
  stunMs: 260, // frozen after being hit
};

export const FLOOR_GEN = {
  corridorMin: 2, // corridor length between two doors, in tiles
  corridorMax: 5,
  padding: 2, // empty tiles around the whole floor
  safeRadius: 110, // no enemies spawn this close to the player's start
};

export const FX = {
  hitstopMs: 60, // tiny freeze on impact; makes hits feel heavy
};
