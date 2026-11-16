// LUMEN DRIFT — the world: one fixed-step simulation. The world owns the run
// state (player, enemies, bullets, shards, score, combo, nova, waves) and the
// screen machine (title, play, upgrade, paused, over, victory). It reads input
// through the small interface input.js provides, so the screenshot autopilot
// can drive the same sim with a fake input.
import { COMBO, ENEMIES, FIELD, NOVA, PALETTE, PLAYER, SHARD, STEP, WAVES } from './config.js';
import { createPlayer, resetPlayer, movePlayer, aimPlayer, firingReady } from './player.js';
import { KIND_BOSS, KIND_MINI, KIND_SPLITTER, spawnBoss, spawnEnemy, updateEnemy } from './enemies.js';
import { clearEffects, createEffects, spawnParticles, spawnRing, spawnText, updateEffects } from './effects.js';
import { bossHpFor, buildWave, edgeSpawn, pickUpgrades, spawnIntervalFor, upgradeCardRects } from './waves.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_NOVA, ACTION_PAUSE, ACTION_RESTART, ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3 } from './input.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const UPGRADE_ACTIONS = [ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3];
const ALL_ACTIONS = [ACTION_CONFIRM, ACTION_PAUSE, ACTION_NOVA, ACTION_RESTART, ACTION_MUTE, ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3];
// Which actions each screen reads. Anything else pressed on that screen is
// drained, so a click or key from play can never fire by itself on a later
// screen (a stale confirm restarting the game the instant it ends, a stale
// 1/2/3 picking an upgrade the player never chose).
const SCREEN_ACTIONS = {
  [SCREEN_TITLE]: [ACTION_CONFIRM],
  [SCREEN_PLAY]: [ACTION_NOVA, ACTION_PAUSE],
  [SCREEN_UPGRADE]: [ACTION_UPGRADE_1, ACTION_UPGRADE_2, ACTION_UPGRADE_3],
  [SCREEN_PAUSED]: [ACTION_PAUSE, ACTION_CONFIRM],
  [SCREEN_OVER]: [ACTION_RESTART, ACTION_CONFIRM],
  [SCREEN_VICTORY]: [ACTION_RESTART, ACTION_CONFIRM],
};

function drainIrrelevant(input, screen) {
  const keep = SCREEN_ACTIONS[screen] ?? [];
  for (const action of ALL_ACTIONS) {
    if (action !== ACTION_MUTE && !keep.includes(action)) input.consume(action);
  }
  // Clicks are only UI on the upgrade screen; elsewhere they are shooting.
  if (screen !== SCREEN_UPGRADE && input.clearClick) input.clearClick();
}

export function createWorld(random) {
  return {
    random,
    screen: SCREEN_TITLE,
    time: 0,
    wave: 1,
    score: 0,
    best: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    nova: 0,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    shards: [],
    effects: createEffects(),
    spawnQueue: [],
    spawnTimer: 0,
    waveBanner: null,
    upgradeChoices: [],
    shake: 0,
    flash: 0,
    flashColor: '#ffffff',
    stats: { shots: 0, hits: 0 },
  };
}

/** Start (or restart) a run from the title / end screens. */
export function resetRun(world) {
  resetPlayer(world.player);
  world.enemies.length = 0;
  world.bullets.length = 0;
  world.enemyBullets.length = 0;
  world.shards.length = 0;
  clearEffects(world.effects);
  world.wave = 1;
  world.score = 0;
  world.kills = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.multiplier = 1;
  world.nova = 0;
  world.shake = 0;
  world.flash = 0;
  world.waveBanner = null;
  world.upgradeChoices = [];
  world.stats.shots = 0;
  world.stats.hits = 0;
  startWave(world);
  world.screen = SCREEN_PLAY;
}

function startWave(world) {
  world.spawnQueue = buildWave(world.wave, world.random);
  world.spawnTimer = 0.6;
  const isBoss = world.wave === 5 || world.wave === WAVES.total;
  world.waveBanner = {
    text: isBoss ? 'GLOOMHEART AWAKENS' : `WAVE ${world.wave}`,
    sub: isBoss ? 'The dark itself comes for your light' : `${world.spawnQueue.length} shadows approach`,
    timer: 2.2,
  };
}

function addScore(world, points, x, y, color = PALETTE.text) {
  world.score += points;
  if (x !== undefined) spawnText(world.effects, x, y, `+${points}`, color, 15);
}

