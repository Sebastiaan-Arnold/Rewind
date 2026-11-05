/**
 * The playable level: tilemap, collision, opacity and pit grids, lighting
 * data and spatial queries.
 */
import { TILE } from '../config.js';

export default class Floor {
  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.width = level.width;
    this.height = level.height;
    this.widthPx = level.width * TILE;
    this.heightPx = level.height * TILE;

    // First GID of 1 matches Tiled's tile numbering.
    this.map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: level.width, height: level.height });
    const tileset = this.map.addTilesetImage('mall', 'tiles', TILE, TILE, 0, 0, 1);
    this.layer = this.map.createBlankLayer('world', tileset);

    this.opacity = new Uint8Array(level.width * level.height);
    this.pits = new Uint8Array(level.width * level.height);
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const index = level.tiles[y][x];
        if (index <= 0) continue;
        this.layer.putTileAt(index, x, y, false);
        if (level.opaque.has(index)) this.opacity[y * level.width + x] = 1;
        if (level.pit.has(index)) this.pits[y * level.width + x] = 1;
      }
    }
    this.layer.setCollision([...level.solid]);

    this.playerSpawn = level.playerSpawn;
    this.enemySpawns = level.enemySpawns;
    this.lights = level.lights;
    this.device = level.device;

    // Ambient light: the level default, then named areas on top (later wins).
    this.ambientAreas = [
      { name: '', x: 0, y: 0, w: this.widthPx, h: this.heightPx, color: level.ambient },
      ...level.areas,
    ];
  }

  isOpaqueTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return true;
    return this.opacity[ty * this.width + tx] === 1;
  }

  /** True if the world position lies over a pit tile. */
  isPitAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
    return this.pits[ty * this.width + tx] === 1;
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

  /** True if no opaque tile lies on the segment between the two points. */
  hasLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 1) return true;
    return this.castRay(x1, y1, (x2 - x1) / dist, (y2 - y1) / dist, dist) >= dist;
  }

  /** The topmost ambient area containing the point. */
  areaAt(x, y) {
    for (let i = this.ambientAreas.length - 1; i >= 0; i--) {
      const a = this.ambientAreas[i];
      if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) return a;
    }
    return null;
  }

  /**
   * Approximate light level (0..1) at a world position from ambient areas and
   * static lights with line of sight. Flicker is ignored.
   */
  lightLevelAt(x, y) {
    const area = this.areaAt(x, y);
    let level = area ? luminance(area.color) : 0;
    for (const light of this.lights) {
      const d = Math.hypot(light.x - x, light.y - y);
      if (d >= light.radius || !this.hasLineOfSight(light.x, light.y, x, y)) continue;
      const f = 1 - d / light.radius;
      level += light.intensity * f * f * luminance(light.color);
    }
    return Math.min(1, level);
  }
}

/** Perceived brightness of a colour, 0..1. */
function luminance(c) {
  return (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) / 255;
}
