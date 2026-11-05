/**
 * Builds the playable floor from a generated plan: a single tilemap with all
 * rooms stamped in, connecting doors opened and corridors carved.
 */

import { TILE, TILES, FLOOR_GEN } from '../config.js';

export default class Floor {
  constructor(scene, plan) {
    this.scene = scene;
    this.plan = plan;
    this.widthPx = plan.width * TILE;
    this.heightPx = plan.height * TILE;

    // First GID of 1 matches Tiled's tile numbering.
    this.map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: plan.width, height: plan.height });
    const tileset = this.map.addTilesetImage('mall', 'tiles', TILE, TILE, 0, 0, 1);
    this.layer = this.map.createBlankLayer('world', tileset);

    this.solid = new Set();
    this.opaque = new Set();

    // Stamp room tiles.
    for (const room of plan.rooms) {
      const t = room.template;
      t.solid.forEach((g) => this.solid.add(g));
      t.opaque.forEach((g) => this.opaque.add(g));
      for (let y = 0; y < t.h; y++) {
        for (let x = 0; x < t.w; x++) {
          const index = t.tiles[y][x];
          if (index > 0) this.put(index, room.x + x, room.y + y);
        }
      }
    }

    // Carve corridors and open the doors they connect.
    for (const c of plan.corridors) {
      this.fill(c.floor, TILES.FLOOR);
      if (c.horizontal) {
        this.fill({ x: c.floor.x, y: c.floor.y - 1, w: c.floor.w, h: 1 }, TILES.WALL);
        this.fill({ x: c.floor.x, y: c.floor.y + c.floor.h, w: c.floor.w, h: 1 }, TILES.WALL);
      } else {
        this.fill({ x: c.floor.x - 1, y: c.floor.y, w: 1, h: c.floor.h }, TILES.WALL);
        this.fill({ x: c.floor.x + c.floor.w, y: c.floor.y, w: 1, h: c.floor.h }, TILES.WALL);
      }
      for (const end of [c.a, c.b]) {
        const d = end.door;
        this.fill({ x: end.room.x + d.tx, y: end.room.y + d.ty, w: d.tw, h: d.th }, TILES.FLOOR);
      }
    }

    this.layer.setCollision([...this.solid]);

    // Spawn points in world space.
    const start = plan.rooms[0];
    const ps = start.template.playerSpawn ?? { x: (start.template.w * TILE) / 2, y: (start.template.h * TILE) / 2 };
    this.playerSpawn = { x: start.x * TILE + ps.x, y: start.y * TILE + ps.y };

    this.enemySpawns = plan.rooms.flatMap((room) =>
      room.template.enemySpawns
        .map((s) => ({ ...s, x: room.x * TILE + s.x, y: room.y * TILE + s.y }))
        .filter((s) => Math.hypot(s.x - this.playerSpawn.x, s.y - this.playerSpawn.y) > FLOOR_GEN.safeRadius),
    );
  }

  put(index, x, y) {
    this.layer.putTileAt(index, x, y, false);
  }

  fill(rect, index) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) this.put(index, x, y);
    }
  }

  /** True if no opaque tile lies on the segment between the two points. */
  hasLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tile = this.layer.getTileAtWorldXY(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      if (tile && this.opaque.has(tile.index)) return false;
    }
    return true;
  }

  /** Returns the room containing the point, or null for corridors. */
  roomAt(px, py) {
    const x = px / TILE;
    const y = py / TILE;
    return (
      this.plan.rooms.find((r) => x >= r.x && x < r.x + r.template.w && y >= r.y && y < r.y + r.template.h) ?? null
    );
  }
}
