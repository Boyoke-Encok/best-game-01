// SPROUT SIEGE — game state, loop, input, HUD, wave flow, autoplay bot.
import { COLS, ROWS, CELL, W, H, TOWERS, TOWER_ORDER, TOTAL_WAVES, START_GOLD, START_LIVES, waveClearBonus, BASE_CELL } from './defs.js';
import { cellCenter, pathLength, isBuildable, spotScore } from './path.js';
import { createTower, towerDef, towerRangeNow, towerDamageNow, canUpgrade, getUpgradeCost, upgradeTower, sellValue, updateTower } from './towers.js';
import { createEnemy, damageEnemy, slowEnemy, healAura, updateEnemy, splitEnemy } from './enemies.js';
import { buildQueue, wavePreview } from './waves.js';
import { sfx, ensureAudio, setMuted, isMuted } from './audio.js';
import { makeFx, burst, leafBurst, floatText, updateFx } from './fx.js';
import { draw } from './render.js';
import { loadBest, saveBest } from './storage.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  state: 'title', // title | play | win | over
  paused: false,
  speed: 1,
  time: 0,
  gold: START_GOLD,
  lives: START_LIVES,
  score: 0,
  kills: 0,
  wave: 0,
  waveActive: false,
  waveTime: 0,
  queue: [],
  queueIdx: 0,
  hpMul: 1,
  waveTotal: 0,
  towers: [],
  enemies: [],
  projectiles: [],
  fx: makeFx(),
  best: loadBest(),
  selected: null,
  placing: null,
  hover: null,
  autoplay: false,
  botT: 0,
  damageDealt: 0,
};

// Best tower cells, computed once: sorted by path coverage.
const SPOT_CACHE = (() => {
  const list = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (isBuildable(col, row, [])) list.push({ col, row, score: spotScore(col, row, 100) });
    }
  }
  list.sort((a, b) => b.score - a.score);
  return list;
})();

const $ = id => document.getElementById(id);
const hud = {
  gold: $('hud-gold'), lives: $('hud-lives'), wave: $('hud-wave'), score: $('hud-score'),
  kills: $('hud-kills'), left: $('hud-left'), next: $('hud-next'),
  waveBtn: $('btn-wave'), speedBtn: $('btn-speed'), pauseBtn: $('btn-pause'),
  muteBtn: $('btn-mute'), restartBtn: $('btn-restart'),
  towerBar: $('towerbar'), selInfo: $('sel-info'),
  title: $('overlay-title'), win: $('overlay-win'), lose: $('overlay-lose'),
  paused: $('overlay-paused'),
  winScore: $('win-score'), winBest: $('win-best'), winDetail: $('win-detail'),
  loseScore: $('lose-score'), loseBest: $('lose-best'), loseDetail: $('lose-detail'),
  titleBest: $('title-best'),
};

function fmt(n) { return String(Math.floor(n)); }

function updateHud() {
  hud.gold.textContent = '🪙 ' + fmt(G.gold);
  hud.lives.textContent = '❤ ' + fmt(G.lives);
  hud.wave.textContent = 'Wave ' + (G.wave === 0 ? '–' : G.wave) + '/' + TOTAL_WAVES;
  hud.score.textContent = 'Score ' + fmt(G.score);
  hud.kills.textContent = 'Kills ' + fmt(G.kills);
  const left = (G.queue.length - G.queueIdx) + G.enemies.length;
  hud.left.textContent = G.waveActive ? 'Pests left ' + left : '';
  if (!G.waveActive && G.state === 'play' && G.wave < TOTAL_WAVES) {
    hud.next.textContent = 'Next: ' + wavePreview(G.wave + 1);
  } else if (G.waveActive) {
    hud.next.textContent = 'Wave ' + G.wave + ' in progress';
  } else {
    hud.next.textContent = '';
  }
  hud.waveBtn.disabled = G.waveActive || G.state !== 'play' || G.wave >= TOTAL_WAVES;
  hud.waveBtn.textContent = G.wave === 0 ? '▶ Start Wave 1' : '▶ Start Wave ' + (G.wave + 1);
  hud.speedBtn.textContent = '⏩ ' + G.speed + '×';
  hud.pauseBtn.textContent = G.paused ? '▶ Resume' : '⏸ Pause';
  hud.muteBtn.textContent = isMuted() ? '🔇 Muted' : '🔊 Sound';
  renderTowerBar();
}

