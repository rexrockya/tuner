import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildCatalog, buildOutputs, loadInputs } from './build-fretboard-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
const OPEN = [0, 64, 59, 55, 50, 45, 40];
const { catalog, supported } = buildCatalog();
const { bopland, guitarset } = loadInputs();

// Catalog identity is the original full library, not a selected/generated substitute.
const originalIds = new Set(Object.values(bopland.data.chords).flatMap(progressions => Object.values(progressions).flat()));
assert.equal(originalIds.size, 2525);
for (const entry of guitarset) originalIds.add(entry.id);
assert.equal(originalIds.size, 2545);
assert.deepEqual(new Set(catalog.lessons.map(x => x.id)), originalIds);
assert.equal(catalog.total, 2545);
assert.equal(catalog.preciseNavigationCount, 21);
assert.equal(catalog.supportedCount, 21);
assert.equal(catalog.unsupportedCount, 2524);
assert.equal(catalog.harmonicProgressionCount, 2545);
assert.deepEqual(new Set(catalog.lessons.map(x => x.meter)), new Set(['4/4', '3/4', '5/4']));

for (const entry of catalog.lessons) {
  assert.match(entry.id, /^[A-Za-z0-9]+$/);
  assert.equal(entry.bars, entry.barChords.length);
  assert(entry.barChords.every(bar => bar.length > 0 && bar.every(chord => typeof chord === 'string' && chord.length)));
  assert.deepEqual(entry.barChords, entry.progression.split('|').map(s => s.trim()).filter(Boolean).map(bar => bar.split(/\s+/)));
  assert(!Object.hasOwn(entry, 'notes'), 'Catalog must not synthesize notes for unavailable phrases');
  if (entry.sourceType === 'bopland') {
    assert.equal(entry.score, `https://bopland.org/data/${entry.id}.png`);
    assert.equal(entry.audio, `https://bopland.org/data/${entry.id}.mp3`);
    assert.equal(entry.originalBpm, null, 'Unknown original tempos must remain unknown');
  }
  if (entry.supported) {
    assert.equal(entry.navigationMode, 'source-notes');
    assert.equal(entry.data, `assets/licks/fretboard/${entry.id}.json`);
    assert.equal(entry.unsupportedReason, null);
  } else {
    assert.equal(entry.navigationMode, 'harmony-only');
    assert.equal(entry.harmonyTiming, 'bar-membership-only');
    assert.equal(entry.harmonicMapLabel, '和弦地图，尚未核对原谱逐音路线');
    assert.equal(entry.data, null);
    assert.equal(entry.unsupportedReason, 'source-note-data-unavailable');
    assert(!supported.has(entry.id));
    assert(!fs.existsSync(path.join(ROOT, `docs/assets/licks/fretboard/${entry.id}.json`)));
  }
}

// Independent fixture checked against the original BopLand PNG, not derived from the UI model.
const originalTab = [[5,7],[4,5],[3,4],[3,7],[3,6],[2,5],[1,3],[1,6],
  [1,5],[2,6],[2,3],[3,5],[3,4],[4,5],[4,6],[4,8],
  [4,5],[2,5],[3,7],[3,5],[3,6],[4,8],[4,5],[4,6],
  [4,7],[5,8],[5,5],[5,8]];
const originalMidi = [52,55,59,62,61,64,67,70,69,65,62,60,59,55,56,58,55,64,62,60,61,58,55,56,57,53,50,53];
const originalDurations = [...Array(24).fill(0.5), 1, 0.5, 0.5, 2];
const bop = supported.get('Xbv40aTf');
assert.equal(bop.legacyId, 'lesson1297');
assert.deepEqual(bop.notes.map(n => [n.string, n.fret]), originalTab);
assert.deepEqual(bop.notes.map(n => n.midi), originalMidi);
assert.deepEqual(bop.notes.map(n => n.duration), originalDurations);
let beat = 0;
for (const note of bop.notes) { assert.equal(note.start, beat); beat += note.duration; }
assert.equal(beat, 16);
assert.deepEqual(bop.chords.map(c => c.name), ['Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7']);
assert.deepEqual(bop.chords.map(c => c.start), [0,2,4,6,8,10,12,14]);
assert(bop.chords.every(c => c.duration === 2 && c.precision === 'source-score'));
assert.equal(bop.notes[23].name, 'G♯3');
assert.equal(bop.notes[23].analysis.verified, true);
assert.equal(bop.originalBpm, null);
assert.equal(bop.timing.audioSync, 'unverified');
assert.equal(bop.source.license, 'CC BY-SA 4.0');

