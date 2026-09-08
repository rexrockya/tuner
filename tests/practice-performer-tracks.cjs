'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of [path.resolve('docs/harmony.js'), process.env.ARRANGEMENT_FILE || path.resolve('docs/practice-arrangement.js')]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}

const H = sandbox.window.tunerHarmony;
const A = sandbox.window.practiceArrangements;
const plain = value => JSON.parse(JSON.stringify(value));
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const guitarOpens = [64, 59, 55, 50, 45, 40];
const epsilon = 1e-7;

for (const name of ['performerProfiles', 'shapeLeadPhrase', 'planLeadCycle', 'leadCycleEvents', 'percussionStyles', 'stringsStyles', 'arrangement']) {
  assert.ok(A[name], `practiceArrangements exports ${name}`);
}

const profileIds = Object.keys(A.performerProfiles);
assert.ok(profileIds.includes('balanced'), 'balanced is the stable legacy-compatible performer profile');
assert.ok(profileIds.length >= 4, 'the player offers a meaningful choice of performer profiles');
const profileLabels = profileIds.map(id => {
  const profile = A.performerProfiles[id];
  assert.equal(typeof profile, 'object', `${id} performer profile is structured data`);
  assert.ok(typeof profile.label === 'string' && profile.label.trim(), `${id} has a visible label`);
  return profile.label;
});
assert.equal(new Set(profileLabels).size, profileLabels.length, 'performer labels are unambiguous');

function validatePhrase(phrase, parsed, context) {
  assert.ok(Array.isArray(phrase.notes) && phrase.notes.length > 0 && phrase.notes.length <= 256, `${context}: bounded notes`);
  let previous;
  for (const note of phrase.notes) {
    for (const field of ['beat', 'duration', 'midi', 'velocity', 'string', 'fret']) assert.ok(Number.isFinite(note[field]), `${context}: finite ${field}`);
    assert.ok(note.beat >= 0 && note.beat < parsed.bars.length * 4, `${context}: onset remains in phrase`);
    assert.ok(note.duration > 0 && note.beat + note.duration <= parsed.bars.length * 4 + epsilon, `${context}: audible gate remains in phrase`);
    assert.ok(note.velocity > 0 && note.velocity <= 1, `${context}: bounded velocity`);
    assert.ok(Number.isInteger(note.midi) && note.midi >= 40 && note.midi <= 88, `${context}: playable pitch`);
    assert.ok(Number.isInteger(note.string) && note.string >= 0 && note.string < guitarOpens.length, `${context}: playable string`);
    assert.ok(Number.isInteger(note.fret) && note.fret >= 0 && note.fret <= 24, `${context}: playable fret`);
    assert.equal(guitarOpens[note.string] + note.fret, note.midi, `${context}: TAB still matches MIDI`);
    const chord = parsed.chords.find(item => note.beat >= item.beat - epsilon && note.beat < item.beat + item.beats - epsilon);
    assert.ok(chord, `${context}: every onset belongs to a harmony`);
    if (Number.isFinite(note.notationDuration)) {
      assert.ok(note.notationDuration > 0 && note.beat + note.notationDuration <= chord.beat + chord.beats + epsilon, `${context}: written note does not cross the harmony`);
    }
    if (previous) {
      assert.ok(note.beat >= previous.beat - epsilon, `${context}: notes stay ordered`);
      assert.ok(previous.beat + previous.duration <= note.beat + epsilon, `${context}: shaped Lead remains a legal monophonic phrase`);
    }
    previous = note;
  }
}

