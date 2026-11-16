// Particles, floating score text and shockwave rings. One fixed pool, reused
// every frame, so the hot loop never allocates: spawn functions take a dead
// particle from the pool and fill it in.
const POOL_SIZE = 320;
const TEXT_POOL_SIZE = 24;

export function createEffects() {
  const particles = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', drag: 1 });
  }
  const texts = [];
  for (let i = 0; i < TEXT_POOL_SIZE; i += 1) {
    texts.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#ffffff', size: 14 });
  }
  const rings = [];
  for (let i = 0; i < 8; i += 1) {
    rings.push({ alive: false, x: 0, y: 0, radius: 0, maxRadius: 1, life: 0, maxLife: 1, color: '#ffffff', width: 3 });
  }
  return { particles, texts, rings };
}

function take(pool) {
  for (let i = 0; i < pool.length; i += 1) {
    if (!pool[i].alive) return pool[i];
  }
  return pool[0];
}

export function spawnParticles(effects, x, y, color, count, speed, size, life) {
  for (let i = 0; i < count; i += 1) {
    const p = take(effects.particles);
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * v;
    p.vy = Math.sin(angle) * v;
    p.maxLife = life * (0.6 + Math.random() * 0.6);
    p.life = p.maxLife;
    p.size = size * (0.6 + Math.random() * 0.8);
    p.color = color;
    p.drag = 0.92;
  }
}

export function spawnText(effects, x, y, text, color, size = 14) {
  const t = take(effects.texts);
  t.alive = true;
  t.x = x;
  t.y = y;
  t.maxLife = 0.9;
  t.life = t.maxLife;
  t.text = text;
  t.color = color;
  t.size = size;
}

export function spawnRing(effects, x, y, maxRadius, color, width = 4) {
  const r = take(effects.rings);
  r.alive = true;
  r.x = x;
  r.y = y;
  r.radius = 8;
  r.maxRadius = maxRadius;
  r.maxLife = 0.5;
  r.life = r.maxLife;
  r.color = color;
  r.width = width;
}

export function updateEffects(effects, dt) {
  for (let i = 0; i < effects.particles.length; i += 1) {
    const p = effects.particles[i];
    if (!p.alive) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.alive = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
  }
  for (let i = 0; i < effects.texts.length; i += 1) {
    const t = effects.texts[i];
    if (!t.alive) continue;
    t.life -= dt;
    if (t.life <= 0) t.alive = false;
    else t.y -= 34 * dt;
  }
  for (let i = 0; i < effects.rings.length; i += 1) {
    const r = effects.rings[i];
    if (!r.alive) continue;
    r.life -= dt;
    if (r.life <= 0) {
      r.alive = false;
      continue;
    }
    const t = 1 - r.life / r.maxLife;
    r.radius = 8 + (r.maxRadius - 8) * t;
  }
}

export function clearEffects(effects) {
  for (const p of effects.particles) p.alive = false;
  for (const t of effects.texts) t.alive = false;
  for (const r of effects.rings) r.alive = false;
}
