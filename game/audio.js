// FLIPBOUND — synthesized sound (WebAudio, no audio files, no network).
// Every effect and the music loop are built from oscillators and filtered noise.
const Sound = (() => {
  let ctx = null, master = null, musicBus = null;
  let muted = false, musicOn = false, musicTimer = null, step = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.14; musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // Single oscillator blip. slideTo bends the pitch over the note.
  function tone(freq, dur, type, vol, slideTo, delay, bus) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.25, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, cutoff) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 900;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  const sfx = {
    jump() { tone(280, 0.14, 'square', 0.16, 540); },
    flip() { tone(200, 0.28, 'sawtooth', 0.16, 920); noiseBurst(0.1, 0.08, 2400); },
    shard(n) { const b = 660 + (n || 0) * 45; tone(b, 0.12, 'sine', 0.28); tone(b * 1.5, 0.2, 'sine', 0.22, null, 0.06); },
    stomp() { noiseBurst(0.12, 0.3, 700); tone(170, 0.16, 'triangle', 0.3, 55); },
    hurt() { tone(190, 0.28, 'sawtooth', 0.28, 65); noiseBurst(0.15, 0.2, 500); },
    checkpoint() { tone(523, 0.1, 'sine', 0.25); tone(784, 0.22, 'sine', 0.25, null, 0.09); },
    portal() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'sine', 0.2, null, i * 0.07)); },
    click() { tone(820, 0.05, 'square', 0.14); },
    heart() { tone(660, 0.12, 'sine', 0.25); tone(880, 0.2, 'sine', 0.25, null, 0.08); },
    shoot() { tone(520, 0.1, 'square', 0.1, 190); },
    bossHit() { tone(120, 0.22, 'square', 0.32, 48); noiseBurst(0.22, 0.25, 420); },
    bossDie() { [220, 180, 140, 90, 55].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.25, f * 0.5, i * 0.12)); noiseBurst(0.7, 0.3, 300); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'triangle', 0.24, null, i * 0.11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.18, null, i * 0.13)); },
    bounce() { tone(180, 0.18, 'sine', 0.25, 640); },
  };

  function play(name, arg) {
    if (muted) return;
    if (!ensure()) return;
    if (sfx[name]) sfx[name](arg);
  }

  // Music: a 16-step loop — soft bass pulse plus a sparkling arpeggio.
  // A minor-ish progression: Am, F, C, G (roots 110, 87.3, 130.8, 98).
  const BASS = [110, 0, 110, 0, 87.31, 0, 87.31, 0, 130.81, 0, 130.81, 0, 98, 0, 98, 0];
  const ARP = [440, 523.25, 659.25, 880, 659.25, 523.25, 440, 523.25, 349.23, 440, 523.25, 698.46, 523.25, 440, 392, 523.25];
  function startMusic() {
    if (musicOn || !ensure()) return;
    musicOn = true;
    musicTimer = setInterval(() => {
      if (muted || !ctx) return;
      const i = step % 16;
      const b = BASS[i];
      if (b) tone(b, 0.22, 'triangle', 0.5, null, 0, musicBus);
      if (i % 2 === 0) tone(ARP[i], 0.14, 'sine', 0.12, null, 0, musicBus);
      step++;
    }, 150);
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : 0.5;
    if (muted) stopMusic(); else if (musicOn) startMusic();
  }

  return { play, startMusic, stopMusic, setMuted, ensure, isMuted: () => muted };
})();
