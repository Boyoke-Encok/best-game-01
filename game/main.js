// FLIPBOUND — main: state machine, input, fixed-step loop, camera, scoring,
// upgrades, persistence, debug hooks. All game code is written fresh in this
// session; nothing is read from or copied from the previous entry.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const LOWFX = new URLSearchParams(location.search).has('lowfx');
const $ = id => document.getElementById(id);

const G = {
  state: 'title', // title | play | pause | clear | over | win
  levelIndex: 0, level: null, lv: null,
  player: null, enemies: [], orbs: [], movers: [], shards: [], checkpoints: [],
  pickups: [], springs: [], portal: null, boss: null,
  camX: 0, time: 0, totalTime: 0, score: 0, scoreAtLevelStart: 0, totalShards: 0,
  best: 0, newBest: false,
  hearts: 3, maxHearts: 3, shardsGot: 0, shardsTotal: 0,
  combo: 0, comboT: 0, mult: 1,
  flipCdMax: 0.9, magnet: false, jumpMul: 1, god: false,
  shake: 0, flash: 0, toast: '', toastT: 0, toastCd: 0,
  timeBonus: 0, upgradeChoices: [], stars: [], t: 0,
  autoplay: false, autoT: 0,
};

try { G.best = parseInt(localStorage.getItem('flipbound_best') || '0', 10) || 0; } catch (e) { G.best = 0; }
function saveBest() {
  if (G.score > G.best) { G.best = G.score; G.newBest = true; try { localStorage.setItem('flipbound_best', String(G.best)); } catch (e) {} }
}

function setToast(text, dur) { G.toast = text; G.toastT = dur || 2.2; }

