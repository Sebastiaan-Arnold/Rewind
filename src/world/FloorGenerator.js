/**
 * Floor layout generation. Engine-independent; operates in tile units.
 *
 * 1. Shuffle the room templates; the first becomes the start room.
 * 2. For each remaining room, pair an open door on any placed room with an
 *    opposite-facing door of equal width on the new room.
 * 3. Place the new room so both doors align across a corridor of random
 *    length. Reject placements that overlap existing rooms or corridors.
 * 4. Unused doors remain closed.
 *
 * Attaching to any placed room (not only the last) yields branching layouts.
 */

import { FLOOR_GEN } from '../config.js';

const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };

export function generateFloor(templates, rng) {
  const order = rng.shuffle(templates);
  const rooms = [{ template: order[0], x: 0, y: 0, usedDoors: new Set() }];
  const corridors = [];

  for (const template of order.slice(1)) {
    const placed = attach(template, rooms, corridors, rng);
    if (!placed) console.warn(`Floor generator: no room for "${template.label}" this run`);
  }

  // Normalise coordinates so the floor starts at (padding, padding).
  const pad = FLOOR_GEN.padding;
  const all = [...rooms.map(roomRect), ...corridors.map((c) => c.bounds)];
  const minX = Math.min(...all.map((r) => r.x));
  const minY = Math.min(...all.map((r) => r.y));
  const maxX = Math.max(...all.map((r) => r.x + r.w));
  const maxY = Math.max(...all.map((r) => r.y + r.h));
  const dx = pad - minX;
  const dy = pad - minY;
  for (const r of rooms) { r.x += dx; r.y += dy; }
  for (const c of corridors) {
    for (const rect of [c.floor, c.bounds]) { rect.x += dx; rect.y += dy; }
  }

  return { rooms, corridors, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

function attach(template, rooms, corridors, rng) {
  const openDoors = rng.shuffle(
    rooms.flatMap((room) =>
      room.template.doors
        .map((door, i) => ({ room, door, i }))
        .filter(({ room: r, i }) => !r.usedDoors.has(i)),
    ),
  );

  for (const from of openDoors) {
    const candidates = rng.shuffle(
      template.doors
        .map((door, i) => ({ door, i }))
        .filter(({ door }) => door.side === OPPOSITE[from.door.side] && door.length === from.door.length),
    );
    for (const to of candidates) {
      const length = rng.int(FLOOR_GEN.corridorMin, FLOOR_GEN.corridorMax);
      const spot = placeAgainst(from.room, from.door, template, to.door, length);
      const newRect = { x: spot.x, y: spot.y, w: template.w, h: template.h };

      // Require a one-tile gap between rooms and an unobstructed corridor.
      const hitsRoom = rooms.some((r) => overlaps(newRect, roomRect(r), 1));
      const hitsCorridor = corridors.some((c) => overlaps(newRect, c.bounds, 1));
      const corridorBlocked =
        rooms.some((r) => r !== from.room && overlaps(spot.corridor.bounds, roomRect(r), 1)) ||
        corridors.some((c) => overlaps(spot.corridor.bounds, c.bounds, 0));
      if (hitsRoom || hitsCorridor || corridorBlocked) continue;

      const room = { template, x: spot.x, y: spot.y, usedDoors: new Set([to.i]) };
      from.room.usedDoors.add(from.i);
      rooms.push(room);
      corridors.push({
        ...spot.corridor,
        a: { room: from.room, door: from.door },
        b: { room, door: to.door },
      });
      return room;
    }
  }
  return null;
}

/**
 * Positions room B so its door `db` faces door `da` of room A, `len` tiles apart.
 * Returns B's position plus the corridor's floor rectangle and its bounds
 * (floor plus one wall tile on each side).
 */
function placeAgainst(A, da, B, db, len) {
  const ax = A.x + da.tx;
  const ay = A.y + da.ty;
  let x;
  let y;
  let floor;
  switch (da.side) {
    case 'east':
      x = A.x + A.template.w + len;
      y = ay - db.ty;
      floor = { x: A.x + A.template.w, y: ay, w: len, h: da.length };
      break;
    case 'west':
      x = A.x - len - B.w;
      y = ay - db.ty;
      floor = { x: A.x - len, y: ay, w: len, h: da.length };
      break;
    case 'south':
      x = ax - db.tx;
      y = A.y + A.template.h + len;
      floor = { x: ax, y: A.y + A.template.h, w: da.length, h: len };
      break;
    default: // north
      x = ax - db.tx;
      y = A.y - len - B.h;
      floor = { x: ax, y: A.y - len, w: da.length, h: len };
  }
  const horizontal = da.side === 'east' || da.side === 'west';
  const bounds = horizontal
    ? { x: floor.x, y: floor.y - 1, w: floor.w, h: floor.h + 2 }
    : { x: floor.x - 1, y: floor.y, w: floor.w + 2, h: floor.h };
  return { x, y, corridor: { floor, bounds, horizontal } };
}

function roomRect(r) {
  return { x: r.x, y: r.y, w: r.template.w, h: r.template.h };
}

function overlaps(a, b, gap) {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}
