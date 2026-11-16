// EMBERFALL — all drawing: arena, entities, HUD, menus, cards.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, BOSS_TIME, WEAPONS } from './defs.js';
import { drawFx } from './fx.js';

function fmtTime(t) {
  const s = Math.floor(t);
  return String(Math.floor(s / 60)).padStart(1, '0') + ':' + String(s % 60).padStart(2, '0');
}

export function drawBackground(ctx, camX, camY, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#120e28');
  g.addColorStop(1, '#0a0817');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // starfield (deterministic dots)
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const sx = ((i * 173) % WORLD_W) - camX;
    const sy = ((i * 311) % WORLD_H) - camY;
    if (sx < -4 || sx > VIEW_W + 4 || sy < -4 || sy > VIEW_H + 4) continue;
    ctx.globalAlpha = 0.15 + 0.25 * ((i * 7) % 10) / 10;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // arena floor grid
  ctx.strokeStyle = 'rgba(125, 240, 193, 0.06)';
  ctx.lineWidth = 1;
  const step = 80;
  for (let x = Math.floor(camX / step) * step; x < camX + VIEW_W; x += step) {
    ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, VIEW_H); ctx.stroke();
  }
  for (let y = Math.floor(camY / step) * step; y < camY + VIEW_H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(VIEW_W, y - camY); ctx.stroke();
  }
  // glowing runes scattered on the floor
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.12)';
  for (let i = 0; i < 24; i++) {
    const rx = ((i * 397) % WORLD_W) - camX;
    const ry = ((i * 251) % WORLD_H) - camY;
    if (rx < -20 || rx > VIEW_W + 20 || ry < -20 || ry > VIEW_H + 20) continue;
    ctx.beginPath();
    ctx.arc(rx, ry, 14 + (i % 3) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // arena bounds
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-camX, -camY, WORLD_W, WORLD_H);
}

