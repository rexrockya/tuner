const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://rexrockya.github.io/tuner/', runScripts: 'outside-only' });
const w = dom.window, d = w.document, $ = id => d.getElementById(id), plain = v => JSON.parse(JSON.stringify(v));
w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLElement.prototype.scrollTo = () => {};
Object.defineProperty(w.navigator, 'connection', { value: { saveData: true } });
for (const file of ['storage.js', 'harmony.js', 'lessons.js', 'practice-arrangement.js', 'practice-audio.js', 'practice.js']) w.eval(fs.readFileSync('docs/' + file, 'utf8'));
const S = w.practiceStudio, H = w.tunerHarmony, storageKey = 'tuner-original-licks-v1';
const change = (id, value) => { $(id).value = value; $(id).dispatchEvent(new w.Event('change')); };
const input = value => { $('practice-progression').value = value; $('practice-progression').dispatchEvent(new w.Event('input')); };
const submit = () => $('practice-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
const names = () => plain(S.getProgression().chords.map(c => c.name));
S.setMode('create');
assert.equal($('practice-input-guide').open, false, 'help is initially folded');
assert.equal($('practice-input-guide').querySelector('summary').textContent, '和声怎么输入');
assert.equal($('practice-progression').getAttribute('autocapitalize'), 'off');
const fullExample = '1maj7,57,4sus2,6aug,37,2,7dim,1';
for (const mode of ['create', 'backing']) {
  S.setMode(mode); change('practice-key', 'C');
  input('H7'); submit(); assert.equal($('practice-error').hidden, false);
  input('456456456'); assert.equal($('practice-error').hidden, true, 'new editing clears obsolete error');
  assert.equal($('practice-progression').hasAttribute('aria-invalid'), false);
  assert.equal($('practice-play').disabled, true, 'editing never plays stale music');
  submit(); assert.equal(S.getProgression().bars.length, 9); assert.equal($('practice-play').disabled, false);
  const sample = [...d.querySelectorAll('[data-harmony-example]')].find(b => b.dataset.harmonyExample === fullExample);
  sample.click(); assert.equal($('practice-progression').value, fullExample); assert.equal(d.activeElement, $('practice-progression'));
  assert.equal($('practice-play').disabled, true); assert.equal(S.transport.playing, false);
  submit(); assert.deepEqual(names(), ['Cmaj7', 'G7', 'Fsus2', 'Aaug', 'E7', 'Dm', 'Bdim', 'C']);
  assert.equal($('practice-chart').children.length, 8);
  input('1 b7 3'); submit(); assert.deepEqual(names(), ['C', 'Bb', 'Em']);
  input('2m7 57，1maj7'); submit(); assert.deepEqual(plain(S.getProgression().chords.map(c => [c.beat, c.beats])), [[0,2],[2,2],[4,4]]);
  input('45645645645645645'); submit(); assert.equal($('practice-error').textContent, '练习最多 16 小节');
}
S.setMode('create'); change('practice-key', 'C');
// Old saved numeric text must retain its original melody, timing, and harmony on every refresh.
for (const version of [1, 2]) for (const text of ['57', '37 | 1', 'b7', '1,(b7),37', '1,27b5,37', '1,77b5,37', '1,7Dim7,37', '1,7DIM7,37', Array(16).fill('77 77').join('|'), Array(16).fill('7add13 7add13').join('|')]) {
  const original = H.parse(text, 'C', { legacy: true }), seed = 1729;
  const phrase = version === 1 ? H.generateLegacy(original, seed, 'blues') : H.generate(original, seed, 'blues');
  const saved = { version, text, key: 'C', feel: 'shuffle', seed, bpm: 96, ...(version === 2 ? { phrase } : {}) };
  w.siteStorage.setItem(storageKey, JSON.stringify([saved])); S.setMode('backing'); S.setMode('create'); change('practice-saved', '0');
  const signature = p => plain(p.chords.map(c => [c.root, c.bass, c.intervals, c.beat, c.beats]));
  assert.deepEqual(signature(S.getProgression()), signature(original), 'legacy ' + text);
  assert.deepEqual(plain(S.getPhrase().notes), plain(phrase.notes), 'legacy melody ' + text);
  change('practice-drum-style', 'ride'); assert.deepEqual(signature(S.getProgression()), signature(original));
  $('practice-save').click(); assert.equal(JSON.parse(w.siteStorage.getItem(storageKey))[0].harmonyVersion, 2);
  change('practice-saved', '0'); assert.deepEqual(signature(S.getProgression()), signature(original));
}
input('57'); submit(); $('practice-save').click();
const saved = JSON.parse(w.siteStorage.getItem(storageKey))[0]; assert.equal(saved.harmonyVersion, 2); assert.equal(saved.text, '57');
input('1'); submit(); change('practice-saved', '0'); assert.deepEqual(names(), ['G7']); assert.equal(S.getPhrase().bars, 1);
dom.window.close();
console.log('PASS harmony input UI: folded help/examples, both modes, stale error cleanup, comma timing, bar limits, v1/v2 migration, subsequent arrangement refresh and new saved syntax');
