// FLIPBOUND — physics: tile collision, gravity flip, moving platforms.
// The world is a tile grid (32px). Gravity points down (gdir = 1) or up (gdir = -1).
// "Ground" is whatever is solid in the gravity direction.
const TILE = 32;

function makeLevel(grid) {
  // Pad rows to equal width so hand-written maps are forgiving.
  const w = Math.max(...grid.map(r => r.length));
  const rows = grid.map(r => (r + '.'.repeat(w)).slice(0, w));
  return { rows, w, h: rows.length };
}

function tileAt(lv, tx, ty) {
  if (tx < 0 || tx >= lv.w || ty < 0 || ty >= lv.h) return '.';
  return lv.rows[ty][tx];
}

function isSolidTile(ch) { return ch === '#'; }
function isOneWay(ch) { return ch === '='; }

// Solid test for a tile from a given approach (gravity direction).
function tileSolidFor(lv, tx, ty, gdir, fromY) {
  const ch = tileAt(lv, tx, ty);
  if (isSolidTile(ch)) return true;
  if (isOneWay(ch)) {
    // One-way: solid only when crossing its gravity-side face.
    const top = ty * TILE, bot = top + TILE;
    if (gdir === 1) return fromY <= top + 1; // falling down onto it
    return fromY >= bot - 1; // rising up onto it (flipped)
  }
  return false;
}

// Move an AABB (entity with x,y,w,h,vx,vy) through the tile grid.
// Mutates e, sets e.onGround / e.groundY. Returns list of tiles hit.
function moveAndCollide(lv, e, dt) {
  const hit = [];
  // --- horizontal ---
  e.x += e.vx * dt;
  const top = Math.floor(e.y / TILE), bot = Math.floor((e.y + e.h - 1) / TILE);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w) / TILE);
    for (let ty = top; ty <= bot; ty++) {
      if (isSolidTile(tileAt(lv, tx, ty))) { e.x = tx * TILE - e.w - 0.01; e.vx = 0; hit.push('wall'); break; }
    }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = top; ty <= bot; ty++) {
      if (isSolidTile(tileAt(lv, tx, ty))) { e.x = (tx + 1) * TILE + 0.01; e.vx = 0; hit.push('wall'); break; }
    }
  }
  // --- vertical (gravity-aware) ---
  const prevLead = e.gdir === 1 ? e.y + e.h : e.y; // leading edge before the move
  e.y += e.vy * dt;
  e.onGround = false;
  const left = Math.floor((e.x + 1) / TILE), right = Math.floor((e.x + e.w - 1) / TILE);
  if (e.gdir === 1) {
    const ty = Math.floor((e.y + e.h) / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (tileSolidFor(lv, tx, ty, 1, prevLead)) {
        e.y = ty * TILE - e.h - 0.01; e.vy = 0; e.onGround = true; break;
      }
    }
    // head bump on the way up
    if (e.vy < 0) {
      const ty2 = Math.floor(e.y / TILE);
      for (let tx = left; tx <= right; tx++) {
        if (isSolidTile(tileAt(lv, tx, ty2))) { e.y = (ty2 + 1) * TILE + 0.01; e.vy = 0; break; }
      }
    }
  } else {
    const ty = Math.floor(e.y / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (tileSolidFor(lv, tx, ty, -1, prevLead)) {
        e.y = (ty + 1) * TILE + 0.01; e.vy = 0; e.onGround = true; break;
      }
    }
    if (e.vy > 0) {
      const ty2 = Math.floor((e.y + e.h) / TILE);
      for (let tx = left; tx <= right; tx++) {
        if (isSolidTile(tileAt(lv, tx, ty2))) { e.y = ty2 * TILE - e.h - 0.01; e.vy = 0; break; }
      }
    }
  }
  return hit;
}

// AABB overlap test.
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Moving platform: {x,y,w,h,axis,range,speed,phase}. Returns its frame delta.
function updateMover(m, dt, t) {
  const c = Math.sin((t + m.phase) * m.speed) * m.range;
  const nx = m.baseX + (m.axis === 'x' ? c : 0);
  const ny = m.baseY + (m.axis === 'y' ? c : 0);
  const dx = nx - m.x, dy = ny - m.y;
  m.x = nx; m.y = ny;
  return { dx, dy };
}

// Standing on a mover? (player's gravity-side edge rests on the mover's face)
function standingOnMover(p, m) {
  const px = p.x + p.w / 2;
  if (px < m.x - 2 || px > m.x + m.w + 2) return false;
  if (p.gdir === 1) return Math.abs((p.y + p.h) - m.y) < 6 && p.vy >= 0;
  return Math.abs(p.y - (m.y + m.h)) < 6 && p.vy <= 0;
}
