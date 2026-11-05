// A "seeded" random number generator.
// Same seed -> same sequence of numbers -> same floor layout.
// That means any layout can be replayed exactly (great for hunting bugs):
// the seed is printed in the browser console, and ?seed=12345 replays it.

export function createRng(seed) {
  let a = seed >>> 0;
  // mulberry32: a tiny, well-known algorithm that's plenty random for games.
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    shuffle(list) {
      const a2 = [...list];
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}
