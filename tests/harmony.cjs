const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const w = {};
vm.runInNewContext(fs.readFileSync('docs/harmony.js', 'utf8'), { window: w });
const H = w.tunerHarmony, plain = x => JSON.parse(JSON.stringify(x));
for (const input of ['2-5-1', '251', 'ii7–V7–Imaj7', 'Dm7 G7 Cmaj7', 'Dm7 → G7 → Cmaj7']) assert.equal(H.parse(input).chords.length, 3, input);
assert.deepEqual(plain(H.parse('ii7 V7 i7', 'A').chords.map(c => c.name)), ['Bm7', 'E7', 'Am7']);
assert.deepEqual(plain(H.parse('bVI7 V7 i7', 'A').chords.map(c => c.name)), ['F7', 'E7', 'Am7']);
assert.deepEqual(plain(H.parse('1 b7 b6 5').chords.map(c => c.root)), [0, 10, 8, 7]);
assert.equal(H.parse('Bm7-5 E7 Am7').chords[0].family, 'half-dim');
assert.equal(H.parse('Cmadd9').chords[0].seventh, false);
assert.deepEqual(plain(H.parse('Cm6/9').chords[0].intervals), [0, 3, 7, 9]);
assert.equal(H.parse('Cm+7').chords[0].intervals[3], 11);
assert.equal(H.parse('C#7').chords[0].name, 'C#7');
assert.equal(H.parse('C/E').chords[0].bass, 4);
assert.equal(H.parse('b7 e7').chords[0].root, 11, 'lowercase BopLand b7 is B7');
assert.deepEqual(plain(H.parse('Dm7 G7 | Cmaj7').chords.map(c => [c.beat, c.beats])), [[0, 2], [2, 2], [4, 4]]);
for (const input of ['H7 G7', 'Dm7 banana C', '<script>', 'C | D E F | G', 'C '.repeat(40), 'V7/ii']) assert.ok(H.parse(input).error, input);
for (const input of ['2-5-1', '2516']) assert.ok(H.matches(H.parse(input), 'dm7 → g7 → cmaj → a7', 'C Major'));
assert.ok(H.matches(H.parse('iiø7 V7 i7'), 'bm7-5 → e7 → am7', 'A Minor'));
assert.equal(H.matches(H.parse('ii7 V7 Imaj7'), 'bm7-5 → e7 → am7', 'A Minor'), false);
assert.equal(H.matches(H.parse('Dm7 G7 Cmaj7'), 'bm7 → e7 → amaj', 'A Major'), false);
assert.ok(H.matches(H.parse('Dm7 G7 Cmaj7'), 'bm7 → e7 → amaj', 'A Major', true));
assert.ok(H.matches(H.parse('2 5 1', 'G'), 'Am7 D7 Gmaj7', 'G'));
assert.ok(H.matches(H.parse('B♭m7 E♭7 A♭maj7'), 'bbm7 → eb7 → abmaj', 'Ab Major'));
assert.equal(H.matches(H.parse('C7'), 'cmaj', 'C'), false);
assert.equal(H.matches(H.parse('Cm7'), 'cm+7', 'C'), false);
let database;
vm.runInNewContext(fs.readFileSync('docs/assets/licks/guitar-index.js', 'utf8'), { bopland: { db: { register: data => database = data } } });
let patterns = 0;
for (const meter of Object.values(database.data.chords)) for (const progression of Object.keys(meter)) {
  const parsed = H.parse(progression); assert.equal(parsed.error, '', progression); patterns++;
}
const changes = H.parse('Dm7 G7 | Cmaj7 A7 | Dm7 G7 | Cmaj7');
const original = H.generate(changes, 4521), repeat = H.generate(changes, 4521), variation = H.generate(changes, 4522);
assert.deepEqual(plain(original), plain(repeat)); assert.notDeepEqual(plain(original.notes), plain(variation.notes));
for (let seed = 0; seed < 60; seed++) {
  for (const note of H.generate(changes, seed).notes) {
    assert.ok(note.midi >= 54 && note.midi <= 79);
    assert.equal([64, 59, 55, 50, 45, 40][note.string] + note.fret, note.midi);
    assert.ok(note.fret >= 0 && note.fret <= 17);
    assert.ok(note.beat + note.duration <= changes.bars.length * 4);
  }
}
console.log(`PASS harmony: ${patterns} real library progressions; degrees, chord qualities, aliases, transposition, invalid input and reproducible playable TAB`);
