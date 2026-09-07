const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const root = process.cwd(), requireProject = createRequire(path.join(root, 'package.json'));
const { JSDOM } = requireProject('jsdom');
const original = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const html = original.replace(/<script\b(?![^>]*id="score-catalog")[^>]*>[\s\S]*?<\/script>/g, '');

function fixture(library) {
  const dom = new JSDOM(html, { url: 'https://rexrockya.github.io/tuner/', runScripts: 'outside-only' });
  const w = dom.window, doc = w.document, jobs = [], events = [], timers = new Map(), timeouts = new Map();
  let clock = 0, seq = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
  w.AudioContext = class {
    state = 'running'; destination = {};
    get currentTime() { return clock; }
    async resume() {}
    createGain() { return { gain: param(), connect(destination) { return destination; }, disconnect() {} }; }
    createOscillator() { return { frequency: param(), connect(destination) { return destination; }, disconnect() {}, start() {}, stop() {} }; }
  };
  w.setInterval = fn => { const id = ++seq; timers.set(id, fn); return id; };
  w.clearInterval = id => timers.delete(id);
  w.setTimeout = fn => { const id = ++seq; timeouts.set(id, fn); return id; };
  w.clearTimeout = id => timeouts.delete(id);
  w.requestAnimationFrame = () => ++seq; w.cancelAnimationFrame = () => {};
  w.HTMLElement.prototype.scrollTo = () => {};
  const make = (kind, options, preset) => {
    let resolve, reject;
    const ready = new Promise((res, rej) => { resolve = res; reject = rej; });
    const job = { kind, options, preset, resolve, reject, disposed: false, starts: [], stops: 0 };
    const instrument = {
      ready,
      start(event) { assert.equal(job.disposed, false, 'disposed instrument must never play'); job.starts.push(event); events.push({ job, ...event }); },
      stop() { job.stops++; },
      dispose() { job.disposed = true; }
    };
    job.instrument = instrument; jobs.push(job); return job;
  };
  w.sampleTestLibrary = {
    pianoToPreset: library.pianoToPreset,
    Instrument: factory => (ctx, options) => {
      const job = make('piano', options);
      const result = factory(ctx, options, { loadInstrument(preset) { job.preset = preset; return job.instrument.ready; } });
      assert.ok(result && typeof result.then === 'function');
      return job.instrument;
    },
    Soundfont: (_ctx, options) => make('soundfont', options).instrument,
    ElectricPiano: (_ctx, options) => make('electric', options).instrument,
    SampleLoader: () => ({ load: async () => new Map() })
  };
  w.opensheetmusicdisplay = { OpenSheetMusicDisplay: class { async load() {} render() {} } };
  w.siteAssets = { load: async () => {}, warm() {} };
  w.fetch = () => Promise.reject(new Error('No network is permitted in this test'));
  Object.defineProperty(doc, 'currentScript', { value: { src: 'https://rexrockya.github.io/tuner/scores.js' } });
  doc.head.append = script => {
    const filename = new URL(script.src).pathname.split('/').pop();
    queueMicrotask(() => {
      w.eval(fs.readFileSync(path.join(root, 'docs/assets/scores', filename), 'utf8'));
      script.onload();
    });
  };
  for (const file of ['storage.js', 'score-audio.js', 'score-beats.js', 'metronome.js', 'scores.js', 'score-reader.js']) {
    const source = fs.readFileSync(path.join(root, 'docs', file), 'utf8');
    // Replace only the external module boundary; all application lifecycle code is real.
    w.eval(source.replace('import(LOCAL_SMPLR_URL)', 'Promise.resolve(window.sampleTestLibrary)'));
  }
  w.eval(fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8'));
  const flush = async (predicate, message) => {
    for (let i = 0; i < 100; i++) { await Promise.resolve(); if (predicate()) return; }
    assert.fail(message || 'expected asynchronous state was not reached');
  };
  const advance = seconds => { const end = clock + seconds; while (clock < end) { clock = Math.min(end, clock + .017); for (const fn of [...timers.values()]) fn(); } };
  return { dom, w, doc, jobs, events, timers, flush, advance };
}

(async () => {
  const library = await import(pathToFileURL(path.join(root, 'docs/assets/audio/smplr-1.0.0.mjs')));
  const f = fixture(library), { w, doc, jobs, events, timers, flush, advance } = f;
  const player = w.scorePlayer;
  try {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, 'docs/assets/scores/catalog.json'), 'utf8'));
    for (const score of catalog) await player.open(score.id);
    assert.equal(Object.keys(w.__tunerBuiltInScores).length, catalog.length, 'load all actual shipped score bundles');

    await player.open('fur-elise');
    const first = player.play(), duplicate = player.play();
    assert.equal(first, duplicate, 'rapid duplicate play reuses the pending playback promise');
    await flush(() => jobs.length === 1, 'first piano request should start');
    assert.equal(jobs[0].preset.groups.length, 1, 'real helper limits Fur Elise to its velocity layer');
    assert.equal(events.length, 0, 'nothing plays before samples are ready');
    jobs[0].resolve(); await first; await duplicate;
    assert.ok(jobs[0].starts.length > 0, 'first piano starts after its own samples resolve');
    player.pause();
    const reusable = jobs.length;
    await player.play();
    assert.equal(jobs.length, reusable, 'second play of the same score reuses decoded instrument');
    player.pause();
    for (let i = 0; i < 12; i++) doc.querySelector('#sheet-transpose-plus').click();
    await player.play();
    assert.equal(jobs.length, reusable, '+12 transpose remains within the already-loaded coverage');
    player.pause();
    for (let i = 0; i < 24; i++) doc.querySelector('#sheet-transpose-minus').click();
    await player.play();
    assert.equal(jobs.length, reusable, '-12 transpose remains within the already-loaded coverage');
    player.pause();

    await player.open('rondo-alla-turca');
    const changed = player.play();
    await flush(() => jobs.length === 2, 'different score must request its own piano coverage');
    assert.equal(jobs[0].disposed, true, 'old score-specific instrument is disposed');
    jobs[1].resolve(); await changed;
    assert.ok(jobs[1].starts.length > 0, 'new score uses the new instrument');
    player.pause();

    await player.open('original-rags');
    const obsolete = player.play();
    await flush(() => jobs.length === 3, 'old pending score starts loading');
    const oldPending = jobs[2];
    await player.open('clair-de-lune');
    const current = player.play();
    await Promise.resolve(); await Promise.resolve();
    assert.equal(jobs.length, 3, 'new coverage waits for the single old loading job');
    const beforeOldReady = events.length;
    oldPending.resolve(); await obsolete;
    await flush(() => jobs.length === 4, 'new score loads after the obsolete job settles');
    assert.equal(oldPending.disposed, true, 'obsolete resolved instrument is disposed instead of installed');
    assert.equal(oldPending.starts.length, 0, 'obsolete score never starts late');
    assert.equal(events.length, beforeOldReady, 'new score does not start with old coverage');
    assert.equal(player.getAudioState().sampleBased, false, 'old ready result does not become active');
    jobs[3].resolve(); await current; advance(2);
    assert.ok(jobs[3].starts.length > 0, 'current score starts only with current coverage');
    assert.equal(timers.size, 1, 'only one playback clock survives the switch');
    player.pause();

    await player.open('gymnopedie-no-1');
    const leaving = player.play();
    await flush(() => jobs.length === 5, 'navigation case begins loading');
    const beforeLeaveReady = events.length;
    doc.querySelector('.tab[data-page="tuner"]').click();
    jobs[4].resolve(); await leaving; advance(5);
    assert.equal(events.length, beforeLeaveReady, 'leaving the page while loading must not produce sound');
    assert.equal(jobs[4].starts.length, 0, 'late ready instrument is not auto-started after navigation');
    assert.equal(timers.size, 0, 'leaving while pending leaves no active score timer');

    console.log(`piano loading passed: ${catalog.length} real bundles; same-score reuse; both transpose extremes; new-score scope; obsolete-ready disposal; pending navigation silence`);
  } finally { f.dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