function gainNova(world, amount) {
  world.nova = Math.min(100, world.nova + amount * world.player.novaGain);
}

function damageEnemy(world, enemy, damage, audio) {
  enemy.hp -= damage;
  enemy.flash = 0.09;
  world.stats.hits += 1;
  if (enemy.hp > 0) return false;
  killEnemy(world, enemy, audio);
  return true;
}

function killEnemy(world, enemy, audio) {
  enemy.alive = false;
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = COMBO.windowSeconds;
  world.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(world.combo / COMBO.stepKills));
  const points = enemy.score * world.multiplier;
  addScore(world, points, enemy.x, enemy.y, world.multiplier > 1 ? PALETTE.gold : PALETTE.text);
  gainNova(world, PLAYER.novaGainPerKill);
  const color = enemy.kind === KIND_BOSS ? PALETTE.boss : PALETTE.wisp;
  spawnParticles(world.effects, enemy.x, enemy.y, color, enemy.kind === KIND_BOSS ? 60 : 16, 260, 3.5, 0.6);
  spawnParticles(world.effects, enemy.x, enemy.y, '#ffffff', 6, 160, 2, 0.35);
  if (audio) audio.enemyDie();
  // Splitters burst into two minis.
  if (enemy.kind === KIND_SPLITTER) {
    for (let i = 0; i < 2; i += 1) {
      const mini = spawnEnemy(KIND_MINI, enemy.x + (i === 0 ? -14 : 14), enemy.y);
      world.enemies.push(mini);
    }
  }
  // Kills drop light shards.
  const shardCount = enemy.kind === KIND_BOSS ? 8 : enemy.kind === 'brute' ? 3 : 1 + Math.floor(world.random() * 2);
  for (let i = 0; i < shardCount; i += 1) {
    const angle = world.random() * Math.PI * 2;
    const speed = 60 + world.random() * 120;
    world.shards.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      value: SHARD.score,
      life: SHARD.lifeSeconds,
      alive: true,
    });
  }
}

function hurtPlayer(world, fromX, fromY, audio) {
  const player = world.player;
  if (player.invulnTimer > 0 || !player.alive) return;
  player.hearts -= 1;
  player.invulnTimer = player.invulnSeconds;
  world.combo = 0;
  world.multiplier = 1;
  world.comboTimer = 0;
  world.shake = 0.4;
  world.flash = 0.5;
  world.flashColor = '#ff2e63';
  // Knock the player away from the blow.
  const dx = player.x - fromX;
  const dy = player.y - fromY;
  const length = Math.hypot(dx, dy) || 1;
  player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + (dx / length) * 46));
  player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + (dy / length) * 46));
  spawnParticles(world.effects, player.x, player.y, PALETTE.heart, 22, 300, 3.5, 0.7);
  if (audio) audio.playerHit();
  if (player.hearts <= 0) {
    player.alive = false;
    world.screen = SCREEN_OVER;
    world.best = Math.max(world.best, world.score);
    spawnParticles(world.effects, player.x, player.y, PALETTE.player, 70, 380, 4, 1.1);
    spawnRing(world.effects, player.x, player.y, 320, PALETTE.player, 5);
    if (audio) audio.gameOver();
  }
}

export function fireNova(world, audio) {
  if (world.nova < 100 || world.screen !== SCREEN_PLAY) return false;
  world.nova = 0;
  world.flash = 1;
  world.flashColor = '#fff3d6';
  world.shake = 0.5;
  spawnRing(world.effects, world.player.x, world.player.y, NOVA.radius, PALETTE.nova, 6);
  spawnParticles(world.effects, world.player.x, world.player.y, PALETTE.nova, 50, 500, 4, 0.8);
  for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = world.enemies[i];
    if (enemy.alive) damageEnemy(world, enemy, NOVA.damage, null);
  }
  world.enemyBullets.length = 0;
  if (audio) audio.nova();
  return true;
}

