// EMBERFALL — enemies, elites and the Hollow King boss.
import { ENEMIES, BOSS, enemyHpScale } from './defs.js';
import { burst } from './fx.js';
import { Sound } from './audio.js';

let uid = 1;

export function makeEnemy(type, x, y, t, elite) {
  const def = ENEMIES[type];
  const hpScale = enemyHpScale(t) * (elite ? 6 : 1);
  return {
    id: uid++, type, x, y,
    r: def.r * (elite ? 1.5 : 1),
    hp: def.hp * hpScale, maxHp: def.hp * hpScale,
    speed: def.speed * (elite ? 0.9 : 1) * (0.9 + Math.random() * 0.2),
    dmg: def.dmg + (elite ? 6 : 0),
    xp: elite ? 20 : def.xp,
    color: def.color, shape: def.shape,
    elite: !!elite, splits: def.splits || 0,
    slowT: 0, hitCd: 0, dead: false, wob: Math.random() * Math.PI * 2,
  };
}

export function makeBoss(x, y, t) {
  return {
    id: uid++, type: 'boss', x, y, r: BOSS.r,
    hp: BOSS.hp, maxHp: BOSS.hp, speed: BOSS.speed, dmg: BOSS.dmg,
    xp: 0, color: BOSS.color, shape: 'boss',
    elite: false, splits: 0, slowT: 0, hitCd: 0, dead: false,
    wob: 0, burstT: 3, summonT: 6, chargeT: 8, charging: 0, chargeVx: 0, chargeVy: 0,
  };
}

function separation(G, e, dt) {
  // cheap local push-apart so the horde does not stack into one dot
  for (const o of G.enemies) {
    if (o === e || o.dead) continue;
    const dx = e.x - o.x, dy = e.y - o.y;
    const d2 = dx * dx + dy * dy;
    const min = (e.r + o.r) * 0.8;
    if (d2 > 0.01 && d2 < min * min) {
      const d = Math.sqrt(d2);
      const push = (min - d) * 0.5;
      e.x += (dx / d) * push * 0.5;
      e.y += (dy / d) * push * 0.5;
    }
  }
}

export function updateEnemy(G, e, dt) {
  const p = G.player;
  if (e.slowT > 0) e.slowT -= dt;
  const slow = e.slowT > 0 ? 0.5 : 1;
  if (e.type === 'boss') {
    updateBoss(G, e, dt, slow);
    return;
  }
  // chase the player with a slight wobble so movement reads as alive
  e.wob += dt * 3;
  const dx = p.x - e.x, dy = p.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const sp = e.speed * slow;
  const wob = Math.sin(e.wob) * 0.25;
  const nx = dx / d, ny = dy / d;
  e.x += (nx - ny * wob) * sp * dt;
  e.y += (ny + nx * wob) * sp * dt;
  separation(G, e, dt);
}

function updateBoss(G, b, dt, slow) {
  const p = G.player;
  b.burstT -= dt; b.summonT -= dt; b.chargeT -= dt;
  if (b.charging > 0) {
    b.charging -= dt;
    b.x += b.chargeVx * dt;
    b.y += b.chargeVy * dt;
    if (Math.random() < 0.3) burst(G.fx, b.x, b.y, '#ff2e63', 2, 80);
    return;
  }
  const dx = p.x - b.x, dy = p.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  b.x += (dx / d) * b.speed * slow * dt;
  b.y += (dy / d) * b.speed * slow * dt;
  if (b.burstT <= 0) {
    b.burstT = BOSS.burstEvery;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < BOSS.burstCount; i++) {
      const a = base + (i / BOSS.burstCount) * Math.PI * 2;
      G.bullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * BOSS.bulletSpeed, vy: Math.sin(a) * BOSS.bulletSpeed, r: 6, dmg: 12, life: 6, color: '#ff2e63' });
    }
    Sound.boss();
  }
  if (b.summonT <= 0) {
    b.summonT = BOSS.summonEvery;
    for (let i = 0; i < BOSS.summonCount; i++) {
      const a = Math.random() * Math.PI * 2;
      G.enemies.push(makeEnemy('shambler', b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90, G.time, false));
    }
    burst(G.fx, b.x, b.y, '#b07cff', 16, 200);
  }
  if (b.chargeT <= 0 && d > 200) {
    b.chargeT = BOSS.chargeEvery;
    b.charging = 0.7;
    b.chargeVx = (dx / d) * 380;
    b.chargeVy = (dy / d) * 380;
  }
}

export function onEnemyKilled(G, e) {
  // drop XP gems (and a heart from elites)
  const n = e.type === 'boss' ? 0 : (e.xp >= 20 ? 4 : e.xp >= 3 ? 2 : 1);
  for (let i = 0; i < n; i++) {
    const v = e.xp >= 20 ? 5 : 1;
    G.gems.push({ x: e.x + (Math.random() * 30 - 15), y: e.y + (Math.random() * 30 - 15), v, r: 6, magnet: false });
  }
  if (e.elite && Math.random() < 0.3) {
    G.hearts.push({ x: e.x, y: e.y, r: 9, heal: 20 });
  }
  if (e.splits) {
    for (let i = 0; i < e.splits; i++) {
      const m = makeEnemy('mini', e.x + (Math.random() * 24 - 12), e.y + (Math.random() * 24 - 12), G.time, false);
      G.enemies.push(m);
    }
  }
  burst(G.fx, e.x, e.y, e.color, e.type === 'boss' ? 40 : 8, 200);
  if (e.type === 'boss') {
    Sound.bossHit();
  } else {
    Sound.die();
  }
}
