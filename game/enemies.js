// SPROUT SIEGE — pests: spawn, march, slow, heal, split, boss minions.
import { ENEMIES } from './defs.js';
import { pointAt, pathLength } from './path.js';

let nextId = 1;

export function createEnemy(id, hpMul) {
  const def = ENEMIES[id];
  const hp = Math.round(def.hp * hpMul);
  const p = pointAt(0);
  return {
    uid: nextId++, id, def, x: p.x, y: p.y, dist: 0,
    hp, maxHp: hp, r: def.r, slowT: 0, slowMul: 0,
    spawnT: def.spawnEvery || 0, dead: false, hitFlash: 0,
  };
}

export function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.hitFlash = 0.12;
  if (e.hp <= 0) e.dead = true;
}

export function slowEnemy(e, mul, dur) {
  // Strongest slow wins; refresh the timer when re-applied.
  if (mul >= e.slowMul || e.slowT <= 0) { e.slowMul = mul; e.slowT = dur; }
  else e.slowT = Math.max(e.slowT, dur);
}

// Nurse Ants heal every other pest nearby. Runs over the whole field.
export function healAura(enemies, dt) {
  for (const n of enemies) {
    if (n.dead || n.id !== 'nurse') continue;
    for (const e of enemies) {
      if (e.dead || e === n) continue;
      const d = Math.hypot(e.x - n.x, e.y - n.y);
      if (d <= n.def.healRange && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + n.def.heals * dt);
      }
    }
  }
}

// Advance one pest. Returns { leaked, spawn } events for main to act on.
export function updateEnemy(e, dt) {
  if (e.slowT > 0) e.slowT -= dt;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  const mul = e.slowT > 0 ? (1 - e.slowMul) : 1;
  e.dist += e.def.speed * mul * dt;
  const p = pointAt(e.dist);
  e.x = p.x; e.y = p.y;
  let spawn = null;
  if (e.def.spawns) {
    e.spawnT -= dt;
    if (e.spawnT <= 0) { e.spawnT = e.def.spawnEvery; spawn = e.def.spawns; }
  }
  const leaked = e.dist >= pathLength();
  return { leaked, spawn };
}

// What a dead splitter leaves behind.
export function splitEnemy(e, hpMul) {
  if (!e.def.splits) return [];
  const kids = [];
  for (let i = 0; i < 2; i++) {
    const k = createEnemy('mitelet', hpMul);
    k.dist = Math.max(0, e.dist - 6 - i * 6);
    const p = pointAt(k.dist);
    k.x = p.x; k.y = p.y;
    kids.push(k);
  }
  return kids;
}
