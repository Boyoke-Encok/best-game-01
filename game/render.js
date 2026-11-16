// FLIPBOUND — rendering: parallax sky, neon tiles, entities, HUD, screens.
// All art is drawn in code. Canvas is 960x540; the world is 15 tiles tall (480px)
// with a 30px sky margin top and bottom (WORLD_Y0 = 30).
const VIEW_W = 960, VIEW_H = 540, WORLD_Y0 = 30;

function makeStars(seed) {
  const stars = [];
  let s = seed || 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 110; i++) stars.push({ x: rnd() * 1920, y: rnd() * 420, r: 0.6 + rnd() * 1.6, tw: rnd() * 6.28 });
  return stars;
}

function drawBackground(ctx, lv, camX, t, stars) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, lv.skyTop); g.addColorStop(1, lv.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // stars (parallax 0.2)
  ctx.save();
  for (const s of stars) {
    const x = ((s.x - camX * 0.2) % 1920 + 1920) % 1920 - 480;
    if (x < -4 || x > VIEW_W + 4) continue;
    ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 0.8 + s.tw));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, s.y, s.r, s.r);
  }
  ctx.restore();
  // far ridge (parallax 0.35) and near ridge (0.6): sine mountains
  for (const [par, col, base, amp] of [[0.35, 'rgba(20,16,48,0.55)', 400, 60], [0.6, 'rgba(12,10,34,0.8)', 440, 46]]) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, VIEW_H);
    for (let x = 0; x <= VIEW_W; x += 16) {
      const wx = x + camX * par;
      const y = base + Math.sin(wx * 0.008) * amp + Math.sin(wx * 0.021 + 2) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_W, VIEW_H); ctx.closePath(); ctx.fill();
  }
  // drifting clouds
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 340 + t * 12 - camX * 0.5) % 1300 + 1300) % 1300 - 170;
    const cy = 60 + (i % 3) * 55;
    ctx.beginPath(); ctx.ellipse(cx, cy, 70, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 40, cy + 8, 48, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTiles(ctx, lv, camX) {
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const x1 = Math.min(lv.w - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);
  for (let ty = 0; ty < lv.h; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = lv.rows[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = lv.ground;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = lv.groundTop;
        ctx.fillRect(x, y, TILE, 3);
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
      } else if (ch === '=') {
        ctx.fillStyle = lv.accent;
        ctx.fillRect(x, y, TILE, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, TILE, 2);
      } else if (ch === '^') {
        ctx.fillStyle = '#ff5d7a';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + TILE); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x + 16, y + TILE);
        ctx.moveTo(x + 16, y + TILE); ctx.lineTo(x + 24, y + 8); ctx.lineTo(x + 30, y + TILE);
        ctx.closePath(); ctx.fill();
      } else if (ch === 'v') {
        ctx.fillStyle = '#ff5d7a';
        ctx.beginPath();
        ctx.moveTo(x + 2, y); ctx.lineTo(x + 10, y + TILE - 8); ctx.lineTo(x + 16, y);
        ctx.moveTo(x + 16, y); ctx.lineTo(x + 24, y + TILE - 8); ctx.lineTo(x + 30, y);
        ctx.closePath(); ctx.fill();
      }
    }
  }
}

