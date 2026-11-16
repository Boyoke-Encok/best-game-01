// FLIPBOUND — entities: enemies, the boss, particles, projectiles, pickups.
// All art is drawn in code (render.js); this file owns behaviour only.

// ---- particles ----
const Particles = {
  list: [],
  spawn(x, y, n, color, speed, life, size, grav) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (speed || 120) * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: (life || 0.6) * (0.6 + Math.random() * 0.7), max: life || 0.6,
        size: (size || 4) * (0.6 + Math.random() * 0.8), color, grav: grav || 0,
      });
    }
  },
  burst(x, y, color, n) { this.spawn(x, y, n || 14, color, 160, 0.7, 4, 300); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98; p.vy *= 0.98;
    }
  },
  clear() { this.list.length = 0; },
};

// ---- enemy factories ----
function makeWalker(x, y) {
  return { kind: 'walker', x, y, w: 26, h: 24, vx: -55, vy: 0, gdir: 1, dir: -1, hp: 1, t: Math.random() * 5, dead: false, onGround: false };
}
function makeFlyer(x, y) {
  return { kind: 'flyer', x, y, w: 26, h: 22, baseY: y, vx: 0, vy: 0, gdir: 1, t: Math.random() * 6, dead: false, onGround: false };
}
function makeTurret(x, y) {
  return { kind: 'turret', x, y, w: 26, h: 26, vx: 0, vy: 0, gdir: 1, cd: 1.2 + Math.random(), dead: false, onGround: true, aim: 0 };
}

function updateWalker(e, lv, dt) {
  e.t += dt;
  e.vx = e.dir * 55;
  e.vy += 1500 * dt;
  if (e.vy > 620) e.vy = 620;
  const before = e.x;
  moveAndCollide(lv, e, dt);
  if (Math.abs(e.x - before) < 0.01 && e.onGround) e.dir *= -1; // hit a wall: turn
  if (e.onGround) {
    // turn at ledges: no ground ahead in the walking direction
    const aheadX = e.dir > 0 ? e.x + e.w + 4 : e.x - 4;
    const tx = Math.floor(aheadX / TILE), ty = Math.floor((e.y + e.h + 6) / TILE);
    if (!isSolidTile(tileAt(lv, tx, ty)) && !isOneWay(tileAt(lv, tx, ty))) e.dir *= -1;
  }
}

function updateFlyer(e, player, dt) {
  e.t += dt;
  // Sine hover, slowly drifting toward the player's height.
  e.y = e.baseY + Math.sin(e.t * 1.6) * 26;
  const dx = player.x - e.x;
  e.x += Math.max(-45, Math.min(45, dx * 0.25)) * dt;
}

function updateTurret(e, player, dt, orbs) {
  e.cd -= dt;
  const dx = (player.x + player.w / 2) - (e.x + e.w / 2);
  const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
  e.aim = Math.atan2(dy, dx);
  if (e.cd <= 0) {
    e.cd = 2.3;
    const sp = 185, d = Math.max(1, Math.hypot(dx, dy));
    orbs.push({ x: e.x + e.w / 2 - 5, y: e.y + e.h / 2 - 5, w: 10, h: 10, vx: dx / d * sp, vy: dy / d * sp, life: 4.5, foe: true });
    Sound.play('shoot');
  }
}

// Enemy orbs: fly straight, die on tiles.
function updateOrbs(orbs, lv, dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.life -= dt;
    o.x += o.vx * dt; o.y += o.vy * dt;
    const tx = Math.floor((o.x + o.w / 2) / TILE), ty = Math.floor((o.y + o.h / 2) / TILE);
    if (o.life <= 0 || isSolidTile(tileAt(lv, tx, ty))) orbs.splice(i, 1);
  }
}

// ---- boss: THE GRAVITY CORE ----
function makeBoss(x, y) {
  return {
    kind: 'boss', x, y, w: 92, h: 92, vx: 0, vy: 0, gdir: 1,
    hp: BOSS.hp, maxHp: BOSS.hp, t: 0, phase: 1, eyeOpen: false, eyeT: 0, eyeTimer: 2.5,
    shootT: 2.0, pulseT: 9, summonT: 12, drift: 0, dead: false, flash: 0, onGround: false,
  };
}

function bossPhase(b) {
  if (b.hp <= BOSS.phaseAt[1]) return 3;
  if (b.hp <= BOSS.phaseAt[0]) return 2;
  return 1;
}

function updateBoss(b, player, lv, dt, orbs, enemies, game) {
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt);
  b.phase = bossPhase(b);
  // Drift: slow horizontal sine, hovering mid-arena.
  b.drift += dt;
  b.x = lv.w * TILE / 2 - b.w / 2 + Math.sin(b.drift * 0.5) * 110;
  b.y = 150 + Math.sin(b.drift * 0.9) * 46;
  // Eye cycle: opens on alternating sides (floor / ceiling) so the player
  // must flip gravity to reach it.
  b.eyeTimer -= dt;
  if (b.eyeTimer <= 0) {
    b.eyeOpen = !b.eyeOpen;
    if (b.eyeOpen) { b.eyeT = BOSS.eyeOpen; b.eyeSide = (Math.floor(b.t) % 2 === 0) ? 1 : -1; }
    b.eyeTimer = b.eyeOpen ? BOSS.eyeOpen : BOSS.eyeGap;
  }
  if (b.eyeOpen) b.eyeT -= dt;
  // Attacks.
  b.shootT -= dt;
  if (b.shootT <= 0) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (b.phase === 1) {
      for (let i = 0; i < BOSS.ringCount; i++) {
        const a = (i / BOSS.ringCount) * Math.PI * 2 + b.t;
        orbs.push({ x: cx - 5, y: cy - 5, w: 10, h: 10, vx: Math.cos(a) * BOSS.bulletSpeed, vy: Math.sin(a) * BOSS.bulletSpeed, life: 5, foe: true });
      }
      b.shootT = 3.4;
    } else {
      // aimed 3-shot burst
      const dx = (player.x + player.w / 2) - cx, dy = (player.y + player.h / 2) - cy;
      const d = Math.max(1, Math.hypot(dx, dy)), base = Math.atan2(dy, dx);
      for (let k = -1; k <= 1; k++) {
        const a = base + k * 0.22;
        orbs.push({ x: cx - 5, y: cy - 5, w: 10, h: 10, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 4.5, foe: true });
      }
      b.shootT = b.phase === 2 ? 2.6 : 2.0;
    }
    Sound.play('shoot');
  }
  if (b.phase === 3) {
    // Gravity pulse: forces the player's gravity to flip (telegraphed).
    b.pulseT -= dt;
    if (b.pulseT <= 0) {
      b.pulseT = 8;
      game.forceFlip();
      Particles.burst(b.x + b.w / 2, b.y + b.h / 2, '#ff5d5d', 26);
      Sound.play('flip');
    }
    b.summonT -= dt;
    if (b.summonT <= 0) {
      b.summonT = 13;
      enemies.push(makeWalker(80, lv.h * TILE - 100));
      enemies.push(makeWalker(lv.w * TILE - 110, lv.h * TILE - 100));
    }
  }
}

// Boss eye hitbox (only while open): a glowing weak point on one side.
function bossEyeBox(b) {
  if (!b.eyeOpen) return null;
  const cx = b.x + b.w / 2;
  const y = b.eyeSide === 1 ? b.y + b.h - 14 : b.y - 14;
  return { x: cx - 20, y, w: 40, h: 28 };
}
