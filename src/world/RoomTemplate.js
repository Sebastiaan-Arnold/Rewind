// Turns one Tiled room file into a plain "template" the generator can use.
//
// What the generator needs from each Tiled room:
//   - Tile layer "ground": the floor, walls and furniture.
//   - Object layer "objects", containing objects whose Class is:
//       door   - a rectangle on the outer wall, 2 tiles wide. Paint wall
//                tiles underneath it; the generator opens the doors it uses
//                and leaves the rest as solid wall.
//       enemy  - a point where an enemy spawns (property "kind", e.g. zombie).
//       player - a point where the player starts if this is the first room.
//   - Tileset tiles can have custom properties:
//       collides (bool) - solid, nothing walks through it
//       opaque   (bool) - blocks enemies' line of sight (walls, not glass)

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
  let playerSpawn = null;

  for (const obj of objects) {
    if (obj.type === 'door') {
      const door = toDoor(obj, T, w, h);
      if (door) doors.push(door);
      else console.warn(`Room "${key}": door #${obj.id} is not on the outer wall, ignored`);
    } else if (obj.type === 'enemy') {
      enemySpawns.push({ x: obj.x, y: obj.y, kind: getProp(obj, 'kind') ?? 'zombie' });
    } else if (obj.type === 'player') {
      playerSpawn = { x: obj.x, y: obj.y };
    }
  }

  // Collect which tile numbers are solid / see-through, from the tileset.
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
  map.destroy();

  return { key, label, w, h, tiles, doors, enemySpawns, playerSpawn, solid, opaque };
}

// Works out which wall a door sits on, in tile units.
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
    length: horizontal ? tw : th, // how wide the opening is
  };
}

// Tiled stores custom properties as a list of { name, value }.
function getProp(obj, name) {
  const props = obj.properties;
  if (Array.isArray(props)) return props.find((p) => p.name === name)?.value;
  return props?.[name];
}
