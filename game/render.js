// SPROUT SIEGE — canvas rendering: garden, path, towers, pests, projectiles.
import { COLS, ROWS, CELL, W, H, BASE_CELL, DECOR } from './defs.js';
import { cellCenter, pathPixels, isPathCell, decorAt } from './path.js';
import { towerRangeNow } from './towers.js';
import { drawFx } from './fx.js';

// Deterministic flower specks so the grass is never bare.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function draw(ctx, G, view) {
  ctx.clearRect(0, 0, W, H);
  drawGrass(ctx);
  drawDecor(ctx);
  drawPath(ctx);
  drawBase(ctx, G);
  drawSpawn(ctx);
  drawTowers(ctx, G, view);
  drawEnemies(ctx, G);
  drawProjectiles(ctx, G);
  drawFx(ctx, G.fx);
  drawPlacement(ctx, G, view);
  drawSelected(ctx, G, view);
}

function drawGrass(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? '#4a8a3f' : '#43803a';
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      const h = hash2(col, row);
      if (h > 0.86) {
        ctx.fillStyle = h > 0.93 ? '#ffd93b' : '#ffffff';
        ctx.beginPath();
        ctx.arc(col * CELL + 10 + h * 20, row * CELL + 8 + h * 22, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawDecor(ctx) {
  for (const [col, row, kind] of DECOR) {
    const c = cellCenter(col, row);
    if (kind === 'pond') {
      ctx.fillStyle = '#5aa9e6';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 19, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8ecdf5';
      ctx.beginPath();
      ctx.ellipse(c.x - 4, c.y - 3, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'rock') {
      ctx.fillStyle = '#8d8d8d';
      ctx.beginPath();
      ctx.arc(c.x, c.y + 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b5b5b5';
      ctx.beginPath();
      ctx.arc(c.x - 3, c.y - 1, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff8fab';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(a) * 9, c.y + Math.sin(a) * 9, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd93b';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPath(ctx) {
  const pts = pathPixels();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#8a6a42';
  ctx.lineWidth = CELL * 0.95;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.strokeStyle = '#b98a4e';
  ctx.lineWidth = CELL * 0.78;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  // Dashes down the middle so the route reads at a glance.
  ctx.strokeStyle = 'rgba(138,106,66,0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSpawn(ctx) {
  const c = cellCenter(0, 5);
  ctx.fillStyle = '#2d1f14';
  ctx.beginPath();
  ctx.ellipse(c.x - CELL / 2 + 6, c.y, 14, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3520';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PEST', c.x - CELL / 2 + 6, c.y - 30);
}

function drawBase(ctx, G) {
  const c = cellCenter(BASE_CELL.col, BASE_CELL.row);
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a67c00';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Sprout: two leaves + stem.
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y + 8);
  ctx.quadraticCurveTo(c.x, c.y - 2, c.x, c.y - 10);
  ctx.stroke();
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.ellipse(c.x - 7, c.y - 8, 7, 4, -0.6, 0, Math.PI * 2);
  ctx.ellipse(c.x + 7, c.y - 8, 7, 4, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5c00';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', c.x, c.y + 30);
}

function towerBase(ctx, t, def) {
  ctx.fillStyle = '#3e7a34';
  ctx.beginPath();
  ctx.arc(t.x, t.y + 8, 13, 0, Math.PI * 2);
  ctx.fill();
}

function drawTowers(ctx, G, view) {
  for (const t of G.towers) {
    const def = { daisy: '#ffd93b', thorn: '#b678e8', frost: '#7fe3f0', pumpkin: '#ff8c42' }[t.type];
    towerBase(ctx, t, def);
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.type === 'daisy') {
      ctx.fillStyle = '#fff3b0';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 6, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === 'thorn') {
      ctx.fillStyle = '#b678e8';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 14 : 7;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e3c6ff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === 'frost') {
      ctx.fillStyle = '#7fe3f0';
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 7, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e0f7fa';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d35400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(0, 11);
      ctx.moveTo(-8, -8);
      ctx.lineTo(-8, 8);
      ctx.moveTo(8, -8);
      ctx.lineTo(8, 8);
      ctx.stroke();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(3, -17, 7, -16);
      ctx.stroke();
    }
    ctx.restore();
    // Level pips.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < t.level; i++) {
      ctx.beginPath();
      ctx.arc(t.x - 8 + i * 8, t.y + 16, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Muzzle flash ring.
    if (t.flash > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 15 + (0.12 - t.flash) * 60, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawEnemies(ctx, G) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    const bob = e.def.flying ? Math.sin(G.time * 6 + e.uid) * 3 : 0;
    const x = e.x, y = e.y + bob;
    ctx.save();
    ctx.translate(x, y);
    // Slow tint.
    if (e.slowT > 0) {
      ctx.strokeStyle = 'rgba(127,227,240,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.hitFlash > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = e.def.color;
    if (e.id === 'aphid' || e.id === 'mite' || e.id === 'mitelet') {
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.25 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * e.r * 0.6, Math.sin(a) * e.r * 0.6);
        ctx.lineTo(Math.cos(a) * (e.r + 4), Math.sin(a) * (e.r + 4));
        ctx.stroke();
      }
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-3, -3, 1.8, 0, Math.PI * 2);
      ctx.arc(3, -3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.id === 'beetle' || e.id === 'goliath') {
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r, e.r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5c1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.7, 0);
      ctx.lineTo(e.r * 0.7, 0);
      ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(e.r * 0.55, -3, 2, 0, Math.PI * 2);
      ctx.arc(e.r * 0.55, 3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.id === 'snail') {
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a5c2e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.55, 0, Math.PI * 4.5);
      ctx.stroke();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.r * 0.6, -e.r * 0.5);
      ctx.lineTo(e.r * 0.8, -e.r - 2);
      ctx.moveTo(e.r * 0.3, -e.r * 0.6);
      ctx.lineTo(e.r * 0.4, -e.r - 2);
      ctx.stroke();
    } else if (e.id === 'locust' || e.id === 'queen') {
      const flap = Math.sin(G.time * 14 + e.uid) * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.ellipse(-e.r * 0.5, -e.r * 0.7 + flap * 4, e.r * 0.7, e.r * 0.3, -0.5, 0, Math.PI * 2);
      ctx.ellipse(e.r * 0.5, -e.r * 0.7 - flap * 4, e.r * 0.7, e.r * 0.3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r, e.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(e.r * 0.6, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.id === 'nurse') {
      ctx.beginPath();
      ctx.arc(-e.r * 0.55, 0, e.r * 0.5, 0, Math.PI * 2);
      ctx.arc(0, 0, e.r * 0.55, 0, Math.PI * 2);
      ctx.arc(e.r * 0.55, 0, e.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
    } else if (e.id === 'moleking') {
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r, e.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d2b1f';
      ctx.beginPath();
      ctx.arc(-e.r * 0.4, -e.r * 0.2, 3, 0, Math.PI * 2);
      ctx.arc(e.r * 0.4, -e.r * 0.2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, e.r * 0.25, e.r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      // Crown.
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-12, -e.r * 0.75);
      ctx.lineTo(-8, -e.r - 6);
      ctx.lineTo(-4, -e.r * 0.75);
      ctx.lineTo(0, -e.r - 8);
      ctx.lineTo(4, -e.r * 0.75);
      ctx.lineTo(8, -e.r - 6);
      ctx.lineTo(12, -e.r * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Boss crown for goliath/queen + HP bar.
    if (e.def.boss && (e.id === 'goliath' || e.id === 'queen')) {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(x - 10, y - e.r - 2);
      ctx.lineTo(x - 6, y - e.r - 9);
      ctx.lineTo(x - 2, y - e.r - 2);
      ctx.lineTo(x + 2, y - e.r - 10);
      ctx.lineTo(x + 6, y - e.r - 2);
      ctx.lineTo(x + 10, y - e.r - 9);
      ctx.lineTo(x + 14, y - e.r - 2);
      ctx.closePath();
      ctx.fill();
    }
    if (e.hp < e.maxHp) {
      const w = Math.max(24, e.r * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - w / 2, y - e.r - 14, w, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7ed957' : '#ff5252';
      ctx.fillRect(x - w / 2, y - e.r - 14, w * (e.hp / e.maxHp), 5);
    }
  }
}

function drawProjectiles(ctx, G) {
  for (const p of G.projectiles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r || 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlacement(ctx, G, view) {
  if (!view.placing || !view.hover) return;
  const def = view.placingDef;
  const ok = view.hoverOk;
  const c = cellCenter(view.hover.col, view.hover.row);
  ctx.fillStyle = ok ? 'rgba(126,217,87,0.35)' : 'rgba(255,82,82,0.35)';
  ctx.fillRect(view.hover.col * CELL, view.hover.row * CELL, CELL, CELL);
  ctx.strokeStyle = ok ? '#7ed957' : '#ff5252';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, def.range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSelected(ctx, G, view) {
  const t = view.selected;
  if (!t) return;
  const r = towerRangeNow(t);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(t.col * CELL + 2, t.row * CELL + 2, CELL - 4, CELL - 4);
}
