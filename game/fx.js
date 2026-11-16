// SPROUT SIEGE — particles and floating combat text. Pure visuals, no logic.
export function makeFx() {
  return { parts: [], texts: [] };
}

export function burst(fx, x, y, color, n = 8, speed = 90) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    fx.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.45 + Math.random() * 0.25, max: 0.7, color,
      r: 2 + Math.random() * 3,
    });
  }
}

export function leafBurst(fx, x, y) {
  burst(fx, x, y, '#7ed957', 6, 60);
  burst(fx, x, y, '#a8e063', 4, 45);
}

export function floatText(fx, x, y, text, color = '#ffffff') {
  fx.texts.push({ x, y, text, color, life: 0.9, max: 0.9 });
}

export function updateFx(fx, dt) {
  for (const p of fx.parts) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }
  fx.parts = fx.parts.filter(p => p.life > 0);
  for (const t of fx.texts) {
    t.life -= dt;
    t.y -= 28 * dt;
  }
  fx.texts = fx.texts.filter(t => t.life > 0);
}

export function drawFx(ctx, fx) {
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