function drawPickup(ctx, kind, x, y, t) {
  const bob = Math.sin(t * 3 + x * 0.05) * 4;
  if (kind === 'shard') {
    ctx.save(); ctx.translate(x, y + bob); ctx.rotate(Math.sin(t * 2) * 0.3);
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffcf3f'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(4, -4); ctx.lineTo(11, 0); ctx.lineTo(4, 4);
    ctx.lineTo(0, 11); ctx.lineTo(-4, 4); ctx.lineTo(-11, 0); ctx.lineTo(-4, -4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (kind === 'heart') {
    ctx.save(); ctx.translate(x, y + bob);
    ctx.fillStyle = '#ff5d7a'; ctx.shadowColor = '#ff5d7a'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-11, -2, -8, -11, 0, -5);
    ctx.bezierCurveTo(8, -11, 11, -2, 0, 8);
    ctx.fill(); ctx.restore();
  }
}

function drawPortal(ctx, x, y, t, open) {
  ctx.save(); ctx.translate(x, y);
  const pulse = open ? 1 + Math.sin(t * 4) * 0.12 : 0.9;
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = open ? '#7ef0c1' : '#5a6a8a';
  ctx.lineWidth = 4; ctx.shadowColor = open ? '#7ef0c1' : '#000'; ctx.shadowBlur = open ? 18 : 0;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 26, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = open ? 'rgba(126,240,193,0.5)' : 'rgba(90,106,138,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 18, 0, t * 2, t * 2 + Math.PI * 1.4); ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx, p, t) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  // motion trail
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#8ef5ff';
  ctx.beginPath(); ctx.arc(cx - p.vx * 0.03, cy - p.vy * 0.03, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  // squash & stretch
  const sq = p.onGround ? 1 + Math.min(0.18, Math.abs(p.landSquash || 0)) : 1;
  ctx.scale(2 - sq > 1.15 ? 1.15 : 1 / Math.sqrt(sq) * 1.05, sq);
  if (p.gdir === -1) ctx.rotate(Math.PI); // flipped: visor on the other side
  // body
  const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 16);
  g.addColorStop(0, '#bdf6ff'); g.addColorStop(0.5, '#37b6e8'); g.addColorStop(1, '#1c6fa8');
  ctx.fillStyle = g;
  ctx.shadowColor = '#37b6e8'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // visor + eyes
  ctx.fillStyle = '#0b2233';
  ctx.beginPath(); ctx.ellipse(2, -2, 8, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  const look = Math.max(-2, Math.min(2, p.vx * 0.006));
  ctx.beginPath(); ctx.arc(0 + look, -2, 2, 0, Math.PI * 2); ctx.arc(5 + look, -2, 2, 0, Math.PI * 2); ctx.fill();
  // little antenna
  ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -18); ctx.stroke();
  ctx.fillStyle = '#ffe066';
  ctx.beginPath(); ctx.arc(0, -19, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // flip cooldown ring
  if (p.flipCd > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 19, -Math.PI / 2, -Math.PI / 2 + (1 - p.flipCd / p.flipCdMax) * Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(ctx, e, t) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  if (e.kind === 'walker') {
    ctx.fillStyle = '#ff8a5c';
    ctx.shadowColor = '#ff8a5c'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // spikes
    ctx.fillStyle = '#e85d3d';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * 9 - 4, cy - 10); ctx.lineTo(cx + i * 9, cy - 18); ctx.lineTo(cx + i * 9 + 4, cy - 10); ctx.closePath(); ctx.fill();
    }
    // angry eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 4 + e.dir * 2, cy - 2, 2.6, 0, Math.PI * 2); ctx.arc(cx + 4 + e.dir * 2, cy - 2, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c0f0f';
    ctx.beginPath(); ctx.arc(cx - 4 + e.dir * 2, cy - 2, 1.2, 0, Math.PI * 2); ctx.arc(cx + 4 + e.dir * 2, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (e.kind === 'flyer') {
    const flap = Math.sin(e.t * 10) * 6;
    ctx.fillStyle = '#b78cff';
    ctx.shadowColor = '#b78cff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(cx, cy, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(183,140,255,0.8)';
    ctx.beginPath(); ctx.ellipse(cx - 12, cy - 4 - flap * 0.4, 10, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 12, cy - 4 + flap * 0.4, 10, 4, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 3, cy - 1, 2.4, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 1, 2.4, 0, Math.PI * 2); ctx.fill();
  } else if (e.kind === 'turret') {
    ctx.fillStyle = '#5c6b8a';
    ctx.fillRect(e.x, e.y + 8, e.w, e.h - 8);
    ctx.fillStyle = '#8a9bbd';
    ctx.beginPath(); ctx.arc(cx, cy + 2, 11, 0, Math.PI * 2); ctx.fill();
    // barrel toward aim
    ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy + 2); ctx.lineTo(cx + Math.cos(e.aim) * 18, cy + 2 + Math.sin(e.aim) * 18); ctx.stroke();
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath(); ctx.arc(cx, cy + 2, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBoss(ctx, b, t) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const flash = b.flash > 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(b.t * 0.7) * 0.08);
  // outer ring
  ctx.strokeStyle = flash ? '#ffffff' : '#ff5d5d';
  ctx.lineWidth = 5; ctx.shadowColor = '#ff5d5d'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,93,93,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 34, b.t, b.t + Math.PI * 1.5); ctx.stroke();
  // core
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 30);
  g.addColorStop(0, flash ? '#ffffff' : '#ffd166');
  g.addColorStop(0.6, flash ? '#ffe066' : '#ff5d5d');
  g.addColorStop(1, '#7a1030');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // eye (weak point) when open
  if (b.eyeOpen) {
    const ey = b.eyeSide === 1 ? 30 : -30;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, ey, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c6fa8';
    ctx.beginPath(); ctx.arc(0, ey, 6, 0, Math.PI * 2); ctx.fill();
  } else {
    // closed: angry slit
    ctx.strokeStyle = '#1c0f0f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawOrb(ctx, o) {
  ctx.fillStyle = '#ff5d5d';
  ctx.shadowColor = '#ff5d5d'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 2.5, 0, Math.PI * 2); ctx.fill();
}

function drawMover(ctx, m) {
  ctx.fillStyle = '#8a9bbd';
  ctx.fillRect(m.x, m.y, m.w, m.h);
  ctx.fillStyle = '#c8d6f2';
  ctx.fillRect(m.x, m.y, m.w, 3);
  ctx.fillStyle = '#ffe066';
  ctx.fillRect(m.x + 4, m.y + m.h / 2 - 2, m.w - 8, 4);
}

function drawCheckpoint(ctx, c, t, active) {
  const x = c.x + 16, y = c.y + 16;
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = active ? '#7ef0c1' : '#5a6a8a'; ctx.lineWidth = 3;
  ctx.shadowColor = active ? '#7ef0c1' : '#000'; ctx.shadowBlur = active ? 12 : 0;
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 14); ctx.stroke();
  ctx.fillStyle = active ? '#7ef0c1' : '#5a6a8a';
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(16, -12); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---- HUD ----
function drawHUD(ctx, g) {
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // hearts
  for (let i = 0; i < g.maxHearts; i++) {
    const x = 18 + i * 30, y = 16;
    ctx.fillStyle = i < g.hearts ? '#ff5d7a' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 12);
    ctx.bezierCurveTo(x - 2, y + 3, x + 1, y - 5, x + 8, y + 1);
    ctx.bezierCurveTo(x + 15, y - 5, x + 18, y + 3, x + 8, y + 12);
    ctx.fill();
  }
  // shards
  ctx.fillStyle = '#ffe066'; ctx.font = 'bold 20px monospace';
  ctx.fillText('◆ ' + g.shardsGot + '/' + g.shardsTotal, 18, 44);
  // score + combo
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px monospace';
  ctx.fillText('SCORE ' + String(g.score).padStart(6, '0'), 18, 72);
  if (g.combo > 1) {
    ctx.fillStyle = '#ffcf3f'; ctx.font = 'bold 18px monospace';
    ctx.fillText('COMBO ×' + g.combo, 18, 98);
  }
  // level + timer (right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px monospace';
  ctx.fillText(g.level.name, VIEW_W - 18, 16);
  ctx.fillStyle = '#bfe9ff'; ctx.font = '16px monospace';
  ctx.fillText('TIME ' + fmtTime(g.time), VIEW_W - 18, 40);
  ctx.fillStyle = '#ffe066'; ctx.font = '16px monospace';
  ctx.fillText('BEST ' + String(g.best).padStart(6, '0'), VIEW_W - 18, 62);
  ctx.restore();
  // boss bar
  if (g.boss) {
    const bw = 420, bx = (VIEW_W - bw) / 2, by = VIEW_H - 34;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx - 4, by - 4, bw + 8, 20);
    ctx.fillStyle = '#3a1030'; ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = '#ff5d5d'; ctx.fillRect(bx, by, bw * (g.boss.hp / g.boss.maxHp), 12);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('THE GRAVITY CORE', VIEW_W / 2, by - 18);
    ctx.restore();
  }
  // toast message
  if (g.toast && g.toastT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, g.toastT * 2);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px monospace'; ctx.textAlign = 'center';
    ctx.fillText(g.toast, VIEW_W / 2, 118);
    ctx.restore();
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