const shapeCharts = [H.parse('2m7,57,1maj7,67', 'C'), H.parse('C7 | Am7 | Dm7 G7 | Cmaj7', 'C')];
const shapeSeeds = [17, 81, 912];
const shapePrints = new Map(profileIds.map(id => [id, []]));
for (const parsed of shapeCharts) for (const seed of shapeSeeds) {
  assert.equal(parsed.error, '');
  const source = H.generate(parsed, seed, 'blues', { style: 'motif', intensity: 'advanced' });
  const sourceSnapshot = plain(source);
  for (const profileId of profileIds) {
    const context = { genre: 'blues', round: 2, style: source.style, intensity: source.intensity };
    const shaped = A.shapeLeadPhrase(source, parsed, profileId, seed ^ 0x45d9f3b, context);
    assert.deepEqual(plain(A.shapeLeadPhrase(source, parsed, profileId, seed ^ 0x45d9f3b, context)), plain(shaped), `${profileId}: shaping is seeded and deterministic`);
    assert.notStrictEqual(shaped, source, `${profileId}: shaping returns a clone`);
    assert.notStrictEqual(shaped.notes, source.notes, `${profileId}: note storage is not shared`);
    assert.deepEqual(plain(source), sourceSnapshot, `${profileId}: shaping never mutates the authored phrase`);
    validatePhrase(shaped, parsed, `${profileId} seed ${seed}`);
    shapePrints.get(profileId).push(shaped.notes.map(note => [note.beat, note.duration, note.notationDuration, note.midi, note.velocity, note.articulation]));
  }
  assert.deepEqual(plain(A.shapeLeadPhrase(source, parsed, 'balanced', seed, {})), sourceSnapshot, 'balanced is an identity transform for legacy phrases');
  assert.deepEqual(plain(A.shapeLeadPhrase(source, parsed, '__unknown__', seed, {})), sourceSnapshot, 'unknown performer safely falls back to balanced');
}
assert.equal(new Set(profileIds.map(id => fingerprint(shapePrints.get(id)))).size, profileIds.length, 'every performer profile changes audible Lead phrasing, not only its label');

const cadenceChart = H.parse('17,47,17,57', 'A');
for (let seed = 1; seed <= 64; seed++) {
  const source = H.generate(cadenceChart, seed, 'blues', { style: 'mixed', intensity: 'auto' });
  const shaped = A.shapeLeadPhrase(source, cadenceChart, 'colorist', seed, {});
  assert.equal(shaped.notes.at(-1).midi, source.notes.at(-1).midi, `colorist seed ${seed}: final root cadence is not recolored`);
  assert.equal(shaped.notes.at(-1).role, source.notes.at(-1).role, `colorist seed ${seed}: final cadence keeps its authored role`);
}

const cycleChart = H.parse('2m7,57,1maj7,67', 'C');
const cycleOptions = {
  style: 'motif', intensity: 'advanced', leadGroove: 'pocket', leadTexture: 'voicing',
  phraseCycleMode: 'sequence', phraseStyleSequence: ['call', 'motif', 'space', 'blues'], densityCycleMode: 'random'
};
const defaultCycle = A.planLeadCycle(cycleChart, 912, 'blues', cycleOptions, 4);
const balancedCycle = A.planLeadCycle(cycleChart, 912, 'blues', { ...cycleOptions, performerProfile: 'balanced' }, 4);
assert.equal(defaultCycle.performerProfile, 'balanced', 'missing performer selection defaults to balanced');
assert.deepEqual(plain(defaultCycle), plain(balancedCycle), 'implicit and explicit balanced cycles are identical');
const unknownCycle = A.planLeadCycle(cycleChart, 912, 'blues', { ...cycleOptions, performerProfile: '__unknown__' }, 4);
assert.equal(unknownCycle.performerProfile, 'balanced');
assert.deepEqual(plain(unknownCycle), plain(balancedCycle), 'unknown performer selection safely normalizes to balanced');

const balancedPlan = plain(balancedCycle.rounds.map(round => ({ seed: round.seed, style: round.style, intensity: round.intensity })));
const plannedPrints = new Set();
for (const profileId of profileIds) {
  const options = { ...cycleOptions, performerProfile: profileId };
  const cycle = A.planLeadCycle(cycleChart, 912, 'blues', options, 4);
  assert.equal(cycle.performerProfile, profileId, `${profileId}: cycle records the normalized performer`);
  assert.deepEqual(plain(A.planLeadCycle(cycleChart, 912, 'blues', options, 4)), plain(cycle), `${profileId}: full cycle is reproducible`);
  assert.deepEqual(plain(cycle.rounds.map(round => ({ seed: round.seed, style: round.style, intensity: round.intensity }))), balancedPlan, `${profileId}: performer does not rewrite phrase/density sequencing`);
  cycle.rounds.forEach((round, index) => validatePhrase(round.phrase, cycleChart, `${profileId} round ${index}`));
  plannedPrints.add(fingerprint(cycle.rounds.map(round => round.phrase.notes.map(note => [note.beat, note.duration, note.midi, note.velocity, note.articulation]))));
}
assert.equal(plannedPrints.size, profileIds.length, 'planLeadCycle applies every performer profile to the generated rounds');

