// EMBERFALL — best score in localStorage.
const KEY = 'emberfall_best';

export function loadBest() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch (e) { return 0; }
}

export function saveBest(score) {
  try {
    if (score > loadBest()) localStorage.setItem(KEY, String(Math.floor(score)));
  } catch (e) { /* storage unavailable */ }
  return loadBest();
}
