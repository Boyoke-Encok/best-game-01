// SPROUT SIEGE — sound: every effect is synthesized with WebAudio, no assets.
let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, lowpass) {
  if (muted) return;
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass || 1200;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  shoot() { tone(720 + Math.random() * 120, 0.07, 'square', 0.05, 420); },
  thorn() { tone(180, 0.12, 'sawtooth', 0.09, 90); },
  splash() { noise(0.18, 0.12, 900); },
  frost() { tone(1200, 0.18, 'sine', 0.06, 1800); },
  splat() { noise(0.12, 0.10, 700); },
  coin() { tone(880, 0.08, 'sine', 0.07); setTimeout(() => tone(1320, 0.12, 'sine', 0.07), 60); },
  place() { tone(220, 0.10, 'triangle', 0.12, 140); },
  upgrade() { tone(520, 0.09, 'triangle', 0.10); setTimeout(() => tone(780, 0.12, 'triangle', 0.10), 70); },
  sell() { tone(660, 0.08, 'sine', 0.08, 440); },
  leak() { tone(160, 0.35, 'sawtooth', 0.14, 70); },
  wave() { tone(392, 0.12, 'triangle', 0.10); setTimeout(() => tone(523, 0.16, 'triangle', 0.10), 110); },
  clear() { tone(523, 0.10, 'triangle', 0.10); setTimeout(() => tone(659, 0.10, 'triangle', 0.10), 90); setTimeout(() => tone(784, 0.18, 'triangle', 0.10), 180); },
  boss() { tone(90, 0.6, 'sawtooth', 0.16, 55); tone(135, 0.6, 'sawtooth', 0.08, 70); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 130)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.08), i * 150)); },
};