export function applyUpgrade(world, card) {
  const player = world.player;
  if (card.id === 'rapid') player.fireInterval *= 0.8;
  else if (card.id === 'heavy') player.bulletDamage += 1;
  else if (card.id === 'swift') player.speed *= 1.12;
  else if (card.id === 'twin') player.bulletCount = Math.min(4, player.bulletCount + 1);
  else if (card.id === 'pierce') player.bulletPierce += 1;
  else if (card.id === 'magnet') player.magnetRadius *= 1.8;
  else if (card.id === 'heart') {
    player.maxHearts = Math.min(PLAYER.maxHearts, player.maxHearts + 1);
    player.hearts = Math.min(player.maxHearts, player.hearts + 1);
  } else if (card.id === 'dynamo') player.novaGain *= 1.5;
  else if (card.id === 'plating') player.invulnSeconds += 0.6;
  spawnText(world.effects, player.x, player.y - 30, card.title, PALETTE.gold, 18);
  world.wave += 1;
  startWave(world);
  world.screen = SCREEN_PLAY;
}

function fireBullets(world, audio) {
  const player = world.player;
  const count = player.bulletCount;
  const spread = 0.11;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    const angle = player.angle + offset;
    world.bullets.push({
      x: player.x + Math.cos(angle) * (player.radius + 6),
      y: player.y + Math.sin(angle) * (player.radius + 6),
      vx: Math.cos(angle) * player.bulletSpeed,
      vy: Math.sin(angle) * player.bulletSpeed,
      damage: player.bulletDamage,
      pierce: player.bulletPierce,
      life: player.bulletRange / player.bulletSpeed,
      alive: true,
    });
  }
  world.stats.shots += 1;
  spawnParticles(world.effects, player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20, PALETTE.bullet, 2, 120, 2, 0.15);
  if (audio) audio.shoot();
}

function stepPlay(world, input, audio, dt) {
  const player = world.player;
  const axis = input.moveAxis();
  movePlayer(player, axis, dt);
  aimPlayer(player, input.mouse.x, input.mouse.y);
  if (firingReady(player, dt, input.firing)) fireBullets(world, audio);
  if (input.consume(ACTION_NOVA)) fireNova(world, audio);
  if (input.consume(ACTION_PAUSE)) {
    world.screen = SCREEN_PAUSED;
    return;
  }

  // Combo decay.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) {
      world.combo = 0;
      world.multiplier = 1;
    }
  }

  // Spawn director.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = spawnIntervalFor(world.wave);
      const kind = world.spawnQueue.shift();
      const at = edgeSpawn(world.random, player);
      if (kind === KIND_BOSS) {
        world.enemies.push(spawnBoss(at.x, at.y, bossHpFor(world.wave)));
        if (audio) audio.boss();
      } else {
        world.enemies.push(spawnEnemy(kind, at.x, at.y));
      }
    }
  }

  const api = {
    spawnRadial(x, y, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + world.time * 0.3;
        world.enemyBullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alive: true, radius: 5 });
      }
    },
    spawnMinis(x, y, count) {
      for (let i = 0; i < count; i += 1) {
        const angle = world.random() * Math.PI * 2;
        world.enemies.push(spawnEnemy(KIND_MINI, x + Math.cos(angle) * 30, y + Math.sin(angle) * 30));
      }
    },
  };

  // Enemies.
  for (let i = 0; i < world.enemies.length; i += 1) {
    const enemy = world.enemies[i];
    if (!enemy.alive) continue;
    updateEnemy(enemy, dt, player, api);
    // Touching the player hurts.
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < enemy.radius + player.radius - 2) {
      hurtPlayer(world, enemy.x, enemy.y, audio);
      if (world.screen !== SCREEN_PLAY) return;
      // The enemy recoils off the player instead of sitting on them.
      enemy.x += ((enemy.x - player.x) / (dist || 1)) * 26;
      enemy.y += ((enemy.y - player.y) / (dist || 1)) * 26;
    }
  }

  // Player bullets.
  for (let i = 0; i < world.bullets.length; i += 1) {
    const bullet = world.bullets[i];
    if (!bullet.alive) continue;
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
      bullet.alive = false;
      continue;
    }
    for (let j = 0; j < world.enemies.length; j += 1) {
      const enemy = world.enemies[j];
      if (!enemy.alive) continue;
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      const reach = enemy.radius + 4;
      if (dx * dx + dy * dy < reach * reach) {
        damageEnemy(world, enemy, bullet.damage, audio);
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          bullet.alive = false;
        }
        break;
      }
    }
  }

  // Enemy bullets.
  for (let i = 0; i < world.enemyBullets.length; i += 1) {
    const bullet = world.enemyBullets[i];
    if (!bullet.alive) continue;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
      bullet.alive = false;
      continue;
    }
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const reach = player.radius + bullet.radius - 2;
    if (dx * dx + dy * dy < reach * reach) {
      bullet.alive = false;
      hurtPlayer(world, bullet.x, bullet.y, audio);
      if (world.screen !== SCREEN_PLAY) return;
    }
  }

  // Shards: drift, magnet toward the player, collect.
  for (let i = 0; i < world.shards.length; i += 1) {
    const shard = world.shards[i];
    if (!shard.alive) continue;
    shard.life -= dt;
    if (shard.life <= 0) {
      shard.alive = false;
      continue;
    }
    const dx = player.x - shard.x;
    const dy = player.y - shard.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < player.magnetRadius) {
      const pull = 520 * (1 - dist / player.magnetRadius) + 120;
      shard.vx += (dx / dist) * pull * dt;
      shard.vy += (dy / dist) * pull * dt;
    } else {
      shard.vx *= 0.98;
      shard.vy *= 0.98;
    }
    shard.x += shard.vx * dt;
    shard.y += shard.vy * dt;
    if (dist < SHARD.pickupRadius + player.radius) {
      shard.alive = false;
      addScore(world, shard.value, shard.x, shard.y - 8, PALETTE.shard);
      gainNova(world, PLAYER.novaGainPerShard);
      spawnParticles(world.effects, shard.x, shard.y, PALETTE.shard, 4, 120, 2, 0.3);
      if (audio) audio.pickup();
    }
  }

  // Sweep the dead.
  world.enemies = world.enemies.filter((e) => e.alive);
  world.bullets = world.bullets.filter((b) => b.alive);
  world.enemyBullets = world.enemyBullets.filter((b) => b.alive);
  world.shards = world.shards.filter((s) => s.alive);

  // Wave cleared?
  if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
    const bonus = WAVES.clearBonus * world.wave;
    addScore(world, bonus, FIELD.width / 2, 200, PALETTE.gold);
    world.best = Math.max(world.best, world.score);
    if (world.wave >= WAVES.total) {
      world.screen = SCREEN_VICTORY;
      if (audio) audio.victory();
    } else {
      world.upgradeChoices = pickUpgrades(world.random);
      world.screen = SCREEN_UPGRADE;
      if (audio) audio.waveClear();
    }
  }
}