// ---- screens ----
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,10,28,0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(126,240,193,0.6)'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawTitle(ctx, g, t) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,28,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  // logo
  ctx.fillStyle = '#7ef0c1'; ctx.font = 'bold 64px monospace';
  ctx.shadowColor = '#7ef0c1'; ctx.shadowBlur = 26;
  ctx.fillText('FLIPBOUND', VIEW_W / 2, 108);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe066'; ctx.font = 'bold 20px monospace';
  ctx.fillText('FLIP GRAVITY · GATHER THE SHARDS · BREAK THE CORE', VIEW_W / 2, 168);
  ctx.fillStyle = '#ffffff'; ctx.font = '17px monospace';
  ctx.fillText('A gravity-flip platformer — 5 zones, 1 boss, endless nerve.', VIEW_W / 2, 200);
  // start button
  const pulse = 1 + Math.sin(t * 3) * 0.06;
  ctx.save(); ctx.translate(VIEW_W / 2, 268); ctx.scale(pulse, pulse);
  ctx.fillStyle = '#7ef0c1';
  ctx.fillRect(-130, -24, 260, 48);
  ctx.fillStyle = '#0b2233'; ctx.font = 'bold 22px monospace';
  ctx.fillText('▶  START  (Enter)', 0, -8);
  ctx.restore();
  ctx.fillStyle = '#bfe9ff'; ctx.font = '16px monospace';
  ctx.fillText('← → / A D move      SPACE jump      SHIFT / X flip gravity', VIEW_W / 2, 336);
  ctx.fillText('P pause      M mute      R restart', VIEW_W / 2, 360);
  ctx.fillStyle = '#ffe066'; ctx.font = 'bold 18px monospace';
  ctx.fillText('BEST SCORE  ' + String(g.best).padStart(6, '0'), VIEW_W / 2, 402);
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '14px monospace';
  ctx.fillText('Collect every shard to open the portal. Stomp enemies. Mind the spikes.', VIEW_W / 2, 438);
  ctx.restore();
}

