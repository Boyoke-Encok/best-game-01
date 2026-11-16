// The wave director: what spawns in each wave, and which upgrade cards the
// player chooses between waves. Both are pure functions of the seeded RNG.
import { BOSS, ENEMIES, UPGRADES, WAVES } from './config.js';
import { range, weightedPick } from './random.js';
import { KIND_BOSS } from './enemies.js';

/** The spawn queue for a wave: an array of enemy kinds, boss first when due. */
export function buildWave(wave, random) {
  const queue = [];
  const isBossWave = wave === 5 || wave === WAVES.total;
  let count = WAVES.baseCount + WAVES.perWave * (wave - 1);
  if (isBossWave) count = Math.floor(count * 0.6);
  const pool = [];
  for (const kind of Object.keys(ENEMIES)) {
    const def = ENEMIES[kind];
    if (def.firstWave <= wave && def.weight > 0) pool.push({ kind, weight: def.weight });
  }
  for (let i = 0; i < count; i += 1) {
    queue.push(weightedPick(random, pool).kind);
  }
  // Shuffle the queue so the wave never arrives in kind order.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  if (isBossWave) queue.unshift(KIND_BOSS);
  return queue;
}

/** Seconds between spawns in this wave (faster as waves rise). */
export function spawnIntervalFor(wave) {
  const interval = WAVES.spawnInterval - (wave - 1) * 0.05;
  return Math.max(WAVES.spawnIntervalMin, interval);
}

/** Boss hit points for the wave. */
export function bossHpFor(wave) {
  return wave >= WAVES.total ? BOSS.hpWave10 : BOSS.hpWave5;
}

/** A point on a field edge, at least `awayFrom` from the player. */
export function edgeSpawn(random, player, awayFrom = 240) {
  for (let tries = 0; tries < 12; tries += 1) {
    const side = Math.floor(random() * 4);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = range(random, 40, 1240);
      y = 40;
    } else if (side === 1) {
      x = range(random, 40, 1240);
      y = 760;
    } else if (side === 2) {
      x = 40;
      y = range(random, 40, 760);
    } else {
      x = 1240;
      y = range(random, 40, 760);
    }
    if (Math.hypot(x - player.x, y - player.y) >= awayFrom) return { x, y };
  }
  return { x: 40, y: 40 };
}

/** Three distinct upgrade cards, picked by weight. */
export function pickUpgrades(random) {
  const pool = UPGRADES.slice();
  const picked = [];
  while (picked.length < 3 && pool.length > 0) {
    const card = weightedPick(random, pool);
    picked.push(card);
    pool.splice(pool.indexOf(card), 1);
  }
  return picked;
}

/** Fixed card rectangles for the upgrade screen (render and input share them). */
export function upgradeCardRects() {
  const width = 300;
  const height = 190;
  const gap = 36;
  const total = width * 3 + gap * 2;
  const x0 = (1280 - total) / 2;
  const y = 300;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (width + gap), y, width, height }));
}
