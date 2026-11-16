// SPROUT SIEGE — wave flow: build a spawn queue, drip pests out, track progress.
import { WAVES, TOTAL_WAVES, ENEMIES } from './defs.js';

export function waveDef(wave) {
  return WAVES[wave - 1];
}

// Flatten a wave's groups into a timed queue: [{id, at}] with `at` in seconds
// after the wave starts. Bosses go first so the player sees the threat early.
export function buildQueue(wave) {
  const def = waveDef(wave);
  const queue = [];
  let t = 0;
  for (const [id, count, gap] of def.groups) {
    for (let i = 0; i < count; i++) {
      queue.push({ id, at: t });
      t += gap;
    }
    t += 1.0; // breather between groups
  }
  return { queue, hpMul: def.hpMul, total: queue.length };
}

// Human-readable preview of a wave for the HUD ("8× Aphid, 1× Goliath Beetle").
export function wavePreview(wave) {
  const def = waveDef(wave);
  return def.groups.map(([id, count]) => `${count}× ${ENEMIES[id].name}`).join(', ');
}

export function totalWaves() {
  return TOTAL_WAVES;
}
