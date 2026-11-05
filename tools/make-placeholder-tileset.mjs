/**
 * Generates the Era 01 placeholder tileset.
 *
 * Usage:   npm run tileset
 * Output:  public/assets/tiles/mall-placeholder.png (8 columns, 16x16 px tiles)
 *
 * Rows (tile ID = row * 8 + column; GID in Tiled = ID + 1):
 *   0  floors      terrazzo, terrazzo variant, marble, checker, food court, carpet wine/blue/grey
 *   1  floors      wood, department store tile, white tile, concrete, stained, hazard, grate, entrance mat
 *   2  walls       brick, facade panel, shutter, broken shutter, glass front, glass door, vent, elevator
 *   3  walls       neon pink, neon cyan, sign cyan/yellow/red, tiled wall, fountain rim, water
 *   4  fixtures    wood counter, display counter, kiosk, goods shelf, bookshelf, CD bins, TV stack, escalator
 *   5  props       planter, bench H/V, bin, table set, clothing rack, mannequin, arcade cabinet
 *   6  props       payphone, directory, ATM, shopping cart, overturned table, fallen chair, barricade, boxes
 *   7  props       pallet, trash bags, fire barrel, display table, coin ride, gumball machine, palm, sleeping bag
 *   8  overlays    debris, crack, puddle, blood pool, blood smear, broken glass, ceiling debris, scorch
 *   9  overlays    rubble pile, shopping bag, footprints, void
 *
 * Props and overlays have transparent backgrounds and belong on the `props` layer.
 * Collision, opacity and pit flags are stored in each level's embedded tileset.
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

/** Translucent drop shadow down-right of a prop. */
function shadow(b) {
  const add = [];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      if (!b.opaque(x, y) && b.opaque(x - 1, y - 1)) add.push([x, y]);
    }
  }
  for (const [x, y] of add) b.set(x, y, 0x000000, 110);
  return b;
}
const prop = (id, paint) => tile(id, (b) => { paint(b); b.outline(P.ink); shadow(b); });
const overlay = tile;

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
const FACADE = 0x8d8578;
function facade(b) {
  b.fill((x, y) => {
    if (x % 8 === 0) return scale(FACADE, 0.82);
    if (y === 0) return scale(FACADE, 1.15);
    if (y === 15) return scale(FACADE, 0.7);
    return noise(x, y, 17) < 0.05 ? scale(FACADE, 0.92) : FACADE;
  });
}

tile(0, (b) => terrazzo(b, 1));
tile(1, (b) => {
  terrazzo(b, 11);
  b.fill((x, y) => (x % 8 !== 7 && y % 8 !== 7 && noise(x, y, 3) < 0.05 ? P.cream : null));
});
tile(2, (b) =>
  b.fill((x, y) => {
    if (x === 15 || y === 15) return P.creamDark;
    const vein = Math.abs(Math.sin(x * 0.45 + y * 0.8) + Math.sin(y * 0.3 - x * 0.2)) < 0.12;
    return vein ? P.creamDark : noise(x, y, 32) < 0.06 ? mix(P.cream, 0xffffff, 0.3) : mix(P.cream, 0xffffff, 0.12);
  }),
);
tile(3, (b) =>
  b.fill((x, y) => {
    if (x % 8 === 7 || y % 8 === 7) return P.grout;
    const light = (x < 8) !== (y < 8);
    const n = noise(x, y, 5);
    if (light) return n < 0.1 ? P.creamDark : P.cream;
    return n < 0.1 ? P.tealDark : P.tealDeep;
  }),
);
tile(4, (b) => b.fill((x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 0x8a3a33 : P.cream)));
tile(5, (b) =>
  b.fill((x, y) => {
    const d = (Math.abs(x - 7.5) + Math.abs(y - 7.5)) % 8;
    if (d < 1) return P.wineLight;
    return noise(x, y, 9) < 0.12 ? mix(P.wine, P.wineLight, 0.5) : P.wine;
  }),
);
tile(6, (b) => b.fill((x, y) => (noise(x, y, 39) < 0.14 ? 0x2f4a78 : (x + y) % 8 === 0 ? 0x263d66 : 0x1e3156)));
tile(7, (b) => b.fill((x, y) => (noise(x, y, 7) < 0.15 ? 0x5c5f66 : (x * 3 + y) % 7 === 0 ? 0x44474d : 0x4f5259)));
tile(8, (b) =>
  b.fill((x, y) => {
    const plank = Math.floor(y / 4);
    if (y % 4 === 3 || (x + plank * 5) % 16 === 0) return P.woodDark;
    return noise(x, plank, 8) < 0.5 ? P.wood : mix(P.wood, P.woodLight, 0.4);
  }),
);
tile(9, (b) => b.fill((x, y) => (x === 15 || y === 15 ? 0x8f8676 : noise(x, y, 9) < 0.05 ? 0xcbc2b0 : 0xbdb4a1)));
tile(10, (b) => b.fill((x, y) => (x % 4 === 3 || y % 4 === 3 ? 0x8f9696 : noise(x, y, 36) < 0.05 ? 0xb9c1c1 : 0xd4dbdb)));
tile(11, (b) => concrete(b, 31));
tile(12, (b) => {
  concrete(b, 41);
  b.fill((x, y) => (Math.hypot((x - 9) / 6, (y - 8) / 4.5) + noise(x, y, 2) * 0.35 < 1 ? mix(P.concreteDark, 0x101114, 0.4) : null));
});
tile(13, (b) => {
  concrete(b, 51);
  b.fill((x, y) => (y < 5 ? ((x + y) % 6 < 3 ? P.hazard : P.ink) : y === 5 ? P.concreteDark : null));
});
tile(14, (b) => {
  concrete(b, 81);
  b.rect(3, 3, 10, 10, P.steelDark);
  for (let y = 4; y < 12; y += 2) b.rect(4, y, 8, 1, P.ink);
});
tile(15, (b) => b.fill((x, y) => (y % 3 === 0 ? 0x1c1d21 : 0x2a2c31)));