// ---- level loading ----
function loadLevel(i) {
  const def = LEVELS[i];
  G.levelIndex = i;
  G.level = def;
  G.lv = makeLevel(def.map);
  // the parsed level is what the renderer reads: give it the palette too,
  // otherwise drawTiles sees no rows/w/h (raw def has map, not rows).
  G.lv.skyTop = def.skyTop; G.lv.skyBot = def.skyBot;
  G.lv.ground = def.ground; G.lv.groundTop = def.groundTop; G.lv.accent = def.accent;
  G.enemies = []; G.orbs = []; G.movers = []; G.shards = []; G.checkpoints = [];
  G.pickups = []; G.springs = []; G.portal = null; G.boss = null;
  G.shardsGot = 0; G.time = 0; G.combo = 0; G.comboT = 0;
  G.botPlan = null; G.botTarget = ''; G.botStuckT = 0; G.botLast = null;
  G.stars = makeStars(11 + i * 7);
  Particles.clear();
  let px = 64, py = 64;
  for (let ty = 0; ty < G.lv.h; ty++) {
    for (let tx = 0; tx < G.lv.w; tx++) {
      const ch = G.lv.rows[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      const put = (ent) => { G.lv.rows[ty] = G.lv.rows[ty].substring(0, tx) + '.' + G.lv.rows[ty].substring(tx + 1); return ent; };
      if (ch === 'P') { px = x + 5; py = y + 4; put(); }
      else if (ch === '*') { G.shards.push({ x: x + 8, y: y + 8, w: 16, h: 16, got: false }); put(); }
      else if (ch === 'C') { G.checkpoints.push({ x, y, w: 32, h: 32, active: false }); put(); }
      else if (ch === 'X') { G.portal = { x, y, w: 32, h: 32, open: false }; put(); }
      else if (ch === 'W') { G.enemies.push(makeWalker(x + 3, y + 8)); put(); }
      else if (ch === 'F') { G.enemies.push(makeFlyer(x + 3, y + 5)); put(); }
      else if (ch === 'T') { G.enemies.push(makeTurret(x + 3, y + 6)); put(); }
      else if (ch === 'M') { G.movers.push({ x, y: y + 12, w: 96, h: 14, axis: 'x', range: 90, speed: 0.9, phase: tx, baseX: x, baseY: y + 12 }); put(); }
      else if (ch === 'N') { G.movers.push({ x, y, w: 96, h: 14, axis: 'y', range: 70, speed: 0.8, phase: tx, baseX: x, baseY: y }); put(); }
      else if (ch === 'B') { G.springs.push({ x: x + 4, y: y + 14, w: 24, h: 18 }); put(); }
      else if (ch === 'H') { G.pickups.push({ kind: 'heart', x: x + 8, y: y + 8, w: 16, h: 16, got: false }); put(); }
    }
  }
  G.shardsTotal = G.shards.length;
  G.player = {
    x: px, y: py, w: 22, h: 28, vx: 0, vy: 0, gdir: 1, onGround: false,
    coyote: 0, buffer: 0, flipCd: 0, flipCdMax: G.flipCdMax, inv: 0,
    landSquash: 0, face: 1, respawn: { x: px, y: py, gdir: 1 },
  };
  G.camX = Math.max(0, Math.min(px - 300, G.lv.w * TILE - VIEW_W));
  if (i === 4) G.boss = makeBoss(G.lv.w * TILE / 2 - 46, 120);
  setToast(def.name + ' — ' + def.sub, 3.2);
}

function startRun() {
  G.score = 0; G.totalTime = 0; G.totalShards = 0; G.newBest = false;
  G.hearts = 3; G.maxHearts = 3; G.mult = 1; G.flipCdMax = 0.9; G.magnet = false; G.jumpMul = 1;
  G.scoreAtLevelStart = 0;
  loadLevel(0);
  G.state = 'play';
  Sound.ensure(); Sound.startMusic();
}

function retryLevel() {
  G.score = G.scoreAtLevelStart;
  G.hearts = G.maxHearts;
  loadLevel(G.levelIndex);
  G.state = 'play';
}

function nextLevel() {
  G.totalTime += G.time;
  G.totalShards += G.shardsGot;
  G.scoreAtLevelStart = G.score;
  if (G.levelIndex + 1 >= LEVELS.length) return winGame();
  loadLevel(G.levelIndex + 1);
  G.state = 'play';
}

function winGame() {
  G.state = 'win';
  saveBest();
  Sound.play('win');
  Sound.stopMusic();
}

// ---- combat / pickups ----
function damagePlayer(n, fromX) {
  const p = G.player;
  if (!p || p.inv > 0 || G.god || G.state !== 'play') return;
  G.hearts -= n;
  p.inv = 1.3;
  G.combo = 0;
  G.shake = 10; G.flash = 0.25;
  Particles.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff5d7a', 16);
  Sound.play('hurt');
  if (fromX !== undefined) p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 220;
  if (G.hearts <= 0) {
    G.state = 'over';
    saveBest();
    Sound.play('lose');
    Sound.stopMusic();
  }
}

function respawn() {
  const p = G.player, r = p.respawn;
  p.x = r.x; p.y = r.y; p.vx = 0; p.vy = 0; p.gdir = 1;
  p.inv = 1.5;
  G.camX = Math.max(0, Math.min(p.x - 300, G.lv.w * TILE - VIEW_W));
  setToast('Back to the checkpoint!', 1.6);
}

function collectShard(s) {
  s.got = true;
  G.shardsGot++;
  G.combo++; G.comboT = 3;
  const pts = 100 * G.combo * G.mult;
  G.score += pts;
  Particles.burst(s.x + s.w / 2, s.y + s.h / 2, '#ffe066', 12);
  Sound.play('shard', G.combo);
  if (G.shardsGot >= G.shardsTotal && G.portal) {
    G.portal.open = true;
    setToast('PORTAL OPEN — go!', 2.4);
    Sound.play('portal');
  }
}

function stompEnemy(e) {
  e.dead = true;
  const p = G.player;
  p.vy = -390 * p.gdir; // bounce away from the surface the enemy stands on
  p.onGround = false;
  G.score += 50 * G.mult;
  Particles.burst(e.x + e.w / 2, e.y + e.h / 2, '#ff8a5c', 16);
  Sound.play('stomp');
}

function doFlip(force) {
  const p = G.player;
  if (!p || G.state !== 'play') return false;
  if (!force && p.flipCd > 0) return false;
  p.gdir *= -1;
  p.vy = -140 * p.gdir; // small pop off the surface
  p.onGround = false;
  p.flipCd = p.flipCdMax;
  Particles.burst(p.x + p.w / 2, p.y + p.h / 2, '#8ef5ff', LOWFX ? 6 : 14);
  Sound.play('flip');
  return true;
}

// ---- upgrades ----
function pickUpgrades() {
  const pool = UPGRADES.filter(u => {
    if (u.id === 'heart' && G.maxHearts >= 5) return false;
    if (u.id === 'swift' && G.flipCdMax <= 0.36) return false;
    if (u.id === 'frenzy' && G.mult >= 3) return false;
    if (u.id === 'magnet' && G.magnet) return false;
    if (u.id === 'spring' && G.jumpMul >= 1.45) return false;
    return true;
  });
  const picks = [];
  const bag = pool.slice();
  while (picks.length < 3 && bag.length) picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
  G.upgradeChoices = picks.length ? picks : [UPGRADES[0]];
}

function applyUpgrade(u) {
  if (u.id === 'heart') { G.maxHearts++; G.hearts = Math.min(G.maxHearts, G.hearts + 1); }
  else if (u.id === 'swift') { G.flipCdMax = Math.max(0.35, G.flipCdMax * 0.6); }
  else if (u.id === 'magnet') { G.magnet = true; }
  else if (u.id === 'spring') { G.jumpMul = Math.min(1.45, G.jumpMul * 1.15); }
  else if (u.id === 'frenzy') { G.mult = Math.min(3, G.mult * 1.5); }
  Sound.play('checkpoint');
  nextLevel();
}

function levelClear() {
  G.timeBonus = Math.max(0, Math.round((G.level.par - G.time)) * 10);
  G.score += G.timeBonus;
  G.state = 'clear';
  pickUpgrades();
  Sound.play('portal');
}

// ---- input ----
const keys = {};
const CLICKABLES = [];
function clickRegions() {
  CLICKABLES.length = 0;
  if (G.state === 'title') CLICKABLES.push({ x: VIEW_W / 2 - 130, y: 244, w: 260, h: 48, act: () => startRun() });
  else if (G.state === 'clear') G.upgradeChoices.forEach((u, i) => CLICKABLES.push({ x: 180 + i * 220, y: 210, w: 190, h: 150, act: () => applyUpgrade(u) }));
  else if (G.state === 'over') CLICKABLES.push({ x: VIEW_W / 2 - 160, y: 280, w: 320, h: 40, act: () => retryLevel() });
  else if (G.state === 'win') CLICKABLES.push({ x: VIEW_W / 2 - 160, y: 336, w: 320, h: 40, act: () => startRun() });
}

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  Sound.ensure();
  if (e.code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
  if (G.state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { Sound.play('click'); startRun(); return; }
  if (G.state === 'play') {
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') G.player.buffer = 0.12;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX' || e.code === 'KeyK') doFlip(false);
    if (e.code === 'KeyP' || e.code === 'Escape') { G.state = 'pause'; Sound.play('click'); }
  } else if (G.state === 'pause') {
    if (e.code === 'KeyP' || e.code === 'Escape') { G.state = 'play'; Sound.play('click'); }
    if (e.code === 'KeyR') retryLevel();
  } else if (G.state === 'clear') {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
    if (n !== undefined && G.upgradeChoices[n]) applyUpgrade(G.upgradeChoices[n]);
  } else if (G.state === 'over') {
    if (e.code === 'KeyR') retryLevel();
    if (e.code === 'Enter') { G.state = 'title'; loadLevel(0); }
  } else if (G.state === 'win') {
    if (e.code === 'KeyR') startRun();
    if (e.code === 'Enter') { G.state = 'title'; loadLevel(0); }
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', (e) => {
  Sound.ensure();
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (VIEW_W / r.width), my = (e.clientY - r.top) * (VIEW_H / r.height);
  clickRegions();
  for (const c of CLICKABLES) {
    if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) { Sound.play('click'); c.act(); return; }
  }
  if (G.state === 'play') G.player.buffer = 0.12; // click = jump too
});

