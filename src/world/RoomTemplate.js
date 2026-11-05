/**
 * Converts a Tiled room map into a plain room template.
 *
 * Map requirements (see README, "Room authoring"):
 *   - Tile layer `ground`.
 *   - Object layer `objects` with objects of class `door`, `enemy`, `player` or `light`.
 *   - Tileset tile properties `collides` and `opaque` (booleans).
 *   - Optional map property `ambient` (colour): base light level of the room.
 */
export function readRoomTemplate(scene, key) {
  const map = scene.make.tilemap({ key });
  const T = map.tileWidth;
  const w = map.width;
  const h = map.height;

  const ground = map.getLayer('ground');
  if (!ground) throw new Error(`Room "${key}" has no tile layer named "ground"`);
  const tiles = ground.data.map((row) => row.map((tile) => tile.index));

  const objects = map.getObjectLayer('objects')?.objects ?? [];
  const doors = [];
  const enemySpawns = [];
  const lights = [];
  let playerSpawn = null;

  for (const obj of objects) {
    if (obj.type === 'door') {
      const door = toDoor(obj, T, w, h);
      if (door) doors.push(door);
      else console.warn(`Room "${key}": door #${obj.id} is not on the outer wall and was ignored`);
    } else if (obj.type === 'enemy') {
      enemySpawns.push({ x: obj.x, y: obj.y, kind: getProp(obj, 'kind') ?? 'zombie' });
    } else if (obj.type === 'player') {
      playerSpawn = { x: obj.x, y: obj.y };
    } else if (obj.type === 'light') {
      lights.push({
        x: obj.x,
        y: obj.y,
        color: parseColor(getProp(obj, 'color'), 0xffffff),
        radius: getProp(obj, 'radius') ?? 96,
        intensity: getProp(obj, 'intensity') ?? 0.8,
        flicker: getProp(obj, 'flicker') ?? 'none',
        glow: getProp(obj, 'glow') ?? false,
      });
    }
  }

  const solid = new Set();
  const opaque = new Set();
  for (const tileset of map.tilesets) {
    for (const [id, props] of Object.entries(tileset.tileProperties ?? {})) {
      const gid = tileset.firstgid + Number(id);
      if (props.collides) solid.add(gid);
      if (props.opaque) opaque.add(gid);
    }
  }

  const label = getProp(map, 'label') ?? key.replace('room:', '');
  const ambient = parseColor(getProp(map, 'ambient'), 0x30364a);
  map.destroy();

  return { key, label, w, h, tiles, doors, enemySpawns, playerSpawn, lights, ambient, solid, opaque };
}

/** Resolves a door object to its wall side and tile-space rectangle. */
function toDoor(obj, T, w, h) {
  const tx = Math.round(obj.x / T);
  const ty = Math.round(obj.y / T);
  const tw = Math.max(1, Math.round(obj.width / T));
  const th = Math.max(1, Math.round(obj.height / T));
  let side = null;
  if (ty === 0) side = 'north';
  else if (ty + th === h) side = 'south';
  else if (tx === 0) side = 'west';
  else if (tx + tw === w) side = 'east';
  if (!side) return null;
  const horizontal = side === 'north' || side === 'south';
  return {
    side,
    tx,
    ty,
    tw: horizontal ? tw : 1,
    th: horizontal ? 1 : th,
    length: horizontal ? tw : th,
  };
}

/** Parses Tiled colour strings (#RRGGBB or #AARRGGBB) to 0xRRGGBB. */
function parseColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const hex = value.replace('#', '');
  return parseInt(hex.length === 8 ? hex.slice(2) : hex, 16);
}

/** Reads a Tiled custom property (stored as an array of { name, value }). */
function getProp(obj, name) {
  const props = obj.properties;
  if (Array.isArray(props)) return props.find((p) => p.name === name)?.value;
  return props?.[name];
}
