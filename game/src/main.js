// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// upgrade, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, fireNova, resetRun, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY, stepWorld } from './world.js';
import { ACTION_CONFIRM, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { readBest, saveBest } from './storage.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);
let best = readBest(BEST_KEY);

/** Debug hooks for playtests and screenshots. */
window.__game = {
  get screen() {
    return world.screen;
  },
  get score() {
    return world.score;
  },
  get wave() {
    return world.wave;
  },
  get hearts() {
    return world.player.hearts;
  },
  get nova() {
    return world.nova;
  },
  get enemies() {
    return world.enemies.length;
  },
  get kills() {
    return world.kills;
  },
  get best() {
    return Math.max(best, world.score);
  },
  get muted() {
    return audio.muted;
  },
  startRun() {
    audio.unlock();
    resetRun(world);
  },
  fireNova() {
    return fireNova(world, audio);
  },
  setNova(value) {
    world.nova = Math.max(0, Math.min(100, value));
    return world.nova;
  },
  stepN(n) {
    for (let i = 0; i < n; i += 1) stepWorld(world, input, null, STEP);
    return { screen: world.screen, score: world.score, wave: world.wave };
  },
};

function persistBest() {
  best = Math.max(best, world.score);
  saveBest(BEST_KEY, best);
}

function runShot(name) {
  const scene = stageShot(name, world);
  best = Math.max(best, scene.best);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, best, { x: 900, y: 300 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      stepWorld(world, input, audio, STEP);
      accumulator -= STEP;
    }
    if (world.screen !== screen) {
      // A run just ended: remember the best score.
      if (world.screen === SCREEN_OVER || world.screen === SCREEN_VICTORY) persistBest();
      screen = world.screen;
    }
    const transform = renderer.getTransform();
    input.setTransform(transform.scale, transform.offsetX, transform.offsetY);
    canvas.style.cursor = world.screen === SCREEN_PLAY ? 'none' : 'default';
    renderer.draw(world, world.screen, best, input.mouse);
    status.textContent = `Lumen Drift — ${world.screen}, score ${world.score}, wave ${world.wave}`;
    requestAnimationFrame(frame);
  }

  // First gesture unlocks the audio context.
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