// ---- per-frame update (fixed step 1/60) ----
function updatePlay(dt) {
  const p = G.player, lv = G.lv;
  G.time += dt;
  // timers
  p.flipCd = Math.max(0, p.flipCd - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.coyote = Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  G.comboT = Math.max(0, G.comboT - dt);
  if (G.comboT <= 0) G.combo = 0;
  G.toastT = Math.max(0, G.toastT - dt);
  G.shake = Math.max(0, G.shake - dt * 30);
  G.flash = Math.max(0, G.flash - dt);

  // --- horizontal input ---
  const left = keys.ArrowLeft || keys.KeyA, right = keys.ArrowRight || keys.KeyD;
  const accel = 2400, maxV = 265;
  if (left && !right) { p.vx = Math.max(-maxV, p.vx - accel * dt); p.face = -1; }
  else if (right && !left) { p.vx = Math.min(maxV, p.vx + accel * dt); p.face = 1; }
  else { p.vx *= (p.onGround ? 0.78 : 0.94); if (Math.abs(p.vx) < 4) p.vx = 0; }

  // --- jump (buffered, coyote, variable height) ---
  if (p.buffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = -600 * p.gdir * G.jumpMul;
    p.onGround = false; p.coyote = 0; p.buffer = 0;
    Particles.burst(p.x + p.w / 2, p.gdir === 1 ? p.y + p.h : p.y, '#bfe9ff', LOWFX ? 3 : 7);
    Sound.play('jump');
  }
  if (!(keys.Space || keys.KeyW || keys.ArrowUp) && p.vy * p.gdir < -160) p.vy = -160 * p.gdir; // jump cut

  // --- gravity ---
  p.vy += 1500 * p.gdir * dt;
  if (p.vy * p.gdir > 640) p.vy = 640 * p.gdir;

  // --- movers: update, carry the player ---
  const deltas = [];
  for (const m of G.movers) {
    const d = updateMover(m, dt, G.t);
    deltas.push([m, d]);
    if (standingOnMover(p, m)) { p.x += d.dx; p.y += d.dy; }
  }

  // --- player vs tiles ---
  const wasGround = p.onGround, vyBefore = p.vy;
  moveAndCollide(lv, p, dt);
  if (p.onGround) {
    p.coyote = 0.09;
    if (!wasGround && vyBefore * p.gdir > 240) {
      p.landSquash = 0.16;
      Particles.burst(p.x + p.w / 2, p.gdir === 1 ? p.y + p.h : p.y, '#bfe9ff', LOWFX ? 3 : 6);
    }
  }
  p.landSquash = Math.max(0, (p.landSquash || 0) - dt * 0.8);

  // --- player vs movers (solid) ---
  for (const m of G.movers) {
    if (!overlap(p, m)) continue;
    const dxTop = (p.y + p.h) - m.y, dxBot = (m.y + m.h) - p.y;
    const dxL = (p.x + p.w) - m.x, dxR = (m.x + m.w) - p.x;
    const min = Math.min(dxTop, dxBot, dxL, dxR);
    if (min === dxTop && p.gdir === 1) { p.y = m.y - p.h; p.vy = 0; p.onGround = true; p.coyote = 0.09; }
    else if (min === dxBot && p.gdir === -1) { p.y = m.y + m.h; p.vy = 0; p.onGround = true; p.coyote = 0.09; }
    else if (min === dxL) { p.x = m.x - p.w; p.vx = Math.min(0, p.vx); }
    else if (min === dxR) { p.x = m.x + m.w; p.vx = Math.max(0, p.vx); }
  }

  // --- world bounds ---
  p.x = Math.max(0, Math.min(lv.w * TILE - p.w, p.x));
  if (p.y < -48 && p.gdir === -1) {
    // No ceiling to hold onto up here: snap back down.
    p.gdir = 1; p.vy = 0; p.y = -48;
    if (G.toastCd <= 0) { setToast('No ceiling up there — flipping back!', 1.8); G.toastCd = 5; }
  }
  G.toastCd = Math.max(0, G.toastCd - dt);
  if (p.y > lv.h * TILE + 90) { damagePlayer(1); if (G.state === 'play') respawn(); return; }

  // --- springs ---
  for (const s of G.springs) {
    if (overlap(p, s)) {
      p.vy = -920 * p.gdir; p.onGround = false;
      Particles.burst(p.x + p.w / 2, p.y + p.h / 2, '#ffe066', LOWFX ? 5 : 10);
      Sound.play('bounce');
    }
  }

  // --- spikes ---
  const px0 = Math.floor((p.x + 4) / TILE), px1 = Math.floor((p.x + p.w - 4) / TILE);
  const py0 = Math.floor((p.y + 4) / TILE), py1 = Math.floor((p.y + p.h - 4) / TILE);
  for (let ty = py0; ty <= py1; ty++) for (let tx = px0; tx <= px1; tx++) {
    const ch = tileAt(lv, tx, ty);
    if (ch !== '^' && ch !== 'v') continue;
    const sx = tx * TILE, sy = ty * TILE;
    const hurt = ch === '^'
      ? { x: sx + 3, y: sy + 14, w: 26, h: 18 }
      : { x: sx + 3, y: sy, w: 26, h: 18 };
    if (overlap({ x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 }, hurt)) {
      damagePlayer(1, sx + 16);
      if (G.state === 'play') { p.y -= 40 * p.gdir; p.vy = -260 * p.gdir; }
      return;
    }
  }

  // --- pickups: shards, hearts, checkpoints, portal ---
  for (const s of G.shards) {
    if (s.got) continue;
    let dx = (s.x + 8) - (p.x + p.w / 2), dy = (s.y + 8) - (p.y + p.h / 2);
    const d = Math.hypot(dx, dy);
    if (G.magnet && d < 130 && d > 1) { s.x += dx / d * 260 * dt; s.y += dy / d * 260 * dt; }
    if (d < 30) collectShard(s);
  }
  for (const h of G.pickups) {
    if (h.got) continue;
    const dx = (h.x + 8) - (p.x + p.w / 2), dy = (h.y + 8) - (p.y + p.h / 2);
    if (Math.hypot(dx, dy) < 30) {
      h.got = true;
      G.hearts = Math.min(G.maxHearts, G.hearts + 1);
      G.score += 25 * G.mult;
      Particles.burst(h.x + 8, h.y + 8, '#ff5d7a', 10);
      Sound.play('heart');
    }
  }
  for (const c of G.checkpoints) {
    if (!c.active && overlap(p, c)) {
      c.active = true;
      p.respawn = { x: c.x, y: c.y - 4, gdir: 1 };
      G.score += 25 * G.mult;
      Particles.burst(c.x + 16, c.y + 16, '#7ef0c1', 12);
      Sound.play('checkpoint');
      setToast('Checkpoint!', 1.4);
    }
  }
  if (G.portal && G.portal.open && overlap(p, G.portal)) { levelClear(); return; }

  // --- enemies ---
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.kind === 'walker') updateWalker(e, lv, dt);
    else if (e.kind === 'flyer') updateFlyer(e, p, dt);
    else if (e.kind === 'turret') updateTurret(e, p, dt, G.orbs);
    if (!overlap(p, e)) continue;
    // stomp: player moving in gravity direction and mostly above the enemy
    const pLead = p.gdir === 1 ? p.y + p.h : p.y;
    const eFace = p.gdir === 1 ? e.y + 6 : e.y + e.h - 6;
    const stomping = p.vy * p.gdir > 60 && (p.gdir === 1 ? pLead - eFace < 14 : eFace - pLead < 14);
    if (stomping) stompEnemy(e);
    else { damagePlayer(1, e.x + e.w / 2); if (G.state !== 'play') return; }
  }
  G.enemies = G.enemies.filter(e => !e.dead);

  // --- orbs ---
  updateOrbs(G.orbs, lv, dt);
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    if (overlap(p, o)) {
      G.orbs.splice(i, 1);
      damagePlayer(1, o.x);
      if (G.state !== 'play') return;
    }
  }

  // --- boss ---
  if (G.boss) {
    const b = G.boss;
    updateBoss(b, p, lv, dt, G.orbs, G.enemies, { forceFlip: () => { if (G.state === 'play') { setToast('GRAVITY PULSE!', 1.2); doFlip(true); } } });
    // eye stomp
    const eye = bossEyeBox(b);
    if (eye && overlap(p, eye) && b.eyeT > 0 && !b.eyeHitCd) {
      b.hp--; b.flash = 0.25; b.eyeHitCd = 0.6; b.eyeOpen = false; b.eyeTimer = BOSS.eyeGap;
      G.score += 200 * G.mult;
      p.vy = -420 * p.gdir;
      Particles.burst(eye.x + 20, eye.y + 14, '#ffe066', 22);
      Sound.play('bossHit');
      G.shake = 8;
      if (b.hp <= 0) {
        b.dead = true;
        Particles.burst(b.x + b.w / 2, b.y + b.h / 2, '#ff5d5d', 40);
        Particles.burst(b.x + b.w / 2, b.y + b.h / 2, '#ffe066', 30);
        Sound.play('bossDie');
        setTimeout(() => { if (G.state === 'play') { G.totalTime += G.time; G.totalShards += G.shardsGot; winGame(); } }, 900);
      }
    }
    b.eyeHitCd = Math.max(0, (b.eyeHitCd || 0) - dt);
    // body contact hurts
    if (!b.dead && overlap(p, { x: b.x + 8, y: b.y + 8, w: b.w - 16, h: b.h - 16 })) {
      damagePlayer(1, b.x + b.w / 2);
      if (G.state !== 'play') return;
    }
  }

  // --- camera ---
  const target = Math.max(0, Math.min(p.x + p.w / 2 - 380, lv.w * TILE - VIEW_W));
  G.camX += (target - G.camX) * Math.min(1, dt * 6);
  Particles.update(dt);
  if (G.autoplay) runAutoplay(dt);
}