// ------------------------------------------------------------------- walls

tile(16, (b) => bricks(b, 1));
tile(17, facade);
tile(18, (b) =>
  b.fill((x, y) => {
    const base = [P.steelLight, P.steel, P.steelDark][y % 3];
    return noise(x, y, 13) < 0.06 ? mix(base, P.pot, 0.5) : base;
  }),
);
tile(19, (b) =>
  b.fill((x, y) => {
    const edge = 7 + Math.round(Math.sin(x * 1.7) * 1.5);
    if (y > edge) return y === edge + 1 ? P.ink : 0x0b0c0f;
    return [P.steelLight, P.steel, P.steelDark][y % 3];
  }),
);
tile(20, (b) =>
  b.fill((x, y) => {
    if (y <= 1 || y >= 14) return y === 0 || y === 15 ? P.steelDark : P.steel;
    const d = (((x - y) % 16) + 16) % 16;
    return d < 2 ? P.glassLight : d === 6 ? mix(P.glass, P.glassLight, 0.4) : P.glass;
  }),
);
tile(21, (b) =>
  b.fill((x, y) => {
    if (y <= 1 || y >= 14 || x === 0 || x === 15 || x === 7 || x === 8) return x === 7 || x === 8 ? P.steelDark : P.steel;
    if (y === 8 && (x === 6 || x === 9)) return P.steelLight;
    return (((x - y) % 12) + 12) % 12 < 2 ? P.glassLight : P.glass;
  }),
);
tile(22, (b) => {
  bricks(b, 3);
  b.rect(2, 4, 12, 8, P.steelDark);
  for (let y = 5; y < 11; y++) b.rect(3, y, 10, 1, y % 2 ? P.ink : P.steel);
});
tile(23, (b) => b.fill((x, y) => (y === 0 || y === 15 ? P.steelDark : x === 7 || x === 8 ? P.ink : x % 7 === 1 ? P.steelLight : P.steel)));
const neon = (color) => (b) => {
  facade(b);
  b.rect(0, 6, 16, 1, mix(color, FACADE, 0.5));
  b.rect(0, 7, 16, 1, mix(color, 0xffffff, 0.6));
  b.rect(0, 8, 16, 1, color);
  b.rect(0, 9, 16, 1, mix(color, FACADE, 0.5));
};
tile(24, neon(P.neonPink));
tile(25, neon(P.neonCyan));
const sign = (color, seed) => (b) => {
  facade(b);
  b.rect(0, 3, 16, 10, P.ink);
  b.rect(0, 4, 16, 8, scale(color, 0.25));
  for (let i = 0; i < 4; i++) if (noise(i, 0, seed) > 0.15) b.rect(1 + i * 4, 6, 2, 4, color);
};
tile(26, sign(P.neonCyan, 1));
tile(27, sign(0xffd23f, 2));
tile(28, sign(0xff4a3a, 3));
tile(29, (b) => b.fill((x, y) => (x % 4 === 3 || y % 4 === 3 ? 0xa8b0b0 : 0xe2e8e8)));
tile(30, (b) =>
  b.fill((x, y) => {
    if (y === 0 || x === 0) return mix(P.cream, 0xffffff, 0.25);
    if (y === 15 || x === 15) return P.creamDark;
    return noise(x, y, 28) < 0.12 ? P.creamDark : P.cream;
  }),
);
tile(31, (b) =>
  b.fill((x, y) => {
    const wave = Math.sin((x + y * 0.5) * 0.9) + Math.sin(y * 1.3 - x * 0.4);
    return wave > 1.3 ? P.waterLight : wave > 0.6 ? mix(P.water, P.waterLight, 0.4) : P.water;
  }),
);

