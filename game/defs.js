// SPROUT SIEGE — shared constants: grid, path, towers, enemies, waves.
// Every number below was chosen for this game only; nothing is copied in.

export const COLS = 24;
export const ROWS = 11;
export const CELL = 40;
export const W = COLS * CELL; // 960
export const H = ROWS * CELL; // 440

// The pest path, as grid waypoints (col, row). Pests enter off the left edge
// and march to the Seed Vault at the right edge.
export const PATH_POINTS = [
  [-1, 5], [5, 5], [5, 2], [12, 2], [12, 8], [18, 8], [18, 5], [24, 5],
];
export const BASE_CELL = { col: 23, row: 5 };

export const START_GOLD = 160;
export const START_LIVES = 20;
export const TOTAL_WAVES = 15;
export const SELL_RATE = 0.7;

// Towers: four plant defenders with distinct roles.
// range in px, dmg per hit, rate in shots per second.
export const TOWERS = {
  daisy: {
    id: 'daisy', name: 'Daisy Dart', cost: 60, range: 100, dmg: 8, rate: 2.5,
    color: '#ffd93b', petal: '#fff3b0', desc: 'Rapid little darts',
  },
  thorn: {
    id: 'thorn', name: 'Thorn Lash', cost: 110, range: 85, dmg: 34, rate: 0.7,
    color: '#b678e8', petal: '#e3c6ff', desc: 'Heavy single hit',
  },
  frost: {
    id: 'frost', name: 'Frost Mint', cost: 90, range: 90, dmg: 3, rate: 1.0,
    color: '#7fe3f0', petal: '#d8fbff', slow: 0.5, slowDur: 1.5,
    desc: 'Chills and slows pests',
  },
  pumpkin: {
    id: 'pumpkin', name: 'Pumpkin Splash', cost: 130, range: 95, dmg: 12, rate: 0.8,
    color: '#ff8c42', petal: '#ffd2a8', splash: 55, splashMul: 0.6,
    desc: 'Splash damage',
  },
};
export const TOWER_ORDER = ['daisy', 'thorn', 'frost', 'pumpkin'];
export const MAX_LEVEL = 3;
export function upgradeCost(def, level) {
  return Math.round(def.cost * 0.6 * level);
}
export function towerDamage(def, level) {
  return Math.round(def.dmg * Math.pow(1.6, level - 1));
}
export function towerRange(def, level) {
  return Math.round(def.range * Math.pow(1.12, level - 1));
}

// Enemies: six pest kinds plus three bosses.
// hp is the wave-1 base; waves scale it. speed in px per second.
// reward is gold on kill — tuned so the whole run funds ~35 towers + upgrades,
// not a carpet of them: every gold piece has to be a choice.
export const ENEMIES = {
  aphid: { id: 'aphid', name: 'Aphid', hp: 22, speed: 58, reward: 4, leak: 1, r: 9, color: '#7ed957' },
  beetle: { id: 'beetle', name: 'Beetle', hp: 70, speed: 30, reward: 7, leak: 1, r: 12, color: '#c94f4f' },
  snail: { id: 'snail', name: 'Snail', hp: 160, speed: 20, reward: 9, leak: 2, r: 13, color: '#b08954' },
  locust: { id: 'locust', name: 'Locust', hp: 40, speed: 72, reward: 6, leak: 1, r: 10, color: '#ff9f1c', flying: true },
  mite: { id: 'mite', name: 'Mite', hp: 30, speed: 62, reward: 3, leak: 1, r: 8, color: '#c77dff', splits: true },
  mitelet: { id: 'mitelet', name: 'Mitelet', hp: 12, speed: 68, reward: 1, leak: 1, r: 6, color: '#e0aaff' },
  nurse: { id: 'nurse', name: 'Nurse Ant', hp: 90, speed: 36, reward: 8, leak: 1, r: 11, color: '#ff6b6b', heals: 6, healRange: 70 },
  goliath: { id: 'goliath', name: 'Goliath Beetle', hp: 1100, speed: 22, reward: 100, leak: 5, r: 22, color: '#8d2f2f', boss: true },
  queen: { id: 'queen', name: 'Locust Queen', hp: 2400, speed: 34, reward: 200, leak: 5, r: 24, color: '#e36414', boss: true, spawns: 'locust', spawnEvery: 4 },
  moleking: { id: 'moleking', name: 'Mole King', hp: 3200, speed: 22, reward: 700, leak: 10, r: 28, color: '#6c4a2f', boss: true, spawns: 'mite', spawnEvery: 5 },
};