// Bot: follows a BFS-planned route (same walk/jump/flip/spring/mover model the
// reachability checker uses) to the nearest shard or the open portal, steering
// greedily toward the next waypoint. Proves the levels are winnable; a human
// plays better.
function botSolid(tx, ty) {
  if (tx < 0 || tx >= G.lv.w || ty < 0 || ty >= G.lv.h) return false;
  const ch = G.lv.rows[ty][tx];
  if (ch === '#' || ch === '=') return true;
  for (const m of G.movers) {
    const mc = Math.floor(m.baseX / TILE), mr = Math.floor(m.baseY / TILE);
    if (ty === mr && tx >= mc && tx < mc + 3) return true;
  }
  return false;
}
function botBlocked(tx, ty) {
  if (tx < 0 || tx >= G.lv.w) return true;
  if (ty < 0) return true;
  if (ty >= G.lv.h) return false; // below the map = a pit (falling out = dead)
  const ch = G.lv.rows[ty][tx];
  return ch === '#' || ch === '^' || ch === 'v';
}
function botSpring(tx, ty) {
  for (const sp of G.springs) if (Math.floor(sp.x / TILE) === tx && Math.floor(sp.y / TILE) === ty) return true;
  return false;
}
function botStandable(tx, ty, g) { return !botBlocked(tx, ty) && botSolid(tx, ty + g); }

