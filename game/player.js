// EMBERFALL — the player: movement, weapons, XP and levelling.
import { WEAPONS, xpNeed, WORLD_W, WORLD_H } from './defs.js';
import { weaponStats } from './upgrades.js';
import { Sound } from './audio.js';
import { burst, floatText, addShake } from './fx.js';

export function makePlayer(x, y) {
  return {
    x, y, r: 14, vx: 0, vy: 0, face: 1,
    hp: 120, maxHp: 120, invuln: 0, dead: false,
    level: 1, xp: 0, xpNeed: xpNeed(1),
    kills: 0, combo: 0, comboT: 0, mult: 1,
    gems: 0, regenT: 0,
  };
}

export function playerSpeed(G) {
  return 170 * (1 + 0.08 * (G.passives.boots || 0));
}
export function magnetRadius(G) {
  return 70 * (1 + 0.3 * (G.passives.magnet || 0));
}
export function hasteFactor(G) {
  return Math.pow(0.92, G.passives.haste || 0);
}
export function armorOf(G) { return G.passives.armor || 0; }
export function critChance(G) { return 0.05 + 0.1 * (G.passives.crit || 0); }
export function xpGain(G) { return 1 + 0.15 * (G.passives.greed || 0); }

export function gainXp(G, amount) {
  const p = G.player;
  p.xp += amount * xpGain(G);
  p.gems += amount;
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.level += 1;
    p.xpNeed = xpNeed(p.level);
    G.pendingLevels += 1;
  }
}

export function addKill(G, x, y, xp) {
  const p = G.player;
  p.kills += 1;
  p.combo += 1;
  p.comboT = 3;
  p.mult = 1 + Math.min(4, Math.floor(p.combo / 8));
  G.score += 10 * p.mult;
}

function nearestEnemy(G, x, y, range) {
  let best = null; let bd = range * range;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function rollCrit(G) {
  return Math.random() < critChance(G);
}

export function hurtEnemy(G, e, dmg, kx, ky) {
  if (e.dead) return;
  let d = dmg;
  let crit = false;
  if (rollCrit(G)) { d *= 2; crit = true; }
  e.hp -= d;
  floatText(G.fx, e.x, e.y - e.r - 4, String(Math.round(d)), crit ? '#ffe066' : '#ffffff', crit);
  burst(G.fx, e.x, e.y, '#ffffff', 2, 60);
  if (e.hp <= 0) e.dead = true;
  else if (kx || ky) { e.x += kx; e.y += ky; }
}

export function updatePlayer(G, dt, input) {
  const p = G.player;
  if (p.dead) return;
  // movement
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (mx || my) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    p.face = mx !== 0 ? Math.sign(mx) : p.face;
  }
  const sp = playerSpeed(G);
  p.x += mx * sp * dt;
  p.y += my * sp * dt;
  p.x = Math.max(p.r, Math.min(WORLD_W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(WORLD_H - p.r, p.y));
  // regen
  if (G.passives.regen) {
    p.regenT += dt;
    if (p.regenT >= 1) {
      p.regenT = 0;
      p.hp = Math.min(p.maxHp, p.hp + 0.8 * (G.passives.regen || 0));
    }
  }
  if (p.invuln > 0) p.invuln -= dt;
  if (p.comboT > 0) {
    p.comboT -= dt;
    if (p.comboT <= 0) { p.combo = 0; p.mult = 1; }
  }
  updateWeapons(G, dt);
}

function updateWeapons(G, dt) {
  const p = G.player;
  const haste = hasteFactor(G);
  for (const id of Object.keys(G.weapons)) {
    const w = G.weapons[id];
    const st = weaponStats(id, w.level);
    if (id === 'blades') {
      // blades orbit continuously; damage is applied in combat
      w.angle = (w.angle || 0) + st.rot * dt;
      continue;
    }
    w.cd -= dt;
    if (w.cd > 0) continue;
    if (id === 'bolt') {
      const t = nearestEnemy(G, p.x, p.y, 620);
      if (!t) continue;
      w.cd = st.cd * haste;
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      const n = st.count;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.14;
        G.projs.push({ x: p.x, y: p.y, vx: Math.cos(a + off) * st.speed, vy: Math.sin(a + off) * st.speed, r: 5, dmg: st.dmg, pierce: st.pierce, life: 1.6, color: '#ffb347', kind: 'bolt' });
      }
      Sound.shoot();
    } else if (id === 'nova') {
      const t = nearestEnemy(G, p.x, p.y, st.radius + 60);
      if (!t) continue;
      w.cd = st.cd * haste;
      G.novas.push({ x: p.x, y: p.y, r: st.radius, dmg: st.dmg, slow: st.slow, life: 0.45, max: 0.45 });
      burst(G.fx, p.x, p.y, '#8fd3ff', 18, 220);
      addShake(G.fx, 2);
      Sound.nova();
    } else if (id === 'chain') {
      const first = nearestEnemy(G, p.x, p.y, st.range);
      if (!first) continue;
      w.cd = st.cd * haste;
      let from = { x: p.x, y: p.y };
      let hit = new Set();
      let cur = first;
      for (let i = 0; i < st.targets && cur; i++) {
        G.zaps.push({ x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, life: 0.18 });
        hurtEnemy(G, cur, st.dmg, 0, 0);
        hit.add(cur);
        from = cur;
        cur = null;
        let bd = st.range * st.range;
        for (const e of G.enemies) {
          if (e.dead || hit.has(e)) continue;
          const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
          if (d < bd) { bd = d; cur = e; }
        }
      }
      Sound.chain();
    } else if (id === 'volley') {
      w.cd = st.cd * haste;
      const n = st.count;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (w.angle || 0);
        G.projs.push({ x: p.x, y: p.y, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, r: 5, dmg: st.dmg, pierce: 0, life: 1.1, color: '#ff8fb0', kind: 'thorn' });
      }
      w.angle = (w.angle || 0) + 0.35;
      Sound.shoot();
    }
  }
}

export function hurtPlayer(G, dmg) {
  const p = G.player;
  if (p.dead || p.invuln > 0 || G.god) return;
  const d = Math.max(1, dmg - armorOf(G));
  p.hp -= d;
  p.invuln = 0.8;
  p.combo = 0; p.mult = 1;
  burst(G.fx, p.x, p.y, '#ff5d5d', 10, 180);
  addShake(G.fx, 5);
  Sound.hurt();
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    burst(G.fx, p.x, p.y, '#ffb347', 40, 260);
    Sound.lose();
  }
}