function performedPrint(events) {
  return events.map(event => [event.beat, event.duration, event.midi, event.velocity, event.timingOffset, event.detuneCents, event.stackIndex]);
}
const missingProfileEvents = A.leadCycleEvents({ ...balancedCycle, performerProfile: undefined }, cycleChart.bars.length * 4, 'shuffle');
const explicitBalancedEvents = A.leadCycleEvents(balancedCycle, cycleChart.bars.length * 4, 'shuffle');
assert.deepEqual(plain(performedPrint(missingProfileEvents)), plain(performedPrint(explicitBalancedEvents)), 'legacy cycles without performer metadata play as balanced');
assert.deepEqual(plain(performedPrint(A.leadCycleEvents({ ...balancedCycle, performerProfile: '__unknown__' }, cycleChart.bars.length * 4, 'shuffle'))), plain(performedPrint(explicitBalancedEvents)), 'unknown performer metadata plays as balanced');

const performancePrints = new Set();
for (const profileId of profileIds) {
  const cycle = { ...balancedCycle, performerProfile: profileId };
  const snapshot = plain(cycle);
  const events = A.leadCycleEvents(cycle, cycleChart.bars.length * 4, 'shuffle');
  assert.deepEqual(plain(A.leadCycleEvents(cycle, cycleChart.bars.length * 4, 'shuffle')), plain(events), `${profileId}: performed timing is deterministic`);
  assert.deepEqual(plain(cycle), snapshot, `${profileId}: rendering events does not mutate the cycle`);
  let previousBeat = -1;
  for (const event of events) {
    assert.ok(Number.isFinite(event.beat) && event.beat >= previousBeat - epsilon && event.beat >= 0 && event.beat < balancedCycle.rounds.length * cycleChart.bars.length * 4, `${profileId}: sorted event onset inside cycle`);
    assert.ok(Number.isFinite(event.duration) && event.duration > 0 && event.beat + event.duration <= balancedCycle.rounds.length * cycleChart.bars.length * 4 + epsilon, `${profileId}: event duration stays bounded`);
    assert.ok(Number.isFinite(event.velocity) && event.velocity > 0 && event.velocity <= 1, `${profileId}: event velocity stays bounded`);
    assert.ok(Number.isFinite(event.timingOffset) && event.timingOffset >= 0 && event.timingOffset <= .12, `${profileId}: human timing remains bounded`);
    assert.ok(Number.isFinite(event.detuneCents) && Math.abs(event.detuneCents) <= 12, `${profileId}: pitch drift remains musical`);
    previousBeat = event.beat;
  }
  performancePrints.add(fingerprint(performedPrint(events)));
}
assert.equal(performancePrints.size, profileIds.length, 'leadCycleEvents reads performerProfile and gives each player a distinct performance fingerprint');

// Freeze the previous release's balanced Lead and four-track backing output. New
// metadata is allowed outside these structures; the audible legacy events are not.
const legacyLeadFields = event => Object.fromEntries(['beat', 'duration', 'notationDuration', 'midi', 'velocity', 'string', 'fret', 'role', 'articulation', 'variant', 'stackIndex', 'stackSize', 'track', 'chorus', 'leadStyle', 'leadIntensity', 'leadGroove', 'timingOffset', 'detuneCents'].filter(key => event[key] !== undefined).map(key => [key, event[key]]));
assert.equal(fingerprint({ rounds: balancedCycle.rounds, events: explicitBalancedEvents.map(legacyLeadFields) }), 'ea67b082ef0e233bcaa72dc1aa702b0ddf437c88a3a507292d0e340f943a26c2', 'balanced performer preserves the previous Lead cycle exactly');

function inspectCatalog(name, catalog) {
  assert.equal(typeof catalog, 'object');
  assert.ok(typeof catalog.none === 'string' && catalog.none.trim(), `${name} catalog exposes off`);
  assert.ok(typeof catalog.auto === 'string' && catalog.auto.trim(), `${name} catalog exposes auto`);
  const manual = Object.keys(catalog).filter(style => !['none', 'auto'].includes(style));
  assert.ok(manual.length >= 2, `${name} has multiple manual playing styles`);
  assert.equal(new Set(Object.values(catalog)).size, Object.keys(catalog).length, `${name} labels are distinct`);
  return manual;
}
const manualStyles = {
  percussion: inspectCatalog('percussion', A.percussionStyles),
  strings: inspectCatalog('strings', A.stringsStyles)
};
const styleFields = { percussion: 'percussionStyle', strings: 'stringsStyle' };
const styleArrays = { percussion: 'percussionStyles', strings: 'stringsStyles' };
const backingChart = H.parse('C7 | Am7 | Dm7 G7 | Cmaj7', 'C');

