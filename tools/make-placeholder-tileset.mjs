// Draws the placeholder tileset as a PNG, pixel by pixel.
// Run with:  npm run tileset
// Output:    public/assets/tiles/mall-placeholder.png  (8 tiles, 16x16 each)
//
// Tile order (Tiled numbers them from 0; in the map data they are +1):
//   0 floor      1 wall*       2 floor-checker  3 planter*
//   4 carpet     5 counter*    6 glass*         7 dark floor
//   (* = solid: marked "collides" in the Tiled tileset)

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const T = 16;
const COLS = 4;
const ROWS = 2;
const W = T * COLS;
const H = T * ROWS;
const px = new Uint8Array(W * H * 4);

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function tile(index, painter) {
  const ox = (index % COLS) * T;
  const oy = Math.floor(index / COLS) * T;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const [r, g, b] = hex(painter(x, y));
      const i = ((oy + y) * W + (ox + x)) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
}

// Small deterministic "random" so the speckles look the same every time.
const speck = (x, y, n) => ((x * 73 + y * 151 + n * 17) % 23) === 0;

// 0 floor: dull teal mall tiles with grout lines
tile(0, (x, y) => (x === 15 || y === 15) ? '#1f2a31' : speck(x, y, 1) ? '#34454e' : '#2b3a42');
// 1 wall: mauve with a lighter top edge and dark base
tile(1, (x, y) => y < 2 ? '#7a6880' : y > 13 ? '#3a2f3d' : (y % 5 === 0) ? '#4d3f51' : '#5a4a5e');
// 2 checker floor
tile(2, (x, y) => ((x < 8) !== (y < 8)) ? '#35464f' : '#26333a');
// 3 planter: pot with a dead plant, on floor
tile(3, (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 4) return speck(x, y, 3) ? '#3f5a34' : '#2f4a2a';
  if (x >= 2 && x <= 13 && y >= 2 && y <= 13) return (x === 2 || y === 2) ? '#8a6a4c' : '#6b4f3a';
  return '#2b3a42';
});
// 4 carpet: dark burgundy with a dither
tile(4, (x, y) => ((x + y) % 4 === 0) ? '#553648' : '#462b3a');
// 5 counter: wooden top, darker front
tile(5, (x, y) => y < 9 ? (y === 0 ? '#a8977c' : '#8a7a62') : (y === 9 ? '#3d352c' : '#5e5244'));
// 6 glass shopfront: frame + diagonal reflection
tile(6, (x, y) => {
  if (x === 0 || x === 15 || y === 0 || y === 15) return '#262626';
  if (Math.abs(x - y) < 2 || Math.abs(x - y + 6) < 1) return '#7fb2bb';
  return '#3d6670';
});
// 7 dark floor (for unlit areas later)
tile(7, (x, y) => (x === 15 || y === 15) ? '#101418' : '#171d22');

// ---- minimal PNG encoder (signature + IHDR + IDAT + IEND chunks) ----
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8 bits per channel, RGBA
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // filter type "none" for each row
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync('public/assets/tiles', { recursive: true });
writeFileSync('public/assets/tiles/mall-placeholder.png', png);
console.log(`Wrote public/assets/tiles/mall-placeholder.png (${W}x${H})`);
