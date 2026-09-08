'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const sandbox = { window: {} }; vm.createContext(sandbox);
for (const file of [path.resolve('docs/harmony.js'), process.env.ARRANGEMENT_FILE || path.resolve('docs/practice-arrangement.js')]) vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
const A = sandbox.window.practiceArrangements, H = sandbox.window.tunerHarmony, plain = x => JSON.parse(JSON.stringify(x));
const cases = ['C7', 'C7 F7 G7 C7', 'Dm7 G7 | Cmaj7', '4536251', 'C/E | F/A | G/B', 'Bdim | F#m7b5 | G7 | Cm'];
const sampleNames = new Set(['hat-1', 'hat-2', 'kick-1', 'kick-2', 'snare-1', 'snare-2', 'ride', 'open-hat']);
const trackStyles = { bass: 'bassStyles', drums: 'drumStyles', keys: 'keyStyles', rhythm: 'rhythmStyles' };
const optionFields = { bass: 'bassStyle', drums: 'drumStyle', keys: 'keyStyle', rhythm: 'rhythmStyle' };
let validated = 0;
function validate(song, parsed, options) {
  const pitchEnds = new Map(), drumAttacks = new Set();
  assert.equal(song.chartBeats, parsed.bars.length * 4);
  assert.equal(song.beats, song.chartBeats * song.chorusStyles.length);
  let lastBeat = -1;
  for (const e of song.events) {
    assert.ok(Number.isFinite(e.beat) && e.beat >= lastBeat && e.beat >= 0 && e.beat < song.beats, 'sorted events inside the song'); lastBeat = e.beat;
    assert.ok(Number.isFinite(e.duration) && e.duration > 0 && e.beat + e.duration <= song.beats + 1e-7, 'positive bounded duration');
    assert.ok(e.velocity > 0 && e.velocity <= 1, 'bounded velocity');
    const chorus = Math.floor((e.beat + 1e-7) / song.chartBeats), localBeat = e.beat - chorus * song.chartBeats;
    const style = song.chorusStyles[chorus][e.track];
    assert.notEqual(style, 'none', 'a disabled track produces no events');
    assert.equal(song[trackStyles[e.track]][chorus], style, 'track metadata matches the chorus');
    if (e.fill) assert.ok(localBeat >= song.chartBeats - (song.chartBeats === 4 ? 1 : 2) - 1e-7, 'fills only occupy the final one/two beats');
    if (e.track === 'drums') {
      assert.ok(sampleNames.has(e.sample), 'every drum uses a bundled playable sample');
      const family = e.sample.replace(/-\d+$/, ''), attack = `${family}:${e.beat.toFixed(6)}`;
      assert.ok(!drumAttacks.has(attack), 'no doubled attack when a fill replaces a backbeat'); drumAttacks.add(attack);
    } else {
      assert.ok(Number.isInteger(e.midi) && e.midi >= 28 && e.midi <= 96, 'all pitches remain playable');
      const chord = parsed.chords.find(c => localBeat >= c.beat - 1e-7 && localBeat < c.beat + c.beats - 1e-7);
      assert.ok(chord, 'every note belongs to the current chord');
      assert.ok(e.beat + e.duration <= chorus * song.chartBeats + chord.beat + chord.beats + 1e-7, 'notes never bleed into the next harmony');
      const voice = `${e.track}:${e.midi}`;
      assert.ok(!pitchEnds.has(voice) || pitchEnds.get(voice) <= e.beat + 1e-7, 'repeated pitches release before their next attack'); pitchEnds.set(voice, e.beat + e.duration);
      if (e.fill) {
        const chordPc = chord.intervals.map(i => H.mod(chord.root + i));
        assert.ok(chordPc.includes(e.midi % 12), 'fill voicings remain in the current chord');
      }
    }
  }
  for (let chorus = 0; chorus < song.chorusStyles.length; chorus++) {
    for (const track of ['drums', 'keys', 'rhythm']) {
      const fills = song.events.filter(e => e.track === track && e.fill && Math.floor((e.beat + 1e-7) / song.chartBeats) === chorus);
      assert.equal(fills.length > 0, song.chorusStyles[chorus][track] !== 'none', 'every enabled player responds at every progression ending');
    }
  }
  for (const track of Object.keys(trackStyles)) {
    const chosen = song[trackStyles[track]], requested = options?.[optionFields[track]];
    if (!requested || requested === 'auto') {
      for (let i = 1; i < chosen.length; i++) assert.notEqual(chosen[i], chosen[i - 1], 'auto styles change after a full progression');
      if (chosen.length > 1) assert.notEqual(chosen[0], chosen.at(-1), 'auto style also changes when the whole arrangement loops');
    } else assert.ok(chosen.every(s => s === requested), 'an explicit style remains selected');
  }
  validated++;
}
for (const text of cases) for (const feel of Object.keys(A.feels)) {
  const parsed = H.parse(text, 'C'); assert.equal(parsed.error, '');
  validate(A.arrangement(parsed, feel, 47, 4), parsed);
  for (const [track, catalog] of Object.entries(trackStyles)) for (const style of Object.keys(A[catalog])) {
    const options = { [optionFields[track]]: style };
    validate(A.arrangement(parsed, feel, 83, 3, options), parsed, options);
  }
}
const chart = H.parse('C/E | F/A | G/B');
const deterministic = A.arrangement(chart, 'shuffle', 182, 4);
assert.deepEqual(plain(A.arrangement(chart, 'shuffle', 182, 4)), plain(deterministic), 'the seed reproduces notes and styles');
assert.notDeepEqual(plain(A.arrangement(chart, 'shuffle', 183, 4)), plain(deterministic), 'another seed supplies a different arrangement');
for (const track of ['drums', 'keys', 'rhythm']) {
  const option = { [optionFields[track]]: Object.keys(A[trackStyles[track]]).find(s => !['none', 'auto'].includes(s)) };
  const edited = A.arrangement(chart, 'shuffle', 182, 4, option);
  assert.deepEqual(plain(edited.events.filter(e => e.track !== track)), plain(deterministic.events.filter(e => e.track !== track)), 'editing one player retains the other players exactly');
}
const muted = A.arrangement(chart, 'shuffle', 1, 4, { keyStyle: 'none', rhythmStyle: 'none' });
assert.ok(muted.events.every(e => !['keys', 'rhythm'].includes(e.track)));
assert.ok(A.arrangement(chart, 'shuffle', 1, 4, { rhythm: false }).events.every(e => e.track !== 'rhythm'), 'legacy rhythm toggle remains compatible');
for (const c of chart.chords) {
  const first = deterministic.events.find(e => e.track === 'bass' && e.beat === c.beat);
  assert.equal(first.midi % 12, c.bass, 'slash-chord bass lands on the requested inversion');
}
const fixed = A.arrangement(H.parse('C7 | F7'), 'shuffle', 32, 4, { drumStyle: 'shuffle', keyStyle: 'soul', rhythmStyle: 'boogie' });
const drumFill = chorus => plain(fixed.events.filter(e => e.track === 'drums' && e.fill && Math.floor(e.beat / fixed.chartBeats) === chorus).map(e => ({ sample: e.sample, beat: e.beat - chorus * fixed.chartBeats })));
assert.notDeepEqual(drumFill(0), drumFill(1), 'fixed-style drum fills alternate without changing the groove');
for (const track of ['keys', 'rhythm']) {
  const ending = chorus => plain(fixed.events.filter(e => e.track === track && e.fill && Math.floor(e.beat / fixed.chartBeats) === chorus).map(e => ({ midi: e.midi, beat: e.beat - chorus * fixed.chartBeats })));
  assert.notDeepEqual(ending(0), ending(1), 'fixed-style keys and guitar responses also develop between choruses');
}
for (const track of ['drums', 'keys', 'rhythm']) {
  const signatures = Object.keys(A[trackStyles[track]]).filter(s => !['none', 'auto'].includes(s)).map(style => {
    const s = A.arrangement(H.parse('C7 | C7'), 'straight', 1, 1, { [optionFields[track]]: style });
    return JSON.stringify(s.events.filter(e => e.track === track && !e.fill).map(e => [e.beat, e.midi, e.sample, e.duration]));
  });
  assert.equal(new Set(signatures).size, signatures.length, 'every named style has a distinct playable rhythm/texture');
}
const expectedPools = { shuffle:['shuffle','ride','backbeat'],slow:['ride','halftime','shuffle'],straight:['backbeat','boogie','funk'],boogie:['boogie','shuffle','backbeat'],soul:['backbeat','halftime','ride'],funk:['funk','backbeat','halftime'],halftime:['halftime','backbeat','ride'],latin:['latin','funk','ride'] };
for (const [feel, definition] of Object.entries(A.feels)) for (let seed = 0; seed < 32; seed++) {
  const song = A.arrangement(H.parse('C7 | F7'), feel, seed, 4);
  assert.ok(song.drumStyles.every(style => expectedPools[feel].includes(style)), 'auto players come from the selected feel');
  const fractions = [0, definition.swing / 2, definition.swing, definition.swing + (1 - definition.swing) / 2];
  for (const hit of song.events.filter(e => e.track === 'drums' && !e.fill && (e.sample === 'ride' || e.sample.startsWith('hat-')))) {
    const raw = hit.beat - .006, fraction = raw - Math.floor(raw + 1e-7);
    assert.ok(fractions.some(value => Math.abs(value - fraction) < 1e-7), 'auto cymbals retain the feel swing instead of imposing a conflicting swing grid');
  }
}
const contrasting = A.arrangement(H.parse('C7 | F7'), 'straight', 1, 1, { drumStyle: 'shuffle' });
assert.ok(contrasting.events.some(e => e.track === 'drums' && e.sample.startsWith('hat-') && Math.abs(e.beat - (.006 + 2 / 3)) < 1e-7), 'an explicit shuffle deliberately overrides straight feel');
const feelSignatures = new Set(Object.keys(A.feels).map(feel => A.arrangement(H.parse('I7 | IV7 | I7 | V7','A'), feel, 912, 4, { bassStyle:'walking' }).events.filter(e => e.track === 'drums').map(e => e.beat + e.sample).join('|')));
assert.equal(feelSignatures.size, 8, 'the former eight-feel example still provides eight musically different auto arrangements');
assert.throws(() => A.arrangement(H.parse('invalid')));
assert.equal(A.arrangement(chart, 'invalid', 1, -2).chorusStyles.length, 1);
assert.equal(A.arrangement(chart, 'shuffle', 1, 1000000).chorusStyles.length, 32, 'untrusted chorus counts remain bounded');
console.log(`PASS arrangement: ${validated} arrangements across 8 feels, all styles, short/split/7-bar charts, bounded fills, live-track isolation, seeded diversity, slash bass and none`);