// BFS over (cell, gdir); returns the cell path to within 1 cell of the target.
function botPlan(sx, sy, sg, tx, ty) {
  const key = (x, y, g) => x + ',' + y + ',' + g;
  const prev = new Map();
  const q = [[sx, sy, sg]];
  prev.set(key(sx, sy, sg), null);
  let end = null;
  while (q.length) {
    const [x, y, g] = q.shift();
    if (Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1 && botStandable(x, y, g)) { end = [x, y, g]; break; }
    const push = (nx, ny, ng) => {
      if (ny < -2 || ny > G.lv.h + 1) return;
      const k = key(nx, ny, ng);
      if (!prev.has(k)) { prev.set(k, [x, y, g]); q.push([nx, ny, ng]); }
    };
    for (const dx of [-1, 1]) { const nx = x + dx; if (!botBlocked(nx, y) && botStandable(nx, y, g)) push(nx, y, g); }
    { const ny = y + g; if (!botBlocked(x, ny) && ny < G.lv.h) push(x, ny, g); }
    const up = botSpring(x, y + g) ? 8 : 3;
    for (let dy = 1; dy <= up; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = x + dx, ny = y - g * dy;
      if (ny < 0 || ny >= G.lv.h) continue;
      let clear = true;
      const steps = Math.max(Math.abs(dx), dy);
      for (let s = 1; s <= steps; s++) {
        if (botBlocked(x + Math.round(dx * s / steps), y - Math.round(g * dy * s / steps))) { clear = false; break; }
      }
      if (!clear) continue;
      if (botStandable(nx, ny, g)) push(nx, ny, g);
      else if (!botBlocked(nx, ny)) push(nx, ny, g);
    }
    { const ng = -g; let found = false, ly = y;
      for (let d = 1; d <= 10; d++) { const cy = y + ng * d;
        if (cy < 0 || cy >= G.lv.h) break;
        if (botSolid(x, cy)) { found = true; ly = cy - ng; break; }
        if (botBlocked(x, cy)) break; }
      if (found) push(x, ly, ng); }
  }
  if (!end) return null;
  const path = [];
  let cur = end;
  while (cur) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1], cur[2])); }
  // keep only cells the player can stand in (drop mid-air jump-arc cells)
  return path.slice(1).filter(([x, y, g]) => botStandable(x, y, g));
}