// Every GuitarSet event is retained, including overlapping sustains and crop carry-ins.
let gsNotes = 0, carryIns = 0, overlaps = 0;
const originalAssets = [];
for (const item of guitarset) {
  const lesson = supported.get(item.id), raw = json(`docs/${item.annotation}`);
  const ratio = item.originalBpm / 60;
  assert(lesson);
  assert.equal(lesson.notes.length, raw.notes.length);
  gsNotes += raw.notes.length;
  assert.equal(lesson.audio, item.audio);
  assert.equal(lesson.score, item.score);
  assert.equal(lesson.originalBpm, item.originalBpm);
  assert.equal(lesson.durationSeconds, raw.endSeconds - raw.startSeconds);
  assert.equal(lesson.duration, (raw.endSeconds - raw.startSeconds) * ratio);
  assert.equal(lesson.timing.sourceStartSeconds, raw.startSeconds);
  assert.equal(lesson.timing.sourceEndSeconds, raw.endSeconds);
  assert.equal(lesson.timing.startSample, raw.startSample);
  assert.equal(lesson.timing.endSample, raw.endSample);
  assert.equal(lesson.timing.sampleRate, raw.sampleRate);
  assert.equal(lesson.timing.audioSync, 'annotation-relative');
  assert.equal(lesson.source.license, 'CC BY 4.0');
  assert.deepEqual(lesson.source.measures, Array.from(item.sourceMeasures));
  for (let i = 0; i < raw.notes.length; i++) {
    const note = lesson.notes[i], source = raw.notes[i];
    assert.deepEqual(note.annotation, source);
    assert.equal(note.midi, source.midi);
    assert.equal(note.string, 6 - source.stringIndex);
    assert.equal(note.fret, source.fret);
    assert.equal(note.timeSeconds, source.time);
    assert.equal(note.durationSeconds, source.duration);
    assert.equal(note.start, source.time * ratio);
    assert.equal(note.duration, source.duration * ratio);
    assert.equal(note.sourceTimeSeconds, source.sourceTime);
    assert.equal(note.sourceDurationSeconds, source.sourceDuration);
    assert.equal(note.sourceMidi, source.sourceMidi);
    assert.equal(note.carryIn, source.carryIn);
    assert.equal(note.midi, OPEN[note.string] + note.fret);
    if (note.carryIn) carryIns++;
    if (i && raw.notes.slice(0, i).some(prior => prior.time + prior.duration > source.time)) overlaps++;
  }
  lesson.chords.forEach((chord, i) => {
    assert.equal(chord.name, item.chords[i]);
    assert.equal(chord.precision, 'per-bar-sample');
    assert.equal(chord.exactChangeTiming, false);
    assert.equal(chord.sampledAtBeat, i * 4 + 1);
  });
  for (const asset of [item.audio, item.score, item.annotation]) {
    const file = `docs/${asset}`, actual = sha(file);
    originalAssets.push([file, actual]);
    assert.equal(lesson.verification.assetChecks[asset].actualSha256, actual);
    if (asset.endsWith('.mp3')) assert.equal(lesson.verification.assetChecks[asset].match, 'byte-identical');
  }
}
assert.equal(gsNotes, 595);
assert(carryIns > 0, 'Carry-in source notes must not be dropped');
assert(overlaps > 0, 'Overlapping source notes must not be flattened');

// The checked-in artifacts must be reproducible, and building must not alter original media.
const firstBuild = buildOutputs(), secondBuild = buildOutputs();
assert.deepEqual(firstBuild, secondBuild);
for (const [file, content] of firstBuild) assert.equal(read(file), content, `Stale generated file: ${file}`);
for (const [file, before] of originalAssets) assert.equal(sha(file), before, `Build mutated source asset: ${file}`);
const manifest = json('docs/assets/licks/fretboard/manifest.json');
assert.equal(manifest.noteTotal, 623);
assert.equal(manifest.catalogSha256, sha('docs/assets/licks/fretboard/catalog.json'));
for (const file of manifest.files) assert.equal(file.dataSha256, sha(`docs/assets/licks/fretboard/${file.id}.json`));

console.log(`Fretboard catalog verified: 2,545 original IDs; 21 precise lessons / 623 unchanged note events; 2,524 honest harmony-only entries; ${carryIns} carry-ins and ${overlaps} overlaps retained.`);
