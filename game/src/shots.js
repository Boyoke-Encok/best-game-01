// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh run for a fixed number of steps, steered by a
// simple autopilot (flee the nearest shadow, chase the nearest shard, aim at
// the nearest enemy and fire), so the frame is what a short game really looks
// like and the same seed always gives the same frame. The end scene's pilot
// never moves or shoots, so the shadows catch it, as a hurried player is.
import { STEP } from './config.js';
import { applyUpgrade, fireNova, resetRun, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, stepWorld } from './world.js';

const START_SECONDS = 8;
const PLAY_SECONDS = 15;
const FIGHT_BEFORE_END_SECONDS = 20;
const UPGRADE_LIMIT_SECONDS = 180;
const END_LIMIT_SECONDS = 300;

function nearestEnemy(world) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < world.enemies.length; i += 1) {
    const e = world.enemies[i];
    if (!e.alive) continue;
    const d = Math.hypot(e.x - world.player.x, e.y - world.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return { enemy: best, dist: bestDist };
}

function nearestShard(world) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < world.shards.length; i += 1) {
    const s = world.shards[i];
    if (!s.alive) continue;
    const d = Math.hypot(s.x - world.player.x, s.y - world.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return { shard: best, dist: bestDist };
}

/** A fake input the autopilot drives; the world cannot tell it from the real one. */
function autopilotInput(world, mode) {
  const player = world.player;
  const { enemy, dist } = nearestEnemy(world);
  const { shard } = nearestShard(world);
  let ax = 0;
  let ay = 0;
  if (mode === 'fight' && player.alive) {
    if (enemy && dist < 170) {
      // Flee the closest shadow.
      ax = (player.x - enemy.x) / (dist || 1);
      ay = (player.y - enemy.y) / (dist || 1);
    } else if (shard) {
      ax = (shard.x - player.x) / 100;
      ay = (shard.y - player.y) / 100;
    } else {
      // Drift toward the centre so the frame stays composed.
      ax = (640 - player.x) / 400;
      ay = (400 - player.y) / 400;
    }
    const length = Math.hypot(ax, ay) || 1;
    ax /= length;
    ay /= length;
  }
  const aim = enemy ?? { x: player.x + 200, y: player.y - 100 };
  return {
    mouse: { x: aim.x, y: aim.y, down: false },
    firing: mode === 'fight' && !!enemy,
    moveAxis() {
      return { x: ax, y: ay };
    },
    consume() {
      return false;
    },
    takeClick() {
      return null;
    },
  };
}

function stepWith(world, mode, seconds, stopWhen) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilotInput(world, mode);
    // The autopilot fires the nova the moment it is ready.
    if (mode === 'fight' && world.nova >= 100) fireNova(world, null);
    stepWorld(world, input, null, STEP);
    if (stopWhen && stopWhen(world)) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw and the best
 * score to show. The world is reset first, so every scene starts clean.
 */
export function stageShot(name, world) {
  resetRun(world);
  if (name === 'play') {
    // Clear waves 1 and 2, taking the first upgrade each time, then fight
    // wave 3 in half-second steps until at least three shadows are on screen
    // at once: the frame has to show the loop at its busiest, not its tail.
    for (let wave = 1; wave <= 2; wave += 1) {
      stepWith(world, 'fight', UPGRADE_LIMIT_SECONDS, (w) => w.screen === SCREEN_UPGRADE || w.screen === SCREEN_OVER);
      if (world.screen !== SCREEN_UPGRADE) break;
      if (world.upgradeChoices[0]) applyUpgrade(world, world.upgradeChoices[0]);
    }
    for (let i = 0; i < 20; i += 1) {
      stepWith(world, 'fight', 0.5);
      if (world.screen !== SCREEN_PLAY || world.enemies.length >= 3) break;
    }
    return { screen: world.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  if (name === 'upgrade') {
    stepWith(world, 'fight', UPGRADE_LIMIT_SECONDS, (w) => w.screen === SCREEN_UPGRADE || w.screen === SCREEN_OVER);
    if (world.screen !== SCREEN_UPGRADE) {
      // The pilot died before clearing wave 1: fall back to a play frame.
      resetRun(world);
      stepWith(world, 'fight', PLAY_SECONDS);
      return { screen: SCREEN_PLAY, best: world.score };
    }
    return { screen: SCREEN_UPGRADE, best: world.score };
  }
  if (name === 'end') {
    // Fight a while first so the game-over screen shows a real score, then
    // stand still and let the shadows finish the run. If wave 1 cleared
    // first, take an upgrade so the run continues into the next wave.
    stepWith(world, 'fight', FIGHT_BEFORE_END_SECONDS);
    if (world.screen === SCREEN_UPGRADE && world.upgradeChoices[0]) applyUpgrade(world, world.upgradeChoices[0]);
    if (world.screen !== SCREEN_OVER) stepWith(world, 'idle', END_LIMIT_SECONDS, (w) => w.screen === SCREEN_OVER);
    // Let the death flash fade and the particles settle before the frame.
    if (world.screen === SCREEN_OVER) stepWith(world, 'idle', 0.6);
    return { screen: world.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  // start (and anything unknown): a few seconds of drift behind the title.
  stepWith(world, 'fight', START_SECONDS);
  world.screen = SCREEN_TITLE;
  return { screen: SCREEN_TITLE, best: 0 };
}
