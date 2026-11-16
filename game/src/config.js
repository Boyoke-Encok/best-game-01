// LUMEN DRIFT — tuning, palette and wave table. One place for every number the
// designers tune; nothing in the sim reads a magic number from anywhere else.
export const STEP = 1 / 60;
export const FIELD = { width: 1280, height: 800 };
export const BEST_KEY = 'lumen-drift-best';

// Palette: a dark indigo void, warm amber light (the player, shards, the nova),
// violet shadows (enemies), cyan accents (combo, UI).
export const PALETTE = {
  voidTop: '#0d1126',
  voidBottom: '#05070f',
  star: '#8fa3ff',
  player: '#ffc46a',
  playerCore: '#fff3d6',
  bullet: '#ffe9a8',
  shard: '#7fe7ff',
  nova: '#ffd166',
  wisp: '#b06cff',
  darter: '#ff5d8f',
  splitter: '#9d6bff',
  mini: '#c99aff',
  brute: '#e14eca',
  boss: '#ff2e63',
  enemyBullet: '#ff7a9e',
  heart: '#ff5d73',
  heartEmpty: '#3a2b3f',
  text: '#f2ead8',
  textDim: '#9a94b8',
  panel: 'rgba(16, 20, 44, 0.92)',
  panelEdge: '#3d4a7a',
  gold: '#ffd166',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  hearts: 3,
  maxHearts: 5,
  fireInterval: 0.16, // seconds between shots
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 4,
  bulletRange: 560,
  invulnSeconds: 1.2,
  magnetRadius: 90,
  novaGainPerShard: 7,
  novaGainPerKill: 2,
};

export const COMBO = {
  windowSeconds: 2.5, // a kill inside this window after the last keeps the chain
  stepKills: 5, // every N chained kills raise the multiplier
  maxMultiplier: 8,
};

export const NOVA = {
  damage: 9,
  radius: 900, // covers the whole field: the blast is the point
  flashSeconds: 0.35,
};

// Enemy kinds. hp, speed, radius, score, and when the director may use them.
export const ENEMIES = {
  wisp: { hp: 2, speed: 74, radius: 13, score: 50, firstWave: 1, weight: 10 },
  darter: { hp: 1, speed: 150, radius: 11, score: 80, firstWave: 2, weight: 6 },
  splitter: { hp: 3, speed: 56, radius: 18, score: 120, firstWave: 3, weight: 5 },
  brute: { hp: 10, speed: 42, radius: 26, score: 250, firstWave: 4, weight: 3 },
  mini: { hp: 1, speed: 120, radius: 9, score: 30, firstWave: 99, weight: 0 },
};

export const BOSS = {
  radius: 46,
  speed: 34,
  score: 2000,
  hpWave5: 120,
  hpWave10: 220,
  burstInterval: 2.6, // seconds between radial bursts
  burstCount: 10,
  bulletSpeed: 150,
};

export const WAVES = {
  total: 10, // clearing wave 10 wins the game
  baseCount: 6, // enemies in wave 1
  perWave: 3, // extra enemies per wave
  spawnInterval: 0.95, // seconds between spawns at wave 1
  spawnIntervalMin: 0.35,
  clearBonus: 100, // score per wave cleared
};

// Upgrade cards offered between waves: pick one. id, title, blurb, and the
// effect the world applies. Weights keep the strong ones rarer.
export const UPGRADES = [
  { id: 'rapid', title: 'Rapid Fire', blurb: '+25% fire rate', weight: 10 },
  { id: 'heavy', title: 'Heavy Rounds', blurb: '+1 bullet damage', weight: 8 },
  { id: 'swift', title: 'Swift Hull', blurb: '+12% move speed', weight: 8 },
  { id: 'twin', title: 'Twin Shot', blurb: 'Fire a second bullet', weight: 5 },
  { id: 'pierce', title: 'Piercing Light', blurb: 'Bullets pierce +1 enemy', weight: 6 },
  { id: 'magnet', title: 'Shard Magnet', blurb: '+80% shard pickup radius', weight: 7 },
  { id: 'heart', title: 'Extra Heart', blurb: '+1 max heart, heal 1', weight: 4 },
  { id: 'dynamo', title: 'Nova Dynamo', blurb: 'Nova charges 50% faster', weight: 6 },
  { id: 'plating', title: 'Thick Plating', blurb: '+0.6s invulnerability after a hit', weight: 6 },
];

export const SHARD = { score: 10, radius: 6, pickupRadius: 22, lifeSeconds: 12 };
