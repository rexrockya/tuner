const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const win = {};
vm.runInNewContext(fs.readFileSync('docs/harmony.js', 'utf8'), { window: win });
const H = win.tunerHarmony, plain = value => JSON.parse(JSON.stringify(value));
const chart = (input, key = 'C', options) => {
  const result = H.parse(input, key, options);
  assert.equal(result.error, '', `${input} must parse`);
  return result;
};
const names = (input, key, options) => plain(chart(input, key, options).chords.map(chord => chord.name));
const times = input => plain(chart(input).chords.map(({ beat, beats, bar }) => [beat, beats, bar]));

// Numeric suffixes have meaning; commas make boundaries unambiguous on a phone.
const example = '1maj7,57,4sus2,6aug,37,2,7dim,1';
assert.deepEqual(names(example), ['Cmaj7', 'G7', 'Fsus2', 'Aaug', 'E7', 'Dm', 'Bdim', 'C']);
assert.equal(chart(example).bars.length, 8);
assert.deepEqual(names('1maj7，57，4sus2，6aug，37，2，7dim，1'), names(example));
assert.deepEqual(names('3,37,3m7,2,27,2m7'), ['Em', 'E7', 'Em7', 'Dm', 'D7', 'Dm7']);
assert.deepEqual(plain(chart('4sus2,6aug,7dim').chords.map(chord => chord.intervals)), [[0,2,7],[0,4,8],[0,3,6]]);
assert.deepEqual(names('b7,#4,1'), ['Bb', 'F#', 'C']);
assert.deepEqual(names('♭7,♯4,1'), ['Bb', 'F#', 'C']);
assert.deepEqual(names('b7,#4,1', 'G'), ['F', 'Db', 'G']);
assert.deepEqual(names('b7'), ['Bb']);
assert.deepEqual(names('#4'), ['F#']);
assert.deepEqual(names('b77,#4m7,1maj7'), ['Bb7','F#m7','Cmaj7']);

// An otherwise invalid all-digit string remains the familiar compact progression.
assert.deepEqual(names('456456456'), ['F','G','Am','F','G','Am','F','G','Am']);
assert.deepEqual(names('6415'), ['Am','F','C','G']);
assert.deepEqual(names('251'), ['Dm','G','C']);
assert.deepEqual(names('57'), ['G7']);
assert.deepEqual(names('37'), ['E7']);
assert.deepEqual(names('113'), ['C13']);
assert.deepEqual(names('5,7'), ['G','Bdim']);
assert.deepEqual(names('1,1,3'), ['C','C','Em']);
assert.equal(chart('1'.repeat(32)).chords.length, 32);
assert.ok(H.parse('1'.repeat(33)).error);
assert.ok(H.parse('1'.repeat(513)).error.includes('512'));
assert.ok(H.parse('1'.repeat(257), 'C', { legacy: true }).error.includes('256'));
assert.ok(H.parse('456,1').error, 'inside comma-delimited bars, do not silently split a malformed suffix');

// Spaces only share a bar when an explicit bar delimiter is present.
assert.deepEqual(times('2m7 57,1maj7'), [[0,2,0],[2,2,0],[4,4,1]]);
assert.deepEqual(times('1 4 5 1,6'), [[0,1,0],[1,1,0],[2,1,0],[3,1,0],[4,4,1]]);
assert.deepEqual(times('1 b7 3'), [[0,4,0],[4,4,1],[8,4,2]]);
assert.deepEqual(times('Dm7 G7 | Cmaj7'), [[0,2,0],[2,2,0],[4,4,1]]);
for (const input of ['1 2 3,5', '1 2 3 4 5,1', '0,1', '8,1', '4notachord,1', 'b8,1']) assert.ok(H.parse(input).error, input);
assert.deepEqual(names('6-4-1-5'), ['Am','F','C','G']);
assert.deepEqual(names('ii7 V7 Imaj7'), ['Dm7','G7','Cmaj7']);
assert.deepEqual(names('Dm7 G7 Cmaj7'), ['Dm7','G7','Cmaj7']);
assert.deepEqual(names('C/E,F/A,G/B'), ['C/E','F/A','G/B']);
assert.deepEqual(names('b7 e7'), ['B7','E7'], 'a lowercase chord-name progression keeps source notation');
assert.equal(H.chord('b7').name, 'B7', 'single chord decoding used by source playback remains note-name based');

// Legacy parsing is kept explicitly for old saved text and imported sources.
const legacy = { legacy: true };
assert.deepEqual(names('57', 'C', legacy), ['G','Bdim']);
assert.deepEqual(names('37 | 1', 'C', legacy), ['Em7','C']);
assert.deepEqual(names('b7', 'C', legacy), ['B7']);
assert.ok(H.parse('456456456', 'C', legacy).error);
assert.deepEqual(names('2-5-1', 'C', legacy), ['Dm','G','C']);
assert.deepEqual(names('iiø7 V7 i7', 'A Minor', legacy), ['Bm7b5','E7','Am7']);
assert.ok(H.matches(chart('37'), 'e7', 'C'));
assert.equal(H.matches(chart('37'), 'em7', 'C'), false);
assert.ok(H.matches(chart('b7'), 'bbmaj', 'C'));
assert.ok(H.matches(chart('7,3'), 'b7 → e7', 'C'), 'source lowercase B7 does not turn into bVII');
assert.ok(H.matches(chart('6415'), 'am7 → fmaj → cmaj → g7', 'C'));

let index;
vm.runInNewContext(fs.readFileSync('docs/assets/licks/guitar-index.js', 'utf8'), { bopland: { db: { register: value => index = value } } });
let sourceProgressions = 0;
for (const group of Object.values(index.data.chords)) for (const input of Object.keys(group)) {
  chart(input, 'C', legacy);
  sourceProgressions++;
}
// The generator, arrangement, and notation all consume the same aligned chord data.
for (const input of [example, 'b7,#4,1', '2m7 57,1maj7', '456456456']) {
  const parsed = chart(input), phrase = H.generate(parsed, 1729);
  assert.equal(phrase.bars, parsed.bars.length);
  for (const note of phrase.notes) {
    const owner = parsed.chords.find(chord => note.beat >= chord.beat && note.beat < chord.beat + chord.beats);
    assert.ok(owner, 'every note belongs to a requested chord');
    assert.ok(note.beat + note.duration <= owner.beat + owner.beats + 1e-6, 'new suffixes retain harmonic boundaries');
  }
}
console.log(`PASS harmony input: numeric suffixes, altered degrees, comma bars, compact input, legacy source compatibility (${sourceProgressions} progressions), search and generator bounds`);
