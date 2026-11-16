// EMBERFALL — static definitions: weapons, passives, enemies, boss, tuning.
// No logic here; the other files read these tables.
export const VIEW_W = 960;
export const VIEW_H = 540;
export const WORLD_W = 2600;
export const WORLD_H = 1800;
export const BOSS_TIME = 480; // 8:00 — the Hollow King arrives, kill him to win

export const WEAPONS = {
  bolt: {
    name: 'Ember Bolt', icon: '●', color: '#ffb347', max: 5,
    desc: 'Hurls a burning bolt at the nearest foe.',
    base: { cd: 0.55, dmg: 12, count: 1, speed: 560, pierce: 0 },
    perLevel: { dmg: 6, count: 1, cd: -0.04 },
  },
  blades: {
    name: 'Orbit Blades', icon: '✦', color: '#7df0c1', max: 5,
    desc: 'Blades circle you and shred anything they touch.',
    base: { cd: 0.35, dmg: 10, count: 2, radius: 95, rot: 2.6 },
    perLevel: { dmg: 5, count: 1, radius: 14 },
  },
  nova: {
    name: 'Frost Nova', icon: '❄', color: '#8fd3ff', max: 5,
    desc: 'A freezing burst that wounds and slows the horde.',
    base: { cd: 4.0, dmg: 18, radius: 170, slow: 0.5 },
    perLevel: { dmg: 10, radius: 22, cd: -0.3 },
  },
  chain: {
    name: 'Storm Chain', icon: 'ϟ', color: '#e6d6ff', max: 5,
    desc: 'Lightning leaps between the nearest foes.',
    base: { cd: 2.2, dmg: 16, targets: 3, range: 300 },
    perLevel: { dmg: 8, targets: 1, cd: -0.18 },
  },
  volley: {
    name: 'Thorn Volley', icon: '✿', color: '#ff8fb0', max: 5,
    desc: 'A ring of thorns bursts out in every direction.',
    base: { cd: 1.7, dmg: 9, count: 8, speed: 420 },
    perLevel: { dmg: 5, count: 3, cd: -0.12 },
  },
};

export const PASSIVES = {
  boots: { name: 'Swift Boots', icon: '»', max: 5, desc: '+8% move speed.' },
  magnet: { name: 'Magnet Charm', icon: '◎', max: 5, desc: '+30% pickup radius.' },
  armor: { name: 'Iron Skin', icon: '▣', max: 5, desc: '+1 armor (less damage taken).' },
  vitality: { name: 'Vitality', icon: '♥', max: 5, desc: '+25 max HP and heal 25.' },
  crit: { name: 'Crit Focus', icon: '✕', max: 5, desc: '+10% critical chance (crits hit x2).' },
  haste: { name: 'Swift Hands', icon: '»', max: 5, desc: 'All weapons fire 8% faster.' },
  greed: { name: 'Greed', icon: '◆', max: 5, desc: '+15% XP from gems.' },
  regen: { name: 'Ember Heart', icon: '+', max: 5, desc: 'Regenerate 0.8 HP per second.' },
};

export const ENEMIES = {
  shambler: { name: 'Shambler', hp: 20, speed: 55, dmg: 8, r: 13, xp: 1, color: '#b07cff', shape: 'blob' },
  darter: { name: 'Darter', hp: 12, speed: 135, dmg: 6, r: 10, xp: 1, color: '#ff9a3d', shape: 'tri' },
  brute: { name: 'Brute', hp: 80, speed: 40, dmg: 14, r: 20, xp: 3, color: '#ff5d5d', shape: 'square' },
  splitter: { name: 'Splitter', hp: 34, speed: 72, dmg: 8, r: 13, xp: 2, color: '#7dff8a', shape: 'blob', splits: 2 },
  mini: { name: 'Mite', hp: 9, speed: 95, dmg: 5, r: 8, xp: 1, color: '#a8ff6a', shape: 'blob' },
};

export const BOSS = {
  name: 'THE HOLLOW KING', hp: 3800, speed: 46, dmg: 20, r: 46,
  color: '#ff2e63', burstEvery: 4.5, burstCount: 12, bulletSpeed: 150,
  summonEvery: 9, summonCount: 4, chargeEvery: 12,
};

export function xpNeed(level) {
  return Math.floor(8 + level * 6 + level * level * 0.8);
}

export function enemyHpScale(t) { return 1 + t / 300; }
export function spawnInterval(t) { return Math.max(0.26, 1.1 - t * 0.0010); }
export function spawnBatch(t) { return 1 + Math.floor(t / 60); }
