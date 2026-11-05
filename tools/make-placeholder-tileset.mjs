/**
 * Generates the Era 01 placeholder tileset.
 *
 * Usage:   npm run tileset
 * Output:  public/assets/tiles/mall-placeholder.png (8x3 tiles, 16x16 px)
 *
 * Tile IDs (GID = ID + 1).  c = collides, o = opaque (blocks light and sight)
 *    0 floor             1 wall (c,o)        2 checker floor     3 planter (c)
 *    4 carpet            5 counter (c)       6 glass (c)         7 concrete
 *    8 floor variant     9 floor cracked    10 concrete stained 11 bench (c)
 *   12 bin (c)          13 shutter (c,o)    14 floor grate      15 neon wall pink (c,o)
 *   16 neon wall cyan (c,o) 17 kiosk (c)    18 shelf (c)        19 boxes (c)
 *   20 puddle           21 hazard concrete  22 vent wall (c,o)  23 debris floor
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { PixelBuffer, mix, scale, noise } from '../src/art/pixel.js';
import { P } from '../src/art/palette.js';

const T = 16;
const COLS = 8;
const tiles = [];

const tile = (id, paint) => {
  const b = new PixelBuffer(T, T);
  paint(b);
  tiles[id] = b;
};

// ---------------------------------------------------------------- surfaces

function terrazzo(b, seed) {
  b.fill((x, y) => {
    if (x % 8 === 7 || y % 8 === 7) return P.grout;
    const n = noise(x, y, seed);
    let c = P.teal;
    if (n < 0.08) c = P.tealLight;
    else if (n > 0.93) c = P.tealDark;
    if ((x + y) % 16 === 4 && noise(x, y, seed + 7) < 0.6) c = mix(c, P.tealSheen, 0.5);
    return c;
  });
}

function concrete(b, seed) {
  b.fill((x, y) => {
    if (x === 15 || y === 15) return P.concreteDark;
    const n = noise(x, y, seed);
    return n < 0.1 ? P.concreteLight : n > 0.9 ? P.concreteDark : P.concrete;
  });
}

function bricks(b, seed) {
  b.fill((x, y) => {
    const row = Math.floor(y / 4);
    const offset = row % 2 === 0 ? 0 : 4;
    if (y % 4 === 3 || (x + offset) % 8 === 7) return P.mortar;
    const n = noise(Math.floor((x + offset) / 8), row, seed);
    let c = n < 0.3 ? P.mauveDark : n > 0.8 ? P.mauveLight : P.mauve;
    if (y % 4 === 0) c = mix(c, P.mauveLight, 0.45);
    if (y % 4 === 2) c = mix(c, P.mauveDeep, 0.35);
    return c;
  });
}

tile(0, (b) => terrazzo(b, 1));
tile(8, (b) => {
  terrazzo(b, 11);
  b.fill((x, y) => (x % 8 !== 7 && y % 8 !== 7 && noise(x, y, 3) < 0.05 ? P.cream : null));
});
tile(9, (b) => {
  terrazzo(b, 21);
  const crack = [[1, 3], [5, 6], [8, 6], [11, 10], [15, 12]];
  for (let i = 0; i < crack.length - 1; i++) b.line(...crack[i], ...crack[i + 1], P.tealDeep);
  b.set(9, 9, P.tealDeep).set(12, 12, P.tealDeep);
});
tile(2, (b) =>
  b.fill((x, y) => {
    if (x % 8 === 7 || y % 8 === 7) return P.grout;
    const light = (x < 8) !== (y < 8);
    const n = noise(x, y, 5);
    if (light) return n < 0.1 ? P.creamDark : P.cream;
    return n < 0.1 ? P.tealDark : P.tealDeep;
  }),
);
tile(4, (b) =>
  b.fill((x, y) => {
    const d = (Math.abs(x - 7.5) + Math.abs(y - 7.5)) % 8;
    if (d < 1) return P.wineLight;
    return noise(x, y, 9) < 0.12 ? mix(P.wine, P.wineLight, 0.5) : P.wine;
  }),
);
tile(7, (b) => concrete(b, 31));
tile(10, (b) => {
  concrete(b, 41);
  b.fill((x, y) => {
    const d = Math.hypot((x - 9) / 6, (y - 8) / 4.5) + noise(x, y, 2) * 0.35;
    return d < 1 ? mix(P.concreteDark, 0x101114, 0.4) : null;
  });
});
tile(21, (b) => {
  concrete(b, 51);
  b.fill((x, y) => (y < 5 ? ((x + y) % 6 < 3 ? P.hazard : P.ink) : y === 5 ? P.concreteDark : null));
});
tile(20, (b) => {
  terrazzo(b, 61);
  b.ellipse(8, 9, 6, 3.6, P.water);
  b.ellipse(7, 8.5, 4, 2.2, mix(P.water, P.waterLight, 0.35));
  b.line(4, 7, 8, 7, P.waterLight);
});
tile(23, (b) => {
  terrazzo(b, 71);
  [[3, 4], [10, 2], [12, 11], [5, 12]].forEach(([x, y]) => b.rect(x, y, 2, 1, P.paper));
  [[7, 8], [2, 9], [13, 6]].forEach(([x, y]) => b.set(x, y, P.tealDeep));
  b.line(8, 12, 11, 13, P.steelDark);
});
tile(14, (b) => {
  terrazzo(b, 81);
  b.rect(3, 3, 10, 10, P.steelDark);
  for (let y = 4; y < 12; y += 2) b.rect(4, y, 8, 1, P.ink);
  b.set(3, 3, P.steel).set(12, 3, P.steel);
});

// ------------------------------------------------------------------- walls

tile(1, (b) => bricks(b, 1));
const neon = (color) => (b) => {
  bricks(b, 2);
  b.rect(0, 6, 16, 1, mix(color, P.mauveDark, 0.55));
  b.rect(0, 7, 16, 1, mix(color, 0xffffff, 0.6));
  b.rect(0, 8, 16, 1, color);
  b.rect(0, 9, 16, 1, mix(color, P.mauveDark, 0.55));
  b.set(3, 5, P.steelDark).set(3, 10, P.steelDark).set(12, 5, P.steelDark).set(12, 10, P.steelDark);
};
tile(15, neon(P.neonPink));
tile(16, neon(P.neonCyan));
tile(22, (b) => {
  bricks(b, 3);
  b.rect(2, 4, 12, 8, P.steelDark);
  for (let y = 5; y < 11; y++) b.rect(3, y, 10, 1, y % 2 ? P.ink : P.steel);
  b.set(2, 4, P.steelLight).set(13, 4, P.steelLight).set(2, 11, P.steelLight).set(13, 11, P.steelLight);
});
tile(13, (b) =>
  b.fill((x, y) => {
    const base = [P.steelLight, P.steel, P.steelDark][y % 3];
    return noise(x, y, 13) < 0.06 ? mix(base, P.pot, 0.5) : base;
  }),
);

// ------------------------------------------------------------------- props

tile(3, (b) => {
  terrazzo(b, 91);
  b.ellipse(8, 8, 7, 7, P.potDark);
  b.ellipse(8, 8, 6, 6, P.pot);
  b.ellipse(8, 8, 4.6, 4.6, 0x33251a);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    const lx = 8 + Math.cos(a) * 3;
    const ly = 8 + Math.sin(a) * 3;
    b.ellipse(lx, ly, 2.1, 2.1, P.leaf);
    b.set(lx - 1, ly - 1, P.leafLight);
  }
  b.ellipse(8, 8, 1.6, 1.6, P.leafDark);
});
tile(5, (b) =>
  b.fill((x, y) => {
    if (y >= 13) return y === 13 ? P.ink : P.woodDark;
    if (y === 0) return P.woodLight;
    return (y % 4 === 2 && noise(x, y, 4) < 0.7) ? P.woodDark : noise(x, y, 6) < 0.08 ? P.woodLight : P.wood;
  }),
);
tile(6, (b) =>
  b.fill((x, y) => {
    if (y <= 1 || y >= 14) return y === 0 || y === 15 ? P.steelDark : P.steel;
    const d = (((x - y) % 16) + 16) % 16;
    if (d < 2) return P.glassLight;
    if (d === 6) return mix(P.glass, P.glassLight, 0.4);
    return P.glass;
  }),
);
tile(11, (b) => {
  terrazzo(b, 101);
  b.rect(2, 3, 1, 10, P.steelDark).rect(13, 3, 1, 10, P.steelDark);
  for (const y of [4, 7, 10]) {
    b.rect(1, y, 14, 2, P.wood);
    b.rect(1, y, 14, 1, P.woodLight);
  }
});
tile(12, (b) => {
  terrazzo(b, 111);
  b.ellipse(8, 8, 6.5, 6.5, P.steelDark);
  b.ellipse(8, 8, 5.5, 5.5, P.steel);
  b.ellipse(8, 8, 3.8, 3.8, P.ink);
  b.set(5, 4, P.steelLight).set(4, 5, P.steelLight).set(6, 3, P.steelLight);
  b.rect(7, 7, 2, 1, P.paper);
});
tile(17, (b) =>
  b.fill((x, y) => {
    if (y === 15) return P.ink;
    const stripe = Math.floor(x / 4) % 2 === 0 ? 0xa8403a : P.cream;
    return y === 0 ? mix(stripe, 0xffffff, 0.2) : y >= 13 ? scale(stripe, 0.7) : stripe;
  }),
);
tile(18, (b) => {
  b.fill(P.steelDark);
  b.rect(1, 1, 14, 14, P.steel);
  const goods = [P.neonPink, P.sodium, P.leafLight, P.glassLight, P.cream, P.jacket];
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if (noise(gx, gy, 18) < 0.2) continue;
      const c = goods[Math.floor(noise(gx, gy, 19) * goods.length)];
      b.rect(2 + gx * 4, 2 + gy * 4, 3, 3, scale(c, 0.85));
      b.set(2 + gx * 4, 2 + gy * 4, c);
    }
  }
});
tile(19, (b) => {
  concrete(b, 121);
  const box = (x, y, w, h) => {
    b.rect(x, y, w, h, P.cardboardDark);
    b.rect(x + 1, y + 1, w - 2, h - 2, P.cardboard);
    b.rect(x + 1, y + Math.floor(h / 2), w - 2, 1, mix(P.cardboard, P.paper, 0.5));
  };
  box(1, 1, 9, 8);
  box(7, 7, 8, 8);
});

// ---------------------------------------------------------------- encoding

// The lightmap darkens the scene at runtime, so surfaces are exported at a
// higher exposure than the base palette.
const EXPOSURE = 1.35;

const ROWS = Math.ceil(tiles.length / COLS);
const sheet = new PixelBuffer(COLS * T, ROWS * T);
tiles.forEach((t, i) => sheet.blit(t, (i % COLS) * T, Math.floor(i / COLS) * T));
for (let i = 0; i < sheet.data.length; i += 4) {
  for (let c = 0; c < 3; c++) sheet.data[i + c] = Math.min(255, sheet.data[i + c] * EXPOSURE);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(sheet.w, 0);
ihdr.writeUInt32BE(sheet.h, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const stride = sheet.w * 4;
const raw = Buffer.alloc((stride + 1) * sheet.h);
for (let y = 0; y < sheet.h; y++) {
  raw[y * (stride + 1)] = 0; // filter: none
  Buffer.from(sheet.data.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync('public/assets/tiles', { recursive: true });
writeFileSync('public/assets/tiles/mall-placeholder.png', png);
console.log(`Wrote public/assets/tiles/mall-placeholder.png (${sheet.w}x${sheet.h}, ${tiles.length} tiles)`);
