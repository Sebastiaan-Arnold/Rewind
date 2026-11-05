/**
 * Reads a Tiled level map into plain data.
 *
 * Map requirements (see README, "Level authoring"):
 *   - Tile layer `ground` (floors and walls) and optional tile layer `props`
 *     (furniture, debris and other overlays with transparent backgrounds).
 *   - Object layer `objects` with objects of class:
 *       player  point   player start
 *       enemy   point   property `kind` (string), e.g. zombie
 *       light   point   properties color, radius, intensity, flicker, glow
 *       area    rect    properties name (string), ambient (color)
 *       device  point   the era's exit device
 *   - Tileset tile properties: collides, opaque, pit (booleans).
 *   - Map property `ambient` (color): light level outside any area.
 */
export function readLevel(scene, key) {
  const map = scene.make.tilemap({ key });
  const ground = map.getLayer('ground');
  if (!ground) throw new Error(`Level "${key}" has no tile layer named "ground"`);

  const level = {
    key,
    name: getProp(map, 'name') ?? key.replace('level:', ''),
    width: map.width,
    height: map.height,
    tileSize: map.tileWidth,
    tiles: ground.data.map((row) => row.map((tile) => tile.index)),
    props: map.getLayer('props')?.data.map((row) => row.map((tile) => tile.index)) ?? null,
    ambient: parseColor(getProp(map, 'ambient'), 0x0e1015),
    playerSpawn: null,
    enemySpawns: [],
    lights: [],
    areas: [],
    device: null,
    solid: new Set(),
    opaque: new Set(),
    pit: new Set(),
  };

  for (const obj of map.getObjectLayer('objects')?.objects ?? []) {
    switch (obj.type) {
      case 'player':
        level.playerSpawn = { x: obj.x, y: obj.y };
        break;
      case 'enemy':
        level.enemySpawns.push({ x: obj.x, y: obj.y, kind: getProp(obj, 'kind') ?? 'zombie' });
        break;
      case 'light':
        level.lights.push({
          x: obj.x,
          y: obj.y,
          color: parseColor(getProp(obj, 'color'), 0xffffff),
          radius: getProp(obj, 'radius') ?? 96,
          intensity: getProp(obj, 'intensity') ?? 0.8,
          flicker: getProp(obj, 'flicker') ?? 'none',
          glow: getProp(obj, 'glow') ?? false,
        });
        break;
      case 'area':
        level.areas.push({
          name: getProp(obj, 'name') ?? obj.name ?? '',
          x: obj.x,
          y: obj.y,
          w: obj.width,
          h: obj.height,
          color: parseColor(getProp(obj, 'ambient'), level.ambient),
        });
        break;
      case 'device':
        level.device = { x: obj.x, y: obj.y };
        break;
      default:
        console.warn(`Level "${key}": object #${obj.id} has unknown class "${obj.type}"`);
    }
  }

  for (const tileset of map.tilesets) {
    for (const [id, props] of Object.entries(tileset.tileProperties ?? {})) {
      const gid = tileset.firstgid + Number(id);
      if (props.collides) level.solid.add(gid);
      if (props.opaque) level.opaque.add(gid);
      if (props.pit) level.pit.add(gid);
    }
  }

  if (!level.playerSpawn) throw new Error(`Level "${key}" has no player start`);
  map.destroy();
  return level;
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