let towerBarSig = '';
function renderTowerBar() {
  // Rebuilding innerHTML destroys the Upgrade/Sell buttons under the
  // player's cursor, so only re-render when something visible changed.
  const s = G.selected;
  const sig = [
    G.state, G.placing,
    s ? s.type + ':' + s.level : 'none',
    TOWER_ORDER.map(id => G.gold >= TOWERS[id].cost ? 1 : 0).join(''),
  ].join('|');
  if (sig === towerBarSig) return;
  towerBarSig = sig;
  hud.towerBar.innerHTML = '';
  for (const id of TOWER_ORDER) {
    const def = TOWERS[id];
    const b = document.createElement('button');
    b.className = 'tower-card' + (G.placing === id ? ' active' : '');
    b.innerHTML = `<b>${def.name}</b><span class="cost">🪙 ${def.cost}</span><span class="desc">${def.desc}</span><span class="key">[${TOWER_ORDER.indexOf(id) + 1}]</span>`;
    b.disabled = G.state !== 'play' || G.gold < def.cost;
    b.onclick = () => { ensureAudio(); selectPlacing(G.placing === id ? null : id); };
    hud.towerBar.appendChild(b);
  }
  // Selected-tower panel.
  if (s) {
    const def = towerDef(s);
    const up = canUpgrade(s) ? ` <button id="btn-up">⬆ Upgrade 🪙 ${getUpgradeCost(s)}</button>` : ' <span>MAX level</span>';
    hud.selInfo.innerHTML =
      `<b>${def.name} Lv${s.level}</b> · dmg ${towerDamageNow(s)} · range ${towerRangeNow(s)}${up} <button id="btn-sell">Sell 🪙 ${sellValue(s)}</button>`;
    const upBtn = document.getElementById('btn-up');
    if (upBtn) upBtn.onclick = () => { tryUpgrade(s); };
    document.getElementById('btn-sell').onclick = () => { sellTower(s); };
  } else {
    hud.selInfo.innerHTML = G.placing
      ? `Placing <b>${TOWERS[G.placing].name}</b> — click a grass cell (right-click / Esc to cancel)`
      : 'Click a tower card (or press 1–4), then click a grass cell to build.';
  }
}

function selectPlacing(id) {
  G.placing = id;
  G.selected = null;
  updateHud();
}

function tryPlace(col, row) {
  if (!G.placing) return false;
  const def = TOWERS[G.placing];
  if (!isBuildable(col, row, G.towers)) { floatText(G.fx, col * CELL + CELL / 2, row * CELL + CELL / 2, 'Blocked!', '#ff5252'); return false; }
  if (G.gold < def.cost) { floatText(G.fx, col * CELL + CELL / 2, row * CELL + CELL / 2, 'Need gold!', '#ff5252'); return false; }
  G.gold -= def.cost;
  const t = createTower(G.placing, col, row);
  G.towers.push(t);
  leafBurst(G.fx, t.x, t.y);
  sfx.place();
  updateHud();
  return true;
}

function tryUpgrade(t) {
  if (!canUpgrade(t)) return;
  const cost = getUpgradeCost(t);
  if (G.gold < cost) { floatText(G.fx, t.x, t.y - 20, 'Need gold!', '#ff5252'); return; }
  G.gold -= cost;
  upgradeTower(t);
  burst(G.fx, t.x, t.y, '#ffd93b', 10, 80);
  sfx.upgrade();
  updateHud();
}

function sellTower(t) {
  G.gold += sellValue(t);
  G.towers = G.towers.filter(x => x !== t);
  if (G.selected === t) G.selected = null;
  sfx.sell();
  updateHud();
}

