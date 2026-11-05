/**
 * Minimal RGBA pixel buffer for procedural pixel art.
 * Engine-independent so it runs both in the browser and in Node tools.
 */
export class PixelBuffer {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x, y, color, alpha = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return this;
    const i = (y * this.w + x) * 4;
    this.data[i] = (color >> 16) & 255;
    this.data[i + 1] = (color >> 8) & 255;
    this.data[i + 2] = color & 255;
    this.data[i + 3] = alpha;
    return this;
  }

  get(x, y) {
    if (!this.inside(x, y)) return null;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
  }

  opaque(x, y) {
    return this.inside(x, y) && this.data[(y * this.w + x) * 4 + 3] > 0;
  }

  /** Fills the whole buffer, or calls fn(x, y) => color per pixel. */
  fill(colorOrFn) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = typeof colorOrFn === 'function' ? colorOrFn(x, y) : colorOrFn;
        if (c !== null && c !== undefined) this.set(x, y, c);
      }
    }
    return this;
  }

  rect(x, y, w, h, color) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, color);
    return this;
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color);
      }
    }
    return this;
  }

  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Darkens opaque pixels that border transparency, giving a rounded volume. */
  rim(amount = 0.25) {
    const edge = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.opaque(x, y)) continue;
        if (!this.opaque(x - 1, y) || !this.opaque(x + 1, y) || !this.opaque(x, y - 1) || !this.opaque(x, y + 1)) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.set(x, y, scale(this.get(x, y), 1 - amount));
    return this;
  }

  /** Adds a one-pixel outline around all opaque pixels. */
  outline(color) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.opaque(x, y)) continue;
        if (this.opaque(x - 1, y) || this.opaque(x + 1, y) || this.opaque(x, y - 1) || this.opaque(x, y + 1)) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.set(x, y, color);
    return this;
  }

  /** Copies another buffer onto this one (opaque pixels only). */
  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c !== null) this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }
}

/** Linear blend between two colours. */
export function mix(a, b, t) {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

/** Multiplies a colour's brightness, clamped to 0..255 per channel. */
export function scale(c, f) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
}

/** Deterministic per-pixel noise in [0, 1). */
export function noise(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
