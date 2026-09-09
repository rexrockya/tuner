const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const docs=path.resolve(process.argv[2]||'docs'), audioFile=path.join(docs,'practice-audio.js');
const banks=path.resolve(process.argv[3]||path.join(docs,'assets/audio'));
const names=['natural-drums','natural-percussion','natural-keys'];
const definitions=Object.fromEntries(names.map(name=>['assets/audio/'+name+'/manifest.json',JSON.parse(fs.readFileSync(path.join(banks,name,'manifest.json'),'utf8'))]));
const manifests=Object.fromEntries(names.map(name=>[name.replace('natural-',''),definitions['assets/audio/'+name+'/manifest.json']]));
const base='assets/audio/natural-keys/';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const plain=x=>JSON.parse(JSON.stringify(x));
// Inputs here are desired playing velocities; legacy accompaniment events carry one third of that value.
const keyEvent=(midi=60,playedVelocity=.5,beat=0)=>({track:'keys',beat,midi,velocity:playedVelocity/3,duration:.5});
const drumEvent=(sample='kick-1',velocity=.6,variant=0,beat=0)=>({track:'drums',sample,velocity,variant,beat,duration:.1});
const selection={keys:'wurli',drums:'natural',percussion:'natural'};
function song(events){return {beats:32,chartBeats:8,events:events||Array.from({length:32},(_,beat)=>keyEvent(60,.6,beat))};}
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
    createBuffer(ch, n, rate) { return {duration: n/rate, length:n, numberOfChannels:ch, getChannelData: () => new Float32Array(n)}; }
    async decodeAudioData(data) {
      const url = new TextDecoder().decode(data); decodes.push(url);
      if (decodeFails.has(url)) throw Error('decode unsupported: ' + url);
      return {duration: 8, length:352800, numberOfChannels:2, url};
    }
  }
  const oldManifest = {'kick-1': {file:'kick.wav'}, 'bass-1': {file:'bass.wav', midi:36}, 'guitar-1': {file:'guitar.wav', midi:60, layer:3, variant:0}};
  const window = {AudioContext:Context, setInterval(fn) { const id=++timerId; timers.set(id,fn); return id; }, clearInterval(id) { timers.delete(id); }};
  const sandbox = {window, AbortController, setTimeout, clearTimeout, Float32Array, Map, Set, console, structuredClone, fetch: async input => {
    const url = input.split('?')[0]; requests.push(url);
    if (gates.has(url)) await gates.get(url).promise;
    if (networkFails.has(url)) return {ok:false};
    return {ok:true, json:async () => { const found=definitions[url]; if(!found) throw Error('Unexpected manifest '+url); return structuredClone(found); }, arrayBuffer:async () => new TextEncoder().encode(url).buffer};
  }};
  vm.createContext(sandbox);
  for (const name of ['harmony.js', 'practice-arrangement.js', 'practice-samples.js']) vm.runInContext(fs.readFileSync(path.join(docs, name), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(audioFile, 'utf8'), sandbox);
  function ended() { for (const node of starts) if (!node.ended && node.stopTime <= now) { node.ended = true; node.onended?.(); } }
  return {A:window.practiceAudio, S:window.practiceSamples, context: new Context(), starts, nodes, timers, requests, decodes, networkFails, decodeFails,
    get now() { return now; }, get resumes() { return resumes; },
    advance(to) { while (now < to) { now = Math.min(to, now + .017); for (const fn of [...timers.values()]) fn(); ended(); } },
    hold(url) { let release; const promise = new Promise(r => release=r); gates.set(url, {promise}); return () => { gates.delete(url); release(); }; },
    count(url) { return requests.filter(x => x === url).length; },
    modernRequests() { return requests.filter(x => x.startsWith(base)); }
  };
}

