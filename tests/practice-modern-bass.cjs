const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const docs = path.resolve(process.argv[2] || path.join(__dirname, '../docs'));
const audioFile = process.argv[3] || path.join(docs, 'practice-audio.js');
const base = 'assets/audio/modern-bass/', assetDir = path.join(docs, base);
const manifest = JSON.parse(fs.readFileSync(path.join(assetDir, 'manifest.json'), 'utf8'));
const entries = Object.values(manifest), roots = [27, 30, 33, 36, 39, 42, 48, 54];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, a + ' != ' + b);
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function pcm(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF'); assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');
  let format, data;
  for (let pos = 12; pos + 8 <= buffer.length;) {
    const kind = buffer.toString('ascii', pos, pos + 4), size = buffer.readUInt32LE(pos + 4), payload = buffer.subarray(pos + 8, pos + 8 + size);
    if (kind === 'fmt ') format = payload;
    if (kind === 'data') data = payload;
    pos += 8 + size + size % 2;
  }
  assert.ok(format && data); assert.equal(format.readUInt16LE(0), 1); assert.equal(format.readUInt16LE(2), 1);
  assert.equal(format.readUInt32LE(4), 44100); assert.equal(format.readUInt16LE(14), 16); assert.equal(data.length, 44100 * 4 * 2);
  let peak = 0; for (let i = 0; i < data.length; i += 2) peak = Math.max(peak, Math.abs(data.readInt16LE(i)) / 32768);
  assert.ok(peak > .5 && peak < .71, 'normalized recordings retain headroom');
  assert.ok(Math.abs(data.readInt16LE(data.length - 2)) < 3, 'tail fade reaches silence');
  return data;
}
function fixture() {
  let now = 0, timerId = 0, resumes = 0;
  const nodes = [], starts = [], timers = new Map(), requests = [], decodes = [], networkFails = new Set(), decodeFails = new Set(), gates = new Map();
  class Param {
    value = 0; events = [];
    setValueAtTime(v, at) { this.value = v; this.events.push({v, at}); }
    setTargetAtTime(v, at) { this.value = v; this.events.push({v, at}); }
    linearRampToValueAtTime(v, at) { this.value = v; this.events.push({v, at}); }
    cancelScheduledValues() {}
  }
  class Node {
    constructor(type) { this.type = type; this.connections = []; for (const k of ['gain','frequency','Q','playbackRate','threshold','knee','ratio','attack','release']) this[k] = new Param(); nodes.push(this); }
    connect(n) { this.connections.push(n); return n; }
    disconnect() { this.disconnected = true; }
    start(at) { this.startTime = at; this.scheduledAt = now; starts.push(this); }
    stop(at) { this.stopTime = at; }
    setPeriodicWave() {}
  }
  class Context {
    state = 'running'; sampleRate = 44100; destination = new Node('destination');
    get currentTime() { return now; }
    async resume() { resumes++; }
    createGain() { return new Node('gain'); } createDynamicsCompressor() { return new Node('compressor'); }
    createConvolver() { return new Node('convolver'); } createBiquadFilter() { return new Node('filter'); }
    createWaveShaper() { return new Node('drive'); } createOscillator() { return new Node('oscillator'); }
    createBufferSource() { return new Node('source'); } createPeriodicWave() { return {}; }
    createBuffer(ch, n, rate) { return {duration: n/rate, getChannelData: () => new Float32Array(n)}; }
    async decodeAudioData(data) {
      const url = new TextDecoder().decode(data); decodes.push(url);
      if (decodeFails.has(url)) throw Error('decode unsupported: ' + url);
      return {duration: url.startsWith(base) ? 4 : 2, url};
    }
  }
  const oldManifest = {'kick-1': {file:'kick.wav'}, 'bass-1': {file:'bass.wav', midi:36}, 'guitar-1': {file:'guitar.wav', midi:60, layer:3, variant:0}};
  const window = {AudioContext:Context, setInterval(fn) { const id=++timerId; timers.set(id,fn); return id; }, clearInterval(id) { timers.delete(id); }};
  const sandbox = {window, AbortController, setTimeout, clearTimeout, Float32Array, Map, Set, console, fetch: async input => {
    const url = input.split('?')[0]; requests.push(url);
    if (gates.has(url)) await gates.get(url).promise;
    if (networkFails.has(url)) return {ok:false};
    return {ok:true, json:async () => url.startsWith(base) ? manifest : oldManifest, arrayBuffer:async () => new TextEncoder().encode(url).buffer};
  }};
  vm.createContext(sandbox);
  for (const name of ['harmony.js', 'practice-arrangement.js']) vm.runInContext(fs.readFileSync(path.join(docs, name), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(audioFile, 'utf8'), sandbox);
  function ended() { for (const node of starts) if (!node.ended && node.stopTime <= now) { node.ended = true; node.onended?.(); } }
  return {A:window.practiceAudio, starts, nodes, timers, requests, decodes, networkFails, decodeFails,
    get now() { return now; }, get resumes() { return resumes; },
    advance(to) { while (now < to) { now = Math.min(to, now + .017); for (const fn of [...timers.values()]) fn(); ended(); } },
    hold(url) { let release; const promise = new Promise(r => release=r); gates.set(url, {promise}); return () => { gates.delete(url); release(); }; },
    count(url) { return requests.filter(x => x === url).length; },
    modernRequests() { return requests.filter(x => x.startsWith(base)); }
  };
}
function song(events = []) { return {beats:32, chartBeats:8, events:events.length ? events : Array.from({length:32}, (_, beat) => ({track:'bass', beat, midi:36, duration:.6, velocity:.65, variant:beat%2}))}; }
function audible(f, at) { return f.starts.filter(n => Math.abs(n.startTime - at) < 1e-7 && !n.disconnected && n.stopTime > n.startTime); }
(async () => {
  {
    assert.equal(entries.length, 16); assert.deepEqual([...new Set(entries.map(e => e.midi))].sort((a,b)=>a-b), roots);
    const provenance = JSON.parse(fs.readFileSync(path.join(assetDir, 'provenance.json'), 'utf8'));
    assert.match(provenance.sourceCommit, /^[a-f0-9]{40}$/); assert.equal(provenance.license, 'CC0-1.0');
    assert.match(fs.readFileSync(path.join(assetDir, 'LICENSE.txt'), 'utf8'), /CC0 1.0 Universal/);
    assert.match(fs.readFileSync(path.join(assetDir, 'SOURCE-README.txt'), 'utf8'), /Ibanez BTB-400QM/);
    assert.equal(provenance.samples.length, entries.length);
    let total = 0;
    for (const entry of entries) {
      assert.equal(entry.sourceLayer, 'f'); const record = provenance.samples.find(p => p.file === entry.file); assert.ok(record);
      assert.equal(record.midi, entry.midi); assert.equal(record.variant, entry.variant);
      const flac = fs.readFileSync(path.join(assetDir, entry.file)), wav = fs.readFileSync(path.join(assetDir, entry.fallback));
      assert.equal(flac.toString('ascii', 0, 4), 'fLaC'); assert.equal(hash(flac), record.flacSha256); assert.equal(hash(wav), record.wavSha256);
      assert.equal(flac.length, record.flacBytes); assert.equal(wav.length, record.wavBytes); pcm(wav); total += flac.length;
    }
    assert.equal(total, provenance.flacTotalBytes); assert.ok(total < 2 * 1024 * 1024);
    for (const midi of roots) {
      const pair = provenance.samples.filter(p => p.midi === midi); assert.deepEqual(pair.map(p => p.variant).sort(), [0,1]);
      assert.notEqual(pair[0].sourceSha256, pair[1].sourceSha256, 'RRs are different source recordings');
      assert.notEqual(pair[0].wavSha256, pair[1].wavSha256, 'RRs retain distinct audio'); near(pair[0].pairGainDb, pair[1].pairGainDb);
    }
    console.log('PASS: 16 licensed recordings, 8 roots, real paired round robins, WAV format/tails, FLAC and provenance hashes');
  }
  {
    const f=fixture(), A=f.A; await A.preload(); assert.equal(f.modernRequests().length, 0);
    await A.prepareTimbres({bass:'precision'}, [{track:'lead', midi:60}]); assert.equal(f.modernRequests().length,0); assert.equal(A.getTimbre('bass'),'round');
    await A.setTimbre('bass','precision', []); assert.equal(f.modernRequests().length,0); assert.equal(A.getTimbre('bass'),'precision');
    await A.setTimbre('bass','round');
    const release=f.hold(base+'manifest.json'), jobs=[1,2,3].map(() => A.prepareTimbres({bass:'precision'}, song().events));
    await flush(); assert.equal(f.count(base+'manifest.json'),1); assert.equal(f.resumes,0); release();
    const snapshots=await Promise.all(jobs); assert.ok(snapshots.every(Object.isFrozen)); assert.equal(A.getTimbre('bass'),'round');
    assert.equal(f.modernRequests().length,17); for (const e of entries) assert.equal(f.count(base+e.file),1);
    await A.prepareTimbres({bass:'precision'},song().events); assert.equal(f.modernRequests().length,17);
    console.log('PASS: existing preload stays light; modern bass loads only for bass events; concurrent preparation shares cached resources');
  }
  {
    const f=fixture(), A=f.A, entry=entries[0]; f.decodeFails.add(base+entry.file);
    await A.prepareTimbres({bass:'precision'},song().events); assert.equal(f.count(base+entry.file),1); assert.equal(f.count(base+entry.fallback),1);
    assert.equal(f.modernRequests().length,18); await A.prepareTimbres({bass:'precision'},song().events); assert.equal(f.modernRequests().length,18);
    A.commitTimbres({bass:'precision'}); const t=new A.Transport(); t.load(song([{track:'bass', beat:0, midi:entry.midi, variant:entry.variant, duration:1, velocity:.6}])); await t.play();
    assert.equal(f.starts[0].buffer.url,base+entry.fallback); t.pause(); f.advance(.05);
    console.log('PASS: unsupported FLAC decode falls back to the matching WAV and caches its playable buffer');
  }
  {
    const f=fixture(), A=f.A, failing=entries.at(-1), failedPaths=[base+failing.file,base+failing.fallback]; failedPaths.forEach(x=>f.networkFails.add(x));
    const t=new A.Transport(), old=song(); t.load(old); await t.play(); const generation=t.generation, oldStart=f.starts[0];
    const release=f.hold(base+'manifest.json'), preparing=A.prepareTimbres({bass:'precision'},old.events); await flush(); f.advance(2.2);
    assert.equal(t.playing,true); assert.equal(t.generation,generation); assert.equal(A.getTimbre('bass'),'round'); assert.ok(f.starts.length>=4); release();
    await assert.rejects(preparing,/\u97f3\u6e90\u8f7d\u5165\u5931\u8d25/); await flush(); assert.equal(t.song,old); assert.equal(t.playing,true); assert.equal(A.getTimbre('bass'),'round');
    f.advance(4); assert.ok(f.starts.length>=7); assert.equal(f.resumes,1); assert.equal(oldStart.buffer.url,'assets/audio/blues/bass.wav');
    const before=new Map(f.requests.map(url=>[url,f.count(url)])); failedPaths.forEach(x=>f.networkFails.delete(x));
    await A.prepareTimbres({bass:'precision'},old.events);
    for (const e of entries.slice(0,-1)) assert.equal(f.count(base+e.file),before.get(base+e.file),'successful partial loads are reused on retry');
    assert.equal(f.count(base+failing.file),2); assert.equal(f.count(base+'manifest.json'),2); assert.equal(t.generation,generation); t.pause(); f.advance(f.now+.04);
    console.log('PASS: slow/failed resources preserve the playing bass and clock; retry reuses the successfully decoded partial bank');
  }
  {
    const f=fixture(), A=f.A, entry=entries[0]; await A.setTimbre('bass','bright');
    f.networkFails.add(base+entry.file); f.networkFails.add(base+entry.fallback);
    await assert.rejects(A.setTimbre('bass','precision',song().events),/\u97f3\u6e90\u8f7d\u5165\u5931\u8d25/); assert.equal(A.getTimbre('bass'),'bright');
    const release=f.hold(base+'manifest.json'), stale=A.setTimbre('bass','precision',song().events); await flush();
    await A.setTimbre('bass','muted'); release(); assert.equal(await stale,false); assert.equal(A.getTimbre('bass'),'muted');
    console.log('PASS: a failed stopped selection restores its previous timbre, and an obsolete failure cannot overwrite a newer selection');
  }
  {
    const f=fixture(), A=f.A, t=new A.Transport(), old=song(); t.load(old); await t.play(); const generation=t.generation;
    f.advance(.5); const snapshot=await A.prepareTimbres({bass:'precision'},old.events); assert.equal(A.getTimbre('bass'),'round');
    let commits=0; const pending=t.queueUpdate(old,{timbres:snapshot,onCommit(){commits++;}}); f.advance(pending.at-.03);
    assert.equal(A.getTimbre('bass'),'round'); assert.equal(commits,0); assert.equal(t.generation,generation);
    const first=audible(f,pending.at); assert.equal(first.length,1); assert.equal(first[0].buffer.url,base+'electric-36-r1.flac');
    assert.ok(first[0].scheduledAt<pending.at); assert.ok(f.starts.filter(n=>n.startTime<pending.at).every(n=>n.buffer.url==='assets/audio/blues/bass.wav'));
    f.advance(pending.at+.02); assert.equal(commits,1); assert.equal(A.getTimbre('bass'),'precision'); assert.equal(t.playing,true); assert.equal(f.resumes,1);
    t.pause(); f.advance(f.now+.04); assert.equal(f.timers.size,0);
    console.log('PASS: preparing never changes sounding bass; one new downbeat is scheduled ahead and the active selection commits at its bar boundary');
  }
  {
    const f=fixture(), A=f.A, t=new A.Transport(), old=song(); old.events.forEach(event=>event.duration=2); t.load(old); await t.play();
    const snapshot=await A.prepareTimbres({bass:'precision'},old.events), pending=t.queueUpdate(old,{timbres:snapshot});
    f.advance(pending.at-.03);
    const candidate=audible(f,pending.at)[0], index=f.nodes.indexOf(candidate), chain=[];
    let current=candidate;
    while(current && f.nodes.indexOf(current)>=index && !chain.includes(current)) { chain.push(current); current=current.connections[0]; }
    assert.ok(chain.length>=7, 'modern candidate owns its tone processing nodes');
    const oldTail=f.starts.filter(n=>n.buffer.url==='assets/audio/blues/bass.wav'&&!n.disconnected).at(-1); assert.ok(oldTail); const previousStop=oldTail.stopTime;
    t.cancelUpdate(); assert.ok(chain.every(node=>node.disconnected),'cancelling a queued voice frees all of its effects immediately');
    assert.equal(oldTail.disconnected,undefined); assert.equal(oldTail.stopTime,previousStop); assert.equal(A.getTimbre('bass'),'round');
    const restored=audible(f,pending.at); assert.equal(restored.length,1); assert.equal(restored[0].buffer.url,'assets/audio/blues/bass.wav');
    t.pause(); f.advance(f.now+.04);
    console.log('PASS: cancelling a future modern-bass downbeat disposes all candidate effects and restores old audio without cutting its tail');
  }
  {
    const f=fixture(), A=f.A; await A.setTimbre('bass','precision'); assert.equal(f.modernRequests().length,0);
    const t=new A.Transport(); t.load(song()); await t.play(); assert.equal(f.count(base+'manifest.json'),1);
    assert.equal(f.starts[0].buffer.url,base+'electric-36-r1.flac'); t.pause(); f.advance(.05);
    console.log('PASS: choosing an unused modern voice remains lazy, then Play prepares it before scheduling any bass note');
  }
  {
    const f=fixture(), A=f.A;
    const events=Array.from({length:28},(_,i)=>({track:'bass',beat:i,midi:28+i,duration:.4,velocity:.7,...(i%3===0?{}:{variant:i%4})}));
    await A.prepareTimbres({bass:'precision'},events); A.commitTimbres({bass:'precision'}); const persistent=f.nodes.length;
    const t=new A.Transport(); t.load(song(events)); await t.play(); f.advance(17.15);
    assert.equal(f.starts.length,events.length);
    for (let i=0;i<events.length;i++) {
      const event=events[i], variant=(event.variant??Math.floor(event.beat*3))%2;
      const root=roots.reduce((best,value)=>Math.abs(value-event.midi)<Math.abs(best-event.midi)?value:best,roots[0]);
      assert.equal(f.starts[i].buffer.url,base+`electric-${root}-r${variant+1}.flac`); near(f.starts[i].playbackRate.value,2**((event.midi-root)/12));
    }
    t.pause(); f.advance(f.now+.04);
    assert.ok(f.nodes.slice(persistent).every(node=>node.disconnected),'every note source, gain, EQ, saturation and compressor node is disconnected after ending');
    assert.ok(f.nodes.slice(0,persistent).some(node=>!node.disconnected),'shared audio buses remain available for the next play');
    assert.equal(f.count(base+'manifest.json'),1);
    console.log('PASS: modern buffers use the nearest recorded root and both variants across bass range; finished audio nodes are disposed');
  }
})().catch(error => { console.error(error); process.exitCode=1; });
