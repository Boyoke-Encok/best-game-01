// EMBERFALL — boot, fixed-step loop, states, collisions, bot, debug hooks.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, BOSS_TIME, WEAPONS } from './defs.js';
import { makePlayer, updatePlayer, hurtPlayer, hurtEnemy, addKill } from './player.js';
import { updateEnemy, onEnemyKilled } from './enemies.js';
import { makeWorld, updateWorld } from './world.js';
import { makeFx, updateFx, burst, addShake } from './fx.js';
import { rollCards, applyCard, weaponStats } from './upgrades.js';
import { drawGame, drawTitle, drawLevelUp, drawPause, drawEnd } from './render.js';
import { ensureAudio, toggleMute, Sound } from './audio.js';
import { loadBest, saveBest } from './storage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  ...makeWorld(),
  player: null, fx: makeFx(),
  weapons: { bolt: { level: 1, cd: 0, angle: 0 } },
  passives: {},
  state: 'title', // title | play | levelup | pause | over | win
  camX: 0, camY: 0,
  cards: [], cardRects: [],
  bossWarn: 0, winT: 0, best: loadBest(),
  input: { up: false, down: false, left: false, right: false },
  levelupT: 0, overT: 0,
};
G.player = makePlayer(WORLD_W / 2, WORLD_H / 2);
G.WORLD_W = WORLD_W; G.WORLD_H = WORLD_H;

function resetRun() {
  const keep = { best: G.best };
  Object.assign(G, makeWorld());
  G.player = makePlayer(WORLD_W / 2, WORLD_H / 2);
  G.fx = makeFx();
  G.weapons = { bolt: { level: 1, cd: 0, angle: 0 } };
  G.passives = {};
  G.state = 'play';
  G.cards = []; G.cardRects = [];
  G.bossWarn = 0; G.winT = 0; G.best = keep.best;
  G.camX = 0; G.camY = 0;
  G.levelupT = 0; G.overT = 0;
  ensureAudio();
}

function startGame() {
  resetRun();
}

function endRun(won) {
  G.state = won ? 'win' : 'over';
  if (won) {
    G.score += 1000 + G.player.level * 100;
    Sound.win();
  }
  G.best = saveBest(G.score);
}

// ---------- collisions ----------
function collideProjectiles(dt) {
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const pr = G.projs[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    let dead = pr.life <= 0 || pr.x < 0 || pr.x > WORLD_W || pr.y < 0 || pr.y > WORLD_H;
    if (!dead) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.x - pr.x, dy = e.y - pr.y;
        const rr = e.r + pr.r;
        if (dx * dx + dy * dy < rr * rr) {
          const kb = 14;
          const d = Math.hypot(dx, dy) || 1;
          hurtEnemy(G, e, pr.dmg, (dx / d) * kb * 0.3, (dy / d) * kb * 0.3);
          Sound.hit();
          if (pr.pierce > 0) { pr.pierce -= 1; }
          else { dead = true; break; }
        }
      }
    }
    if (dead) G.projs.splice(i, 1);
  }
}

function collideBlades(dt) {
  const w = G.weapons.blades;
  if (!w) return;
  const st = weaponStats('blades', w.level);
  const p = G.player;
  const n = 2 + (w.level - 1);
  const radius = 95 + 14 * (w.level - 1);
  for (const e of G.enemies) {
    if (!e.dead) e.bladeCd = Math.max(0, (e.bladeCd || 0) - dt);
  }
  for (let i = 0; i < n; i++) {
    const a = (w.angle || 0) + (i / n) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * radius;
    const by = p.y + Math.sin(a) * radius;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - bx, dy = e.y - by;
      const rr = e.r + 12;
      if (dx * dx + dy * dy < rr * rr && (e.bladeCd || 0) <= 0) {
        e.bladeCd = 0.35;
        hurtEnemy(G, e, st.dmg, 0, 0);
      }
    }
  }
}

function collideNovas() {
  for (let i = G.novas.length - 1; i >= 0; i--) {
    const n = G.novas[i];
    if (!n.applied) {
      n.applied = true;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.x - n.x, dy = e.y - n.y;
        if (dx * dx + dy * dy < (n.r + e.r) * (n.r + e.r)) {
          hurtEnemy(G, e, n.dmg, 0, 0);
          e.slowT = 2;
        }
      }
    }
    n.life -= 1 / 60;
    if (n.life <= 0) G.novas.splice(i, 1);
  }
}

