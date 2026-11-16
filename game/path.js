// SPROUT SIEGE — the winding dirt path: geometry, buildable cells, spot scores.
import { COLS, ROWS, CELL, PATH_POINTS, BASE_CELL, DECOR } from './defs.js';

export function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

// Pixel waypoints for the path, including the off-screen entry and exit.
export function pathPixels() {
  return PATH_POINTS.map(([c, r]) => cellCenter(c, r));
}

export function pathLength() {
  const pts = pathPixels();
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

// Distance from a point to one segment.
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Shortest distance from a point to the whole path.
export function distToPath(x, y) {
  const pts = pathPixels();
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    best = Math.min(best, distToSeg(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
  }
  return best;
}

// Position along the path at distance d from the entry (for enemy movement).
export function pointAt(d) {
  const pts = pathPixels();
  let rest = d;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (rest <= seg) {
      const t = seg === 0 ? 0 : rest / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    rest -= seg;
  }
  return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
}

// The set of grid cells the path runs through (a cell counts if its center
// is within half a cell of the path line).
export function pathCells() {
  const set = new Set();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const c = cellCenter(col, row);
      if (distToPath(c.x, c.y) <= CELL * 0.55) set.add(col + ',' + row);
    }
  }
  return set;
}

const PATH_SET = pathCells();
const DECOR_MAP = new Map(DECOR.map(([c, r, kind]) => [c + ',' + r, kind]));

export function decorAt(col, row) {
  return DECOR_MAP.get(col + ',' + row) || null;
}

export function isPathCell(col, row) {
  return PATH_SET.has(col + ',' + row);
}

export function isBuildable(col, row, towers) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (isPathCell(col, row)) return false;
  if (DECOR_MAP.has(col + ',' + row)) return false;
  if (col === BASE_CELL.col && row === BASE_CELL.row) return false;
  if (towers.some(t => t.col === col && t.row === row)) return false;
  return true;
}

// How good a cell is for a tower: how much path length falls inside a
// reference range circle around it. Bends score highest. Used by the bot
// and shown to the player as a subtle hint ring on hover.
export function spotScore(col, row, range = 100) {
  const c = cellCenter(col, row);
  const pts = pathPixels();
  let covered = 0;
  const STEP = 8;
  for (let i = 1; i < pts.length; i++) {
    const segLen = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const n = Math.max(1, Math.floor(segLen / STEP));
    for (let s = 0; s <= n; s++) {
      const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * (s / n);
      const y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * (s / n);
      if (Math.hypot(x - c.x, y - c.y) <= range) covered += STEP;
    }
  }
  return covered;
}
