/* Synthesized EBU Tech 3341 (2023), table 1: 1–5, 9–19;
 * Tech 3342 (2023), table 1: 1–4. Test signals are computed locally.
 * https://tech.ebu.ch/docs/tech/tech3341.pdf
 * https://tech.ebu.ch/docs/tech/tech3342.pdf
 * This subset is not a full EBU/ITU certification suite; authentic programme,
 * multichannel, BS.2217 and TP transient tests 20–23 remain separate work.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = process.env.TUNER_QA_ROOT || path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'docs/loudness-dsp.js'), 'utf8'), { filename: 'loudness-dsp.js' });
const Meter = globalThis.ProgrammeLoudness.ProgrammeMeter;
const results = [];
function near(actual, expected, tolerance, label) { assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} versus ${expected} ±${tolerance}`); }
function test(name, run) { const before = performance.now(); try { const detail = run(); results.push({ name, passed: true, ms: Math.round(performance.now() - before), detail }); console.log('PASS ' + name); } catch (error) { results.push({ name, passed: false, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); } }
function feed(meter, seconds, db, options = {}) {
  const frames = Math.round(seconds * meter.rate), amplitude = options.amplitude ?? 10 ** (db / 20), frequency = options.frequency ?? 1000;
  const phase = options.phase ?? 0, chunks = options.chunks || [4096], inverted = options.inverted;
  let at = 0, part = 0, current = meter.read();
  while (at < frames) {
    const count = Math.min(chunks[part++ % chunks.length], frames - at), left = new Float32Array(count), right = meter.channels === 2 ? new Float32Array(count) : null;
    for (let i = 0; i < count; i++) {
      const frame = at + i, fade = options.taper ? Math.max(0, Math.min(1, frame / (meter.rate * .01), (frames - 1 - frame) / (meter.rate * .01))) : 1;
      left[i] = amplitude * fade * Math.sin(2 * Math.PI * frequency * frame / meter.rate + phase);
      if (right) right[i] = inverted ? -left[i] : left[i];
    }
    current = meter.process(right ? [left, right] : [left], options.onUpdate); at += count;
  }
  return current;
}
for (const rate of [44100, 48000]) {
  for (const db of [-23, -33]) test(`${rate} Tech 3341 #${db === -23 ? 1 : 2}: stereo reference`, () => {
    const m = new Meter(rate, 2), r = feed(m, 20, db);
    for (const field of ['momentary', 'shortTerm', 'integrated']) near(r[field], db, .1, field);
    near(r.integratedSeconds, 20, 1 / rate, 'sample duration'); return { M: r.momentary, S: r.shortTerm, I: r.integrated };
  });
  const sequences = [
    { number: 3, segments: [[10, -36], [60, -23], [10, -36]] },
    { number: 4, segments: [[10, -72], [10, -36], [60, -23], [10, -36], [10, -72]] },
    { number: 5, segments: [[20, -26], [20.1, -20], [20, -26]] }
  ];
  for (const sequence of sequences) test(`${rate} Tech 3341 #${sequence.number}: gating/energy integration`, () => {
    const m = new Meter(rate, 2); let r; for (const [duration, db] of sequence.segments) r = feed(m, duration, db);
    near(r.integrated, -23, .1, 'integrated'); return { I: r.integrated, gate: r.gate };
  });
  test(`${rate} Tech 3341 #9: rectangular 3 s window`, () => {
    const m = new Meter(rate, 2); const values = [];
    const onUpdate = r => { if (r.seconds >= 3) values.push(r.shortTerm); };
    for (let i = 0; i < 5; i++) { feed(m, 1.34, -20, { onUpdate }); feed(m, 1.66, -30, { onUpdate }); }
    assert.ok(values.length >= 100); for (const value of values) near(value, -23, .1, 'S'); return { minimum: Math.min(...values), maximum: Math.max(...values) };
  });
  test(`${rate} Tech 3341 #12: rectangular 400 ms window`, () => {
    const m = new Meter(rate, 2); const values = [];
    const onUpdate = r => { if (r.seconds >= 1) values.push(r.momentary); };
    for (let i = 0; i < 25; i++) { feed(m, .18, -20, { onUpdate }); feed(m, .22, -30, { onUpdate }); }
    for (const value of values) near(value, -23, .1, 'M'); return { minimum: Math.min(...values), maximum: Math.max(...values) };
  });
  test(`${rate} Tech 3341 #13: 400 ms peak at 20 ms offsets`, () => {
    const observed = [];
    for (let offset = 0; offset < 20; offset++) {
      const m = new Meter(rate, 2); feed(m, offset * .02, -Infinity); feed(m, .4, -23); const r = feed(m, 1, -Infinity);
      near(r.maxM, -23, .1, `max M at ${offset * 20} ms`); observed.push(r.maxM);
    }
    return { minimum: Math.min(...observed), maximum: Math.max(...observed) };
  });
  test(`${rate} Tech 3341 #10: 3 s max at 150 ms offsets`, () => {
    const observed = [];
    for (let i = 0; i < 20; i++) {
      const m = new Meter(rate, 2); feed(m, i * .15, -Infinity); feed(m, 3, -23); const r = feed(m, 1, -Infinity);
      near(r.maxS, -23, .1, `max S at ${i * 150} ms`); observed.push(r.maxS);
    }
    return { minimum: Math.min(...observed), maximum: Math.max(...observed) };
  });
  test(`${rate} Tech 3341 #11: live successive S maxima`, () => {
    const m = new Meter(rate, 2), observed = [];
    for (let i = 0; i < 20; i++) {
      feed(m, i * .15, -Infinity); feed(m, 3, -38 + i); const r = feed(m, 3 - i * .15, -Infinity);
      near(r.maxS, -38 + i, .1, `successive S ${i}`); observed.push(r.maxS);
    }
    return observed;
  });
  test(`${rate} Tech 3341 #14: live successive M maxima`, () => {
    const m = new Meter(rate, 2), observed = [];
    for (let i = 0; i < 20; i++) {
      feed(m, i * .02, -Infinity); feed(m, .4, -38 + i); const r = feed(m, .4 - i * .02, -Infinity);
      near(r.maxM, -38 + i, .1, `successive M ${i}`); observed.push(r.maxM);
    }
    return observed;
  });
  for (const [number, divider, degrees, amplitude, expected] of [[15, 4, 0, .5, -6], [16, 4, 45, .5, -6], [17, 6, 60, .5, -6], [18, 8, 67.5, .5, -6], [19, 4, 45, 1.41, 3]]) test(`${rate} Tech 3341 #${number}: intersample true peak`, () => {
    const r = feed(new Meter(rate, 2), .3, 0, { frequency: rate / divider, phase: degrees * Math.PI / 180, amplitude, taper: true });
    assert.ok(r.truePeak >= expected - .4 && r.truePeak <= expected + .2, `true peak ${r.truePeak}, expected ${expected} +0.2/-0.4`); return { dBTP: r.truePeak };
  });
  for (const [number, levels, target] of [[1, [-20, -30], 10], [2, [-20, -15], 5], [3, [-40, -20], 20], [4, [-50, -35, -20, -35, -50], 15]]) test(`${rate} Tech 3342 #${number}: LRA percentiles and gating`, () => {
    const m = new Meter(rate, 2); let r; for (const db of levels) r = feed(m, 20, db);
    near(r.lra, target, 1, 'LRA'); return { LRA: r.lra };
  });
  test(`${rate} mono / stereo / opposite phase and chunk partition`, () => {
    const mono = feed(new Meter(rate, 1), 5, -23, { chunks: [127, 255, 1024] });
    const stereo = feed(new Meter(rate, 2), 5, -23);
    const reverse = feed(new Meter(rate, 2), 5, -23, { inverted: true, chunks: [19, 128, 513] });
    near(stereo.integrated - mono.integrated, 10 * Math.log10(2), 1e-8, 'independent channel energy sum');
    near(reverse.integrated, stereo.integrated, 1e-8, 'opposite phase must not cancel');
    near(reverse.truePeak, stereo.truePeak, 1e-8, 'channel peak must not cancel');
    return { mono: mono.integrated, stereo: stereo.integrated, reverse: reverse.integrated };
  });
  test(`${rate} pause keeps cumulative I/LRA/TP; resume excludes paused loud audio`, () => {
    const m = new Meter(rate, 2); const before = feed(m, 6, -23);
    m.pause(true); const paused = feed(m, 3, -3);
    near(paused.integrated, before.integrated, 1e-12, 'paused I'); near(paused.integratedSeconds, before.integratedSeconds, 1e-12, 'paused duration');
    assert.equal(paused.lra, before.lra); assert.equal(paused.truePeak, before.truePeak);
    near(paused.momentary, -3, .1, 'M continues while integrated paused');
    m.pause(false); const resumed = feed(m, 3, -23);
    near(resumed.integrated, before.integrated, .02, 'resume I'); near(resumed.truePeak, before.truePeak, .1, 'resume TP must not leak paused FIR samples');
    near(resumed.integratedSeconds, 9, 1 / rate, 'active samples'); return { beforeTP: before.truePeak, resumedTP: resumed.truePeak };
  });
  test(`${rate} reset and digital silence`, () => {
    const m = new Meter(rate, 2); feed(m, 4, -23); m.pause(true); m.reset();
    const r = m.read(); assert.equal(r.integrated, -Infinity); assert.equal(r.lra, null); assert.equal(r.truePeak, -Infinity); assert.equal(r.integratedSeconds, 0);
    const silent = feed(m, 4, -Infinity); assert.equal(silent.integrated, -Infinity); assert.equal(silent.truePeak, -Infinity); assert.equal(silent.lra, null);
    const fresh = feed(new Meter(rate, 2), 4, -33); m.reset(); const reset = feed(m, 4, -33); near(reset.integrated, fresh.integrated, 1e-12, 'reset filters');
  });
}
if (process.env.LOUDNESS_RESULTS) fs.writeFileSync(process.env.LOUDNESS_RESULTS, JSON.stringify(results, null, 2));
console.log(`${results.filter(r => r.passed).length}/${results.length} loudness standard checks passed`);
if (results.some(r => !r.passed)) process.exitCode = 1;
module.exports = { Meter, feed };

