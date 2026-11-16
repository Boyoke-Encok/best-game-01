// EMBERFALL — the world: spawn director, timer, gems, pickups, boss schedule.
import { WORLD_W, WORLD_H, BOSS_TIME, spawnInterval, spawnBatch } from './defs.js';
import { makeEnemy, makeBoss } from './enemies.js';
import { magnetRadius, gainXp } from './player.js';
import { Sound } from './audio.js';

export function makeWorld() {
  return {
    time: 0, spawnT: 0, eliteT: 55, bossSpawned: false, bossWarned: false,
    enemies: [], gems: [], hearts: [], projs: [], bullets: [], novas: [], zaps: [],
    score: 0, pendingLevels: 0, god: false, autoplay: false,
  };
}

function spawnEdge(G) {
  // spawn just outside the camera view
  const camX = G.camX, camY = G.camY;
  const side = Math.floor(Math.random() * 4);
  const m = 40;
  let x, y;
  if (side === 0) { x = camX - m; y = camY + Math.random() * 540; }
  else if (side === 1) { x = camX + 960 + m; y = camY + Math.random() * 540; }
  else if (side === 2) { x = camX + Math.random() * 960; y = camY - m; }
  else { x = camX + Math.random() * 960; y = camY + 540 + m; }
  return { x: Math.max(20, Math.min(WORLD_W - 20, x)), y: Math.max(20, Math.min(WORLD_H - 20, y)) };
}

function pickType(t) {
  const r = Math.random();
  if (t < 60) return r < 0.85 ? 'shambler' : 'darter';
  if (t < 90) return r < 0.6 ? 'shambler' : r < 0.85 ? 'darter' : 'brute';
  if (t < 150) return r < 0.45 ? 'shambler' : r < 0.7 ? 'darter' : r < 0.88 ? 'brute' : 'splitter';
  if (t < 300) return r < 0.35 ? 'shambler' : r < 0.6 ? 'darter' : r < 0.8 ? 'brute' : 'splitter';
  return r < 0.3 ? 'shambler' : r < 0.55 ? 'darter' : r < 0.78 ? 'brute' : 'splitter';
}

export function updateWorld(G, dt) {
  G.time += dt;
  const t = G.time;
  // opening burst: the first seconds must already feel alive
  if (!G.opened) {
    G.opened = true;
    const p = G.player;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      G.enemies.push(makeEnemy('shambler', p.x + Math.cos(a) * 450, p.y + Math.sin(a) * 450, 0, false));
    }
  }
  // boss warning + spawn at 8:00
  if (!G.bossWarned && t >= BOSS_TIME - 5) {
    G.bossWarned = true;
    G.bossWarn = 5;
    Sound.boss();
  }
  if (!G.bossSpawned && t >= BOSS_TIME) {
    G.bossSpawned = true;
    const p = G.player;
    const bx = Math.max(100, Math.min(WORLD_W - 100, p.x + 420));
    const by = Math.max(100, Math.min(WORLD_H - 100, p.y - 200));
    G.enemies.push(makeBoss(bx, by, t));
    G.bossWarn = 0;
    Sound.boss();
  }
  // regular spawns (slower once the boss is out)
  const rate = G.bossSpawned ? 0.3 : 1;
  G.spawnT -= dt;
  if (G.spawnT <= 0 && G.enemies.length < 160) {
    G.spawnT = spawnInterval(t) / rate;
    const batch = spawnBatch(t);
    for (let i = 0; i < batch; i++) {
      const s = spawnEdge(G);
      G.enemies.push(makeEnemy(pickType(t), s.x, s.y, t, false));
    }
  }
  // elites on the minute
  G.eliteT -= dt;
  if (G.eliteT <= 0) {
    G.eliteT = 60;
    const n = t >= 240 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const s = spawnEdge(G);
      G.enemies.push(makeEnemy(t >= 180 ? 'brute' : 'shambler', s.x, s.y, t, true));
    }
  }
  updatePickups(G, dt);
}

function updatePickups(G, dt) {
  const p = G.player;
  const mag = magnetRadius(G);
  for (let i = G.gems.length - 1; i >= 0; i--) {
    const g = G.gems[i];
    const dx = p.x - g.x, dy = p.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d < mag || g.magnet) {
      g.magnet = true;
      const pull = Math.max(320, 900 - d);
      g.x += (dx / (d || 1)) * pull * dt;
      g.y += (dy / (d || 1)) * pull * dt;
    }
    if (d < p.r + g.r + 4) {
      G.gems.splice(i, 1);
      gainXp(G, g.v);
      Sound.pickup();
    }
  }
  for (let i = G.hearts.length - 1; i >= 0; i--) {
    const h = G.hearts[i];
    const d = Math.hypot(p.x - h.x, p.y - h.y);
    if (d < p.r + h.r + 4) {
      G.hearts.splice(i, 1);
      p.hp = Math.min(p.maxHp, p.hp + h.heal);
      Sound.pickup();
    }
  }
}
