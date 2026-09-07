const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

// Run from repository root: node tests/piano-coverage.cjs
// No network or audio hardware; reads the exact browser helper, shipped sample
// library and shipped score bundles instead of duplicating a piano preset.
const docs = path.resolve('docs');
const plain = value => JSON.parse(JSON.stringify(value));
const sampleNames = preset => [...new Set(preset.groups.flatMap(group => group.regions.map(region => region.sample)))];
function selectedRegions(preset, pitch, velocity) {
  return preset.groups.flatMap(group => {
    if (velocity < group.velRange[0] || velocity > group.velRange[1]) return [];
    const { regions, ...settings } = group;
    return regions.filter(region => pitch >= region.keyRange[0] && pitch <= region.keyRange[1])
      .map(region => plain({ settings, region }));
  });
}

(async () => {
  const library = await import(pathToFileURL(path.join(docs, 'assets/audio/smplr-1.0.0.mjs')));
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(docs, 'score-audio.js'), 'utf8'), context);
  const { pianoPresetForScore, scoreVelocity } = context.window.scoreAudio;
  assert.equal(typeof pianoPresetForScore, 'function');
  assert.equal(typeof scoreVelocity, 'function');
  const full = library.pianoToPreset({
    baseUrl: 'https://smpldsnds.github.io/sfzinstruments-splendid-grand-piano/samples',
    detune: 0, decayTime: 1.25
  });
  const originalLayers = JSON.stringify(library.LAYERS);
  const fullNames = sampleNames(full);
  assert.equal(fullNames.length, 226, 'baseline instrument must match the audited vendored library');
  assert.deepEqual(plain(pianoPresetForScore(library, [])), full, 'empty score retains the complete instrument');
  assert.deepEqual(plain(pianoPresetForScore(library, [{ pitch: NaN, velocity: 90 }])), full,
    'no valid note data retains the complete instrument');

  const html = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
  const embedded = JSON.parse(html.match(/<script id="score-catalog" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const catalog = JSON.parse(fs.readFileSync(path.join(docs, 'assets/scores/catalog.json'), 'utf8'));
  assert.deepEqual(embedded.map(entry => entry.id), catalog.map(entry => entry.id));
  assert.ok(embedded.length >= 13, 'exercise the entire shipped collection');
  let comparisons = 0;
  const counts = {};
  for (const score of embedded) {
    const bundlePath = path.resolve(docs, score.assetScript.split('?')[0]);
    assert.ok(bundlePath.startsWith(docs + path.sep), 'bundled score must stay under docs');
    const bundled = { window: {} };
    vm.runInNewContext(fs.readFileSync(bundlePath, 'utf8'), bundled);
    const manifest = plain(bundled.window.__tunerBuiltInScores[score.id]);
    assert.equal(manifest.id, score.id);
    assert.ok(manifest.notes.length, score.id + ': score has notes');
    const reduced = pianoPresetForScore(library, manifest.notes);
    assert.deepEqual(plain(reduced.samples), full.samples, score.id + ': formats/base URL unchanged');
    assert.deepEqual(plain(reduced.defaults), full.defaults, score.id + ': decay/detune unchanged');
    const reducedNames = sampleNames(reduced);
    assert.ok(reducedNames.length > 0 && reducedNames.length <= fullNames.length);
    counts[score.id] = reducedNames.length;
    for (const name of reducedNames) assert.ok(fullNames.includes(name), score.id + ': only original samples');

    const pairs = [...new Map(manifest.notes.map(note => [note.pitch + ':' + note.velocity, note])).values()];
    for (const note of pairs) {
      // This is the existing player's documented MIDI-velocity conversion.
      const velocity = Math.max(12, Math.min(127, Math.round(note.velocity * .92)));
      assert.equal(scoreVelocity(note), velocity, 'helper uses the actual playback velocity');
      for (let shift = -12; shift <= 12; shift++) {
        const pitch = note.pitch + shift;
        assert.deepEqual(selectedRegions(reduced, pitch, velocity), selectedRegions(full, pitch, velocity),
          `${score.id}: pitch ${note.pitch}, velocity ${note.velocity}, transpose ${shift}`);
        comparisons++;
      }
    }
  }
  // Prove that unused layers really disappear, not just that a full preset still works.
  assert.ok(counts['fur-elise'] <= 65, 'Für Elise should load at most one full velocity layer');
  assert.ok(counts['rondo-alla-turca'] <= 65, 'Rondo should load at most one full velocity layer');

  // The two MIDI extremes may transpose outside the original playable range.
  // Preserve the original instrument's behavior even for those out-of-range notes.
  const edgeNotes = [0, 127].flatMap(pitch => [0, 127].map(velocity => ({ pitch, velocity })));
  const edgePreset = pianoPresetForScore(library, edgeNotes);
  for (const note of edgeNotes) for (let shift = -12; shift <= 12; shift++) {
    assert.deepEqual(selectedRegions(edgePreset, note.pitch + shift, scoreVelocity(note)),
      selectedRegions(full, note.pitch + shift, scoreVelocity(note)));
  }
  assert.equal(JSON.stringify(library.LAYERS), originalLayers, 'do not mutate the vendored piano mapping');
  console.log(`piano coverage passed: ${embedded.length} shipped bundles, ${comparisons} exact mapping comparisons across 25 transpositions; ${JSON.stringify(counts)}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