/** One fixed step. `input` follows the input.js interface; `audio` may be null. */
export function stepWorld(world, input, audio, dt = STEP) {
  world.time += dt;
  if (world.shake > 0) world.shake -= dt;
  if (world.flash > 0) world.flash -= dt * 2.4;
  if (world.waveBanner && world.waveBanner.timer > 0) world.waveBanner.timer -= dt;
  updateEffects(world.effects, dt);

  if (input.consume(ACTION_MUTE) && audio) audio.toggleMute();
  drainIrrelevant(input, world.screen);

  if (world.screen === SCREEN_TITLE) {
    if (input.consume(ACTION_CONFIRM)) {
      if (audio) {
        audio.unlock();
        audio.click();
      }
      resetRun(world);
    }
    return;
  }
  if (world.screen === SCREEN_PLAY) {
    stepPlay(world, input, audio, dt);
    return;
  }
  if (world.screen === SCREEN_UPGRADE) {
    for (let i = 0; i < UPGRADE_ACTIONS.length; i += 1) {
      if (input.consume(UPGRADE_ACTIONS[i]) && world.upgradeChoices[i]) {
        if (audio) audio.upgrade();
        applyUpgrade(world, world.upgradeChoices[i]);
        return;
      }
    }
    const click = input.takeClick ? input.takeClick() : null;
    if (click) {
      const rects = upgradeCardRects();
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (click.x >= r.x && click.x <= r.x + r.width && click.y >= r.y && click.y <= r.y + r.height && world.upgradeChoices[i]) {
          if (audio) audio.upgrade();
          applyUpgrade(world, world.upgradeChoices[i]);
          return;
        }
      }
    }
    return;
  }
  if (world.screen === SCREEN_PAUSED) {
    if (input.consume(ACTION_PAUSE) || input.consume(ACTION_CONFIRM)) {
      world.screen = SCREEN_PLAY;
    }
    return;
  }
  // Over and victory: restart on R or Enter/click.
  if (world.screen === SCREEN_OVER || world.screen === SCREEN_VICTORY) {
    if (input.consume(ACTION_RESTART) || input.consume(ACTION_CONFIRM)) {
      if (audio) audio.click();
      resetRun(world);
    }
  }
}
