/**
 * Builds a shadowed light shape as gradient triangles on a Graphics object.
 *
 * Rays are cast from the light against opaque tiles; the hit points form the
 * visible area. Each ray is split into rings whose vertex colours follow a
 * quadratic falloff, so the GPU's per-vertex colour interpolation produces a
 * smooth gradient. Cones fade out toward their edges.
 */

const RINGS = [0, 0.3, 0.6, 1];
const WALL_BLEED = 5; // pixels a ray continues into a wall, so wall edges catch light

/**
 * @param {Phaser.GameObjects.Graphics} g   target (cleared by the caller)
 * @param {import('../world/Floor.js').default} floor
 * @param {object} light  { x, y, radius, color, intensity, start?, end?, rays?, falloff? }
 *   falloff: exponent of the distance curve (2 = soft pool, 1 = long throw)
 * @param {number} ox, oy  subtracted from world coordinates when drawing
 */
export function drawLightShape(g, floor, light, ox = 0, oy = 0) {
  const { x, y, radius, color, intensity } = light;
  const start = light.start ?? -Math.PI;
  const end = light.end ?? Math.PI;
  const rays = light.rays ?? 48;
  const isCone = end - start < Math.PI * 2 - 0.001;
  const exponent = light.falloff ?? 2;

  const dirs = [];
  for (let i = 0; i <= rays; i++) {
    const a = start + ((end - start) * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hit = floor.castRay(x, y, dx, dy, radius);
    const length = hit < radius ? Math.min(radius, hit + WALL_BLEED) : radius;
    const t = i / rays;
    const edge = isCone ? smooth(Math.min(t, 1 - t) / 0.28) : 1;
    dirs.push({ dx, dy, length, edge });
  }

  const vertex = (d, ring) => {
    const dist = d.length * RINGS[ring];
    const falloff = Math.max(0, 1 - dist / radius);
    const k = intensity * falloff ** exponent * (ring === 0 ? 1 : d.edge);
    return { x: x + d.dx * dist - ox, y: y + d.dy * dist - oy, c: scaleColor(color, k) };
  };

  for (let i = 0; i < rays; i++) {
    const a = dirs[i];
    const b = dirs[i + 1];
    for (let r = 0; r < RINGS.length - 1; r++) {
      const a0 = vertex(a, r);
      const a1 = vertex(a, r + 1);
      const b0 = vertex(b, r);
      const b1 = vertex(b, r + 1);
      tri(g, a0, a1, b1);
      if (r > 0) tri(g, a0, b1, b0);
    }
  }
}

function tri(g, p, q, r) {
  g.fillGradientStyle(p.c, q.c, r.c, r.c, 1);
  g.fillTriangle(p.x, p.y, q.x, q.y, r.x, r.y);
}

function smooth(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function scaleColor(color, k) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (ch((color >> 16) & 255) << 16) | (ch((color >> 8) & 255) << 8) | ch(color & 255);
}
