import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] || new URL('..', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ''));
const { createSampleBank } = await import(pathToFileURL(path.join(root, 'docs/practice-timbres.js')).href);
const originalFetch = globalThis.fetch;
const target = 10 ** (-24 / 20), peakLimit = 10 ** (-6 / 20);
const event = { track: 'lead', midi: 69, velocity: .72, duration: 1, beat: 0 };
const close = (a, b, label, epsilon = 1e-5) => assert.ok(Math.abs(a - b) < epsilon, `${label}: ${a} != ${b}`);
// Real Soundfont mapping and real bank caching; only network and decoding are doubled.
const source = 'MIDI.Soundfont.violin = {"A4":"data:audio/mp3;base64,AQ=="};';
function pcm(amplitudes, seconds = 1, change = () => {}) {
  const rate = 1000, length = Math.round(rate * seconds);
  const channels = amplitudes.map(amp => Float32Array.from({ length }, (_, i) => (i % 2 ? -1 : 1) * amp));
  change(channels, rate);
  const original = channels.map(a => a.slice());
  let reads = 0;
  return {
    buffer: { sampleRate: rate, length, duration: seconds, numberOfChannels: channels.length, getChannelData(channel) { reads++; return channels[channel]; } },
    channels, original, reads: () => reads
  };
}
async function load(input, label) {
  let decodes = 0, fetches = 0, sustains = 0;
  globalThis.fetch = async url => {
    assert.ok(String(url).includes('violin-mp3.js'), 'only the violin bank is fetched');
    fetches++;
    return { ok: true, text: async () => source };
  };
  const context = { async decodeAudioData(bytes) { assert.equal(new Uint8Array(bytes)[0], 1); decodes++; return input.buffer; } };
  const helpers = {
    scoreVelocity: note => note.velocity,
    // Sustain preparation is independently covered by score-audio.cjs. This stub
    // isolates calibration: any PCM writes here would therefore be calibration's.
    prepareViolinSustain(buffer) { assert.equal(buffer, input.buffer); sustains++; return { loop: false, ampRelease: .06 }; }
  };
  const bank = createSampleBank(context, helpers);
  await Promise.all([bank.ensure('violin', [event, event]), bank.ensure('violin', [event])]);
  const asset = bank.get('violin', event);
  assert.ok(asset && Number.isFinite(asset.level), label + ': finite per-sample level is returned');
  assert.ok(asset.level > 0 && asset.level <= 8, label + ': gain is positive and bounded');
  assert.equal(asset.buffer, input.buffer, 'the original AudioBuffer is retained');
  assert.equal(asset.kind, 'violin');
  assert.equal(asset.midi, 69, 'original soundfont root mapping is retained');
  assert.equal(decodes, 1, 'parallel ensures decode one shared buffer');
  assert.equal(fetches, 1, 'parallel ensures fetch the bank once');
  assert.equal(sustains, 1, 'sustain metadata is prepared only once per buffer');
  const reads = input.reads();
  assert.equal(reads, input.channels.length, 'each decoded channel is inspected once during calibration');
  for (let i = 0; i < 10; i++) assert.equal(bank.get('violin', event).level, asset.level);
  await bank.ensure('violin', [event]);
  assert.equal(input.reads(), reads, 'cached ensure/get never remeasure PCM');
  assert.equal(decodes, 1);
  for (let c = 0; c < input.channels.length; c++) assert.deepEqual(input.channels[c], input.original[c], label + ': calibration only adds metadata, never rewrites PCM');
  return asset;
}
try {
  const stereo = pcm([.01, .02]);
  const a = await load(stereo, 'stereo RMS');
  const stereoRms = Math.sqrt((.01 ** 2 + .02 ** 2) / 2);
  close(a.level * stereoRms, target, 'all-channel RMS reaches -24 dBFS');
  const windowed = pcm([.02, .02], 1, (channels, rate) => {
    for (const data of channels) {
      for (let i = Math.round(.08 * rate); i < Math.round(.6 * rate); i++) data[i] = (i % 2 ? -1 : 1) * .04;
      for (let i = 0; i < 60; i++) data[i] = (i % 2 ? -1 : 1) * .15;
    }
  });
  const b = await load(windowed, 'measurement window');
  close(b.level * .04, target, 'RMS excludes the initial attack and later sustain');
  const quiet = await load(pcm([.001, .001]), 'quiet sample');
  close(quiet.level, 8, 'quiet recordings cannot exceed +18.06 dB gain');
  const peaked = await load(pcm([.01, .01], 1, channels => { channels[1][750] = .8; }), 'peak safety');
  close(peaked.level * .8, peakLimit, 'whole-file peak outside RMS window limits gain');
  assert.ok(peaked.level < 1, 'already hot peaks may be attenuated');
  const loud = await load(pcm([.1, .1]), 'loud sample');
  close(loud.level * .1, target, 'an already loud source is trimmed down to target');
  const lateTransient = await load(pcm([0, 0], 1, channels => { channels[0][750] = .8; }), 'silent RMS window with late transient');
  close(lateTransient.level * .8, peakLimit, 'silent RMS window still preserves whole-file peak safety');
  const shortHot = await load(pcm([.9], .04), 'short hot source');
  close(shortHot.level * .9, peakLimit, 'short hot recordings retain peak safety without an RMS window');
  await load(pcm([0, 0]), 'silence');
  await load(pcm([0], .02), 'short silence');
  await load(pcm([.02], .04), 'short audible source');
  const pianoPcm = pcm([.2, .2]);
  globalThis.fetch = async url => {
    assert.equal(String(url), 'https://example.test/piano/A4.wav');
    return { ok: true, arrayBuffer: async () => Uint8Array.of(2).buffer };
  };
  const pianoPreset = { defaults: {}, groups: [{ regions: [{ sample: 'A4', pitch: 69, keyRange: [69, 69] }] }], samples: { baseUrl: 'https://example.test/piano', formats: ['wav'] } };
  const pianoBank = createSampleBank({ async decodeAudioData() { return pianoPcm.buffer; } }, {
    scoreVelocity: note => note.velocity,
    pianoPresetForScore: () => pianoPreset,
    prepareViolinSustain() { assert.fail('piano cannot enter violin processing'); }
  });
  await pianoBank.ensure('piano', [event]);
  const piano = pianoBank.get('piano', event);
  assert.equal(piano.level, undefined, 'violin calibration never changes the piano level');
  assert.equal(pianoPcm.reads(), 0, 'piano PCM is not inspected or normalized');
  assert.equal(piano.buffer, pianoPcm.buffer);
  console.log('PASS: real violin bank RMS calibration, stereo energy, time window, gain/peak limits, silence/short-buffer safety and immutable cached PCM');
} finally { globalThis.fetch = originalFetch; }
