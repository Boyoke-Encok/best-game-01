// LUMEN DRIFT — every pixel the game paints: the void, the lantern ship, the
// shadows, the HUD and the menus. Glow is pre-rendered into small offscreen
// sprites at boot, so the hot loop never pays for shadowBlur.
import { FIELD, PALETTE } from './config.js';
import { KIND_BOSS, KIND_BRUTE, KIND_DARTER, KIND_MINI, KIND_SPLITTER, KIND_WISP } from './enemies.js';
import { upgradeCardRects } from './waves.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY } from './world.js';

const FONT = "'Trebuchet MS', Verdana, sans-serif";

function makeGlowSprite(color, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const glows = {};
  for (const [key, color] of Object.entries({
    player: PALETTE.player,
    bullet: PALETTE.bullet,
    shard: PALETTE.shard,
    wisp: PALETTE.wisp,
    darter: PALETTE.darter,
    splitter: PALETTE.splitter,
    brute: PALETTE.brute,
    boss: PALETTE.boss,
    nova: PALETTE.nova,
    heart: PALETTE.heart,
  })) {
    glows[key] = makeGlowSprite(color);
  }
  // A fixed starfield, twinkling with time.
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: Math.random() * FIELD.width,
      y: Math.random() * FIELD.height,
      r: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
    });
  }
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function drawGlow(sprite, x, y, radius, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  function circle(x, y, radius, fill) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function text(str, x, y, size, color, align = 'left', weight = 'bold') {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function heartShape(x, y, size, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.35);
    ctx.bezierCurveTo(x - size, y - size * 0.45, x - size * 0.35, y - size, x, y - size * 0.3);
    ctx.bezierCurveTo(x + size * 0.35, y - size, x + size, y - size * 0.45, x, y + size * 0.35);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.voidTop);
    gradient.addColorStop(1, PALETTE.voidBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i];
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = twinkle * 0.8;
      circle(s.x, s.y, s.r, PALETTE.star);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(player, time) {
    if (!player.alive) return;
    const blink = player.invulnTimer > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) return; // invulnerability flicker
    const r = player.radius;
    drawGlow(glows.player, player.x, player.y, r * 3.2, 0.9);
    // Hull: a small lantern-ship pointing at the aim angle.
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(r + 6, 0);
    ctx.lineTo(-r * 0.7, r * 0.75);
    ctx.lineTo(-r * 0.35, 0);
    ctx.lineTo(-r * 0.7, -r * 0.75);
    ctx.closePath();
    ctx.fillStyle = '#2a2118';
    ctx.fill();
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    circle(player.x, player.y, r * 0.42, PALETTE.playerCore);
    // Thruster trail.
    if (player.thrust > 0) {
      const back = player.angle + Math.PI;
      const tx = player.x + Math.cos(back) * (r + 4);
      const ty = player.y + Math.sin(back) * (r + 4);
      drawGlow(glows.player, tx, ty, 10 + Math.random() * 6, 0.7);
    }
  }

  function drawEnemy(enemy, time) {
    const x = enemy.x;
    const y = enemy.y;
    const flash = enemy.flash > 0;
    if (enemy.kind === KIND_WISP) {
      drawGlow(glows.wisp, x, y, enemy.radius * 2.6, 0.8);
      circle(x, y, enemy.radius, flash ? '#ffffff' : '#3a1c5c');
      ctx.strokeStyle = PALETTE.wisp;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
      ctx.stroke();
      // Two pale eyes.
      circle(x - 5, y - 3, 2.4, '#e8dcff');
      circle(x + 5, y - 3, 2.4, '#e8dcff');
    } else if (enemy.kind === KIND_DARTER) {
      const telegraph = enemy.state === 1;
      drawGlow(glows.darter, x, y, enemy.radius * 2.4, telegraph ? 1 : 0.7);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(enemy.angle);
      ctx.beginPath();
      ctx.moveTo(enemy.radius + 4, 0);
      ctx.lineTo(0, enemy.radius * 0.8);
      ctx.lineTo(-enemy.radius, 0);
      ctx.lineTo(0, -enemy.radius * 0.8);
      ctx.closePath();
      ctx.fillStyle = flash ? '#ffffff' : telegraph ? '#ff8fb0' : '#4d0f26';
      ctx.fill();
      ctx.strokeStyle = PALETTE.darter;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else if (enemy.kind === KIND_SPLITTER) {
      drawGlow(glows.splitter, x, y, enemy.radius * 2.4, 0.8);
      circle(x, y, enemy.radius, flash ? '#ffffff' : '#2c1550');
      ctx.strokeStyle = PALETTE.splitter;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
      ctx.stroke();
      circle(x, y, enemy.radius * 0.45, '#d9bfff');
      circle(x - 6, y - 5, 2.2, '#2c1550');
      circle(x + 6, y - 5, 2.2, '#2c1550');
    } else if (enemy.kind === KIND_MINI) {
      drawGlow(glows.wisp, x, y, enemy.radius * 2.2, 0.7);
      circle(x, y, enemy.radius, flash ? '#ffffff' : '#4a2472');
    } else if (enemy.kind === KIND_BRUTE) {
      drawGlow(glows.brute, x, y, enemy.radius * 2.2, 0.8);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 0.4);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * enemy.radius;
        const py = Math.sin(a) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = flash ? '#ffffff' : '#3d0f33';
      ctx.fill();
      ctx.strokeStyle = PALETTE.brute;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      circle(x, y, enemy.radius * 0.35, '#ff9de2');
    } else if (enemy.kind === KIND_BOSS) {
      const pulse = 1 + Math.sin(time * 3) * 0.06;
      drawGlow(glows.boss, x, y, enemy.radius * 3, 0.95);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 0.25);
      ctx.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const rr = enemy.radius * pulse * (i % 2 === 0 ? 1.15 : 0.85);
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = flash ? '#ffffff' : '#2b0416';
      ctx.fill();
      ctx.strokeStyle = PALETTE.boss;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
      circle(x, y, enemy.radius * 0.4, '#ff5d73');
      circle(x - 12, y - 8, 3.5, '#ffffff');
      circle(x + 12, y - 8, 3.5, '#ffffff');
      // Boss health bar.
      const barW = 120;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - barW / 2, y - enemy.radius - 22, barW, 9);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillRect(x - barW / 2 + 1, y - enemy.radius - 21, (barW - 2) * Math.max(0, enemy.hp / enemy.maxHp), 7);
    }
  }

  function drawHud(world, best) {
    const player = world.player;
    // Top bar.
    ctx.fillStyle = 'rgba(5, 7, 15, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, 54);
    text(`SCORE  ${world.score.toLocaleString('en-US')}`, 20, 36, 26, PALETTE.text);
    text(`BEST  ${Math.max(best, world.score).toLocaleString('en-US')}`, 20, 50, 12, PALETTE.textDim);
    const waveLabel = `WAVE ${world.wave} / 10`;
    text(waveLabel, FIELD.width / 2, 34, 24, PALETTE.text, 'center');
    const left = world.spawnQueue.length + world.enemies.length;
    text(left > 0 ? `${left} shadows left` : 'WAVE CLEAR', FIELD.width / 2, 50, 12, PALETTE.textDim, 'center');
    // Hearts, top right.
    for (let i = 0; i < player.maxHearts; i += 1) {
      heartShape(FIELD.width - 30 - i * 32, 22, 11, i < player.hearts ? PALETTE.heart : PALETTE.heartEmpty);
    }
    // Combo, under the score.
    if (world.combo >= 2) {
      const mult = world.multiplier;
      text(`COMBO x${mult}`, 20, 82, 20, mult >= 4 ? PALETTE.gold : PALETTE.shard);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(20, 90, 110, 5);
      ctx.fillStyle = mult >= 4 ? PALETTE.gold : PALETTE.shard;
      ctx.fillRect(20, 90, 110 * Math.max(0, world.comboTimer / 2.5), 5);
    }
    // Nova meter, bottom left.
    const novaW = 220;
    const novaX = 20;
    const novaY = FIELD.height - 34;
    text('NOVA', novaX, novaY - 8, 13, world.nova >= 100 ? PALETTE.nova : PALETTE.textDim);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(novaX, novaY, novaW, 10);
    ctx.fillStyle = world.nova >= 100 ? PALETTE.nova : '#c98f2e';
    ctx.fillRect(novaX, novaY, novaW * (world.nova / 100), 10);
    if (world.nova >= 100) text('READY — SPACE / RIGHT CLICK', novaX + novaW + 12, novaY + 9, 13, PALETTE.nova);
    // Wave banner.
    if (world.waveBanner && world.waveBanner.timer > 0) {
      const alpha = Math.min(1, world.waveBanner.timer);
      ctx.globalAlpha = alpha;
      text(world.waveBanner.text, FIELD.width / 2, 150, 44, PALETTE.text, 'center');
      text(world.waveBanner.sub, FIELD.width / 2, 180, 16, PALETTE.textDim, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function drawCrosshair(world, mouse) {
    if (world.screen !== SCREEN_PLAY) return;
    const x = mouse.x;
    const y = mouse.y;
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 7, y);
    ctx.moveTo(x + 7, y);
    ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x, y - 7);
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x, y + 16);
    ctx.stroke();
  }

  function dimPanel() {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(world, best) {
    dimPanel();
    drawGlow(glows.player, FIELD.width / 2, 235, 150, 0.8);
    text('LUMEN DRIFT', FIELD.width / 2, 250, 72, PALETTE.text, 'center');
    text('a lantern against the dark', FIELD.width / 2, 288, 20, PALETTE.gold, 'center');
    text('Survive 10 waves of shadows. Collect light shards to charge your NOVA,', FIELD.width / 2, 350, 18, PALETTE.textDim, 'center');
    text('then unleash it to clear the void. Clear wave 10 and the dark is beaten.', FIELD.width / 2, 376, 18, PALETTE.textDim, 'center');
    const controls = [
      'WASD / ARROWS — fly',
      'MOUSE — aim   •   HOLD LEFT CLICK — shoot',
      'SPACE / RIGHT CLICK — NOVA when the meter is full',
      'P — pause   •   M — mute   •   R — restart',
    ];
    controls.forEach((line, i) => text(line, FIELD.width / 2, 440 + i * 30, 17, PALETTE.text, 'center'));
    const blink = Math.floor(world.time * 2) % 2 === 0;
    if (blink) text('CLICK OR PRESS ENTER TO BEGIN', FIELD.width / 2, 600, 22, PALETTE.nova, 'center');
    if (best > 0) text(`BEST SCORE  ${best.toLocaleString('en-US')}`, FIELD.width / 2, 648, 16, PALETTE.textDim, 'center');
  }

  function drawUpgrade(world) {
    dimPanel();
    text('WAVE CLEAR', FIELD.width / 2, 180, 40, PALETTE.gold, 'center');
    text(`Wave ${world.wave} beaten  •  Score ${world.score.toLocaleString('en-US')}  •  Choose one upgrade`, FIELD.width / 2, 218, 17, PALETTE.textDim, 'center');
    const rects = upgradeCardRects();
    world.upgradeChoices.forEach((card, i) => {
      const r = rects[i];
      ctx.fillStyle = PALETTE.panel;
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      text(`[${i + 1}]`, r.x + 18, r.y + 34, 15, PALETTE.textDim);
      text(card.title, r.x + 18, r.y + 72, 23, PALETTE.text, 'left');
      text(card.blurb, r.x + 18, r.y + 106, 16, PALETTE.shard, 'left');
      text('Click or press ' + (i + 1), r.x + 18, r.y + 158, 14, PALETTE.textDim, 'left');
    });
  }

  function drawPaused() {
    dimPanel();
    text('PAUSED', FIELD.width / 2, 380, 54, PALETTE.text, 'center');
    text('Press P or click to keep flying', FIELD.width / 2, 424, 18, PALETTE.textDim, 'center');
  }

  function drawEnd(world, best, victory) {
    dimPanel();
    if (victory) {
      drawGlow(glows.nova, FIELD.width / 2, 260, 200, 0.9);
      text('THE VOID IS LIT', FIELD.width / 2, 280, 58, PALETTE.gold, 'center');
      text('Wave 10 cleared — the Gloomheart is gone and the dark retreats.', FIELD.width / 2, 322, 18, PALETTE.textDim, 'center');
    } else {
      text('THE LIGHT FADES', FIELD.width / 2, 280, 58, PALETTE.heart, 'center');
      text(`The shadows took your lantern on wave ${world.wave}.`, FIELD.width / 2, 322, 18, PALETTE.textDim, 'center');
    }
    text(`SCORE  ${world.score.toLocaleString('en-US')}`, FIELD.width / 2, 400, 30, PALETTE.text, 'center');
    text(`WAVE REACHED  ${world.wave}  •  SHADOWS DOWN  ${world.kills}`, FIELD.width / 2, 440, 17, PALETTE.textDim, 'center');
    text(`BEST  ${Math.max(best, world.score).toLocaleString('en-US')}`, FIELD.width / 2, 472, 17, PALETTE.gold, 'center');
    const blink = Math.floor(world.time * 2) % 2 === 0;
    if (blink) text('PRESS R OR CLICK TO FLY AGAIN', FIELD.width / 2, 560, 22, PALETTE.nova, 'center');
  }

  function drawEffects(effects) {
    for (let i = 0; i < effects.rings.length; i += 1) {
      const r = effects.rings[i];
      if (!r.alive) continue;
      ctx.globalAlpha = r.life / r.maxLife;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < effects.particles.length; i += 1) {
      const p = effects.particles[i];
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      circle(p.x, p.y, p.size, p.color);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < effects.texts.length; i += 1) {
      const t = effects.texts[i];
      if (!t.alive) continue;
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.6);
      text(t.text, t.x, t.y, t.size, t.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  return {
    getTransform() {
      return { scale, offsetX, offsetY };
    },
    resize,
    draw(world, screen, best, mouse) {
      resize();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      // Screen shake.
      if (world.shake > 0) {
        const mag = world.shake * 14;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      drawBackground(world.time);
      // Shards.
      for (let i = 0; i < world.shards.length; i += 1) {
        const s = world.shards[i];
        if (!s.alive) continue;
        const blink = s.life < 3 && Math.floor(world.time * 6) % 2 === 0;
        if (blink) continue;
        drawGlow(glows.shard, s.x, s.y, 16, 0.85);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(world.time * 2 + i);
        ctx.fillStyle = PALETTE.shard;
        ctx.fillRect(-4.5, -4.5, 9, 9);
        ctx.restore();
      }
      // Enemies.
      for (let i = 0; i < world.enemies.length; i += 1) {
        if (world.enemies[i].alive) drawEnemy(world.enemies[i], world.time);
      }
      // Enemy bullets.
      for (let i = 0; i < world.enemyBullets.length; i += 1) {
        const b = world.enemyBullets[i];
        if (!b.alive) continue;
        drawGlow(glows.boss, b.x, b.y, 14, 0.9);
        circle(b.x, b.y, b.radius, '#ffb3c6');
      }
      // Player bullets.
      for (let i = 0; i < world.bullets.length; i += 1) {
        const b = world.bullets[i];
        if (!b.alive) continue;
        drawGlow(glows.bullet, b.x, b.y, 10, 0.9);
        circle(b.x, b.y, 3.5, '#fff6d8');
      }
      drawPlayer(world.player, world.time);
      drawEffects(world.effects);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) {
        drawHud(world, best);
      }
      if (screen === SCREEN_TITLE) drawTitle(world, best);
      else if (screen === SCREEN_UPGRADE) drawUpgrade(world);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawEnd(world, best, false);
      else if (screen === SCREEN_VICTORY) drawEnd(world, best, true);
      drawCrosshair(world, mouse);
      // Nova / hit flash on top of everything.
      if (world.flash > 0) {
        ctx.globalAlpha = Math.min(0.55, world.flash);
        ctx.fillStyle = world.flashColor;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        ctx.globalAlpha = 1;
      }
    },
  };
}
