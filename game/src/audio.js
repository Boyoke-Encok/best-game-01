// Synthesized sound effects for LUMEN DRIFT: every sound is built with the
// WebAudio API at run time, so the game ships no audio files and works offline.
// The context starts on the first user gesture; before that every call is a no-op.
const NOTE = { C4: 261.63, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880.0 };

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let lastShoot = 0;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return context;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.32;
    master.connect(context.destination);
    return context;
  }

  function tone(freq, duration, type, volume, slideTo) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, volume, filterFreq) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  function arpeggio(notes, noteDuration, type, volume, gap = 0.09) {
    notes.forEach((freq, index) => {
      window.setTimeout(() => tone(freq, noteDuration, type, volume), index * gap * 1000);
    });
  }

  return {
    /** Call from any user gesture so later sounds are allowed. */
    unlock() {
      ensure();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() {
      // Throttle: a shot every frame would stack into a buzz.
      const now = performance.now();
      if (now - lastShoot < 45) return;
      lastShoot = now;
      tone(920, 0.07, 'square', 0.10, 420);
    },
    enemyDie() {
      noise(0.18, 0.22, 1400);
      tone(220, 0.16, 'sine', 0.16, 55);
    },
    pickup() {
      tone(1320, 0.09, 'sine', 0.12, 1980);
    },
    nova() {
      noise(0.6, 0.4, 900);
      tone(160, 0.55, 'sine', 0.4, 40);
      tone(880, 0.3, 'triangle', 0.12, 1760);
    },
    playerHit() {
      tone(180, 0.25, 'sawtooth', 0.25, 60);
      noise(0.15, 0.2, 700);
    },
    waveClear() {
      arpeggio([NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], 0.16, 'triangle', 0.16);
    },
    upgrade() {
      arpeggio([NOTE.E5, NOTE.G5, NOTE.C5, NOTE.E5], 0.12, 'sine', 0.14);
    },
    boss() {
      tone(98, 0.5, 'sawtooth', 0.2, 49);
      tone(147, 0.5, 'sawtooth', 0.14, 73);
    },
    gameOver() {
      arpeggio([NOTE.A4, NOTE.G4, NOTE.E4, NOTE.C4], 0.3, 'triangle', 0.18, 0.22);
    },
    victory() {
      arpeggio([NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5], 0.18, 'triangle', 0.16, 0.11);
    },
    click() {
      tone(660, 0.05, 'sine', 0.1, 880);
    },
  };
}
