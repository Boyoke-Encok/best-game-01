// The shadow creatures. Each enemy is one plain object; behaviour is a small
// switch on `kind` so the sim stays cheap and allocation-free in the hot loop.
import { BOSS, ENEMIES } from './config.js';

export const KIND_WISP = 'wisp';
export const KIND_DARTER = 'darter';
export const KIND_SPLITTER = 'splitter';
export const KIND_MINI = 'mini';
export const KIND_BRUTE = 'brute';
export const KIND_BOSS = 'boss';

/** Spawn one enemy of `kind` at (x, y). Bosses are built by spawnBoss instead. */
export function spawnEnemy(kind, x, y) {
  const def = ENEMIES[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    radius: def.radius,
    score: def.score,
    // Darter state: 0 = stalking, 1 = telegraphing the lunge, 2 = lunging.
    state: 0,
    stateTimer: 0,
    angle: 0,
    flash: 0, // hit flash, seconds left
    alive: true,
  };
}

export function spawnBoss(x, y, hp) {
  return {
    kind: KIND_BOSS,
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: BOSS.speed,
    radius: BOSS.radius,
    score: BOSS.score,
    state: 0,
    stateTimer: BOSS.burstInterval,
    angle: 0,
    flash: 0,
    alive: true,
  };
}

function chase(enemy, targetX, targetY, dt, speedScale = 1) {
  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  enemy.vx = (dx / length) * enemy.speed * speedScale;
  enemy.vy = (dy / length) * enemy.speed * speedScale;
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  enemy.angle = Math.atan2(dy, dx);
}

/**
 * One step of enemy behaviour. `api` gives the sim's helpers: the player
 * position, a function to spawn enemy bullets, and one to spawn minis.
 */
export function updateEnemy(enemy, dt, player, api) {
  if (enemy.flash > 0) enemy.flash -= dt;
  if (enemy.kind === KIND_DARTER) {
    if (enemy.state === 0) {
      chase(enemy, player.x, player.y, dt, 0.85);
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < 260) {
        enemy.state = 1;
        enemy.stateTimer = 0.45;
      }
    } else if (enemy.state === 1) {
      // Telegraph: hold still, trembling toward the player.
      enemy.stateTimer -= dt;
      enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      if (enemy.stateTimer <= 0) {
        enemy.state = 2;
        enemy.stateTimer = 0.38;
        enemy.vx = Math.cos(enemy.angle) * enemy.speed * 2.6;
        enemy.vy = Math.sin(enemy.angle) * enemy.speed * 2.6;
      }
    } else {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) enemy.state = 0;
    }
    return;
  }
  if (enemy.kind === KIND_BOSS) {
    chase(enemy, player.x, player.y, dt, 0.6);
    enemy.stateTimer -= dt;
    if (enemy.stateTimer <= 0) {
      enemy.stateTimer = BOSS.burstInterval;
      api.spawnRadial(enemy.x, enemy.y, BOSS.burstCount, BOSS.bulletSpeed);
      api.spawnMinis(enemy.x, enemy.y, 2);
    }
    return;
  }
  // Wisp, splitter, mini and brute all chase; the brute just does it slowly.
  chase(enemy, player.x, player.y, dt, 1);
}