// ---------------------------------------------------------------- fixtures

const GOODS = [P.neonPink, P.sodium, P.leafLight, P.glassLight, P.cream, P.jacket, 0xffd23f];

tile(32, (b) =>
  b.fill((x, y) => {
    if (y >= 13) return y === 13 ? P.ink : P.woodDark;
    if (y === 0) return P.woodLight;
    return y % 4 === 2 && noise(x, y, 4) < 0.7 ? P.woodDark : P.wood;
  }),
);
tile(33, (b) =>
  b.fill((x, y) => {
    if (y === 0 || y >= 13 || x === 0 || x === 15) return y >= 14 ? P.steelDark : P.steel;
    if (noise(x, y, 33) < 0.05) return 0xfff2b0;
    return (((x - y) % 10) + 10) % 10 === 0 ? P.glassLight : mix(P.glass, P.wine, 0.4);
  }),
);
tile(34, (b) =>
  b.fill((x, y) => {
    if (y === 15) return P.ink;
    const stripe = Math.floor(x / 4) % 2 === 0 ? 0xa8403a : P.cream;
    return y === 0 ? mix(stripe, 0xffffff, 0.2) : y >= 13 ? scale(stripe, 0.7) : stripe;
  }),
);
tile(35, (b) => {
  b.fill(P.steelDark);
  b.rect(1, 1, 14, 14, P.steel);
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if (noise(gx, gy, 18) < 0.25) continue;
      b.rect(2 + gx * 4, 2 + gy * 4, 3, 3, scale(GOODS[Math.floor(noise(gx, gy, 19) * GOODS.length)], 0.85));
    }
  }
});
tile(36, (b) => {
  b.fill(P.woodDark);
  for (const y of [1, 6, 11]) {
    for (let x = 1; x < 15; x++) {
      if (noise(x, y, 36) < 0.12) continue;
      b.rect(x, y, 1, 4, GOODS[Math.floor(noise(x, y, 37) * GOODS.length)]);
    }
  }
});
tile(37, (b) => {
  b.fill(0x2a2421);
  b.rect(0, 0, 16, 1, P.woodLight);
  for (const y of [2, 9]) for (let x = 1; x < 15; x++) b.rect(x, y, 1, 5, x % 2 ? scale(GOODS[x % GOODS.length], 0.7) : P.ink);
});
tile(38, (b) => {
  b.fill(P.steelDark);
  for (const [x, y] of [[1, 1], [9, 1], [1, 9], [9, 9]]) {
    b.rect(x, y, 6, 6, 0x5a5e66);
    b.rect(x + 1, y + 1, 4, 3, noise(x, y, 38) < 0.3 ? 0x5fb4c8 : 0x0d1418);
  }
});
tile(39, (b) =>
  b.fill((x, y) => {
    if (x <= 1 || x >= 14) return x === 1 || x === 14 ? P.steelDark : P.ink;
    if (y % 4 === 0) return P.steelDark;
    return x % 2 === 0 ? P.steel : P.steelLight;
  }),
);

// ------------------------------------------------------------------- props