function startWave() {
  if (G.waveActive || G.state !== 'play' || G.wave >= TOTAL_WAVES) return;
  G.wave += 1;
  const q = buildQueue(G.wave);
  G.queue = q.queue;
  G.hpMul = q.hpMul;
  G.waveTotal = q.total;
  G.queueIdx = 0;
  G.waveTime = 0;
  G.waveActive = true;
  const boss = G.queue.some(e => ['goliath', 'queen', 'moleking'].includes(e.id));
  if (boss) sfx.boss(); else sfx.wave();
  updateHud();
}

function endWave() {
  G.waveActive = false;
  const bonus = waveClearBonus(G.wave);
  G.gold += bonus;
  G.score += G.wave * 50;
  floatText(G.fx, 480, 200, `Wave ${G.wave} clear! +🪙${bonus}`, '#ffd93b');
  sfx.clear();
  if (G.wave >= TOTAL_WAVES) {
    winGame();
  } else {
    updateHud();
  }
}

function winGame() {
  G.state = 'win';
  G.score += G.lives * 100;
  saveBest(G.score);
  G.best = loadBest();
  hud.winScore.textContent = fmt(G.score);
  hud.winBest.textContent = fmt(G.best);
  hud.winDetail.textContent = `All 15 waves cleared · ${G.kills} pests squashed · ${G.lives === 1 ? '1 life' : G.lives + ' lives'} left · best ${fmt(G.best)}`;
  hud.win.classList.remove('hidden');
  sfx.win();
  updateHud();
}

function loseGame() {
  G.state = 'over';
  saveBest(G.score);
  G.best = loadBest();
  hud.loseScore.textContent = fmt(G.score);
  hud.loseBest.textContent = fmt(G.best);
  hud.loseDetail.textContent = `The pests overran the garden on wave ${G.wave} · ${G.kills} pests squashed · best ${fmt(G.best)}`;
  hud.lose.classList.remove('hidden');
  sfx.lose();
  updateHud();
}

function resetGame() {
  G.state = 'play';
  G.paused = false;
  G.speed = 1;
  G.time = 0;
  G.gold = START_GOLD;
  G.lives = START_LIVES;
  G.score = 0;
  G.kills = 0;
  G.wave = 0;
  G.waveActive = false;
  G.queue = [];
  G.queueIdx = 0;
  G.towers = [];
  G.enemies = [];
  G.projectiles = [];
  G.fx = makeFx();
  G.best = loadBest();
  G.selected = null;
  G.placing = null;
  G.autoplay = false;
  G.botT = 0;
  hud.title.classList.add('hidden');
  hud.win.classList.add('hidden');
  hud.lose.classList.add('hidden');
  hud.paused.classList.add('hidden');
  updateHud();
}

// ---- combat ----

function spawnEnemy(id) {
  const e = createEnemy(id, G.hpMul);
  G.enemies.push(e);
  return e;
}

function killEnemy(e, award = true) {
  e.dead = true;
  if (award) {
    G.gold += e.def.reward;
    G.score += e.def.reward * 2;
    G.kills += 1;
    burst(G.fx, e.x, e.y, e.def.color, 10, 100);
    floatText(G.fx, e.x, e.y - 12, '+' + e.def.reward, '#ffd93b');
    if (Math.random() < 0.4) sfx.coin();
  }
  for (const kid of splitEnemy(e, G.hpMul)) G.enemies.push(kid);
}

function fireShot(shot) {
  G.projectiles.push({
    x: shot.from.x, y: shot.from.y, px: shot.from.x, py: shot.from.y,
    target: shot.to, speed: 460, dmg: shot.dmg, kind: shot.kind,
    slow: shot.slow, slowDur: shot.slowDur,
    splash: shot.splash, splashMul: shot.splashMul,
    color: shot.color, r: 3,
  });
  if (shot.kind === 'thorn') sfx.thorn();
  else if (shot.kind === 'pumpkin') sfx.splash();
  else if (shot.kind === 'frost') sfx.frost();
  else sfx.shoot();
}

