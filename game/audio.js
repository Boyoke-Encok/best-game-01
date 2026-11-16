// EMBERFALL — synthesized WebAudio sounds. No audio files, no network.
let ctx = null;
let muted = false;
let master = null;

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}
export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq || 1200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol || 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

export const Sound = {
  shoot() { tone(720 + Math.random() * 120, 0.07, 'square', 0.05, 320); },
  hit() { noise(0.06, 0.12, 2400); },
  die() { tone(220, 0.16, 'triangle', 0.14, 60); noise(0.1, 0.1, 900); },
  pickup() { tone(880 + Math.random() * 80, 0.08, 'sine', 0.12, 1320); },
  levelup() {
    if (!ctx || muted) return;
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.16), i * 70));
  },
  hurt() { tone(160, 0.22, 'sawtooth', 0.2, 70); noise(0.12, 0.14, 500); },
  nova() { tone(420, 0.35, 'sine', 0.16, 90); noise(0.25, 0.1, 700); },
  chain() { tone(1200, 0.09, 'square', 0.08, 300); tone(1500, 0.07, 'square', 0.06, 400); },
  boss() { tone(90, 0.6, 'sawtooth', 0.22, 45); noise(0.4, 0.12, 300); },
  bossHit() { tone(300, 0.12, 'square', 0.12, 120); },
  win() {
    if (!ctx || muted) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.16), i * 90));
  },
  lose() {
    if (!ctx || muted) return;
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sawtooth', 0.12), i * 130));
  },
  click() { tone(660, 0.05, 'sine', 0.1); },
};
