/**
 * Builds the playable floor from a generated plan: a single tilemap with all
 * rooms stamped in, connecting doors opened and corridors carved.
 */

import { TILE, TILES, FLOOR_GEN, LIGHTING } from '../config.js';

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
    this.buildOpacityGrid();

    // Spawn points in world space.
    const start = plan.rooms[0];
    const ps = start.template.playerSpawn ?? { x: (start.template.w * TILE) / 2, y: (start.template.h * TILE) / 2 };
    this.playerSpawn = { x: start.x * TILE + ps.x, y: start.y * TILE + ps.y };

    this.enemySpawns = plan.rooms.flatMap((room) =>
      room.template.enemySpawns
        .map((s) => ({ ...s, x: room.x * TILE + s.x, y: room.y * TILE + s.y }))
        .filter((s) => Math.hypot(s.x - this.playerSpawn.x, s.y - this.playerSpawn.y) > FLOOR_GEN.safeRadius),
    );

    // Lighting data in world space.
    this.lights = plan.rooms.flatMap((room) =>
      room.template.lights.map((l) => ({ ...l, x: room.x * TILE + l.x, y: room.y * TILE + l.y })),
    );
    this.ambientAreas = [
      ...plan.corridors.map((c) => ({
        ...scaleRect(c.bounds),
        color: darker(c.a.room.template.ambient, c.b.room.template.ambient, LIGHTING.corridorAmbient),
      })),
      ...plan.rooms.map((r) => ({
        ...scaleRect({ x: r.x, y: r.y, w: r.template.w, h: r.template.h }),
        color: r.template.ambient,
      })),
    ];
  }

  buildOpacityGrid() {
    const { width, height } = this.plan;
    this.opacity = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.layer.getTileAt(x, y);
        if (tile && this.opaque.has(tile.index)) this.opacity[y * width + x] = 1;
      }
    }
  }

  isOpaqueTile(tx, ty) {
    const { width, height } = this.plan;
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return true;
    return this.opacity[ty * width + tx] === 1;
  }

  /**
   * Grid ray cast (DDA). Returns the distance in pixels from (x, y) along the
   * unit direction (dx, dy) to the first opaque tile, capped at maxDist.
   */
  castRay(x, y, dx, dy, maxDist) {
    let tx = Math.floor(x / TILE);
    let ty = Math.floor(y / TILE);
    const stepX = dx < 0 ? -1 : 1;
    const stepY = dy < 0 ? -1 : 1;
    const deltaX = dx === 0 ? Infinity : Math.abs(TILE / dx);
    const deltaY = dy === 0 ? Infinity : Math.abs(TILE / dy);
    let sideX = dx === 0 ? Infinity : (dx < 0 ? x - tx * TILE : (tx + 1) * TILE - x) / Math.abs(dx);
    let sideY = dy === 0 ? Infinity : (dy < 0 ? y - ty * TILE : (ty + 1) * TILE - y) / Math.abs(dy);
    for (;;) {
      let dist;
      if (sideX < sideY) {
        dist = sideX;
        sideX += deltaX;
        tx += stepX;
      } else {
        dist = sideY;
        sideY += deltaY;
        ty += stepY;
      }
      if (dist >= maxDist) return maxDist;
      if (this.isOpaqueTile(tx, ty)) return dist;
    }
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
    if (dist < 1) return true;
    return this.castRay(x1, y1, (x2 - x1) / dist, (y2 - y1) / dist, dist) >= dist;
  }

  /**
   * Approximate light level (0..1) at a world position from ambient areas and
   * static lights with line of sight. Flicker is ignored.
   */
  lightLevelAt(x, y) {
    const area = this.ambientAreas.find((a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
    let level = area ? luminance(area.color) : 0;
    for (const light of this.lights) {
      const d = Math.hypot(light.x - x, light.y - y);
      if (d >= light.radius || !this.hasLineOfSight(light.x, light.y, x, y)) continue;
      const f = 1 - d / light.radius;
      level += light.intensity * f * f * luminance(light.color);
    }
    return Math.min(1, level);
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

function scaleRect(r) {
  return { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE };
}

/** Perceived brightness of a colour, 0..1. */
function luminance(c) {
  return (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) / 255;
}

/** Returns the darkest of the given colours. */
function darker(...colors) {
  return colors.reduce((a, b) => (luminance(b) < luminance(a) ? b : a));
}