function drawPause(ctx, g) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,28,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px monospace';
  ctx.fillText('PAUSED', VIEW_W / 2, 210);
  ctx.fillStyle = '#bfe9ff'; ctx.font = '17px monospace';
  ctx.fillText('P / Esc — resume      M — mute      R — restart level', VIEW_W / 2, 270);
  ctx.restore();
}

function drawLevelClear(ctx, g) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,28,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ef0c1'; ctx.font = 'bold 40px monospace';
  ctx.fillText('ZONE CLEAR!', VIEW_W / 2, 84);
  ctx.fillStyle = '#ffffff'; ctx.font = '19px monospace';
  ctx.fillText('Time ' + fmtTime(g.time) + '   ·   Time bonus +' + g.timeBonus + '   ·   Score ' + g.score, VIEW_W / 2, 128);
  ctx.fillStyle = '#ffe066'; ctx.font = 'bold 20px monospace';
  ctx.fillText('CHOOSE AN UPGRADE  (press 1 / 2 / 3 or click)', VIEW_W / 2, 172);
  g.upgradeChoices.forEach((u, i) => {
    const x = 180 + i * 220, y = 210, w = 190, h = 150;
    panel(ctx, x, y, w, h);
    ctx.fillStyle = '#ffe066'; ctx.font = 'bold 34px monospace';
    ctx.fillText(u.icon, x + w / 2, y + 26);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px monospace';
    ctx.fillText(u.name, x + w / 2, y + 76);
    ctx.fillStyle = '#bfe9ff'; ctx.font = '14px monospace';
    wrapText(ctx, u.desc, x + w / 2, y + 104, w - 20, 18);
    ctx.fillStyle = '#7ef0c1'; ctx.font = 'bold 15px monospace';
    ctx.fillText('[ ' + (i + 1) + ' ]', x + w / 2, y + 128);
  });
  ctx.restore();
}

function drawGameOver(ctx, g) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,6,12,0.75)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d7a'; ctx.font = 'bold 48px monospace';
  ctx.fillText('GAME OVER', VIEW_W / 2, 200);
  ctx.fillStyle = '#ffffff'; ctx.font = '19px monospace';
  ctx.fillText('Score ' + g.score + '   ·   Reached ' + g.level.name, VIEW_W / 2, 250);
  ctx.fillStyle = '#7ef0c1'; ctx.font = 'bold 20px monospace';
  ctx.fillText('R — retry this zone      Enter — back to title', VIEW_W / 2, 300);
  ctx.restore();
}

function drawVictory(ctx, g) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,12,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe066'; ctx.font = 'bold 52px monospace';
  ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 24;
  ctx.fillText('★ YOU WIN! ★', VIEW_W / 2, 150);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px monospace';
  ctx.fillText('THE GRAVITY CORE IS BROKEN — THE SKY IS YOURS', VIEW_W / 2, 196);
  ctx.fillStyle = '#7ef0c1'; ctx.font = 'bold 20px monospace';
  ctx.fillText('FINAL SCORE  ' + g.score, VIEW_W / 2, 244);
  ctx.fillStyle = '#ffe066'; ctx.font = '19px monospace';
  ctx.fillText('BEST  ' + String(g.best).padStart(6, '0') + (g.newBest ? '   — NEW BEST!' : ''), VIEW_W / 2, 276);
  ctx.fillStyle = '#bfe9ff'; ctx.font = '17px monospace';
  ctx.fillText('Shards ' + g.totalShards + '   ·   Time ' + fmtTime(g.totalTime), VIEW_W / 2, 308);
  ctx.fillStyle = '#7ef0c1'; ctx.font = 'bold 20px monospace';
  ctx.fillText('R — play again      Enter — back to title', VIEW_W / 2, 356);
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, cx, yy);
}
