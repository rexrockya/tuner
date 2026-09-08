const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('docs/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: 'https://rexrockya.github.io/tuner/', runScripts: 'outside-only' }), w = dom.window, d = w.document;
const $ = id => d.getElementById(id), plain = x => JSON.parse(JSON.stringify(x));
let now = 0, sequence = 0, decoded = 0;
const timers = new Map(), nodes = [], scheduled = [], problems = [];
w.addEventListener('error', e => problems.push(e.message));
class Param { value = 0; setValueAtTime(v) { this.value = v; } setTargetAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } cancelScheduledValues() {} }
class AudioNode {
  constructor(type) { this.type = type; this.connections = []; for (const key of ['gain', 'frequency', 'playbackRate', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[key] = new Param(); nodes.push(this); }
  connect(node) { this.connections.push(node); return node; } disconnect() {} setPeriodicWave() {}
  start(at) { this.at = at; scheduled.push(this); } stop(at) { this.stopAt = at; }
}
w.AudioContext = class {
  state = 'running'; sampleRate = 44100; destination = new AudioNode('destination');
  get currentTime() { return now; } async resume() {}
  createGain() { return new AudioNode('gain'); } createDynamicsCompressor() { return new AudioNode('compressor'); }
  createConvolver() { return new AudioNode('room'); } createBiquadFilter() { return new AudioNode('filter'); }
  createOscillator() { return new AudioNode('organ'); } createBufferSource() { return new AudioNode('sample'); }
  createPeriodicWave() { return {}; }
  createBuffer(channels, length, rate) { return { duration: length / rate, getChannelData: () => new Float32Array(length) }; }
  async decodeAudioData(bytes) {
    const buffer = Buffer.from(bytes); assert.ok(['fLaC', 'RIFF'].includes(buffer.toString('ascii', 0, 4))); if (buffer.toString('ascii', 0, 4) === 'RIFF') assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
    assert.ok(buffer.length > 1000); decoded++; return { duration: 3.2 };
  }
};
w.setInterval = fn => { const id = ++sequence; timers.set(id, fn); return id; }; w.clearInterval = id => timers.delete(id);
w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {}; w.HTMLElement.prototype.scrollTo = () => {}; w.HTMLMediaElement.prototype.pause = () => {};
w.fetch = async url => {
  const file = path.resolve('docs', url.split('?')[0]); assert.ok(file.startsWith(path.resolve('docs/assets/audio/blues')), 'all new playback assets must be self-hosted');
  return { ok: fs.existsSync(file), json: async () => JSON.parse(fs.readFileSync(file, 'utf8')), arrayBuffer: async () => { const b = fs.readFileSync(file); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } };
};
for (const file of ['storage.js', 'harmony.js', 'lessons.js', 'practice-audio.js', 'practice.js']) w.eval(fs.readFileSync('docs/' + file, 'utf8'));
const studio = w.practiceStudio, flush = () => new Promise(resolve => setImmediate(resolve));
function advance(seconds) { const end = now + seconds; while (now < end) { now = Math.min(end, now + .017); for (const timer of timers.values()) timer(); } }
function change(id, value) { $(id).value = value; $(id).dispatchEvent(new w.Event('change')); }
(async () => {
  assert.equal(d.querySelectorAll('.lesson-modes button').length, 3);
  studio.setMode('create'); studio.generate(913);
  assert.equal($('lesson-library-pane').hidden, true); assert.equal($('practice-pane').hidden, false);
  assert.equal(studio.getPhrase().bars, 3); assert.ok(d.querySelectorAll('.tab-fret').length > 8);
  const phrase = plain(studio.getPhrase());
  studio.setMode('backing'); studio.setMode('create'); assert.deepEqual(plain(studio.getPhrase()), phrase, 'mode changes retain the draft');
  $('practice-save').click(); assert.equal(JSON.parse(w.localStorage.getItem('tuner-original-licks-v1')).length, 1);
  studio.generate(914); change('practice-saved', '0'); assert.deepEqual(plain(studio.getPhrase()), phrase, 'saved notes reproduce exactly');
  const midi = Buffer.from(studio.midiFile()); assert.equal(midi.toString('ascii', 0, 4), 'MThd');
  assert.deepEqual([...midi.subarray(22, 26)], [0, 255, 81, 3], 'tempo first');
  assert.deepEqual([...midi.subarray(29, 32)], [0, 192, 26], 'guitar program before the first note');

  const originalSaved = w.localStorage.getItem('tuner-original-licks-v1');
  change('practice-bass-style', 'octave'); assert.deepEqual(plain(studio.getPhrase()), phrase, 'changing bass retains the melody');
  $('practice-rhythm').click(); assert.equal($('practice-rhythm').getAttribute('aria-pressed'), 'false'); assert.ok(!studio.transport.song.events.some(event => event.track === 'rhythm'));
  assert.deepEqual(plain(studio.getPhrase()), phrase, 'rhythm guitar toggle retains the melody');
  $('practice-rhythm').click(); assert.ok(studio.transport.song.events.some(event => event.track === 'rhythm'));
  change('practice-feel', 'funk'); assert.deepEqual(plain(studio.getPhrase()), phrase, 'changing groove retains the exact composition');
  change('practice-phrase-style', 'arpeggio'); assert.notDeepEqual(plain(studio.getPhrase().notes), phrase.notes, 'style selection changes musical vocabulary');
  $('practice-save').click(); const styled = plain(studio.getPhrase()); studio.generate(920); change('practice-saved','0'); assert.deepEqual(plain(studio.getPhrase()),styled,'version 2 favorites store exact note snapshots');
  w.siteStorage.setItem('tuner-original-licks-v1', JSON.stringify([{version:1,text:'ii7 | V7 | Imaj7',key:'C',feel:'shuffle',seed:913,bpm:96}]));
  change('practice-saved','0'); assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(plain(studio.getPhrase()))).digest('hex'),'f15cc446349967e473ab980aeee3d74bf68d028ddcf85c2ac82b7d11afeda206','old v1 favorite reproduces the original notes exactly');
  w.siteStorage.setItem('tuner-original-licks-v1', originalSaved); change('practice-saved','0'); assert.deepEqual(plain(studio.getPhrase()),phrase);
  studio.setMode('backing'); change('practice-preset', 'minor');
  assert.equal($('practice-error').hidden, true); assert.equal(studio.getProgression().bars.length, 12);
  assert.equal(studio.getProgression().bars[8][0].name, 'F7');
  change('practice-preset', 'blues');
  d.querySelector('[data-practice-bar="8"]').click(); await flush(); await flush();
  assert.equal(studio.transport.playing, true, 'clicking a bar starts playback');
  assert.equal(studio.transport.position, 32); assert.equal($('practice-current-chord').textContent, 'E7');
  assert.equal(decoded, Object.keys(JSON.parse(fs.readFileSync('docs/assets/audio/blues/manifest.json', 'utf8'))).length, 'every bundled asset reaches the decoder');
  assert.ok(scheduled.some(node => node.type === 'sample') && scheduled.some(node => node.type === 'organ'));
  const before = studio.transport.current(); change('practice-bpm', '80'); await flush(); assert.ok(Math.abs(studio.transport.current() - before) < .1);
  $('practice-bar-loop').click(); await flush(); assert.equal(studio.transport.loopBar, 8);
  advance(16); assert.ok(studio.transport.current() >= 32 && studio.transport.current() < 36);
  const position = studio.transport.current();
  const keys = d.querySelector('[data-practice-volume="keys"]'); keys.value = '0'; keys.dispatchEvent(new w.Event('input'));
  assert.equal(studio.transport.current(), position, 'volume preserves timing');
  assert.ok(nodes.filter(node => node.type === 'filter').every(node => !node.connections.some(next => next.type === 'room')), 'organ reverb follows its volume bus');
  d.querySelector('.tab[data-page="sheet"]').click(); assert.equal(studio.transport.playing, false); assert.equal(timers.size, 0);
  $('practice-progression').value = 'H7'; $('practice-progression').dispatchEvent(new w.Event('input')); $('practice-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.equal($('practice-play').disabled, true); assert.equal($('practice-error').hidden, false);
  change('practice-bass-style', 'walking'); $('practice-progression').value = 'C/E | F/A | G/B'; studio.generate(1);
  const firstBass = studio.transport.song.events.filter(e => e.track === 'bass' && e.beat < 4);
  assert.equal(firstBass[0].midi % 12, 4); assert.ok(firstBass.slice(1, 3).every(e => [0, 4, 7, 9].includes(e.midi % 12)));
  const A = w.practiceAudio, arrangement = A.arrangement(w.tunerHarmony.parse('I7 | IV7', 'A'), 'shuffle', 2, 2);
  const secondKeys = arrangement.events.filter(e => e.track === 'keys' && e.beat >= 8);
  assert.ok(secondKeys.some(e => Math.abs(e.beat % 1 - 2 / 3) < 1e-7));
  // A tab switch during asynchronous loading must cancel the scheduled start.
  const pending = studio.transport.play(); studio.setMode('library'); await pending; assert.equal(studio.transport.playing, false);
  studio.setMode('backing');
  studio.transport.load(w.practiceAudio.arrangement(w.tunerHarmony.parse('I7 | IV7', 'A'), 'shuffle', 1, 4));
  await studio.transport.seek(10); await studio.transport.setLoop(false); await studio.transport.play(); advance(8);
  assert.equal(studio.transport.playing, false); assert.equal(studio.transport.position, 16, 'turning loop off ends this chorus, not all four arrangements');
  const ids = [...d.querySelectorAll('[id]')].map(node => node.id); assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(problems, []);
  for (const button of d.querySelectorAll('#practice-pane button')) assert.ok(button.textContent.trim() || button.getAttribute('aria-label'));
  console.log('PASS practice: generated TAB, draft retention, local favorites, MIDI, minor blues, 36 audio assets, click/play, tempo, looping, mute routing, cancellation and unique accessible controls');
  studio.stop(); dom.window.close();
})().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
