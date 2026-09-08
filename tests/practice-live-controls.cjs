const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module'), { JSDOM } = createRequire(path.resolve('package.json'))('jsdom');
(async () => {
  const dom = new JSDOM(fs.readFileSync('docs/index.html', 'utf8'), { url: 'https://rexrockya.github.io/tuner/#lessons', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, q = id => d.getElementById(id), plain = value => JSON.parse(JSON.stringify(value));
  const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve)); };
  const errors = []; w.addEventListener('error', event => errors.push(event.message));
  w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
  w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLElement.prototype.scrollTo = () => {};
  Object.defineProperty(w.navigator, 'connection', { value: { saveData: true } });
  for (const file of ['storage.js', 'harmony.js', 'lessons.js', 'practice-arrangement.js', 'practice-audio.js']) w.eval(fs.readFileSync('docs/' + file, 'utf8'));
  const A = w.practiceAudio, active = Object.fromEntries(Object.keys(A.timbres).map(track => [track, A.getTimbre(track)]));
  const preparations = [], queued = [], commits = [];
  A.getTimbre = track => active[track];
  A.setTimbre = async (track, id) => { active[track] = id; return true; };
  A.prepareTimbres = (selection, events) => new Promise((resolve, reject) => preparations.push({ selection: plain(selection), events: plain(events), resolve: () => resolve({ ...selection }), reject }));
  A.commitTimbres = selection => { Object.assign(active, selection); commits.push(plain(selection)); };
  A.getContext = () => ({ resume: async () => {} }); A.volume = () => {};
  class ControlledTransport {
    constructor(update = () => {}) { this.update = update; this.bpm = 96; this.position = 0; this.playing = false; this.loading = false; this.loop = true; this.loopBar = null; this.song = { events: [], beats: 0, chartBeats: 0 }; this.generation = 0; this.pauseCalls = 0; this.loadCalls = 0; }
    bounds() { return this.loopBar === null ? [0, this.loop ? this.song.beats : this.song.chartBeats] : [this.loopBar * 4, this.loopBar * 4 + 4]; }
    current() { return this.position; }
    load(song) { this.loadCalls++; this.pause(); this.song = song; this.position = 0; this.loopBar = null; this.update(); }
    async play() { this.playing = true; this.update(); }
    pause() { this.pauseCalls++; this.generation++; this.cancelUpdate('pause'); this.playing = false; this.loading = false; this.update(); }
    cancelUpdate(reason = 'cancel') { const old = this.pendingUpdate; this.pendingUpdate = null; old?.options.onCancel?.(reason); }
    queueUpdate(song, options = {}) { assert.equal(this.playing, true); this.cancelUpdate('replaced'); const pending = { song, options }; this.pendingUpdate = pending; queued.push(pending); return pending; }
    boundary(beat) { const pending = this.pendingUpdate; assert.ok(pending, 'an update is queued'); this.pendingUpdate = null; this.position = beat; this.song = pending.song; if (pending.options.timbres) A.commitTimbres(pending.options.timbres); if (pending.options.bpm) this.bpm = pending.options.bpm; pending.options.onCommit?.(); this.update(); }
    async seek(beat) { this.cancelUpdate('seek'); this.position = beat; this.update(); }
    async tempo(bpm) { this.bpm = +bpm; this.update(); }
    async setLoop(on) { this.loop = on; this.update(); }
    async setLoopBar(bar) { this.loopBar = bar; this.update(); }
  }
  A.Transport = ControlledTransport;
  w.eval(fs.readFileSync(process.argv[2] || 'docs/practice.js', 'utf8'));
  const S = w.practiceStudio, t = S.transport, change = (id, value) => { q(id).value = value; q(id).dispatchEvent(new w.Event('change')); };
  const voice = id => { const select = d.querySelector('[data-practice-timbre="lead"]'); select.value = id; select.dispatchEvent(new w.Event('change')); };
  const completeLatest = async () => { assert.ok(preparations.length, 'resources requested'); preparations.at(-1).resolve(); await flush(); };
  const start = async (beat = 1.25) => { t.position = beat; await t.play(); };
  q('lesson-page').style.display = 'block'; S.setMode('create'); S.generate(912); await flush();
  const initial = plain(S.getPhrase()), originalSong = t.song;
  await start(); const pauses = t.pauseCalls, loads = t.loadCalls;
  voice('piano');
  assert.equal(t.playing, true, 'resource loading leaves the current music playing');
  assert.equal(t.pauseCalls, pauses, 'changing voice does not invoke pause');
  assert.equal(t.loadCalls, loads, 'changing voice does not reset transport');
  assert.equal(t.song, originalSong); assert.deepEqual(plain(S.getPhrase()), initial);
  assert.equal(A.getTimbre('lead'), 'warm', 'active voice stays old until the boundary');
  assert.equal(q('practice-play').disabled, false, 'pause remains available while live resources load');
  assert.equal(q('practice-save').disabled, true); assert.equal(q('practice-midi').disabled, true);
  q('practice-save').click(); assert.equal(w.siteStorage.getItem('tuner-original-licks-v1'), null, 'pending settings cannot save the old phrase');
  await completeLatest();
  assert.ok(t.pendingUpdate); assert.equal(t.song, originalSong); assert.equal(A.getTimbre('lead'), 'warm');
  t.boundary(4); assert.equal(t.playing, true); assert.equal(t.position, 4); assert.equal(A.getTimbre('lead'), 'piano');
  assert.deepEqual(plain(S.getPhrase()), initial, 'timbre-only update keeps the melody');
  assert.equal(q('practice-save').disabled, false); assert.equal(q('practice-midi').disabled, false);

  const beforeRewrite = plain(S.getPhrase()), beforeRewriteSong = t.song;
  change('practice-intensity', 'challenge'); const outdated = preparations.at(-1);
  change('practice-phrase-style', 'space'); change('practice-rhythm-style', 'none'); voice('violin');
  const latest = preparations.at(-1); assert.notEqual(latest, outdated);
  assert.equal(t.playing, true); assert.equal(t.song, beforeRewriteSong); assert.deepEqual(plain(S.getPhrase()), beforeRewrite);
  outdated.resolve(); await flush(); assert.equal(t.pendingUpdate, null, 'stale resource result cannot schedule an outdated phrase');
  latest.resolve(); await flush(); assert.ok(t.pendingUpdate);
  const pending = t.pendingUpdate;
  assert.equal(pending.options.timbres.lead, 'violin');
  assert.ok(pending.song.events.every(event => event.track !== 'rhythm'), 'latest snapshot includes the independently changed accompaniment');
  const nextLead = pending.song.events.filter(event => event.track === 'lead');
  assert.ok(nextLead.length); assert.deepEqual(latest.events.filter(event => event.track === 'lead'), plain(nextLead), 'sample readiness covers the final phrase pitches');
  t.boundary(8); assert.equal(t.playing, true); assert.equal(A.getTimbre('lead'), 'violin');
  assert.equal(S.getPhrase().style, 'space'); assert.equal(S.getPhrase().seed, initial.seed);
  assert.notDeepEqual(plain(S.getPhrase().notes), beforeRewrite.notes); assert.equal(q('practice-intensity').value, 'challenge');
  q('practice-save').click(); const favorite = JSON.parse(w.siteStorage.getItem('tuner-original-licks-v1'))[0];
  assert.equal(favorite.intensity, 'challenge'); assert.equal(favorite.style, 'space'); assert.equal(favorite.rhythmStyle, 'none'); assert.equal(favorite.timbres.lead, 'violin'); assert.deepEqual(favorite.phrase, plain(S.getPhrase()));

  change('practice-drum-style', 'funk'); await completeLatest(); const superseded = t.pendingUpdate;
  change('practice-bass-style', 'octave'); assert.notEqual(t.pendingUpdate, superseded, 'ready-but-uncommitted update is invalidated by a newer choice');
  assert.equal(t.playing, true); await completeLatest(); t.boundary(12);
  assert.equal(q('practice-drum-style').value, 'funk'); assert.equal(q('practice-bass-style').value, 'octave');

  const preserved = plain(S.getPhrase()), preservedSong = t.song;
  voice('piano'); preparations.at(-1).reject(new Error('controlled unavailable sample')); await flush();
  assert.equal(t.playing, true, 'resource failure cannot silence current playback'); assert.equal(t.song, preservedSong); assert.deepEqual(plain(S.getPhrase()), preserved);
  assert.equal(A.getTimbre('lead'), 'violin'); assert.equal(t.pendingUpdate, null);
  assert.equal(q('practice-live-retry').hidden, false, 'failure exposes a visible retry action');
  q('practice-live-retry').click(); await completeLatest(); t.boundary(16); assert.equal(A.getTimbre('lead'), 'piano', 'retry loads and applies the same chosen voice');

  change('practice-intensity', 'easy'); const cancelled = preparations.at(-1), queueCount = queued.length;
  q('practice-play').click(); assert.equal(t.playing, false, 'pause button works while changes prepare');
  cancelled.resolve(); await flush(); assert.equal(queued.length, queueCount, 'late resolution after pause cannot queue or start sound'); assert.equal(t.playing, false);
  await start(2); voice('violin'); const navigation = preparations.at(-1), countBeforeNavigation = queued.length;
  S.setMode('backing'); navigation.resolve(); await flush(); assert.equal(t.playing, false); assert.equal(queued.length, countBeforeNavigation, 'leaving mode invalidates pending live change');
  assert.equal(q('practice-intensity-wrap').hidden, true);
  S.setMode('create'); change('practice-feel', 'shuffle');
  const reference = plain(S.getPhrase()), n = reference.notes[0];
  const twoNotes = { ...reference, notes: [{ ...n, beat: 0, bar: 0, duration: .4, notationDuration: .5 }, { ...n, beat: .5, bar: 0, duration: .4, notationDuration: .5 }] };
  S.generate(912, { phrase: twoNotes });
  let staffData; w.practiceNotation = { mount() { return { setVisible() {}, render(value) { staffData = value; return Promise.resolve(true); }, update() {} }; } };
  await start(.58); const oldSwing = A.feels.shuffle.swing, oldBpm = t.bpm;
  change('practice-feel', 'straight'); t.update();
  assert.equal(d.querySelector('[data-note-beat].active').dataset.noteBeat, '0', 'pending feel does not move the old score highlight ahead of audible swing');
  assert.equal(t.bpm, oldBpm, 'pending tempo cannot retime the active transport');
  change('practice-notation', 'staff'); await flush(); assert.equal(staffData.swing, oldSwing, 'opening staff during a pending feel uses the active audible feel');
  await completeLatest(); t.boundary(4); await flush(); assert.equal(staffData.swing, A.feels.straight.swing); assert.equal(t.bpm, A.feels.straight.bpm);

  const audibleChart = plain(S.getProgression()), audiblePhrase = plain(S.getPhrase()), audibleSong = t.song;
  q('practice-progression').value = '1,b7,#4'; q('practice-progression').dispatchEvent(new w.Event('input'));
  assert.equal(t.playing, true, 'editing harmony text keeps the current progression moving');
  assert.equal(q('practice-play').disabled, false, 'dirty input must not disable Pause');
  assert.equal(t.song, audibleSong); assert.deepEqual(plain(S.getProgression()), audibleChart);
  const preparesBeforeDirtyStyle = preparations.length; change('practice-intensity', 'easy');
  assert.equal(preparations.length, preparesBeforeDirtyStyle, 'style changes cannot pair old notes with unsubmitted harmony'); assert.deepEqual(plain(S.getPhrase()), audiblePhrase);
  voice('violin'); assert.equal(preparations.length, preparesBeforeDirtyStyle, 'dirty harmony also refuses resource requests for a new voice');
  assert.equal(d.querySelector('[data-practice-timbre="lead"]').value, A.getTimbre('lead'), 'refused dirty voice restores its audible selection');
  S.generate(913); assert.equal(t.playing, true); assert.deepEqual(plain(S.getProgression()), audibleChart);
  await completeLatest(); t.boundary(8); assert.notDeepEqual(plain(S.getProgression()), audibleChart); assert.equal(S.getPhrase().seed, 913);
  const validChart = plain(S.getProgression());
  q('practice-progression').value = '1junk'; q('practice-progression').dispatchEvent(new w.Event('input')); S.generate(914);
  assert.equal(t.playing, true, 'an invalid generated candidate cannot stop the old music'); assert.deepEqual(plain(S.getProgression()), validChart); assert.equal(q('practice-play').disabled, false);
  S.stop();
  q('practice-progression').value = '6,4,1,5'; S.generate(915); await flush(); await start();
  voice('violin'); const stoppedRequest = preparations.at(-1);
  q('practice-progression').value = '1,4,5,1'; q('practice-progression').dispatchEvent(new w.Event('input')); S.stop();
  assert.equal(A.getTimbre('lead'), 'piano');
  assert.equal(d.querySelector('[data-practice-timbre="lead"]').value, 'violin', 'a dirty edit retains the desired voice for the next generation');
  S.generate(916); await flush(); assert.equal(t.playing, false); assert.equal(A.getTimbre('lead'), 'violin', 'stopped generation reconciles a selected but cancelled voice');
  const queuedBeforeLate = queued.length; stoppedRequest.resolve(); await flush(); assert.equal(queued.length, queuedBeforeLate); assert.equal(t.playing, false);
  const storedVoices = { drums: 'vintage', bass: 'muted', keys: 'gospel', rhythm: 'bright', lead: 'piano' };
  const restoredFavorite = { version: 2, harmonyVersion: 2, text: '2m7,57,1maj7', key: 'C', feel: 'funk', bpm: 123,
    seed: initial.seed, phrase: initial, style: 'mixed', intensity: 'standard', bassStyle: 'walking', drumStyle: 'ride', keyStyle: 'soul', rhythmStyle: 'chop', timbres: storedVoices };
  w.siteStorage.setItem('tuner-original-licks-v1', JSON.stringify([restoredFavorite]));
  S.setMode('backing'); S.setMode('create'); q('practice-progression').value = '6,4,1,5'; S.generate(917);
  await start(1.5); const beforeSavedSong = t.song, beforeSavedPhrase = plain(S.getPhrase()), beforeSavedBpm = t.bpm, beforeSavedRequests = preparations.length;
  change('practice-saved', '0');
  assert.equal(preparations.length, beforeSavedRequests + 1, 'loading a live favorite prepares one complete candidate, not one per changed instrument');
  assert.equal(t.playing, true); assert.equal(t.song, beforeSavedSong); assert.equal(t.bpm, beforeSavedBpm); assert.deepEqual(plain(S.getPhrase()), beforeSavedPhrase);
  assert.deepEqual(preparations.at(-1).selection, storedVoices, 'favorite preparation includes all five selected voices together');
  await completeLatest(); assert.equal(t.pendingUpdate.options.bpm, 123); assert.deepEqual(plain(t.pendingUpdate.options.timbres), storedVoices);
  t.boundary(4); assert.equal(t.playing, true); assert.equal(t.bpm, 123); assert.deepEqual(plain(S.getPhrase()), initial);
  for (const [track, id] of Object.entries(storedVoices)) { assert.equal(A.getTimbre(track), id); assert.equal(d.querySelector('[data-practice-timbre="' + track + '"]').value, id); }
  for (const [field, expected] of [['practice-feel', 'funk'], ['practice-intensity', 'standard'], ['practice-bass-style', 'walking'], ['practice-drum-style', 'ride'], ['practice-key-style', 'soul'], ['practice-rhythm-style', 'chop']]) assert.equal(q(field).value, expected);
  S.stop();
  assert.deepEqual(errors, []); dom.window.close();
  console.log('PASS live controls: uninterrupted preparation, boundary-only phrase/timbre commit, latest full snapshot, pending save/export protection, retry, pause and navigation cancellation');
})().catch(error => { console.error(error); process.exit(1); });