// Decorations that block building: ponds, rocks and flower beds. Each entry
// is [col, row, kind]. None of them sits on the path.
export const DECOR = [
  [2, 1, 'pond'], [3, 1, 'pond'], [2, 2, 'pond'], [3, 2, 'pond'],
  [20, 9, 'pond'], [21, 9, 'pond'], [20, 10, 'pond'], [21, 10, 'pond'],
  [7, 4, 'rock'], [8, 4, 'rock'], [15, 5, 'rock'], [16, 6, 'rock'],
  [20, 3, 'rock'], [21, 3, 'rock'], [6, 9, 'rock'], [7, 9, 'rock'],
  [3, 7, 'flowers'], [4, 7, 'flowers'], [10, 5, 'flowers'], [11, 6, 'flowers'],
  [14, 9, 'flowers'], [15, 9, 'flowers'], [21, 7, 'flowers'], [22, 7, 'flowers'],
  [9, 9, 'flowers'], [10, 9, 'flowers'], [19, 2, 'flowers'], [20, 2, 'flowers'],
  [1, 3, 'flowers'], [2, 3, 'flowers'], [13, 4, 'flowers'], [14, 4, 'flowers'],
  [16, 1, 'flowers'], [17, 1, 'flowers'], [8, 6, 'flowers'], [9, 6, 'flowers'],
  [22, 4, 'flowers'], [23, 4, 'flowers'], [1, 9, 'flowers'], [2, 9, 'flowers'],
];

// Waves: [enemyId, count, gapSeconds] groups, spawned in order.
// hpMul scales every enemy's hp for that wave.
export const WAVES = [
  { hpMul: 1.00, groups: [['aphid', 8, 0.7]] },
  { hpMul: 1.13, groups: [['aphid', 12, 0.6]] },
  { hpMul: 1.26, groups: [['aphid', 8, 0.6], ['beetle', 6, 0.9]] },
  { hpMul: 1.39, groups: [['beetle', 10, 0.8], ['aphid', 6, 0.5]] },
  { hpMul: 1.52, groups: [['goliath', 1, 0], ['aphid', 8, 0.6]] },
  { hpMul: 1.65, groups: [['locust', 10, 0.6], ['beetle', 8, 0.8]] },
  { hpMul: 1.78, groups: [['mite', 12, 0.6], ['aphid', 8, 0.5]] },
  { hpMul: 1.91, groups: [['snail', 10, 1.0], ['beetle', 8, 0.8]] },
  { hpMul: 2.04, groups: [['locust', 12, 0.5], ['nurse', 6, 0.9], ['aphid', 8, 0.5]] },
  { hpMul: 2.17, groups: [['queen', 1, 0], ['locust', 10, 0.6]] },
  { hpMul: 2.30, groups: [['beetle', 12, 0.7], ['mite', 10, 0.6]] },
  { hpMul: 2.43, groups: [['snail', 12, 0.9], ['locust', 10, 0.5], ['nurse', 4, 0.9]] },
  { hpMul: 2.56, groups: [['mite', 16, 0.5], ['aphid', 12, 0.5], ['nurse', 6, 0.9]] },
  { hpMul: 2.69, groups: [['beetle', 14, 0.7], ['snail', 12, 0.9], ['locust', 8, 0.5]] },
  { hpMul: 2.82, groups: [['moleking', 1, 0], ['mite', 8, 0.5], ['locust', 6, 0.5]] },
];

export function waveClearBonus(wave) {
  return 20 + wave * 4;
}