function collideEnemies(dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y;
    const rr = p.r + e.r - 2;
    if (dx * dx + dy * dy < rr * rr) {
      hurtPlayer(G, e.dmg);
    }
  }
}

function collideBullets(dt) {
  const p = G.player;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H;
    if (!dead) {
      const dx = p.x - b.x, dy = p.y - b.y;
      const rr = p.r + b.r - 2;
      if (dx * dx + dy * dy < rr * rr) {
        hurtPlayer(G, b.dmg);
        dead = true;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

function sweepDead() {
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (!e.dead) continue;
    if (!e.counted) {
      e.counted = true;
      onEnemyKilled(G, e);
      if (e.type !== 'boss') addKill(G, e.x, e.y, e.xp);
      else {
        G.score += 500;
        G.winT = 0.9;
        burst(G.fx, e.x, e.y, '#ffd76a', 50, 300);
        addShake(G.fx, 10);
      }
    }
    G.enemies.splice(i, 1);
  }
}

// ---------- autoplay bot (verification only) ----------
function botInput() {
  const p = G.player;
  const inp = { up: false, down: false, left: false, right: false };
  let tx = 0, ty = 0;
  // dodge the nearest boss bullet
  let bd = 130 * 130, bb = null;
  for (const b of G.bullets) {
    const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
    if (d < bd) { bd = d; bb = b; }
  }
  if (bb) {
    const dx = p.x - bb.x, dy = p.y - bb.y;
    const d = Math.hypot(dx, dy) || 1;
    // run perpendicular to the bullet's travel
    const px = -bb.vy, py = bb.vx;
    const s = (px * dx + py * dy) >= 0 ? 1 : -1;
    tx = px * s; ty = py * s;
  } else {
    // nearest gem — unless hurt, then fleeing comes first
    let gd = 420 * 420, gg = null;
    for (const g of G.gems) {
      const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
      if (d < gd) { gd = d; gg = g; }
    }
    // flee the nearest enemy inside 180
    let ed = 180 * 180, ee = null;
    for (const e of G.enemies) {
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < ed) { ed = d; ee = e; }
    }
    if (ee && (p.hp < 50 || !gg)) {
      tx = p.x - ee.x; ty = p.y - ee.y;
    } else if (gg) {
      tx = gg.x - p.x; ty = gg.y - p.y;
    } else if (ee) {
      tx = p.x - ee.x; ty = p.y - ee.y;
    } else {
      // drift toward the arena middle
      tx = WORLD_W / 2 - p.x; ty = WORLD_H / 2 - p.y;
    }
  }
  const len = Math.hypot(tx, ty);
  if (len > 8) {
    const nx = tx / len, ny = ty / len;
    if (ny < -0.4) inp.up = true;
    if (ny > 0.4) inp.down = true;
    if (nx < -0.4) inp.left = true;
    if (nx > 0.4) inp.right = true;
  }
  return inp;
}

// ---------- update ----------
function update(dt) {
  if (G.bossWarn > 0) G.bossWarn -= dt;
  for (const z of G.zaps) z.life -= dt;
  G.zaps = G.zaps.filter(z => z.life > 0);
  if (G.state !== 'play') return;
  const input = G.autoplay ? botInput() : G.input;
  updateWorld(G, dt);
  updatePlayer(G, dt, input);
  for (const e of G.enemies) updateEnemy(G, e, dt);
  collideProjectiles(dt);
  collideBlades(dt);
  collideNovas();
  collideEnemies(dt);
  collideBullets(dt);
  sweepDead();
  updateFx(G.fx, dt);
  // camera follows the player
  G.camX = Math.max(0, Math.min(WORLD_W - VIEW_W, G.player.x - VIEW_W / 2));
  G.camY = Math.max(0, Math.min(WORLD_H - VIEW_H, G.player.y - VIEW_H / 2));
  // boss killed -> win after the burst
  if (G.winT > 0) {
    G.winT -= dt;
    if (G.winT <= 0) endRun(true);
  }
  // player died
  if (G.player.dead && G.state === 'play') {
    endRun(false);
    return;
  }
  // level-up queue
  if (G.pendingLevels > 0 && G.state === 'play') {
    G.cards = rollCards(G);
    G.state = 'levelup';
    G.levelupT = 0;
    Sound.levelup();
  }
}

function pickCard(i) {
  if (G.state !== 'levelup') return;
  const c = G.cards[i];
  if (!c) return;
  applyCard(G, c);
  G.pendingLevels -= 1;
  Sound.click();
  if (G.pendingLevels > 0) {
    G.cards = rollCards(G);
    G.levelupT = 0;
  } else {
    G.state = 'play';
  }
}

// ---------- loop ----------
let last = performance.now();
let acc = 0;
function frame(now) {
  const dtMs = Math.min(100, now - last);
  last = now;
  acc += dtMs / 1000;
  const step = 1 / 60;
  let n = 0;
  while (acc >= step && n < 5) {
    // autoplay picks a card on its own
    if (G.state === 'levelup' && G.autoplay) {
      G.levelupT += step;
      if (G.levelupT > 0.4) pickCard(0);
    }
    update(step);
    acc -= step;
    n++;
  }
  if (n === 5) acc = 0;
  render(now / 1000);
  requestAnimationFrame(frame);
}

function render(t) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (G.state === 'title') drawTitle(ctx, G, G.best);
  else if (G.state === 'levelup') { drawGame(ctx, G, t); drawLevelUp(ctx, G); }
  else if (G.state === 'pause') { drawGame(ctx, G, t); drawPause(ctx); }
  else if (G.state === 'over') { drawGame(ctx, G, t); drawEnd(ctx, G, G.best, false); }
  else if (G.state === 'win') { drawGame(ctx, G, t); drawEnd(ctx, G, G.best, true); }
  else drawGame(ctx, G, t);
}