function updateProjectiles(dt) {
  for (const p of G.projectiles) {
    p.px = p.x; p.py = p.y;
    const t = p.target;
    if (!t || t.dead) { p.done = true; continue; }
    const dx = t.x - p.x, dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= Math.max(step, 8)) {
      // Hit!
      damageEnemy(t, p.dmg);
      G.damageDealt += p.dmg;
      if (p.dmg >= 15) floatText(G.fx, t.x, t.y - 14, '-' + p.dmg, '#ffffff');
      if (p.slow) slowEnemy(t, p.slow, p.slowDur);
      if (p.splash) {
        burst(G.fx, t.x, t.y, p.color, 6, 70);
        for (const e of G.enemies) {
          if (e.dead || e === t) continue;
          if (Math.hypot(e.x - t.x, e.y - t.y) <= p.splash) {
            damageEnemy(e, Math.round(p.dmg * p.splashMul));
            G.damageDealt += Math.round(p.dmg * p.splashMul);
          }
        }
      } else {
        burst(G.fx, t.x, t.y, p.color, 3, 50);
      }
      if (t.dead) killEnemy(t);
      p.done = true;
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
  G.projectiles = G.projectiles.filter(p => !p.done);
  // Sweep kills from splash damage (splash may kill non-targets).
  for (const e of [...G.enemies]) {
    if (e.dead && !e.counted) { e.counted = true; killEnemy(e); }
  }
  G.enemies = G.enemies.filter(e => !e.dead);
}

function update(dt) {
  if (G.state !== 'play' || G.paused) return;
  G.time += dt;
  updateFx(G.fx, dt);

  // Spawn from the queue.
  if (G.waveActive) {
    G.waveTime += dt;
    while (G.queueIdx < G.queue.length && G.queue[G.queueIdx].at <= G.waveTime) {
      spawnEnemy(G.queue[G.queueIdx].id);
      G.queueIdx += 1;
    }
  }

  // Towers fire.
  for (const t of G.towers) {
    const shot = updateTower(t, dt, G.enemies);
    if (shot) fireShot(shot);
  }
  updateProjectiles(dt);

  // Pests march, heal, spawn minions, leak.
  healAura(G.enemies, dt);
  for (const e of [...G.enemies]) {
    if (e.dead) continue;
    const ev = updateEnemy(e, dt);
    if (ev.spawn) {
      const m = spawnEnemy(ev.spawn);
      m.dist = Math.max(0, e.dist - 10);
      const pos = { x: e.x, y: e.y };
      m.x = pos.x; m.y = pos.y;
    }
    if (ev.leaked) {
      e.dead = true;
      G.lives -= e.def.leak;
      floatText(G.fx, 900, 220, `-${e.def.leak} ❤`, '#ff5252');
      sfx.leak();
      if (G.lives <= 0) {
        G.lives = 0;
        G.enemies = G.enemies.filter(x => !x.dead);
        updateHud();
        loseGame();
        return;
      }
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead);

  // Wave cleared?
  if (G.waveActive && G.queueIdx >= G.queue.length && G.enemies.length === 0) {
    endWave();
  }

  // Autoplay bot.
  if (G.autoplay) botTick(dt);

  updateHud();
}

// ---- autoplay bot (plays the real economy: places, upgrades, starts waves) ----

function botTick(dt) {
  G.botT += dt;
  if (G.botT < 0.5) return;
  G.botT = 0;
  if (G.state !== 'play' || G.paused) return;

  const count = id => G.towers.filter(t => t.type === id).length;
  const emptySpots = SPOT_CACHE.filter(s => isBuildable(s.col, s.row, G.towers));

  // 1. Once the garden has a backbone, upgrades beat more towers: an
  // upgraded tower hits harder per gold than a fresh level-1 one.
  // Late on, Thorn Lashes are the boss killers — upgrade those first.
  if (G.towers.length >= 10 && G.gold >= 120) {
    const upgradable = G.towers.filter(t => canUpgrade(t))
      .sort((a, b) => {
        if (G.wave >= 13) {
          const ta = a.type === 'thorn' ? 0 : 1, tb = b.type === 'thorn' ? 0 : 1;
          if (ta !== tb) return ta - tb;
        }
        return spotScore(b.col, b.row, 100) - spotScore(a.col, a.row, 100);
      });
    if (upgradable.length > 0) {
      const t = upgradable[0];
      const cost = getUpgradeCost(t);
      if (G.gold >= cost) {
        G.gold -= cost;
        upgradeTower(t);
        burst(G.fx, t.x, t.y, '#ffd93b', 8, 70);
        return;
      }
    }
  }

  // 2. Place a tower if we can afford one and a good spot is open.
  if (emptySpots.length > 0) {
    const spot = emptySpots[0];
    let pick = null;
    const nextWave = G.wave + 1;
    const bossNext = [5, 10, 15].includes(nextWave);
    if (count('daisy') < 3 && G.gold >= TOWERS.daisy.cost) pick = 'daisy';
    else if (count('frost') < 1 && G.gold >= TOWERS.frost.cost && G.wave >= 1) pick = 'frost';
    else if (count('pumpkin') < 1 && G.gold >= TOWERS.pumpkin.cost && G.wave >= 2) pick = 'pumpkin';
    else if (bossNext && count('thorn') < 3 && G.gold >= TOWERS.thorn.cost) pick = 'thorn';
    else if (G.gold >= TOWERS.pumpkin.cost && count('pumpkin') < 6) pick = 'pumpkin';
    else if (G.gold >= TOWERS.daisy.cost && count('daisy') < 12) pick = 'daisy';
    else if (G.gold >= TOWERS.thorn.cost) pick = 'thorn';
    if (pick) {
      const def = TOWERS[pick];
      G.gold -= def.cost;
      const t = createTower(pick, spot.col, spot.row);
      G.towers.push(t);
      leafBurst(G.fx, t.x, t.y);
      return;
    }
  }

  // 3. Upgrade the weakest tower near the path when flush.
  if (G.gold >= 150) {
    const upgradable = G.towers.filter(t => canUpgrade(t))
      .sort((a, b) => spotScore(b.col, b.row, 100) - spotScore(a.col, a.row, 100));
    if (upgradable.length > 0) {
      const t = upgradable[0];
      const cost = getUpgradeCost(t);
      if (G.gold >= cost) {
        G.gold -= cost;
        upgradeTower(t);
        burst(G.fx, t.x, t.y, '#ffd93b', 8, 70);
        return;
      }
    }
  }

  // 4. Start the next wave when the field is clear.
  if (!G.waveActive && G.enemies.length === 0 && G.wave < TOTAL_WAVES) {
    startWave();
  }
}

// ---- input ----

function canvasCell(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
  return { col: Math.floor(x / CELL), row: Math.floor(y / CELL), x, y };
}

canvas.addEventListener('mousemove', ev => {
  const c = canvasCell(ev);
  G.hover = c;
  if (G.placing) {
    // nothing else needed; render draws the ghost
  }
});

canvas.addEventListener('mouseleave', () => { G.hover = null; });

canvas.addEventListener('contextmenu', ev => {
  ev.preventDefault();
  selectPlacing(null);
});

canvas.addEventListener('click', ev => {
  ensureAudio();
  if (G.state !== 'play' || G.paused) return;
  const c = canvasCell(ev);
  if (G.placing) {
    if (tryPlace(c.col, c.row)) {
      // Keep placing while affordable (shift held = place many).
      if (!ev.shiftKey || G.gold < TOWERS[G.placing].cost) selectPlacing(null);
    }
    return;
  }
  const t = G.towers.find(t => t.col === c.col && t.row === c.row);
  G.selected = t || null;
  updateHud();
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { selectPlacing(null); G.selected = null; updateHud(); return; }
  if (G.state === 'title' && (ev.key === 'Enter' || ev.key === ' ')) { ensureAudio(); resetGame(); return; }
  if ((G.state === 'win' || G.state === 'over') && (ev.key === 'Enter' || ev.key === 'r' || ev.key === 'R')) { ensureAudio(); resetGame(); return; }
  if (G.state !== 'play') return;
  const k = ev.key.toLowerCase();
  if (k >= '1' && k <= '4') {
    const id = TOWER_ORDER[Number(k) - 1];
    selectPlacing(G.placing === id ? null : id);
  } else if (k === ' ') { ev.preventDefault(); startWave(); }
  else if (k === 'f') { G.speed = G.speed === 1 ? 2 : 1; updateHud(); }
  else if (k === 'p') { togglePause(); }
  else if (k === 'm') { setMuted(!isMuted()); updateHud(); }
  else if (k === 'r') { resetGame(); }
  else if (k === 'u' && G.selected) { tryUpgrade(G.selected); }
});

function togglePause() {
  if (G.state !== 'play') return;
  G.paused = !G.paused;
  hud.paused.classList.toggle('hidden', !G.paused);
  updateHud();
}

hud.waveBtn.onclick = () => { ensureAudio(); startWave(); };
hud.speedBtn.onclick = () => { G.speed = G.speed === 1 ? 2 : 1; updateHud(); };
hud.pauseBtn.onclick = () => togglePause();
hud.muteBtn.onclick = () => { setMuted(!isMuted()); updateHud(); };
hud.restartBtn.onclick = () => { ensureAudio(); resetGame(); };
$('btn-start').onclick = () => { ensureAudio(); resetGame(); };
$('btn-again-win').onclick = () => { ensureAudio(); resetGame(); };
$('btn-again-lose').onclick = () => { ensureAudio(); resetGame(); };
$('btn-help').onclick = () => { $('help-box').classList.toggle('hidden'); };

// ---- main loop ----

let last = performance.now();
function frame(now) {
  const raw = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dt = raw * (G.state === 'play' && !G.paused ? G.speed : 1);
  update(dt);
  draw(ctx, G, {
    placing: G.placing,
    placingDef: G.placing ? TOWERS[G.placing] : null,
    hover: G.hover,
    hoverOk: G.hover ? isBuildable(G.hover.col, G.hover.row, G.towers) : false,
    selected: G.selected,
  });
  requestAnimationFrame(frame);
}

hud.titleBest.textContent = fmt(G.best);
updateHud();
requestAnimationFrame(frame);

// ---- debug hooks (used by the playtest harness, not by players) ----
window.__game = {
  state() {
    const boss = G.enemies.find(e => e.def.boss);
    return {
      state: G.state, wave: G.wave, gold: Math.floor(G.gold), lives: G.lives,
      score: Math.floor(G.score), kills: G.kills,
      enemies: G.enemies.length, towers: G.towers.length,
      waveActive: G.waveActive, paused: G.paused,
      bossHp: boss ? { hp: boss.hp, max: boss.maxHp, id: boss.id } : null,
    };
  },
  start() { ensureAudio(); resetGame(); },
  autoplay(on) { G.autoplay = !!on; },
  setSpeed(n) { G.speed = n === 4 ? 4 : (n === 2 ? 2 : 1); updateHud(); },
  startWave() { startWave(); },
  place(type, col, row) {
    if (!TOWERS[type]) return false;
    if (G.gold < TOWERS[type].cost) return false;
    if (!isBuildable(col, row, G.towers)) return false;
    G.gold -= TOWERS[type].cost;
    G.towers.push(createTower(type, col, row));
    return true;
  },
  debug() {
    return {
      towers: G.towers.map(t => ({ type: t.type, col: t.col, row: t.row, x: t.x, y: t.y, cd: t.cd, level: t.level })),
      projectiles: G.projectiles.length,
      enemies: G.enemies.slice(0, 3).map(e => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, dist: Math.round(e.dist), dead: e.dead })),
    };
  },
};