function trackEvents(song, track) { return song.events.filter(event => event.track === track); }
function validateNewTrack(song, track, parsed, context) {
  const events = trackEvents(song, track);
  assert.ok(events.length, `${context}: enabled ${track} creates events`);
  const pitchEnds = new Map();
  let previousBeat = -1;
  for (const event of events) {
    assert.ok(Number.isFinite(event.beat) && event.beat >= previousBeat - epsilon && event.beat >= 0 && event.beat < song.beats, `${context}: sorted onset in song`);
    assert.ok(Number.isFinite(event.duration) && event.duration > 0 && event.beat + event.duration <= song.beats + epsilon, `${context}: bounded duration`);
    assert.ok(Number.isFinite(event.velocity) && event.velocity > 0 && event.velocity <= 1, `${context}: bounded velocity`);
    const chorus = Math.floor((event.beat + epsilon) / song.chartBeats);
    assert.equal(song.chorusStyles[chorus][track], song[styleArrays[track]][chorus], `${context}: chorus metadata agrees with selected style`);
    const localBeat = event.beat - chorus * song.chartBeats;
    if (track === 'percussion') {
      assert.ok(typeof event.sample === 'string' && event.sample, `${context}: percussion selects a playable sample`);
    } else {
      assert.ok(Number.isInteger(event.midi) && event.midi >= 40 && event.midi <= 96, `${context}: strings pitch is playable`);
      const chord = parsed.chords.find(item => localBeat >= item.beat - epsilon && localBeat < item.beat + item.beats - epsilon);
      assert.ok(chord, `${context}: strings onset belongs to a harmony`);
      assert.ok(chord.intervals.some(interval => H.mod(chord.root + interval) === H.mod(event.midi)), `${context}: strings use the current chord`);
      assert.ok(event.beat + event.duration <= chorus * song.chartBeats + chord.beat + chord.beats + epsilon, `${context}: strings release before the harmony changes`);
      const previousEnd = pitchEnds.get(event.midi);
      assert.ok(previousEnd === undefined || previousEnd <= event.beat + epsilon, `${context}: repeated strings pitch releases before retrigger`);
      pitchEnds.set(event.midi, event.beat + event.duration);
    }
    previousBeat = event.beat;
  }
}

const implicitDefaults = A.arrangement(backingChart, 'shuffle', 182, 4);
const explicitDefaults = A.arrangement(backingChart, 'shuffle', 182, 4, { performerProfile: 'balanced', percussionStyle: 'none', stringsStyle: 'none' });
assert.deepEqual(plain(implicitDefaults), plain(explicitDefaults), 'missing new options equal explicit balanced/off defaults');
for (const track of Object.keys(styleFields)) {
  assert.ok(implicitDefaults[styleArrays[track]].every(style => style === 'none'), `${track} defaults off for legacy callers`);
  assert.ok(implicitDefaults.chorusStyles.every(round => round[track] === 'none'), `${track} default is visible in chorus metadata`);
  assert.equal(trackEvents(implicitDefaults, track).length, 0, `${track} default emits no events`);
}
for (const profileId of profileIds) {
  const song = A.arrangement(backingChart, 'shuffle', 182, 4, { performerProfile: profileId });
  assert.ok(song.percussionStyles.every(style => style === 'none') && song.stringsStyles.every(style => style === 'none'), `${profileId}: performer affinity never opts a missing track in`);
}