(async()=>{
 {
  for(const name of names){
   const folder=path.join(banks,name),m=definitions['assets/audio/'+name+'/manifest.json'],p=JSON.parse(fs.readFileSync(path.join(folder,'provenance.json'),'utf8'));
   assert.match(p.source.commit,/^[a-f0-9]{40}$/);assert.equal(p.source.commit,m.source.commit);
   assert.match(fs.readFileSync(path.join(folder,'LICENSE'),'utf8'),name==='natural-keys'?/Attribution 3.0/:/CC0 1.0/);
   assert.equal(new Set(p.files.map(s=>s.sourceSha256)).size,p.files.length,'Every bundled take is a distinct source recording');
   for(const record of p.files)for(const [file,output] of Object.entries(record.outputs)){const data=fs.readFileSync(path.join(folder,file));assert.equal(hash(data),output.sha256);assert.equal(data.length,output.bytes);}
   for(const doc of p.sourceDocuments||[])assert.equal(hash(fs.readFileSync(path.join(folder,doc.file))),doc.sha256);
   for(const articulation of new Set(m.samples.map(s=>s.articulation)))for(let velocity=0;velocity<=127;velocity++)assert.ok(m.samples.some(s=>s.articulation===articulation&&s.velocityRange[0]<=velocity&&s.velocityRange[1]>=velocity));
  }
  assert.equal(manifests.drums.samples.length,100);assert.equal(manifests.percussion.samples.length,26);assert.equal(manifests.keys.samples.length,48);assert.equal(new Set(manifests.keys.samples.map(s=>s.file)).size,42);
  for(let midi=33;midi<=96;midi++)for(let velocity=0;velocity<=127;velocity++)assert.equal(manifests.keys.samples.filter(s=>s.keyRange[0]<=midi&&s.keyRange[1]>=midi&&s.velocityRange[0]<=velocity&&s.velocityRange[1]>=velocity).length,1);
  console.log('PASS: licensed fixed-source recordings, all distributed SHA256/size, original source mappings, complete key/velocity coverage');
 }
 {
  const f=fixture(),S=f.S,bank=S.createBank(f.context);
  near(S.velocity({track:'keys',velocity:.2}),.6);near(S.velocity({track:'strings',velocity:.2}),.6);near(S.velocity({track:'percussion',velocity:.2}),.4);near(S.velocity({track:'keys',velocity:.8}),1);
  await f.A.preload();await bank.ensure(selection,[]);assert.equal(f.requests.length,0);assert.equal(f.starts.length,0);
  const events=[keyEvent(33,.2),keyEvent(36,.2),keyEvent(74,.9)],release=f.hold(base+'manifest.json');
  const jobs=[bank.ensure(selection,events),bank.ensure(selection,events),bank.ensure(selection,events)];await flush();assert.equal(f.count(base+'manifest.json'),1);release();await Promise.all(jobs);
  const files=new Set(events.map(e=>S.select(manifests.keys,'keys',e).file));assert.equal(files.size,2);assert.equal(f.requests.length,3);assert.equal(f.starts.length,0);assert.equal(f.resumes,0);
  for(const file of files)assert.equal(f.count(base+file),1);
  const a=bank.get(events[0],selection),b=bank.get(events[1],selection);assert.equal(a.buffer,b.buffer);assert.notEqual(a.level,b.level);assert.equal(a.midi,33);assert.equal(b.midi,33);assert.equal(a.loop,true);assert.ok(a.loopEnd>a.loopStart);assert.equal(a.amplitudeExponent,2);near(S.amplitude(a,.5),(64/127)**2);
  await bank.ensure(selection,events);assert.equal(f.requests.length,3);
  console.log('PASS: only required Wurli files load; concurrent jobs share work; reused buffers retain distinct SFZ region gain and inherited curve/loops');
 }
 {
  const f=fixture(),S=f.S;
  for(const velocity of [.1,.35,.6,.95]){
   const samples=Array.from({length:20},(_,variant)=>S.select(manifests.drums,'drums',drumEvent('kick-1',velocity,variant)));assert.equal(new Set(samples.map(s=>s.file)).size,4);assert.equal(new Set(samples.map(s=>s.sourceLayer)).size,1);
  }
  const snare=Array.from({length:128},(_,v)=>S.select(manifests.drums,'drums',drumEvent('snare-1',v/127)));assert.equal(new Set(snare.map(s=>s.file)).size,12);
  for(const s of snare){assert.equal(s.amplitudeExponent,0);near(S.amplitude(s,.15),1);near(S.amplitude(s,.95),1);}
  const soft=S.select(manifests.drums,'drums',drumEvent('kick-1',10/127));assert.ok(S.amplitude(soft,10/127)>.4);
  const bank=S.createBank(f.context),events=['shaker','tambourine','clap'].map((style,i)=>({track:'percussion',sample:i===2?'snare-1':'open-hat',percussionStyle:style,beat:i,velocity:.3,duration:.075}));
  await bank.ensure(selection,events);assert.ok(f.requests.every(u=>u.startsWith('assets/audio/natural-percussion/')));
  events.forEach(e=>{const asset=bank.get(e,selection);assert.equal(asset.articulation,e.percussionStyle==='tambourine'?'tambourine-hit':e.percussionStyle);assert.equal(asset.bank,'percussion');});
  console.log('PASS: actual 4-way RR and 12 snare layers; source drum response retained; shaker/tambourine/clap use real percussion bank');
 }
 {
  const f=fixture(),bank=f.S.createBank(f.context),event=keyEvent(),s=f.S.select(manifests.keys,'keys',event);f.decodeFails.add(base+s.file);
  await bank.ensure(selection,[event]);assert.equal(f.count(base+s.file),1);assert.equal(f.count(base+s.fallback),1);assert.equal(bank.get(event,selection).buffer.url,base+s.fallback);
  await bank.ensure(selection,[event]);assert.equal(f.count(base+s.fallback),1);assert.equal(f.starts.length,0);
  console.log('PASS: failed FLAC decode uses matching WAV once and caches the successful decoded buffer without sounding');
 }
 {
  const f=fixture(),bank=f.S.createBank(f.context),events=[keyEvent(33,.2),keyEvent(51,.4),keyEvent(73,.75),keyEvent(92,.95)];
  const fail=f.S.select(manifests.keys,'keys',events[1]),bad=[base+fail.file,base+fail.fallback];bad.forEach(u=>f.networkFails.add(u));
  await assert.rejects(bank.ensure(selection,events));await flush();assert.equal(f.starts.length,0);
  const successful=events.filter((_,i)=>i!==1).map(e=>base+f.S.select(manifests.keys,'keys',e).file);successful.forEach(u=>assert.equal(f.count(u),1));
  bad.forEach(u=>f.networkFails.delete(u));await bank.ensure(selection,events);successful.forEach(u=>assert.equal(f.count(u),1));assert.equal(f.count(base+fail.file),2);assert.equal(f.count(base+'manifest.json'),1);
  console.log('PASS: failed partial preparation retries only missing files and retains successful cache');
 }
 {
  const f=fixture(),A=f.A;await A.setTimbre('keys','jazz',[]);const t=new A.Transport(),old=song();t.load(old);await t.play();assert.ok(f.starts.length>0);const generation=t.generation;
  const first=f.S.select(manifests.keys,'keys',old.events[0]),bad=[base+first.file,base+first.fallback];bad.forEach(u=>f.networkFails.add(u));
  const release=f.hold(base+'manifest.json'),pending=A.prepareTimbres({keys:'wurli'},old.events);await flush();f.advance(2.2);assert.equal(t.playing,true);assert.equal(A.getTimbre('keys'),'jazz');assert.equal(t.generation,generation);release();await assert.rejects(pending);
  f.advance(3);assert.equal(t.playing,true);assert.equal(A.getTimbre('keys'),'jazz');assert.ok(f.starts.every(n=>!n.buffer));
  bad.forEach(u=>f.networkFails.delete(u));const prepared=await A.prepareTimbres({keys:'wurli'},old.events);assert.equal(A.getTimbre('keys'),'jazz');const update=t.queueUpdate(old,{timbres:prepared});f.advance(update.at-.03);assert.equal(A.getTimbre('keys'),'jazz');
  const starts=f.starts.filter(n=>n.buffer&&Math.abs(n.startTime-update.at)<1e-7&&!n.disconnected);assert.equal(starts.length,1);assert.equal(starts[0].buffer.url,base+first.file);assert.ok(starts[0].scheduledAt<update.at);assert.equal(starts[0].loop,true);
  f.advance(update.at+.02);assert.equal(A.getTimbre('keys'),'wurli');assert.equal(t.playing,true);assert.equal(t.generation,generation);t.pause();f.advance(f.now+.05);assert.equal(f.timers.size,0);
  console.log('PASS: slow/failed bank preserves playing harmony; prepared real keys take over only at queued bar boundary');
 }
 {
  const f=fixture(),A=f.A,event=keyEvent(36,.2),second=keyEvent(33,.2,1),source=f.S.select(manifests.keys,'keys',event),secondSource=f.S.select(manifests.keys,'keys',second),songData=song([event,second]);
  await A.setTimbre('keys','wurli',[event]);await A.preload();const persistent=f.nodes.length,t=new A.Transport();t.load(songData);await t.play();
  const voice=f.starts[0];assert.equal(voice.buffer.url,base+source.file);near(voice.playbackRate.value,2**((event.midi-source.midi+source.tuneCents/100)/12));near(voice.loopStart,source.loopStart);near(voice.loopEnd,source.loopEnd);
  const input=voice.connections[0];assert.ok(input.gain.value>0);f.advance(.75);const secondVoice=f.starts[1];assert.equal(secondVoice.buffer,voice.buffer);near(input.gain.value/secondVoice.connections[0].gain.value,source.level/secondSource.level);
  near(f.S.amplitude({...source,amplitudeExponent:2},f.S.velocity(event)),(Math.round(.2*127)/127)**2);
  t.pause();f.advance(f.now+.1);assert.ok(f.nodes.slice(persistent).every(n=>n.disconnected));
  console.log('PASS: real Wurli buffer, nearest source pitch, SFZ tune/loop/region gain, and per-voice node disposal');
 }
 {
  const f=fixture(),A=f.A;await A.setTimbre('keys','jazz');const event=keyEvent(),s=f.S.select(manifests.keys,'keys',event);[base+s.file,base+s.fallback].forEach(u=>f.networkFails.add(u));await assert.rejects(A.setTimbre('keys','wurli',[event]));assert.equal(A.getTimbre('keys'),'jazz');assert.equal(f.starts.length,0);
  console.log('PASS: failed stopped instrument selection restores previous voice without audio');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
