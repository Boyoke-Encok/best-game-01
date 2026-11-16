// SPROUT SIEGE — towers: build, upgrade, sell, aim and fire.
import { TOWERS, MAX_LEVEL, upgradeCost, towerDamage, towerRange, SELL_RATE } from './defs.js';
import { cellCenter } from './path.js';

export function createTower(type, col, row) {
  const def = TOWERS[type];
  const c = cellCenter(col, row);
  return {
    type, col, row, x: c.x, y: c.y,
    level: 1, invested: def.cost, cd: 0, angle: -Math.PI / 2, flash: 0,
  };
}

export function towerDef(t) {
  return TOWERS[t.type];
}

export function towerRangeNow(t) {
  return towerRange(TOWERS[t.type], t.level);
}

export function towerDamageNow(t) {
  return towerDamage(TOWERS[t.type], t.level);
}

export function canUpgrade(t) {
  return t.level < MAX_LEVEL;
}

export function getUpgradeCost(t) {
  return upgradeCost(TOWERS[t.type], t.level);
}

export function upgradeTower(t) {
  if (!canUpgrade(t)) return false;
  const cost = getUpgradeCost(t);
  t.invested += cost;
  t.level += 1;
  return cost;
}

export function sellValue(t) {
  return Math.floor(t.invested * SELL_RATE);
}

// Pick the target: a boss in range first (biggest threat), else the enemy
// furthest along the path.
export function pickTarget(t, enemies) {
  const range = towerRangeNow(t);
  let best = null, bestD = -1;
  let boss = null, bossD = -1;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - t.x, e.y - t.y);
    if (d > range + e.r) continue;
    if (e.def.boss && e.dist > bossD) { boss = e; bossD = e.dist; }
    if (e.dist > bestD) { best = e; bestD = e.dist; }
  }
  return boss || best;
}

// Advance one tower. Returns a shot descriptor when it fires, else null.
export function updateTower(t, dt, enemies) {
  t.cd -= dt;
  if (t.flash > 0) t.flash -= dt;
  const def = TOWERS[t.type];
  const target = pickTarget(t, enemies);
  if (!target) return null;
  t.angle = Math.atan2(target.y - t.y, target.x - t.x);
  if (t.cd > 0) return null;
  t.cd = 1 / def.rate;
  t.flash = 0.12;
  return {
    from: { x: t.x, y: t.y },
    to: target,
    kind: t.type,
    dmg: towerDamageNow(t),
    slow: def.slow || 0,
    slowDur: def.slowDur || 0,
    splash: def.splash || 0,
    splashMul: def.splashMul || 0,
    color: def.color,
  };
}
