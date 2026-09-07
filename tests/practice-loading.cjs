const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Copy into tests/ and run normally, or pass a project root when running externally.
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const manifest = JSON.parse(fs.readFileSync(path.join(docs, 'assets/audio/blues/manifest.json'), 'utf8'));
const names = Object.keys(manifest);
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness(options = {}) {
  const state = { resumes: 0, waves: 0, started: [], requests: [], decodes: [], successful: [], timers: new Map(), intervals: new Map(), now: 3, sequence: 0 };
  const owners = new WeakMap();
  class Param { value = 0; setValueAtTime(v) { this.value = v; } setTargetAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } cancelScheduledValues() {} }
  class Node {
    constructor() { for (const key of ['gain', 'frequency', 'playbackRate', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[key] = new Param(); }
    connect(node) { return node; } disconnect() {} setPeriodicWave() {} start(at) { state.started.push({ node: this, at }); } stop() {}
  }
  class Context {
    constructor(settings) { this.state = 'suspended'; this.sampleRate = 44100; this.destination = new Node(); state.settings = settings; }
    get currentTime() { return state.now; }
    resume() { state.resumes++; this.state = 'running'; return Promise.resolve(); }
    createGain() { return new Node(); } createDynamicsCompressor() { return new Node(); } createConvolver() { return new Node(); }
    createBiquadFilter() { return new Node(); } createOscillator() { return new Node(); } createBufferSource() { return new Node(); }
    createPeriodicWave() { state.waves++; return {}; }
    createBuffer(channels, length, rate) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { duration: length / rate, getChannelData: channel => data[channel] }; }
    async decodeAudioData(bytes) {
      const file = owners.get(bytes); state.decodes.push(file);
      const header = Buffer.from(bytes).toString('ascii', 0, 4);
      assert.equal(header, file.endsWith('.flac') ? 'fLaC' : 'RIFF', 'test fixtures use real bundled files');
      if (file.endsWith('.flac') && options.unsupportedFlac) throw new Error('Simulated unsupported FLAC decoder');
      state.successful.push(file); return { duration: 3.2 };
    }
  }
  const pendingAbort = signal => new Promise((_, reject) => {
    if (!signal) return;
    if (signal.aborted) reject(new Error('Aborted by timeout'));
    else signal.addEventListener('abort', () => reject(new Error('Aborted by timeout')), { once: true });
  });
  const fetch = async (url, request = {}) => {
    const file = url.split('/').pop(); state.requests.push(file);
    const isManifest = file === 'manifest.json';
    if (isManifest && options.stallManifest === 'fetch') return pendingAbort(request.signal);
    if (options.failedFiles?.has(file)) return { ok: false };
    return {
      ok: true,
      async json() { if (isManifest && options.stallManifest === 'body') return pendingAbort(request.signal); return manifest; },
      async arrayBuffer() {
        if (isManifest && options.stallManifest === 'body') return pendingAbort(request.signal);
        const source = fs.readFileSync(path.join(docs, 'assets/audio/blues', file));
        const bytes = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength); owners.set(bytes, file); return bytes;
      }
    };
  };
  const window = {
    AudioContext: Context,
    setInterval(fn) { const id = ++state.sequence; state.intervals.set(id, fn); return id; },
    clearInterval(id) { state.intervals.delete(id); }
  };
  const sandbox = { window, fetch, console, AbortController, TextDecoder, Float32Array, Map, Set,
    setTimeout(fn) { const id = ++state.sequence; state.timers.set(id, fn); return id; }, clearTimeout(id) { state.timers.delete(id); } };
  vm.createContext(sandbox);
  for (const file of ['harmony.js', 'practice-audio.js']) vm.runInContext(fs.readFileSync(path.join(docs, file), 'utf8'), sandbox, { filename: file });
  return { A: window.practiceAudio, H: window.tunerHarmony, state, options };
}