function drawEnemy(ctx, e, camX, camY, t) {
  const x = e.x - camX, y = e.y - camY;
  if (x < -60 || x > VIEW_W + 60 || y < -60 || y > VIEW_H + 60) return;
  const flash = e.flashT > 0;
  ctx.save();
  ctx.translate(x, y);
  if (e.elite) {
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  if (e.shape === 'tri') {
    ctx.rotate(Math.atan2(e.vy || 0, e.vx || 1));
    ctx.beginPath(); ctx.moveTo(e.r, 0); ctx.lineTo(-e.r, -e.r * 0.8); ctx.lineTo(-e.r, e.r * 0.8); ctx.closePath(); ctx.fill();
  } else if (e.shape === 'square') {
    ctx.rotate(Math.sin(e.wob || 0) * 0.15);
    ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
  } else if (e.shape === 'boss') {
    // the Hollow King: horned crown + burning eye
    ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.moveTo(-e.r * 0.7, -e.r * 0.6); ctx.lineTo(-e.r * 0.3, -e.r * 1.25); ctx.lineTo(-e.r * 0.1, -e.r * 0.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(e.r * 0.7, -e.r * 0.6); ctx.lineTo(e.r * 0.3, -e.r * 1.25); ctx.lineTo(e.r * 0.1, -e.r * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.1, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.r * 0.35, -e.r * 0.1, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff2e63';
    ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.r * 0.35, -e.r * 0.1, 3, 0, Math.PI * 2); ctx.fill();
  } else {
    // blob: wobbling circle with eyes
    const wob = 1 + Math.sin((e.wob || 0) * 2) * 0.08;
    ctx.beginPath(); ctx.arc(0, 0, e.r * wob, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0817';
    ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.2, e.r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.r * 0.35, -e.r * 0.2, e.r * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // hp bar for hurt brutes/elites/boss
  if ((e.maxHp > 40 || e.elite) && e.hp < e.maxHp && e.type !== 'boss') {
    const w = e.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - w / 2, y - e.r - 10, w, 4);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(x - w / 2, y - e.r - 10, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}

function drawPlayer(ctx, p, camX, camY, t) {
  const x = p.x - camX, y = p.y - camY;
  ctx.save();
  ctx.translate(x, y);
  // ember aura
  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
  aura.addColorStop(0, 'rgba(255, 179, 71, 0.5)');
  aura.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  // body: flame sprite
  const flick = 1 + Math.sin(t * 9) * 0.08;
  ctx.fillStyle = p.invuln > 0 && Math.floor(t * 12) % 2 === 0 ? '#ffffff' : '#ffb347';
  ctx.beginPath();
  ctx.arc(0, 0, p.r * flick, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.arc(0, -2, p.r * 0.62 * flick, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#0a0817';
  ctx.beginPath(); ctx.arc(-5 * p.face, -3, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5 * p.face, -3, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBlades(ctx, G, camX, camY) {
  const w = G.weapons.blades;
  if (!w) return;
  const st = { count: 2 + (w.level - 1), radius: 95 + 14 * (w.level - 1) };
  const p = G.player;
  for (let i = 0; i < st.count; i++) {
    const a = (w.angle || 0) + (i / st.count) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * st.radius - camX;
    const by = p.y + Math.sin(a) * st.radius - camY;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = '#7df0c1';
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

export function drawGame(ctx, G, t) {
  const camX = G.camX + (G.fx.shakeX || 0);
  const camY = G.camY + (G.fx.shakeY || 0);
  drawBackground(ctx, camX, camY, t);
  // XP gems
  for (const g of G.gems) {
    const x = g.x - camX, y = g.y - camY;
    if (x < -10 || x > VIEW_W + 10 || y < -10 || y > VIEW_H + 10) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = g.v >= 5 ? '#7df0c1' : '#4dd8ff';
    const s = g.v >= 5 ? 8 : 5;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  // hearts
  for (const h of G.hearts) {
    const x = h.x - camX, y = h.y - camY;
    ctx.fillStyle = '#ff5d7a';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('♥', x, y + 6);
  }
  // novas
  for (const n of G.novas) {
    const a = 0.5 * (n.life / n.max);
    ctx.strokeStyle = `rgba(143, 211, 255, ${a + 0.3})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(n.x - camX, n.y - camY, n.r * (1 - n.life / n.max * 0.3), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(143, 211, 255, ${a * 0.4})`;
    ctx.beginPath(); ctx.arc(n.x - camX, n.y - camY, n.r, 0, Math.PI * 2); ctx.fill();
  }
  // enemies
  for (const e of G.enemies) drawEnemy(ctx, e, camX, camY, t);
  // projectiles
  for (const pr of G.projs) {
    const x = pr.x - camX, y = pr.y - camY;
    ctx.fillStyle = pr.color;
    ctx.beginPath(); ctx.arc(x, y, pr.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x, y, pr.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  // boss bullets
  for (const b of G.bullets) {
    const x = b.x - camX, y = b.y - camY;
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, b.r + 2, 0, Math.PI * 2); ctx.stroke();
  }
  // chain zaps
  ctx.strokeStyle = '#e6d6ff';
  ctx.lineWidth = 2.5;
  for (const z of G.zaps) {
    ctx.globalAlpha = Math.min(1, z.life / 0.1);
    ctx.beginPath();
    const mx = (z.x1 + z.x2) / 2 - camX + (Math.random() * 16 - 8);
    const my = (z.y1 + z.y2) / 2 - camY + (Math.random() * 16 - 8);
    ctx.moveTo(z.x1 - camX, z.y1 - camY);
    ctx.lineTo(mx, my);
    ctx.lineTo(z.x2 - camX, z.y2 - camY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  drawBlades(ctx, G, camX, camY);
  drawPlayer(ctx, G.player, camX, camY, t);
  drawFx(ctx, G.fx, camX, camY);
  drawHud(ctx, G, t);
}

function drawHud(ctx, G, t) {
  const p = G.player;
  // XP bar (top)
  const xpFrac = p.xp / p.xpNeed;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, VIEW_W, 10);
  ctx.fillStyle = '#4dd8ff';
  ctx.fillRect(0, 0, VIEW_W * xpFrac, 10);
  // HP bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 22, 220, 16);
  ctx.fillStyle = p.hp / p.maxHp > 0.3 ? '#ff5d5d' : '#ff2e63';
  ctx.fillRect(14, 22, 220 * Math.max(0, p.hp / p.maxHp), 16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 22, 220, 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}`, 20, 34);
  // level + timer
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#ffd76a';
  const remain = Math.max(0, BOSS_TIME - G.time);
  ctx.fillText(G.bossSpawned ? 'BOSS' : fmtTime(remain), VIEW_W / 2, 34);
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`LEVEL ${p.level}`, VIEW_W / 2, 52);
  // kills + score + combo
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`SCORE ${G.score}`, VIEW_W - 14, 30);
  ctx.fillText(`KILLS ${p.kills}`, VIEW_W - 14, 48);
  if (p.mult > 1) {
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`COMBO x${p.mult}`, VIEW_W - 14, 68);
  }
  // weapon icons bottom-left
  ctx.textAlign = 'left';
  let wx = 14;
  for (const id of Object.keys(G.weapons)) {
    const w = G.weapons[id];
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(wx, VIEW_H - 34, 34, 26);
    ctx.fillStyle = WEAPONS[id].color;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(WEAPONS[id].icon, wx + 4, VIEW_H - 15);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Lv' + w.level, wx + 20, VIEW_H - 15);
    wx += 40;
  }
  // boss HP bar
  const boss = G.enemies.find(e => e.type === 'boss');
  if (boss) {
    const w = 420;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(VIEW_W / 2 - w / 2, 60, w, 14);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(VIEW_W / 2 - w / 2, 60, w * Math.max(0, boss.hp / boss.maxHp), 14);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(VIEW_W / 2 - w / 2, 60, w, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE HOLLOW KING', VIEW_W / 2, 56);
  }
  // boss warning
  if (G.bossWarn > 0) {
    ctx.fillStyle = '#ff2e63';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE HOLLOW KING APPROACHES…', VIEW_W / 2, 120);
  }
}

export function drawTitle(ctx, G, best) {
  drawBackground(ctx, 300, 300, 0);
  ctx.fillStyle = 'rgba(10, 8, 23, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('EMBERFALL', VIEW_W / 2, 150);
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SURVIVE THE HOLLOW NIGHT — SLAY THE KING AT 8:00', VIEW_W / 2, 188);
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';
  ctx.fillText('Weapons fire on their own. You move. You dodge. You choose.', VIEW_W / 2, 224);
  ctx.fillText('Collect ember gems, level up, pick 1 of 3 upgrades.', VIEW_W / 2, 248);
  ctx.fillStyle = '#7df0c1';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('▶  START  (Enter)', VIEW_W / 2, 310);
  ctx.fillStyle = '#9d98c4';
  ctx.font = '14px monospace';
  ctx.fillText('← → / A D move    P pause    M mute    R restart', VIEW_W / 2, 352);
  ctx.fillText('5 weapons · 8 passives · elites every minute · boss at 8:00', VIEW_W / 2, 378);
  if (best > 0) {
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('BEST SCORE  ' + best, VIEW_W / 2, 420);
  }
  ctx.fillStyle = '#6f6a94';
  ctx.font = '12px monospace';
  ctx.fillText('EMBERFALL — Arrows/WASD move · Space not needed, weapons fire on their own · P pause · M mute · R restart', VIEW_W / 2, 500);
}

export function drawLevelUp(ctx, G) {
  ctx.fillStyle = 'rgba(10, 8, 23, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('LEVEL UP — CHOOSE ONE', VIEW_W / 2, 90);
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';
  ctx.fillText('Level ' + G.player.level + '  ·  click a card or press 1 / 2 / 3', VIEW_W / 2, 118);
  G.cardRects = [];
  const cw = 250, ch = 210, gap = 24;
  const total = cw * 3 + gap * 2;
  const x0 = (VIEW_W - total) / 2;
  const y0 = 150;
  G.cards.forEach((c, i) => {
    const x = x0 + i * (cw + gap);
    G.cardRects.push({ x, y: y0, w: cw, h: ch, i });
    ctx.fillStyle = 'rgba(20, 16, 44, 0.95)';
    ctx.fillRect(x, y0, cw, ch);
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y0, cw, ch);
    ctx.fillStyle = c.color;
    ctx.font = 'bold 40px monospace';
    ctx.fillText(c.icon, x + cw / 2, y0 + 62);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(c.title, x + cw / 2, y0 + 102);
    ctx.fillStyle = '#cfcbe8';
    ctx.font = '13px monospace';
    wrapText(ctx, c.text, x + cw / 2, y0 + 130, cw - 28, 18);
    ctx.fillStyle = '#6f6a94';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('[' + (i + 1) + ']', x + cw / 2, y0 + ch - 16);
  });
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10, 8, 23, 0.65)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '15px monospace';
  ctx.fillStyle = '#9d98c4';
  ctx.fillText('P resume   ·   R restart   ·   M mute', VIEW_W / 2, VIEW_H / 2 + 24);
}

export function drawEnd(ctx, G, best, won) {
  ctx.fillStyle = 'rgba(10, 8, 23, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = '#7df0c1';
    ctx.font = 'bold 54px monospace';
    ctx.fillText('★ YOU WIN! ★', VIEW_W / 2, 130);
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.fillText('THE HOLLOW KING IS BROKEN — THE NIGHT IS YOURS', VIEW_W / 2, 168);
  } else {
    ctx.fillStyle = '#ff5d5d';
    ctx.font = 'bold 54px monospace';
    ctx.fillText('YOU FELL', VIEW_W / 2, 130);
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.fillText('THE HOLLOW NIGHT CLAIMS ANOTHER EMBER', VIEW_W / 2, 168);
  }
  const p = G.player;
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('FINAL SCORE  ' + G.score, VIEW_W / 2, 230);
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.fillText(`BEST  ${Math.max(best, G.score)}${G.score >= best && G.score > 0 ? '  —  NEW BEST!' : ''}`, VIEW_W / 2, 262);
  ctx.fillText(`Kills ${p.kills}   ·   Level ${p.level}   ·   Time ${fmtTime(G.time)}`, VIEW_W / 2, 292);
  ctx.fillStyle = '#7df0c1';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('R — play again        Enter — back to title', VIEW_W / 2, 350);
}