prop(40, (b) => {
  b.ellipse(8, 8, 6.5, 6.5, P.pot);
  b.ellipse(8, 8, 5, 5, 0x33251a);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    b.ellipse(8 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 2.1, 2.1, P.leaf);
    b.set(8 + Math.cos(a) * 3 - 1, 8 + Math.sin(a) * 3 - 1, P.leafLight);
  }
  b.ellipse(8, 8, 1.6, 1.6, P.leafDark);
});
const bench = (vertical) => (b) => {
  for (const k of [2, 13]) (vertical ? b.rect(3, k, 10, 1, P.steelDark) : b.rect(k, 3, 1, 10, P.steelDark));
  for (const k of [4, 7, 10]) {
    if (vertical) b.rect(k, 1, 2, 14, P.wood).rect(k, 1, 1, 14, P.woodLight);
    else b.rect(1, k, 14, 2, P.wood).rect(1, k, 14, 1, P.woodLight);
  }
};
prop(41, bench(false));
prop(42, bench(true));
prop(43, (b) => {
  b.ellipse(8, 8, 5.5, 5.5, P.steel);
  b.ellipse(8, 8, 3.8, 3.8, P.ink);
  b.set(5, 5, P.steelLight).set(6, 4, P.steelLight);
  b.rect(7, 7, 2, 1, P.paper);
});
prop(44, (b) => {
  b.rect(1, 6, 3, 4, P.steelDark).rect(12, 6, 3, 4, P.steelDark);
  b.ellipse(8, 8, 4.6, 4.6, mix(P.cream, 0xffffff, 0.3));
  b.set(7, 6, P.sodium).set(9, 9, 0xa8403a);
});
prop(45, (b) => {
  b.fill((x, y) => {
    const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
    return d <= 6.6 && d > 5.4 ? P.steelLight : null;
  });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    b.ellipse(8 + Math.cos(a) * 5.4, 8 + Math.sin(a) * 5.4, 1.3, 1.3, GOODS[k % GOODS.length]);
  }
  b.ellipse(8, 8, 1, 1, P.steelDark);
});
prop(46, (b) => {
  b.ellipse(8, 8, 2.8, 5, 0xd8d0c4);
  b.ellipse(8.5, 8, 2.2, 2.2, 0xe8e0d4);
  b.rect(7, 2, 2, 1, 0xb0a898).rect(7, 13, 2, 1, 0xb0a898);
});
prop(47, (b) => {
  b.rect(2, 1, 12, 14, 0x1d1a2a);
  b.rect(3, 2, 10, 6, 0x0a1a24);
  b.rect(4, 3, 8, 4, 0x2fa9c8);
  b.set(5, 4, 0xffffff).set(9, 5, P.neonPink);
  b.rect(3, 10, 10, 3, 0x2c2840);
  b.set(5, 11, 0xff3040).set(7, 11, 0xffd23f).set(9, 11, 0x40c0ff);
});
prop(48, (b) => {
  b.rect(4, 2, 8, 11, P.steel);
  b.rect(5, 3, 6, 4, P.steelDark);
  b.rect(5, 8, 1, 4, P.ink).rect(6, 11, 4, 1, P.ink);
  b.set(7, 8, P.steelLight).set(9, 8, P.steelLight).set(8, 9, P.steelLight);
});
prop(49, (b) => {
  b.rect(1, 4, 14, 8, P.steelDark);
  b.rect(2, 5, 12, 6, P.cream);
  b.rect(3, 6, 4, 2, P.neonCyan).rect(8, 6, 3, 3, P.sodium).rect(3, 9, 6, 1, P.neonPink);
  b.set(11, 9, 0xff3040);
});
prop(50, (b) => {
  b.rect(3, 2, 10, 12, 0x5a5e66);
  b.rect(4, 3, 8, 4, 0x0a2014);
  b.rect(5, 4, 6, 2, 0x3fd07a);
  b.rect(5, 9, 6, 3, P.steelDark);
});
prop(51, (b) => {
  for (let y = 3; y < 13; y++) for (let x = 2; x < 13; x++) if (x === 2 || x === 12 || y === 3 || y === 12 || (x % 2 === 0 && y % 2 === 1)) b.set(x, y, P.steelLight);
  b.rect(13, 3, 2, 10, 0xc03030);
});
prop(52, (b) => {
  b.rect(1, 3, 14, 4, mix(P.cream, 0xffffff, 0.2));
  b.rect(1, 7, 14, 1, P.creamDark);
  b.rect(3, 8, 1, 6, P.steelDark).rect(12, 8, 1, 6, P.steelDark);
});
prop(53, (b) => {
  b.line(3, 10, 9, 4, 0xa8403a);
  b.line(4, 11, 10, 5, 0xa8403a);
  b.line(9, 4, 12, 7, P.steelDark);
  b.line(4, 11, 7, 14, P.steelDark);
});
prop(54, (b) => {
  b.line(0, 3, 15, 12, P.wood).line(0, 4, 15, 13, P.woodDark);
  b.line(0, 12, 15, 3, P.woodLight).line(0, 13, 15, 4, P.wood);
  b.rect(1, 6, 14, 4, P.wood).rect(1, 6, 14, 1, P.woodLight);
  b.set(3, 7, P.steelLight).set(12, 8, P.steelLight);
});
prop(55, (b) => {
  const box = (x, y, w, h) => {
    b.rect(x, y, w, h, P.cardboardDark);
    b.rect(x + 1, y + 1, w - 2, h - 2, P.cardboard);
    b.rect(x + 1, y + Math.floor(h / 2), w - 2, 1, mix(P.cardboard, P.paper, 0.5));
  };
  box(1, 1, 9, 8);
  box(7, 7, 8, 8);
});
prop(56, (b) => {
  for (const y of [2, 7, 12]) b.rect(1, y, 14, 3, P.wood).rect(1, y, 14, 1, P.woodLight);
  b.rect(2, 1, 2, 14, P.woodDark).rect(12, 1, 2, 14, P.woodDark);
});
prop(57, (b) => {
  b.ellipse(5, 6, 4, 3.5, 0x18181c);
  b.ellipse(10, 9, 4.5, 4, 0x1f1f24);
  b.ellipse(6, 11, 3.5, 3, 0x15151a);
  b.set(4, 5, 0x50505a).set(9, 8, 0x55555f).set(10, 6, P.steelDark);
});
prop(58, (b) => {
  b.ellipse(8, 8, 6, 6, 0x6e3a22);
  b.ellipse(8, 8, 4.8, 4.8, 0x2a1408);
  b.ellipse(8, 8, 3.6, 3.6, 0xff7a20);
  b.ellipse(7.5, 7.5, 2, 2, 0xffd060);
  b.set(8, 7, 0xffffff);
});
prop(59, (b) => {
  b.rect(1, 3, 14, 10, P.woodLight);
  b.rect(1, 12, 14, 1, P.woodDark);
  [[3, 5], [7, 5], [11, 6], [4, 9], [9, 9]].forEach(([x, y], i) => b.rect(x, y, 2, 2, GOODS[i]));
});
prop(60, (b) => {
  b.ellipse(8, 9, 6, 4.5, 0x3a3e46);
  b.ellipse(8, 8, 4, 3, 0xd8402a);
  b.rect(5, 6, 2, 2, 0xffd23f);
  b.rect(11, 7, 1, 2, 0xffffff);
});
prop(61, (b) => {
  b.rect(5, 9, 6, 5, 0xc03030);
  b.ellipse(8, 6, 4, 4, 0xbfe0e8);
  [[6, 5], [9, 6], [7, 7], [8, 4]].forEach(([x, y], i) => b.set(x, y, GOODS[i]));
});
prop(62, (b) => {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    b.line(8, 8, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, P.leaf);
    b.line(8, 8, 8 + Math.cos(a + 0.2) * 6, 8 + Math.sin(a + 0.2) * 6, P.leafLight);
  }
  b.ellipse(8, 8, 2.5, 2.5, P.pot);
});
prop(63, (b) => {
  b.rect(2, 4, 12, 8, 0x2f5a7a);
  b.rect(2, 4, 3, 8, 0x3f7aa0);
  b.rect(11, 5, 3, 6, P.paper);
});