for (const track of Object.keys(styleFields)) {
  const field = styleFields[track], array = styleArrays[track], other = track === 'percussion' ? 'strings' : 'percussion';
  const signatures = [];
  for (const style of manualStyles[track]) {
    const song = A.arrangement(backingChart, 'shuffle', 47, 3, { performerProfile: profileIds.at(-1), [field]: style, [styleFields[other]]: 'none' });
    assert.ok(song[array].every(selected => selected === style), `${track}/${style}: explicit style remains selected in every chorus`);
    assert.ok(song.chorusStyles.every(round => round[track] === style), `${track}/${style}: explicit selection is recorded per chorus`);
    assert.equal(trackEvents(song, other).length, 0, `${track}/${style}: the other optional track stays off`);
    validateNewTrack(song, track, backingChart, `${track}/${style}`);
    signatures.push(fingerprint(trackEvents(song, track).map(event => [event.beat, event.duration, event.midi, event.sample, event.velocity, event.playbackRate])));
  }
  assert.equal(new Set(signatures).size, signatures.length, `${track}: every manual style has a distinct playable result`);

  const off = A.arrangement(backingChart, 'shuffle', 47, 3, { performerProfile: profileIds.at(-1), [field]: 'none' });
  assert.ok(off[array].every(style => style === 'none') && trackEvents(off, track).length === 0, `${track}: explicit off wins over performer affinity`);

  const autoSeen = new Set();
  for (let seed = 0; seed < 8; seed++) {
    const options = { performerProfile: profileIds[seed % profileIds.length], [field]: 'auto' };
    const song = A.arrangement(backingChart, 'shuffle', seed, 4, options);
    assert.deepEqual(plain(A.arrangement(backingChart, 'shuffle', seed, 4, options)), plain(song), `${track}/auto seed ${seed}: deterministic selection and notes`);
    assert.ok(song[array].every(style => style !== 'auto' && Object.hasOwn(A[styleArrays[track]], style)), `${track}/auto: resolves to a concrete catalog style`);
    song[array].forEach(style => autoSeen.add(style));
    for (let chorus = 0; chorus < song.chorusStyles.length; chorus++) {
      const chorusEvents = trackEvents(song, track).filter(event => Math.floor((event.beat + epsilon) / song.chartBeats) === chorus);
      assert.equal(chorusEvents.length > 0, song[array][chorus] !== 'none', `${track}/auto: off choruses are silent and enabled choruses are audible`);
    }
    if (trackEvents(song, track).length) validateNewTrack(song, track, backingChart, `${track}/auto seed ${seed}`);
  }
  assert.ok(autoSeen.size >= Math.min(2, manualStyles[track].length), `${track}/auto varies across seeded arrangements`);
}

const isolationOptions = { performerProfile: profileIds.at(-1), percussionStyle: 'none', stringsStyle: 'none' };
const allOff = A.arrangement(backingChart, 'soul', 713, 4, isolationOptions);
for (const track of Object.keys(styleFields)) {
  const enabled = A.arrangement(backingChart, 'soul', 713, 4, { ...isolationOptions, [styleFields[track]]: manualStyles[track][0] });
  assert.deepEqual(plain(enabled.events.filter(event => event.track !== track)), plain(allOff.events), `enabling ${track} leaves every existing player exact`);
}
if (manualStyles.percussion.length > 1) {
  const shared = { performerProfile: profileIds.at(-1), stringsStyle: 'auto' };
  const first = A.arrangement(backingChart, 'soul', 91, 4, { ...shared, percussionStyle: manualStyles.percussion[0] });
  const second = A.arrangement(backingChart, 'soul', 91, 4, { ...shared, percussionStyle: manualStyles.percussion[1] });
  assert.deepEqual(plain(first.events.filter(event => event.track !== 'percussion')), plain(second.events.filter(event => event.track !== 'percussion')), 'manual percussion changes do not consume another track\'s random stream');
}

const legacyArrangementCases = [
  ['C/E | F/A | G/B', 'C', 'shuffle', 182, 4, {}],
  ['C7 | F7', 'C', 'straight', 1, 1, { bassStyle: 'walking', drumStyle: 'backbeat', keyStyle: 'soul', rhythmStyle: 'chop' }],
  ['2m7,57,1maj7,67', 'C', 'soul', 912, 4, {}],
  ['1 b7 #4 6m,2m 57 7dim 1', 'Bb', 'latin', 47, 3, { bassStyle: 'riff', drumStyle: 'latin', keyStyle: 'arpeggio', rhythmStyle: 'clave' }]
];
const legacyBacking = crypto.createHash('sha256');
for (const [text, key, feel, seed, choruses, options] of legacyArrangementCases) {
  const song = A.arrangement(H.parse(text, key), feel, seed, choruses, options);
  assert.ok(song.percussionStyles.every(style => style === 'none') && song.stringsStyles.every(style => style === 'none'));
  legacyBacking.update(JSON.stringify(song.events.filter(event => ['bass', 'drums', 'keys', 'rhythm'].includes(event.track))));
}
assert.equal(legacyBacking.digest('hex'), '376ab97a5cadcf709c15a8a58e9a27268c95ac29acce9306104c7d819fe5e42b', 'new optional tracks preserve previous four-track arrangements bit for bit');

const bounded = A.arrangement(backingChart, 'invalid', 1, 1000000, { percussionStyle: 'auto', stringsStyle: 'auto' });
assert.equal(bounded.chorusStyles.length, 32, 'untrusted chorus counts remain bounded');
assert.equal(bounded.percussionStyles.length, 32);
assert.equal(bounded.stringsStyles.length, 32);

console.log(`PASS performer/tracks: ${profileIds.length} deterministic performer profiles with balanced legacy behavior; percussion and strings off/auto/manual, boundaries, overrides, isolation and unchanged four-track defaults`);