// ---------- input ----------
const keyMap = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

window.addEventListener('keydown', (ev) => {
  ensureAudio();
  const k = ev.code;
  if (keyMap[k]) {
    G.input[keyMap[k]] = true;
    ev.preventDefault();
    return;
  }
  if (k === 'Enter') {
    if (G.state === 'title') startGame();
    else if (G.state === 'over' || G.state === 'win') G.state = 'title';
  } else if (k === 'KeyP') {
    if (G.state === 'play') G.state = 'pause';
    else if (G.state === 'pause') G.state = 'play';
  } else if (k === 'KeyM') {
    toggleMute();
  } else if (k === 'KeyR') {
    if (G.state !== 'title') startGame();
  } else if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') {
    pickCard(Number(k.slice(-1)) - 1);
  }
});

window.addEventListener('keyup', (ev) => {
  const k = keyMap[ev.code];
  if (k) G.input[k] = false;
});

canvas.addEventListener('click', (ev) => {
  ensureAudio();
  const r = canvas.getBoundingClientRect();
  const x = (ev.clientX - r.left) * (VIEW_W / r.width);
  const y = (ev.clientY - r.top) * (VIEW_H / r.height);
  if (G.state === 'title') { startGame(); return; }
  if (G.state === 'levelup') {
    for (const cr of G.cardRects || []) {
      if (x >= cr.x && x <= cr.x + cr.w && y >= cr.y && y <= cr.y + cr.h) {
        pickCard(cr.i);
        return;
      }
    }
  }
  if (G.state === 'over' || G.state === 'win') { G.state = 'title'; }
});

// ---------- debug hooks (verification only) ----------
window.__game = {
  G,
  state() {
    return {
      state: G.state, time: Math.round(G.time * 10) / 10,
      score: G.score, hp: Math.round(G.player.hp), level: G.player.level,
      kills: G.player.kills, enemies: G.enemies.length, gems: G.gems.length,
      x: Math.round(G.player.x), y: Math.round(G.player.y),
      bossHp: (G.enemies.find(e => e.type === 'boss') || {}).hp ?? null,
      weapons: Object.keys(G.weapons),
    };
  },
  start() { startGame(); },
  warp(t) { G.time = t; G.spawnT = 0; G.eliteT = 30; },
  giveBuild() {
    const p = G.player;
    p.level = 12;
    p.xpNeed = 200;
    G.weapons = {
      bolt: { level: 5, cd: 0, angle: 0 },
      blades: { level: 5, cd: 0, angle: 0 },
      nova: { level: 5, cd: 0, angle: 0 },
      chain: { level: 5, cd: 0, angle: 0 },
      volley: { level: 5, cd: 0, angle: 0 },
    };
    G.passives = { boots: 3, magnet: 3, armor: 3, vitality: 5, crit: 3, haste: 3, greed: 2, regen: 3 };
    p.maxHp = 100 + 25 * 5;
    p.hp = p.maxHp;
  },
  god() { G.god = !G.god; return G.god; },
  autoplay(on) { G.autoplay = !!on; return G.autoplay; },
  spawnBoss() {
    if (G.bossSpawned) return false;
    G.time = Math.max(G.time, BOSS_TIME);
    return true;
  },
};

requestAnimationFrame(frame);
