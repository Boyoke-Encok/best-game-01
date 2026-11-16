// SPROUT SIEGE — best score in localStorage. Tiny on purpose.
const KEY = 'sprout_siege_best';

export function loadBest() {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch (e) {
    return 0;
  }
}

export function saveBest(score) {
  try {
    if (score > loadBest()) window.localStorage.setItem(KEY, String(score));
  } catch (e) { /* storage unavailable: best is session-only */ }
}
