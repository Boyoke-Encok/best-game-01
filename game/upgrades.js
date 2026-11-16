// EMBERFALL — level-up cards: build the choice of 3, apply the pick.
import { WEAPONS, PASSIVES } from './defs.js';

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build 3 distinct upgrade offers from what the player can still take.
export function rollCards(G) {
  const pool = [];
  for (const id of Object.keys(WEAPONS)) {
    const w = G.weapons[id];
    if (!w && Object.keys(G.weapons).length < 4) {
      pool.push({ kind: 'weapon', id, level: 1, title: WEAPONS[id].name, icon: WEAPONS[id].icon, color: WEAPONS[id].color, text: 'NEW — ' + WEAPONS[id].desc });
    } else if (w && w.level < WEAPONS[id].max) {
      pool.push({ kind: 'weapon', id, level: w.level + 1, title: WEAPONS[id].name + ' Lv' + (w.level + 1), icon: WEAPONS[id].icon, color: WEAPONS[id].color, text: 'Stronger ' + WEAPONS[id].name.toLowerCase() + '.' });
    }
  }
  for (const id of Object.keys(PASSIVES)) {
    const lv = G.passives[id] || 0;
    if (lv < PASSIVES[id].max) {
      pool.push({ kind: 'passive', id, level: lv + 1, title: PASSIVES[id].name + ' Lv' + (lv + 1), icon: PASSIVES[id].icon, color: '#ffd76a', text: PASSIVES[id].desc });
    }
  }
  shuffle(pool);
  return pool.slice(0, 3);
}

export function applyCard(G, card) {
  if (!card) return;
  if (card.kind === 'weapon') {
    const def = WEAPONS[card.id];
    const cur = G.weapons[card.id];
    if (!cur) {
      G.weapons[card.id] = { level: 1, cd: 0, angle: 0 };
      if (card.id === 'blades') G.weapons[card.id].blades = [];
    } else {
      cur.level = Math.min(def.max, cur.level + 1);
    }
  } else {
    G.passives[card.id] = (G.passives[card.id] || 0) + 1;
    if (card.id === 'vitality') {
      G.player.maxHp += 25;
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + 25);
    }
  }
}

export function weaponStats(id, level) {
  const def = WEAPONS[id];
  const s = { ...def.base };
  const pl = def.perLevel;
  for (const k of Object.keys(pl)) {
    if (k === 'count' || k === 'targets') s[k] = def.base[k] + pl[k] * (level - 1);
    else if (k === 'cd') s[k] = Math.max(0.15, def.base[k] + pl[k] * (level - 1));
    else s[k] = def.base[k] + pl[k] * (level - 1);
  }
  return s;
}
