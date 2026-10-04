/** Build source-preserving fretboard data. No transcription, OMR or phrase generation. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = 'docs/assets/licks/fretboard';
const OPEN = [0, 64, 59, 55, 50, 45, 40];
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
const normalize = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const pitch = n => NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
const UNAVAILABLE = 'source-note-data-unavailable';

function checkSourceAsset(asset, expected) {
  const actual = hash(`docs/${asset}`);
  if (actual === expected) return { actualSha256: actual, manifestSha256: expected, match: 'byte-identical' };
  // Git checks out text as LF, while this dataset's original generator ran with CRLF.
  // Only that reversible newline difference is permitted; audio is always byte-checked.
  if (/\.(json|svg)$/.test(asset)) {
    const crlf = read(`docs/${asset}`).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    const crlfHash = crypto.createHash('sha256').update(crlf).digest('hex');
    if (crlfHash === expected) return { actualSha256: actual, manifestSha256: expected, match: 'CRLF-to-LF-checkout-only' };
  }
  assert.equal(actual, expected, `Source asset changed beyond permitted text line endings: ${asset}`);
}

export function loadInputs() {
  let bopland, guitarset;
  vm.runInNewContext(read('docs/assets/licks/guitar-index.js'), {
    bopland: { db: { register: data => { bopland = data; } } }
  });
  vm.runInNewContext(read('docs/assets/licks/guitarset-index.js'), {
    window: { lessonPlayer: { registerSupplemental: data => { guitarset = data; } } }
  });
  // Match the original library's established categories and ordering exactly.
  const categories = JSON.parse(read('docs/lessons.js').match(/const BOPLAND_CATEGORIES = (\[[\s\S]*?\]);/)[1]);
  return { bopland: JSON.parse(JSON.stringify(bopland)), guitarset: JSON.parse(JSON.stringify(guitarset)), categories };
}

export function buildCatalog() {
  const { bopland, guitarset, categories } = loadInputs();
  const provenance = json('docs/assets/licks/guitarset/manifest.json');
  const sources = {
    bopland: {
      name: 'BopLand.org', type: 'bopland', url: 'https://bopland.org/database#guitar-licks/',
      license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: 'BopLand.org guitar TAB and original demonstration audio',
      evidence: 'source/research.json'
    },
    guitarset: {
      name: 'GuitarSet', type: 'guitarset', version: '1.1.0', url: 'https://zenodo.org/records/3371780',
      license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      authors: provenance.authors,
      citation: 'Q. Xi, R. M. Bittner, J. Pauwels, X. Ye, J. P. Bello. GuitarSet: A Dataset for Guitar Transcription. ISMIR, 2018.'
    }
  };
  const patterns = [];
  bopland.index.forEach((category, i) => category.keys.forEach(([keyCode, key, chords]) => {
    patterns.push({ group: categories[i] || '其他进行', keyCode, key, meter: category.time, progression: normalize(chords) });
  }));
  const entries = new Map(), counters = {};
  for (const [meter, progressions] of Object.entries(bopland.data.chords)) {
    for (const [rawProgression, ids] of Object.entries(progressions)) {
      const progression = normalize(rawProgression);
      const match = patterns.filter(p => (!p.meter || p.meter === meter) && progression.includes(p.progression))
        .sort((a, b) => b.progression.length - a.progression.length)[0];
      const group = match?.group || (meter === '3/4' ? 'Waltz / 3/4' : meter === '5/4' ? 'Take Five / 5/4' : '其他进行');
      const key = match?.key || '其他调性';
      const bars = rawProgression.split('|').map(s => s.trim()).filter(Boolean);
      for (const id of ids) {
        if (entries.has(id)) continue;
        assert.match(id, /^[A-Za-z0-9]+$/);
        counters[group] = (counters[group] || 0) + 1;
        const title = `${group} · ${key} · ${counters[group]}`;
        entries.set(id, {
          id, title, name: title, group, key, keyCode: match?.keyCode || 'other', meter, bars: bars.length,
          chord: bars.join(' → '), progression: rawProgression, barChords: bars.map(bar => bar.split(/\s+/)), sourceType: 'bopland',
          score: `https://bopland.org/data/${id}.png`, audio: `https://bopland.org/data/${id}.mp3`,
          originalBpm: null, supported: false, data: null, unsupportedReason: UNAVAILABLE,
          navigationMode: 'harmony-only', harmonyTiming: 'bar-membership-only',
          harmonicMapLabel: '和弦地图，尚未核对原谱逐音路线'
        });
      }
    }
  }
  const lesson1297 = json(`${OUTPUT}/source/lesson1297.json`);
  const supported = new Map([[lesson1297.id, lesson1297]]);
  assert(entries.has(lesson1297.id), 'The verified original lesson must still be present in the source catalog');
  Object.assign(entries.get(lesson1297.id), {
    supported: true, data: `assets/licks/fretboard/${lesson1297.id}.json`, unsupportedReason: null,
    noteCount: lesson1297.notes.length, legacyId: lesson1297.legacyId, navigationMode: 'source-notes',
    harmonyTiming: 'source-score', harmonicMapLabel: null
  });
  for (const item of guitarset) {
    assert(!entries.has(item.id), `Duplicate source lesson ID: ${item.id}`);
    const annotation = json(`docs/${item.annotation}`);
    const proof = provenance.files.find(p => p.id === item.id);
    assert(proof, `Missing original provenance: ${item.id}`);
    const assetChecks = Object.fromEntries([[item.audio, proof.audioSha256], [item.score, proof.scoreSha256], [item.annotation, proof.annotationSha256]]
      .map(([asset, expected]) => [asset, checkSourceAsset(asset, expected)]));
    assert.equal(annotation.originalBpm, item.originalBpm);
    const ratio = item.originalBpm / 60;
    const durationSeconds = annotation.endSeconds - annotation.startSeconds;
    const duration = durationSeconds * ratio;
    const notes = annotation.notes.map((n, index) => {
      const start = n.time * ratio;
      return {
        index, midi: n.midi, string: 6 - n.stringIndex, fret: n.fret, name: pitch(n.midi),
        start, duration: n.duration * ratio, bar: Math.floor(start / 4) + 1, beat: start % 4 + 1,
        timeSeconds: n.time, durationSeconds: n.duration, carryIn: n.carryIn,
        sourceTimeSeconds: n.sourceTime, sourceDurationSeconds: n.sourceDuration,
        sourceMidi: n.sourceMidi, stringIndex: n.stringIndex,
        // Verbatim original annotation fields preserve fractional source MIDI and unrounded source timing.
        annotation: { ...n }
      };
    });
    const lesson = {
      schemaVersion: 1, id: item.id, title: item.name, meter: item.meter, bars: item.bars,
      timeUnit: 'quarter-note-beats', duration, durationSeconds, originalBpm: item.originalBpm,
      notation: 'guitarset-performance-annotation', notes,
      chords: item.chords.map((name, bar) => ({
        name, start: bar * 4, duration: Math.max(0, Math.min(4, duration - bar * 4)), bar: bar + 1, beat: 1,
        precision: 'per-bar-sample', sampledAtBeat: bar * 4 + 1,
        // The existing score samples the instructed chord at beat 2, not every chord boundary.
        exactChangeTiming: false
      })),
      audio: item.audio, score: item.score, annotation: item.annotation,
      source: { ...sources.guitarset, track: item.sourceTrack, measures: [...item.sourceMeasures] },
      timing: {
        basis: 'source-performance-annotation', audioSync: 'annotation-relative',
        audioOffsetSeconds: 0, originalBpm: item.originalBpm,
        sourceStartSeconds: annotation.startSeconds, sourceEndSeconds: annotation.endSeconds,
        startSample: annotation.startSample, endSample: annotation.endSample, sampleRate: annotation.sampleRate,
        chordPrecision: 'per-bar-sample',
        chordCaveat: 'Chord names are the existing instructed-annotation sample at beat 2 of each bar; displayed bar spans are navigation regions, not verified exact chord-change boundaries.',
        noteCaveat: 'Source annotation, not independent manual transcription; bends and articulations remain in original audio.'
      },
      verification: {
        method: 'lossless-source-annotation-mapping', noteCount: notes.length,
        sourceAudioSha256: proof.sourceAudioSha256, sourceAnnotationSha256: proof.sourceAnnotationSha256,
        audioSha256: hash(`docs/${item.audio}`), scoreSha256: hash(`docs/${item.score}`), annotationSha256: hash(`docs/${item.annotation}`),
        assetChecks,
        sourcePitchSpellingKnown: false
      }
    };
    supported.set(item.id, lesson);
    entries.set(item.id, {
      id: item.id, title: item.name, name: item.name, group: item.group, key: item.key, keyCode: item.keyCode,
      meter: item.meter, bars: item.bars, chord: item.chord, progression: `| ${item.chords.join(' | ')} |`,
      barChords: item.chords.map(name => [name]),
      sourceType: item.sourceType, score: item.score, audio: item.audio, annotation: item.annotation,
      originalBpm: item.originalBpm, supported: true, data: `assets/licks/fretboard/${item.id}.json`,
      unsupportedReason: null, noteCount: notes.length, navigationMode: 'source-notes',
      harmonyTiming: 'per-bar-sample', harmonicMapLabel: null
    });
  }
  const catalog = {
    schemaVersion: 1, total: entries.size, supportedCount: supported.size,
    preciseNavigationCount: supported.size,
    harmonicProgressionCount: entries.size,
    unsupportedCount: entries.size - supported.size,
    defaultLessonId: lesson1297.id, sources,
    unsupportedReasons: {
      [UNAVAILABLE]: '原谱目前仅有图片；尚无核验的逐音、节奏与指法资料。请查看原谱与原示范音频。'
    },
    lessons: [...entries.values()]
  };
  validate(catalog, supported);
  return { catalog, supported };
}

export function validate(catalog, supported) {
  assert.equal(catalog.total, 2545);
  assert.equal(catalog.supportedCount, 21);
  assert.equal(catalog.unsupportedCount, 2524);
  assert.equal(new Set(catalog.lessons.map(n => n.id)).size, catalog.total);
  for (const entry of catalog.lessons) {
    assert.equal(entry.supported, supported.has(entry.id));
    assert.equal(Boolean(entry.data), entry.supported);
    if (!entry.supported) assert.equal(entry.unsupportedReason, UNAVAILABLE);
  }
  for (const [id, lesson] of supported) {
    assert.equal(id, lesson.id);
    assert.equal(lesson.timeUnit, 'quarter-note-beats');
    assert(lesson.notes.length > 0);
    assert(lesson.source.license && lesson.source.url);
    let previous = -Infinity;
    for (const note of lesson.notes) {
      assert(Number.isInteger(note.midi));
      assert(Number.isInteger(note.string) && note.string >= 1 && note.string <= 6);
      assert(Number.isInteger(note.fret) && note.fret >= 0 && note.fret <= 24);
      assert.equal(OPEN[note.string] + note.fret, note.midi, `${id}: MIDI must match original TAB`);
      assert(Number.isFinite(note.start) && note.start >= 0 && note.start >= previous);
      assert(Number.isFinite(note.duration) && note.duration > 0);
      assert(note.start + note.duration <= lesson.duration + 0.00001, `${id}: note extends beyond source clip`);
      previous = note.start;
    }
  }
}

export function buildOutputs() {
  const { catalog, supported } = buildCatalog();
  const outputs = new Map();
  const encode = value => JSON.stringify(value) + '\n';
  outputs.set(`${OUTPUT}/catalog.json`, encode(catalog));
  for (const [id, lesson] of supported) outputs.set(`${OUTPUT}/${id}.json`, encode(lesson));
  const assetProof = [...supported].map(([id, lesson]) => ({
    id, noteCount: lesson.notes.length, method: lesson.verification.method,
    dataSha256: crypto.createHash('sha256').update(outputs.get(`${OUTPUT}/${id}.json`)).digest('hex')
  }));
  outputs.set(`${OUTPUT}/manifest.json`, JSON.stringify({
    schemaVersion: 1, catalogTotal: catalog.total, supportedTotal: catalog.supportedCount,
    preciseNavigationTotal: catalog.preciseNavigationCount, unsupportedTotal: catalog.unsupportedCount,
    harmonicProgressionTotal: catalog.harmonicProgressionCount,
    harmonicChordTokenTotal: catalog.lessons.reduce((sum, lesson) => sum + lesson.barChords.reduce((subtotal, bar) => subtotal + bar.length, 0), 0),
    harmonyOnlyTotal: catalog.lessons.filter(lesson => lesson.navigationMode === 'harmony-only').length,
    sources: [{ source: 'bopland', total: 2525, supported: 1, unsupported: 2524 }, { source: 'guitarset', total: 20, supported: 20, unsupported: 0 }],
    noteTotal: [...supported.values()].reduce((sum, lesson) => sum + lesson.notes.length, 0),
    sourceInputs: [
      'docs/assets/licks/guitar-index.js', 'docs/assets/licks/guitarset-index.js',
      'docs/assets/licks/guitarset/manifest.json', `${OUTPUT}/source/lesson1297.json`
    ].map(file => ({ file, sha256: hash(file) })),
    catalogSha256: crypto.createHash('sha256').update(outputs.get(`${OUTPUT}/catalog.json`)).digest('hex'),
    research: 'source/research.json', files: assetProof,
    policy: 'No newly composed, generated, transposed or OMR-derived notes are substituted for unavailable original guitar phrases.'
  }, null, 2) + '\n');
  return outputs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const outputs = buildOutputs();
  for (const [file, content] of outputs) {
    if (check) assert.equal(read(file), content, `Generated file is stale: ${file}`);
    else {
      fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
      fs.writeFileSync(path.join(ROOT, file), content);
    }
  }
  console.log(`${check ? 'Verified' : 'Built'} 2,545 catalog entries; 21 source-preserving lessons; 2,524 explicit source-data gaps (${outputs.size} files).`);
}
