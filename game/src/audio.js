// Sound, synthesised live with WebAudio: no audio files, nothing fetched. The context is
// created on the first user gesture (browsers block sound before one), and every effect is a
// short oscillator or filtered-noise envelope. Mute is a single flag the game toggles with M.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  /** Create the context on demand; returns false while the browser still forbids sound. */
  function ensure() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.4;
      master.connect(context.destination);
    } catch {
      context = null;
      return false;
    }
    return true;
  }

  function tone({ frequency, endFrequency, duration, type, volume, delay }) {
    if (muted || !ensure() || !context) return;
    const start = context.currentTime + (delay ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration, volume, fromFrequency, toFrequency, delay }) {
    if (muted || !ensure() || !context) return;
    const start = context.currentTime + (delay ?? 0);
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(fromFrequency, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, toFrequency), start + duration);
    filter.Q.value = 1.1;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  return {
    /** Call from any gesture so later effects are allowed to sound. */
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    /** A pickup chime that climbs with the combo multiplier. */
    pickup(multiplier) {
      const base = 520 * 2 ** ((multiplier - 1) / 4);
      tone({ frequency: base, duration: 0.12, type: 'sine', volume: 0.5 });
      tone({ frequency: base * 1.5, duration: 0.16, type: 'sine', volume: 0.35, delay: 0.05 });
    },
    /** A dull thud for taking a hit. */
    hit() {
      tone({ frequency: 160, endFrequency: 55, duration: 0.28, type: 'sawtooth', volume: 0.5 });
      noise({ duration: 0.2, volume: 0.3, fromFrequency: 900, toFrequency: 120 });
    },
    /** The nova burst: a rising whoosh and a bright ping. */
    nova() {
      noise({ duration: 0.5, volume: 0.45, fromFrequency: 300, toFrequency: 4200 });
      tone({ frequency: 880, endFrequency: 1760, duration: 0.35, type: 'triangle', volume: 0.3, delay: 0.05 });
    },
    /** A rock shattering inside a burst. */
    shatter() {
      noise({ duration: 0.16, volume: 0.25, fromFrequency: 1600, toFrequency: 300 });
    },
    /** Level up: a quick rising arpeggio. */
    levelUp() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone({ frequency, duration: 0.14, type: 'triangle', volume: 0.4, delay: index * 0.07 });
      });
    },
    /** Winning the constellation: a bright fanfare. */
    win() {
      [523, 659, 784, 1047, 1319].forEach((frequency, index) => {
        tone({ frequency, duration: 0.3, type: 'triangle', volume: 0.4, delay: index * 0.11 });
      });
      tone({ frequency: 2093, duration: 0.5, type: 'sine', volume: 0.25, delay: 0.55 });
    },
    /** Game over: three notes falling away. */
    gameOver() {
      [392, 311, 233].forEach((frequency, index) => {
        tone({ frequency, duration: 0.32, type: 'sine', volume: 0.4, delay: index * 0.16 });
      });
    },
    /** A soft click for menus and starting. */
    click() {
      tone({ frequency: 700, duration: 0.07, type: 'sine', volume: 0.3 });
    },
  };
}