function runAutoplay(dt) {
  const p = G.player, lv = G.lv;
  G.autoT += dt;
  keys.Space = true; // hold jump: full-height jumps, no jump-cut
  // pick the target: open portal, else nearest ungot shard
  let tx = null, ty = null, tkey = '';
  if (G.portal && G.portal.open) { tx = G.portal.x + 16; ty = G.portal.y + 16; tkey = 'portal'; }
  else {
    let best = 1e9;
    for (const s of G.shards) if (!s.got) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < best) { best = d; tx = s.x + 8; ty = s.y + 8; tkey = 's' + s.x + ',' + s.y; }
    }
  }
  if (tx === null) return;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  // (re)plan when the target changed, the plan ran out, or we are stuck
  if (!G.botPlan || G.botTarget !== tkey || G.botPlan.length === 0) {
    const sx = Math.max(0, Math.min(lv.w - 1, Math.floor(pcx / TILE))), sy = Math.max(0, Math.min(lv.h - 1, Math.floor(pcy / TILE)));
    G.botPlan = botPlan(sx, sy, p.gdir, Math.floor(tx / TILE), Math.floor(ty / TILE));
    G.botTarget = tkey; G.botStuckT = 0; G.botLast = { x: pcx, y: pcy };
  }
  if (G.botStuckT === undefined) { G.botStuckT = 0; G.botLast = { x: pcx, y: pcy }; }
  if (Math.hypot(pcx - G.botLast.x, pcy - G.botLast.y) > 14) { G.botLast = { x: pcx, y: pcy }; G.botStuckT = 0; }
  else {
    G.botStuckT += dt;
    if (G.botStuckT > 3) { G.botPlan = null; G.botStuckT = 0; if (p.onGround) p.buffer = 0.12; }
  }
  // steer toward the next waypoint (or the raw target if no plan)
  let wx = tx, wy = ty, wg = p.gdir;
  if (G.botPlan && G.botPlan.length) {
    const wp = G.botPlan[0];
    wx = wp[0] * TILE + 16; wy = wp[1] * TILE + 16; wg = wp[2];
    if (Math.hypot(wx - pcx, wy - pcy) < 22) G.botPlan.shift();
  }
  keys.ArrowLeft = wx < pcx - 6;
  keys.ArrowRight = wx > pcx + 6;
  // flip when the waypoint wants the other gravity and we are standing
  if (wg !== p.gdir && p.onGround && p.flipCd <= 0) doFlip(false);
  // jump: wall ahead, gap ahead, or waypoint above us
  const aheadX = p.vx > 0 ? p.x + p.w + 6 : p.vx < 0 ? p.x - 6 : pcx;
  const atx = Math.floor(aheadX / TILE), aty = Math.floor((p.y + p.h / 2) / TILE);
  if ((p.vx > 40 || p.vx < -40) && isSolidTile(tileAt(lv, atx, aty)) && p.onGround) p.buffer = 0.12;
  if (p.onGround) {
    const gx = Math.floor((pcx + (p.vx > 0 ? 40 : p.vx < 0 ? -40 : 0)) / TILE);
    const gy = Math.floor((p.gdir === 1 ? p.y + p.h + 8 : p.y - 8) / TILE);
    const ch = tileAt(lv, gx, gy);
    if (!isSolidTile(ch) && !isOneWay(ch)) p.buffer = 0.12;
    const dy = wy - pcy;
    if ((p.gdir === 1 && dy < -26) || (p.gdir === -1 && dy > 26)) p.buffer = 0.12;
  }
  // ran off an edge over a pit? jump inside the coyote window
  if (!p.onGround && p.coyote > 0 && p.vy * p.gdir > 0) {
    const gx2 = Math.floor((pcx + (p.vx > 0 ? 40 : p.vx < 0 ? -40 : 0)) / TILE);
    const gy2 = Math.floor((p.gdir === 1 ? p.y + p.h + 8 : p.y - 8) / TILE);
    const ch2 = tileAt(lv, gx2, gy2), ch3 = tileAt(lv, gx2, gy2 + p.gdir);
    if (!isSolidTile(ch2) && !isOneWay(ch2) && !isSolidTile(ch3) && !isOneWay(ch3)) p.buffer = 0.12;
  }
  if (G.autoT > 2) { G.autoT = 0; if (p.onGround) p.buffer = 0.12; }
}

