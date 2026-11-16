// A tiny seeded random number generator (mulberry32) so a seed always replays
// the same game: the screenshot scenes and the practice runs are deterministic.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one entry from `entries` by their `weight` fields. */
export function weightedPick(random, entries) {
  let total = 0;
  for (let i = 0; i < entries.length; i += 1) total += entries[i].weight;
  let roll = random() * total;
  for (let i = 0; i < entries.length; i += 1) {
    roll -= entries[i].weight;
    if (roll <= 0) return entries[i];
  }
  return entries[entries.length - 1];
}
