import { repo } from '../data/repository';

/**
 * Tiny procedural sound effects (Web Audio). No audio files needed for the MVP;
 * replace with recorded SFX from the free libraries listed in docs/FREE_TOOLS.md.
 */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (!repo.settings().sound) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, slideTo?: number, delay = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.1) {
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(); const g = a.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g).connect(a.destination); s.start();
}

export const sfx = {
  click: () => tone(660, 0.06, 'triangle', 0.06),
  jump: () => tone(380, 0.16, 'square', 0.05, 760),
  star: () => { tone(988, 0.08, 'triangle', 0.06); tone(1319, 0.12, 'triangle', 0.06, undefined, 0.07); },
  hit: () => { noise(0.12, 0.12); tone(180, 0.12, 'sawtooth', 0.05, 90); },
  power: () => tone(240, 0.25, 'sawtooth', 0.05, 900),
  ko: () => { tone(520, 0.5, 'triangle', 0.07, 80); noise(0.3, 0.08); },
  checkpoint: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, undefined, i * 0.08)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, undefined, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, undefined, i * 0.14)),
};