(async () => {
  {
    const { A, H, state } = harness();
    const first = A.preload(), second = A.preload(); assert.equal(first, second, 'concurrent callers share one asset load');
    await Promise.all([first, second]);
    assert.equal(state.resumes, 0, 'preload must not resume or unlock the audio device');
    assert.equal(state.started.length, 0, 'preload must never schedule audible nodes');
    assert.equal(A.getContext().state, 'suspended'); assert.equal(state.settings.latencyHint, 'interactive');
    assert.equal(state.requests.length, names.length + 1); assert.equal(state.decodes.length, names.length);
    assert.ok(state.decodes.every(file => file.endsWith('.flac'))); assert.equal(state.timers.size, 0, 'all asset deadlines are cleared');
    await A.preload(); await A.ensure(); assert.equal(state.resumes, 1); assert.equal(state.requests.length, names.length + 1, 'warm play reuses decoded assets');
    const transport = new A.Transport(); transport.load(A.arrangement(H.parse('I7 | IV7', 'A'), 'shuffle', 1)); await transport.play();
    assert.ok(state.started.length); assert.ok(Math.abs(Math.min(...state.started.map(item => item.at)) - state.now - .025) < 1e-9, 'first warm event is scheduled 25 ms ahead');
    assert.equal(state.waves, 1, 'organ voices share one periodic wave'); transport.pause(); assert.equal(state.intervals.size, 0);
    console.log('PASS: concurrent silent preload, interactive context, decoded cache, 25 ms warm schedule and shared organ waveform');
  }
  {
    const { A, state } = harness({ unsupportedFlac: true }); await A.preload();
    assert.equal(state.resumes, 0); assert.equal(state.requests.length, names.length * 2 + 1);
    assert.equal(state.decodes.filter(file => file.endsWith('.flac')).length, names.length);
    assert.equal(state.successful.filter(file => file.endsWith('.wav')).length, names.length, 'every unsupported FLAC automatically uses the bundled WAV');
    await A.ensure(); assert.equal(state.resumes, 1); assert.equal(state.requests.length, names.length * 2 + 1); assert.equal(state.timers.size, 0);
    console.log('PASS: unsupported FLAC decode falls back to all 12 WAV samples and warm playback reuses the fallback buffers');
  }
  {
    const failedFiles = new Set(['snare-2.flac', 'snare-2.wav']);
    const { A, state } = harness({ failedFiles });
    await assert.rejects(A.preload(), /音源载入失败/); await flush();
    assert.equal(state.successful.length, names.length - 1, 'unaffected samples finish decoding despite one failure');
    const prior = new Map(state.requests.map(file => [file, state.requests.filter(item => item === file).length]));
    failedFiles.clear(); await A.preload();
    assert.equal(state.successful.length, names.length, 'retry only adds the previously failed sample');
    for (const [name, entry] of Object.entries(manifest)) if (name !== 'snare-2') assert.equal(state.requests.filter(file => file === entry.file).length, prior.get(entry.file), `${name} must not be downloaded or decoded again`);
    assert.equal(state.requests.filter(file => file === 'snare-2.flac').length, 2);
    assert.equal(state.timers.size, 0); assert.equal(state.resumes, 0);
    console.log('PASS: partial loading failure is retryable and reuses all 11 already decoded samples');
  }
  for (const stage of ['fetch', 'body']) {
    const options = { stallManifest: stage }, { A, state } = harness(options);
    const pending = A.preload(); const rejection = assert.rejects(pending, /[Aa]bort|超时/); await flush();
    assert.ok(state.timers.size, `manifest ${stage} needs a timeout, not a permanently pending shared loader`);
    for (const timer of [...state.timers.values()]) timer(); await rejection; assert.equal(state.timers.size, 0);
    options.stallManifest = false; await A.preload(); assert.equal(state.successful.length, names.length);
    console.log(`PASS: stalled manifest ${stage} aborts and retry recovers`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
