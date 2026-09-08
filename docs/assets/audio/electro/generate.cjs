'use strict';
// Original deterministic electronic percussion. Node.js standard library only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const RATE = 44100;
const OUT = __dirname;
const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296 * 2 - 1; };
}
function lowpass(input, hz) {
  const result = new Float64Array(input.length), a = 1 - Math.exp(-TAU * hz / RATE);
  let previous = 0;
  for (let i = 0; i < input.length; i++) result[i] = previous += a * (input[i] - previous);
  return result;
}
function highpass(input, hz) {
  const low = lowpass(input, hz);
  return Float64Array.from(input, (v, i) => v - low[i]);
}
function noise(count, seed, lo, hi) {
  const next = rng(seed);
  return lowpass(highpass(Float64Array.from({ length: count }, next), lo), hi);
}
function kick(variant) {
  const n = Math.round(.45 * RATE), data = new Float64Array(n);
  const click = noise(n, 0x71a502 + variant, 2600, 13000);
  const base = variant === 1 ? 46 : 52, top = variant === 1 ? 155 : 173;
  const pitchDecay = variant === 1 ? .027 : .022;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE, hz = base + (top - base) * Math.exp(-t / pitchDecay);
    phase += TAU * hz / RATE;
    const body = Math.sin(phase) + .105 * Math.sin(2 * phase) * Math.exp(-t / .055);
    const shaped = Math.tanh(body * 1.12) / Math.tanh(1.12);
    data[i] = shaped * Math.exp(-t / (variant === 1 ? .105 : .09)) + .22 * click[i] * Math.exp(-t / .0018);
  }
  return data;
}
function snare(variant) {
  const n = Math.round(.22 * RATE), data = new Float64Array(n);
  const wire = noise(n, 0x2b792d + variant, 1400, 10500);
  const bed = noise(n, 0x971a9c + variant, 450, 6200);
  const f = variant === 1 ? 178 : 191;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const body = .58 * Math.sin(TAU * f * t) * Math.exp(-t / .035) + .28 * Math.sin(TAU * f * 1.83 * t) * Math.exp(-t / .025);
    data[i] = body + 1.8 * wire[i] * Math.exp(-t / (variant === 1 ? .051 : .044)) + .30 * bed[i] * Math.exp(-t / .023);
  }
  return data;
}
function metallic(duration, seed, open = false, ride = false) {
  const n = Math.round(duration * RATE), raw = new Float64Array(n);
  const air = noise(n, seed, ride ? 2800 : 5700, 15000);
  const pitches = ride ? [1517, 2339, 3469, 5099, 7193, 11027] : [3251, 4217, 5879, 7313, 9631, 12203];
  const decay = ride ? .15 : open ? .095 : .016;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let metal = 0;
    for (let j = 0; j < pitches.length; j++) {
      const hz = pitches[j] * (seed % 3 === 0 ? 1.017 : 1);
      // Inharmonic sine partials avoid square-wave aliasing above Nyquist.
      metal += Math.sin(TAU * hz * t + j * .49) * Math.exp(-t / (decay * (1 - j * .055)));
    }
    raw[i] = air[i] * Math.exp(-t / decay) + metal * (ride ? .15 : .057);
    if (ride) raw[i] += .11 * Math.sin(TAU * 2467 * t) * Math.exp(-t / .22);
  }
  return highpass(raw, ride ? 2000 : 5400);
}
function finish(input, peak, tailSeconds) {
  const data = highpass(input, 18), attack = Math.round(.00035 * RATE), tail = Math.round(tailSeconds * RATE);
  let maximum = 0;
  for (let i = 0; i < data.length; i++) {
    const fadeIn = i < attack ? .5 - .5 * Math.cos(Math.PI * i / attack) : 1;
    const left = data.length - 1 - i;
    const fadeOut = left < tail ? .5 - .5 * Math.cos(Math.PI * left / tail) : 1;
    data[i] *= fadeIn * fadeOut;
    maximum = Math.max(maximum, Math.abs(data[i]));
  }
  return Int16Array.from(data, value => Math.round(value / maximum * peak * 32767));
}
function wav(samples) {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write('RIFF', 0); out.writeUInt32LE(out.length - 8, 4); out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) out.writeInt16LE(samples[i], 44 + i * 2);
  return out;
}
const specifications = [
  ['kick-1', () => kick(1), .76, .025, 'swept sine bass drum with short filtered-noise click'],
  ['kick-2', () => kick(2), .76, .025, 'slightly higher/tighter swept sine bass drum'],
  ['snare-1', () => snare(1), .74, .018, 'two-mode tonal snare body with band-limited noise'],
  ['snare-2', () => snare(2), .74, .018, 'higher/tighter tonal snare body with independent seeded noise'],
  ['hat-1', () => metallic(.08, 0x49ac19), .56, .009, 'closed electronic hat: high-passed noise and inharmonic partials'],
  ['hat-2', () => metallic(.08, 0x49ac1a), .56, .009, 'closed hat timbral variant with independent seeded noise'],
  ['open-hat', () => metallic(.4, 0x926dfa, true), .58, .035, 'open electronic hat: longer metallic-noise decay'],
  ['ride', () => metallic(.6, 0x6201af, false, true), .60, .045, 'synthetic metallic ride-like percussion; not a recorded cymbal'],
];
const manifest = {
  schemaVersion: 1,
  name: 'TUner original electronic percussion',
  source: 'Original deterministic program synthesis; no third-party audio or recordings.',
  generator: 'generate.cjs', sampleRate: RATE, channels: 1, bitDepth: 16,
  variants: 'The numbered pairs are synthesized timbral/noise variants, not recorded round-robin takes.',
  files: {},
};
for (const [id, synthesize, targetPeak, tail, description] of specifications) {
  const samples = finish(synthesize(), targetPeak, tail), bytes = wav(samples), file = id + '.wav';
  fs.writeFileSync(path.join(OUT, file), bytes);
  let peak = 0, energy = 0;
  for (const value of samples) { peak = Math.max(peak, Math.abs(value) / 32768); energy += (value / 32768) ** 2; }
  manifest.files[id] = { file, description, durationSeconds: samples.length / RATE, frames: samples.length, bytes: bytes.length, peak, rms: Math.sqrt(energy / samples.length), sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ generated: Object.keys(manifest.files).length, output: OUT, bytes: Object.values(manifest.files).reduce((sum, item) => sum + item.bytes, 0) }));
