// The best score, kept in localStorage when the browser allows it. The game
// never depends on storage working: a private window just keeps the best for
// the visit.
export function readBest(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}
