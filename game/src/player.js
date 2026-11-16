// The player ship: a small lantern with a warm core. Creation, reset and the
// per-step movement and firing state; damage and scoring live in world.js.
import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2, // aim direction, set from the mouse each step
    hearts: PLAYER.hearts,
    maxHearts: PLAYER.hearts,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    bulletDamage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletPierce: 0,
    bulletCount: 1,
    magnetRadius: PLAYER.magnetRadius,
    novaGain: 1, // multiplier on nova charge
    invulnSeconds: PLAYER.invulnSeconds,
    fireTimer: 0,
    invulnTimer: 0,
    alive: true,
    thrust: 0, // 0..1, how hard the engines are working (for the trail)
  };
}

export function resetPlayer(player) {
  const fresh = createPlayer();
  Object.assign(player, fresh);
}

/** Move toward the input axis, clamped to the field; returns the speed ratio. */
export function movePlayer(player, axis, dt) {
  const length = Math.hypot(axis.x, axis.y) || 1;
  const nx = axis.x / length;
  const ny = axis.y / length;
  const moving = axis.x !== 0 || axis.y !== 0;
  player.vx = moving ? nx * player.speed : 0;
  player.vy = moving ? ny * player.speed : 0;
  player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
  player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));
  player.thrust = moving ? 1 : 0;
  return moving ? 1 : 0;
}

/** Aim at a point (the mouse, or the autopilot's target). */
export function aimPlayer(player, x, y) {
  player.angle = Math.atan2(y - player.y, x - player.x);
}

/** Tick the firing cooldown; true when a shot is due this step. */
export function firingReady(player, dt, firing) {
  player.fireTimer -= dt;
  if (player.invulnTimer > 0) player.invulnTimer -= dt;
  if (!firing || player.fireTimer > 0) return false;
  player.fireTimer = player.fireInterval;
  return true;
}