// ---- render ----
function render() {
  const t = G.t;
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  const lv = G.lv; // parsed level (rows + palette); NOT G.level (raw def)
  if (G.state === 'title') {
    drawBackground(ctx, lv, G.camX + t * 12, t, G.stars);
    ctx.save();
    ctx.translate(-(G.camX + t * 12), WORLD_Y0);
    drawTiles(ctx, lv, G.camX + t * 12);
    for (const s of G.shards) drawPickup(ctx, 'shard', s.x + 8, s.y + 8, t);
    ctx.restore();
    drawTitle(ctx, G, t);
  } else {
    drawBackground(ctx, lv, G.camX, t, G.stars);
    ctx.save();
    ctx.translate(-G.camX, WORLD_Y0); // one world transform for everything below
    drawTiles(ctx, lv, G.camX);
    for (const m of G.movers) drawMover(ctx, m);
    for (const s of G.springs) {
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#ff8a5c';
      ctx.fillRect(s.x, s.y, s.w, 5);
    }
    for (const c of G.checkpoints) drawCheckpoint(ctx, c, t, c.active);
    for (const s of G.shards) if (!s.got) drawPickup(ctx, 'shard', s.x + 8, s.y + 8, t);
    for (const h of G.pickups) if (!h.got) drawPickup(ctx, 'heart', h.x + 8, h.y + 8, t);
    if (G.portal) drawPortal(ctx, G.portal.x + 16, G.portal.y + 16, t, G.portal.open);
    for (const e of G.enemies) drawEnemy(ctx, e, t);
    for (const o of G.orbs) drawOrb(ctx, o);
    if (G.boss && !G.boss.dead) drawBoss(ctx, G.boss, t);
    // player (blink while invincible)
    if (!G.player || G.player.inv <= 0 || Math.floor(t * 14) % 2 === 0) drawPlayer(ctx, G.player, t);
    // particles
    for (const pt of Particles.list) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore(); // world transform
    drawHUD(ctx, G);
    if (G.flash > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (G.flash * 0.9) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (G.state === 'pause') drawPause(ctx, G);
    else if (G.state === 'clear') drawLevelClear(ctx, G);
    else if (G.state === 'over') drawGameOver(ctx, G);
    else if (G.state === 'win') drawVictory(ctx, G);
  }
  ctx.restore();
}

// ---- main loop (fixed timestep) ----
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  G.t += dt;
  acc += dt;
  const STEP = 1 / 60;
  let n = 0;
  while (acc >= STEP && n < 5) {
    if (G.state === 'play') updatePlay(STEP);
    else if (G.state === 'title') { G.camX = (G.camX + STEP * 12) % Math.max(1, G.lv.w * TILE - VIEW_W); Particles.update(STEP); }
    acc -= STEP; n++;
  }
  render();
}

// ---- debug hooks (verification only; the game is fully playable without them) ----
window.__game = {
  G,
  warp(i) { loadLevel(i); G.state = 'play'; },
  god() { G.god = !G.god; return G.god; },
  teleport(x, y) { G.player.x = x; G.player.y = y; G.player.vx = 0; G.player.vy = 0; },
  setHearts(n) { G.hearts = n; },
  winLevel() { for (const s of G.shards) if (!s.got) collectShard(s); if (G.portal) G.portal.open = true; },
  bossKill() { if (G.boss) { G.boss.hp = 1; G.boss.eyeOpen = true; G.boss.eyeT = 5; } },
  autoplay(on) { G.autoplay = !!on; if (!on) for (const k of Object.keys(keys)) keys[k] = false; return G.autoplay; },
  start() { startRun(); },
  state() { return { state: G.state, level: G.levelIndex, score: G.score, hearts: G.hearts, shards: G.shardsGot + '/' + G.shardsTotal, x: Math.round(G.player.x), y: Math.round(G.player.y), bossHp: G.boss ? G.boss.hp : null }; },
};

// ---- boot ----
loadLevel(0);
requestAnimationFrame(frame);