// ---------------------------------------------------------------- overlays

const BLOOD = 0x4a0d10;
overlay(64, (b) => {
  [[2, 3], [10, 2], [12, 11], [4, 12], [7, 7]].forEach(([x, y], i) => b.rect(x, y, 2 + (i % 2), 1 + (i % 2), P.paper));
  [[8, 12], [3, 8], [13, 6]].forEach(([x, y]) => b.set(x, y, P.ink));
});
overlay(65, (b) => {
  const crack = [[1, 3], [5, 6], [8, 6], [11, 10], [15, 12]];
  for (let i = 0; i < crack.length - 1; i++) b.line(...crack[i], ...crack[i + 1], 0x101214);
  b.set(9, 9, 0x101214);
});
overlay(66, (b) => {
  b.ellipse(8, 9, 6, 3.6, P.water);
  b.ellipse(7, 8.5, 4, 2.2, mix(P.water, P.waterLight, 0.35));
  b.line(4, 7, 8, 7, P.waterLight);
});
overlay(67, (b) => {
  b.fill((x, y) => (Math.hypot((x - 8) / 6, (y - 8) / 4.5) + noise(x, y, 67) * 0.4 < 1 ? BLOOD : null));
  b.ellipse(13, 4, 1, 1, BLOOD).ellipse(2, 12, 1, 1, BLOOD);
  b.set(6, 7, 0x6a1a1c).set(7, 7, 0x6a1a1c);
});
overlay(68, (b) => {
  for (let x = 0; x < 16; x++) {
    const y = 8 + Math.round(Math.sin(x * 0.5) * 2);
    b.rect(x, y - 1, 1, 2 + (noise(x, 0, 68) < 0.4 ? 1 : 0), BLOOD);
  }
});
overlay(69, (b) => {
  [[3, 4], [8, 2], [12, 6], [5, 10], [10, 12], [14, 13], [2, 14]].forEach(([x, y], i) => {
    b.set(x, y, P.glassLight);
    if (i % 2) b.set(x + 1, y, mix(P.glassLight, 0xffffff, 0.5));
  });
});
overlay(70, (b) => {
  b.rect(2, 3, 6, 5, 0xc8c4b8).rect(2, 3, 6, 1, 0xe0dcd0);
  b.rect(9, 8, 5, 5, 0xbab6aa);
  b.line(4, 11, 7, 13, 0xa8a498);
  b.set(13, 3, 0xc8c4b8).set(1, 13, 0xc8c4b8);
});
overlay(71, (b) =>
  b.fill((x, y) => {
    const d = Math.hypot((x - 8) / 7, (y - 8) / 6) + noise(x, y, 71) * 0.5;
    return d < 0.8 ? 0x0a0908 : d < 1.1 ? 0x1c1712 : null;
  }),
);
prop(72, (b) => {
  [[2, 4, 5, 4], [7, 2, 4, 4], [9, 7, 6, 5], [3, 9, 5, 5], [6, 6, 3, 3]].forEach(([x, y, w, h]) => {
    b.rect(x, y, w, h, P.concreteLight).rect(x, y, w, 1, mix(P.concreteLight, 0xffffff, 0.2));
  });
  b.line(4, 13, 9, 12, P.steel);
});
prop(73, (b) => {
  b.rect(5, 5, 7, 8, 0xc9a77a).rect(5, 5, 7, 1, 0xdab98c);
  b.line(6, 4, 7, 3, P.ink).line(10, 4, 9, 3, P.ink);
});
overlay(74, (b) => {
  [[3, 3], [6, 6], [4, 10], [8, 12], [11, 8], [13, 4]].forEach(([x, y]) => b.rect(x, y, 2, 1, BLOOD).set(x, y + 1, BLOOD));
});
tile(75, (b) => b.fill((x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? 0x0b1114 : 0x080c0e)));

// ---------------------------------------------------------------- encoding

// The lightmap darkens the scene at runtime, so surfaces are exported at a
// higher exposure than the base palette.
const EXPOSURE = 1.35;

const ROWS = Math.ceil(tiles.length / COLS);
const sheet = new PixelBuffer(COLS * T, ROWS * T);
tiles.forEach((t, i) => {
  const ox = (i % COLS) * T;
  const oy = Math.floor(i / COLS) * T;
  for (let k = 0; k < t.data.length; k += 4) {
    const x = (k / 4) % T;
    const y = Math.floor(k / 4 / T);
    const j = ((oy + y) * sheet.w + ox + x) * 4;
    for (let c = 0; c < 3; c++) sheet.data[j + c] = Math.min(255, t.data[k + c] * EXPOSURE);
    sheet.data[j + 3] = t.data[k + 3];
  }
});

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
