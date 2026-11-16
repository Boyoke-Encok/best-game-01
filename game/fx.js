// EMBERFALL — particles, floating damage numbers, screen shake.
export function makeFx() {
  return { parts: [], texts: [], shake: 0, shakeX: 0, shakeY: 0 };
}

export function burst(fx, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 160) * (0.3 + Math.random() * 0.7);
    fx.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.35, max: 0.7, color,
      size: 2 + Math.random() * 3,
    });
  }
  if (fx.parts.length > 400) fx.parts.splice(0, fx.parts.length - 400);
}

export function floatText(fx, x, y, text, color, big) {
  fx.texts.push({ x, y, text, color: color || '#fff', life: 0.8, big: !!big });
  if (fx.texts.length > 60) fx.texts.splice(0, fx.texts.length - 60);
}

export function addShake(fx, amount) {
  fx.shake = Math.min(14, fx.shake + amount);
}

export function updateFx(fx, dt) {
  for (let i = fx.parts.length - 1; i >= 0; i--) {
    const p = fx.parts[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    if (p.life <= 0) fx.parts.splice(i, 1);
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    t.y -= 42 * dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  fx.shake = Math.max(0, fx.shake - dt * 30);
  fx.shakeX = (Math.random() * 2 - 1) * fx.shake;
  fx.shakeY = (Math.random() * 2 - 1) * fx.shake;
}

export function drawFx(ctx, fx, camX, camY) {
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - camX - p.size / 2, p.y - camY - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, t.life / 0.4);
    ctx.font = t.big ? 'bold 17px monospace' : 'bold 12px monospace';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x - camX, t.y - camY);
  }
  ctx.globalAlpha = 1;
}
