// Production-path integration tests. Uses the seven real manifests, actual sample selection,
// loader, voice graph and transport. decodeAudioData returns tagged mock buffers: this suite
// does not measure PCM quality, browser decoder support or perceived sound.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const docs = path.resolve(process.argv[2] || path.join(__dirname, '../docs'));
const bankNames = ['natural-guitar','natural-bass','natural-drums','natural-percussion','natural-strings','natural-ensemble','natural-keys'];
const manifests = Object.fromEntries(bankNames.map(name => [name, JSON.parse(fs.readFileSync(path.join(docs, 'assets/audio', name, 'manifest.json'), 'utf8'))]));
const near = (a,b,tolerance=1e-7) => assert.ok(Number.isFinite(a) && Math.abs(a-b)<tolerance, `${a} != ${b}`);
const plain = value => JSON.parse(JSON.stringify(value));
const expectedVelocity = event => Math.max(1/127,Math.min(1,(event.velocity??.6)*(['keys','strings'].includes(event.track)?3:event.track==='percussion'?2:1)));
const flush = async () => { for (let i=0;i<30;i++) await Promise.resolve(); };
const defaults = {drums:'natural',bass:'round',keys:'wurli',rhythm:'warm',percussion:'natural',strings:'chamber',lead:'warm'};
function fixture() {
  let now=0, timerId=0, resumes=0, imports=0, activeDownloads=0, maxDownloads=0;
  const nodes=[],starts=[],requests=[],decodes=[],timers=new Map(),gates=new Map(),networkFails=new Set(),decodeFails=new Set();
  class Param {
    value=0;events=[];
    record(kind,v,at,extra) {this.value=v;this.events.push({kind,v,at,extra});}
    setValueAtTime(v,at){this.record('set',v,at);} setTargetAtTime(v,at,constant){this.record('target',v,at,constant);}
    linearRampToValueAtTime(v,at){this.record('linear',v,at);} exponentialRampToValueAtTime(v,at){this.record('exponential',v,at);}
    cancelScheduledValues(at){this.events.push({kind:'cancel',at});}
  }
  class Node {
    constructor(kind){this.kind=kind;this.id=nodes.length;this.connections=[];this.stops=[];for(const key of ['gain','frequency','Q','playbackRate','threshold','knee','ratio','attack','release','pan'])this[key]=new Param();nodes.push(this);}
    connect(node){this.connections.push(node);return node;} disconnect(){this.disconnected=true;}
    start(at){this.startTime=at;this.scheduledAt=now;starts.push(this);} stop(at){this.stopTime=at;this.stops.push(at);} setPeriodicWave(){}
  }
  class Context {
    state='running';sampleRate=44100;destination=new Node('destination');get currentTime(){return now;}async resume(){resumes++;}
    createGain(){return new Node('gain');}createDynamicsCompressor(){return new Node('compressor');}createConvolver(){return new Node('convolver');}
    createBiquadFilter(){return new Node('filter');}createWaveShaper(){return new Node('drive');}createOscillator(){return new Node('oscillator');}
    createBufferSource(){return new Node('source');}createPeriodicWave(){return {};}createStereoPanner(){return new Node('panner');}
    createBuffer(ch,length,rate){return {duration:length/rate,length,sampleRate:rate,numberOfChannels:ch,getChannelData:()=>new Float32Array(length)};}
    async decodeAudioData(data){
      const url=new TextDecoder().decode(data);decodes.push(url);await Promise.resolve();
      if(decodeFails.has(url))throw Error('mock decoder unsupported: '+url);
      const [,bank,file]=/^assets\/audio\/([^/]+)\/(.+)$/.exec(url)||[];
      const entry=manifests[bank]?.samples.find(s=>s.file===file||s.fallback===file);
      assert.ok(entry,'mock decode must correspond to a real manifest entry: '+url);
      const duration=entry.duration||8,channels=entry.channels||2;
      return {url,duration,length:Math.round(duration*44100),sampleRate:44100,numberOfChannels:channels};
    }
  }
  const window={AudioContext:Context,setInterval(fn){const id=++timerId;timers.set(id,fn);return id;},clearInterval(id){timers.delete(id);}};
  const sandbox={window,console,Math,AbortController,Float32Array,Map,Set,setTimeout,clearTimeout,fetch:async(input)=>{
    const url=String(input).split('?')[0];requests.push(url);
    assert.match(url,/^assets\/audio\/natural-[^/]+\//,'production recordings must not fetch legacy blues/GM/modern-bass');
    if(gates.has(url))await gates.get(url).promise;
    if(networkFails.has(url))return {ok:false};
    const match=/^assets\/audio\/([^/]+)\/(.+)$/.exec(url);assert.ok(match);const [,bank,file]=match;
    assert.ok(manifests[bank], 'real bank required');
    return {ok:true,json:async()=>{assert.equal(file,'manifest.json');return structuredClone(manifests[bank]);},arrayBuffer:async()=>{
      assert.ok(manifests[bank].samples.some(s=>s.file===file||s.fallback===file),'only manifest files may be fetched');
      activeDownloads++;maxDownloads=Math.max(maxDownloads,activeDownloads);await Promise.resolve();activeDownloads--;
      return new TextEncoder().encode(url).buffer;
    }};
  }};
  vm.createContext(sandbox);
  for(const name of ['harmony.js','practice-arrangement.js','practice-samples.js','practice-audio.js']){
    new vm.Script(fs.readFileSync(path.join(docs,name),'utf8'),{filename:name,importModuleDynamically(){imports++;throw Error('unexpected legacy/GM import');}}).runInContext(sandbox);
  }
  function ended(){for(const node of starts)if(!node.ended&&node.stopTime<=now){node.ended=true;node.onended?.();}}
  return {A:window.practiceAudio,P:window.practiceSamples,nodes,starts,requests,decodes,timers,networkFails,decodeFails,
    get now(){return now;},get resumes(){return resumes;},get imports(){return imports;},get maxDownloads(){return maxDownloads;},
    advance(to){while(now<to){now=Math.min(to,now+.017);for(const fn of [...timers.values()])fn();ended();}},
    setNow(to){now=to;},tick(){for(const fn of [...timers.values()])fn();},
    hold(url){let release;const promise=new Promise(r=>release=r);gates.set(url,{promise});return()=>{gates.delete(url);release();};},
    count(url){return requests.filter(x=>x===url).length;}
  };
}
function song(events,beats=16){return {events,beats,chartBeats:beats};}
function leadSong(midi=60){return song(Array.from({length:16},(_,beat)=>({track:'lead',midi,beat,duration:1.5,velocity:.72,variant:beat%4})));}
function audible(f,at){return f.starts.filter(n=>Math.abs(n.startTime-at)<1e-7&&!n.disconnected&&n.stopTime>n.startTime);}
function ownChain(source){const result=[];let node=source;while(node&&node.id>=source.id&&!result.includes(node)){result.push(node);node=node.connections[0];}return result;}
function sampleFor(source){const [,bank,file]=/^assets\/audio\/([^/]+)\/(.+)$/.exec(source.buffer.url);return manifests[bank].samples.find(s=>s.file===file||s.fallback===file);}
function expectedAmplitude(asset,velocity,manifest={}){
  const v=Math.max(1,Math.min(127,Math.round(velocity*127)));
  if(asset.velocityCurve){const p=asset.velocityCurve;for(let i=1;i<p.length;i++)if(v<=p[i][0])return p[i-1][1]+(p[i][1]-p[i-1][1])*(v-p[i-1][0])/(p[i][0]-p[i-1][0]);return p.at(-1)[1];}
  return (v/127)**(asset.amplitudeExponent??manifest.amplitudeExponent??manifest.velocityTracking?.amplitudeExponent??1);
}
(async()=>{
  {
    let samples=0;for(const [bank,m] of Object.entries(manifests)){assert.equal(m.version,1);assert.ok(m.samples.length);for(const entry of m.samples){
      assert.ok(Array.isArray(entry.velocityRange)&&entry.velocityRange.length===2);assert.ok(entry.velocityRange[0]>=0&&entry.velocityRange[1]<=127);
      for(const filename of [entry.file,entry.fallback]){assert.ok(filename&&!/^(?:https?:|\/)|\.\./.test(filename));assert.ok(fs.statSync(path.join(docs,'assets/audio',bank,filename)).isFile());}
      samples++;
    }}console.log(`PASS: seven production manifests and ${samples} real FLAC/WAV pairs present (metadata, not PCM QA)`);
  }
  {
    const f=fixture();await f.A.preload();assert.equal(f.requests.length,0);await f.A.prepareTimbres(defaults,[]);
    await f.A.setTimbre('lead','violin',[]);await f.A.setTimbre('keys','wurli-soft',[]);
    assert.equal(f.requests.length,0);assert.equal(f.resumes,0);assert.equal(f.imports,0);assert.equal(f.starts.length,0);
    console.log('PASS: preload and unused selections fetch no recordings, legacy blues, GM library or old bass');
  }
  {
    const f=fixture(),A=f.A,P=f.P;
    const events=[{track:'lead',midi:60,articulation:'slide'},{track:'bass',midi:39},{track:'drums',sample:'kick-1'},
      {track:'keys',midi:60},{track:'rhythm',midi:64},{track:'strings',midi:69},{track:'percussion',sample:'hat-1',percussionStyle:'shaker'}]
      .map((e,i)=>({...e,beat:i*.25,duration:1,velocity:.72,variant:i}));
    const selection={...defaults,bass:'precision'},expectedBanks=['guitar','bass','drums','keys','guitar','ensemble','percussion'];
    const prepared=await A.prepareTimbres(selection,events);A.commitTimbres(prepared);const count=f.requests.length;
    assert.equal(f.requests.filter(u=>u.endsWith('manifest.json')).length,6);
    const fileSet=new Set(events.map(e=>{const bank=P.route(e,selection);return 'assets/audio/'+P.catalog[bank]+'/'+P.select(manifests[P.catalog[bank]],bank,e).file;}));
    assert.deepEqual([...new Set(f.requests.filter(u=>!u.endsWith('manifest.json')))].sort(),[...fileSet].sort());
    assert.ok(fileSet.size<20,'seven voices should not fetch entire banks');
    const t=new A.Transport();t.load(song(events,8));await t.play();f.advance(1.2);assert.equal(f.starts.length,7);assert.equal(f.requests.length,count);
    f.starts.forEach((source,i)=>{assert.ok(source.buffer.url.startsWith('assets/audio/'+P.catalog[expectedBanks[i]]+'/'));const e=events[i],entry=sampleFor(source),v=Math.round(expectedVelocity(e)*127);
      assert.ok(v>=entry.velocityRange[0]&&v<=entry.velocityRange[1]);if(Number.isFinite(e.midi)){assert.ok(e.midi>=entry.keyRange[0]&&e.midi<=entry.keyRange[1]);near(source.playbackRate.value,2**((e.midi-entry.midi+(entry.tuneCents||0)/100)/12));}
      const chain=ownChain(source);assert.equal(chain[1].kind,'gain','sample input gain precedes filters and drive');
      assert.ok(chain[1].gain.value>0&&Number.isFinite(chain[1].gain.value));
      const envelope=chain.find(n=>n.kind==='gain'&&n.gain.events.some(e=>e.kind==='target'));
      near(envelope.gain.events.find(e=>e.kind==='linear').v,1);
      if(entry.loopEnd>entry.loopStart){assert.equal(source.loop,true);near(source.loopStart,entry.loopStart);near(source.loopEnd,entry.loopEnd);}
      assert.equal(source.playbackRate.events.length,0,'natural takes do not add a fake slide');
    });t.pause();
    const violin=[{track:'lead',midi:60,beat:0,duration:1,velocity:.72},{track:'lead',midi:72,beat:1,duration:.25,velocity:.4}];
    const vs=await A.prepareTimbres({lead:'violin'},violin);A.commitTimbres(vs);const begin=f.starts.length;t.load(song(violin,8));await t.play();f.advance(f.now+.8);
    assert.equal(f.starts.length-begin,2);assert.match(f.starts[begin].buffer.url,/natural-strings\/sustain-/);assert.match(f.starts[begin+1].buffer.url,/natural-strings\/short-/);
    assert.equal(f.requests.filter(u=>u.endsWith('manifest.json')).length,7);assert.equal(f.imports,0);t.pause();
    console.log('PASS: all seven tracks route through their real banks; Lead solo bow/short differs from ensemble, and Play reuses precisely prepared files');
  }
  {
    const f=fixture(),A=f.A,events=[];
    for(let i=0;i<32;i++)events.push({track:'lead',midi:40+i,beat:i*.25,duration:.25,velocity:i%2?.8:.35,variant:i%4});
    const release=f.hold('assets/audio/natural-guitar/manifest.json');const jobs=[1,2,3].map(()=>A.prepareTimbres({lead:'warm'},events));await flush();assert.equal(f.count('assets/audio/natural-guitar/manifest.json'),1);release();await Promise.all(jobs);
    assert.ok(f.maxDownloads<=4,'a shared preparation never opens more than four file downloads');
    for(const url of new Set(f.requests))assert.equal(f.count(url),1,'concurrent preparation shares '+url);
    const before=f.requests.length;await A.prepareTimbres({lead:'warm'},events);assert.equal(f.requests.length,before);assert.equal(f.resumes,0);
    assert.ok(new Set(f.requests.filter(u=>u.endsWith('.flac'))).size<manifests['natural-guitar'].samples.length);
    console.log('PASS: sparse event-based loading deduplicates concurrent manifests/files, respects four-file concurrency and reuses buffers');
  }
  {
    const f=fixture(),A=f.A,e={track:'lead',midi:60,beat:0,duration:1,velocity:.72},bank='natural-guitar';
    const picked=f.P.select(manifests[bank],'guitar',e),url='assets/audio/'+bank+'/'+picked.file,fallback='assets/audio/'+bank+'/'+picked.fallback;
    f.decodeFails.add(url);await A.prepareTimbres({lead:'warm'},[e]);assert.equal(f.count(url),1);assert.equal(f.count(fallback),1);
    const t=new A.Transport();t.load(song([e],8));await t.play();assert.equal(f.starts[0].buffer.url,fallback);t.pause();
    await A.prepareTimbres({},[e]);assert.equal(f.count(url),1);assert.equal(f.count(fallback),1);
    console.log('PASS: a rejected FLAC decoder loads matching WAV once and playback uses the successful fallback');
  }
  {
    for(const track of ['lead','rhythm'])for(const id of ['warm','bright','jazz','dry','ambient'].filter(id=>track==='lead'||id!=='jazz')){
      const f=fixture(),A=f.A,events=['picked','muted','slide'].map((articulation,beat)=>({track,midi:60,beat,duration:1,velocity:.72,variant:0,articulation}));
      const snapshot=await A.prepareTimbres({[track]:id},events);A.commitTimbres(snapshot);const t=new A.Transport();t.load(song(events,8));await t.play();f.advance(1.4);assert.equal(f.starts.length,3);
      assert.equal(f.nodes.filter(n=>n.kind==='compressor').length,1,`${track}/${id}: only shared master compression`);assert.equal(f.nodes.filter(n=>n.kind==='drive').length,0,`${track}/${id}: clean takes bypass artificial drive`);
      f.starts.forEach(source=>{const chain=ownChain(source);assert.equal(chain[1].kind,'gain');const entry=sampleFor(source),first=sampleFor(f.starts[0]);near(chain[1].gain.value/(expectedAmplitude(entry,.72)*(entry.level??1)),ownChain(f.starts[0])[1].gain.value/(expectedAmplitude(first,.72)*(first.level??1)));
        const envelope=chain.find(n=>n.kind==='gain'&&n.gain.events.some(e=>e.kind==='target'));assert.ok(envelope);near(envelope.gain.events.find(e=>e.kind==='target').at-source.startTime,60/96);
        assert.equal(source.playbackRate.events.length,0,'slide label must not inject 65-cent scoops');
      });t.pause();f.advance(f.now+.04);
    }
    console.log('PASS: clean Lead/rhythm patches preserve amplitude once, full note gates, and natural tuning without per-voice compression, saturation or fake slides');
  }
  {
    const cases=[
      {track:'lead',id:'warm',bank:'guitar',midi:60,velocities:[.15,.4,.65,.85]},
      {track:'lead',id:'crunch',bank:'guitar',midi:60,velocities:[.15,.4,.65,.85],drive:true},
      {track:'lead',id:'violin',bank:'strings',midi:60,velocities:[.15,.4,.65,.85]},
      {track:'rhythm',id:'warm',bank:'guitar',midi:60,velocities:[.15,.4,.65,.85]},
      {track:'bass',id:'precision',bank:'bass',midi:39,velocities:[.12,.25,.5,.85]},
      {track:'keys',id:'wurli',bank:'keys',midi:60,velocities:[.08,.16,.24,.32]},
      {track:'strings',id:'chamber',bank:'ensemble',midi:69,velocities:[.1,.2,.26,.32]},
      {track:'drums',id:'natural',bank:'drums',sample:'kick-1',velocities:[.15,.4,.65,.85]},
      {track:'percussion',id:'natural',bank:'percussion',sample:'hat-1',percussionStyle:'shaker',velocities:[.15,.4,.65,.85]}
    ];
    for(const setting of cases){
      const f=fixture(),A=f.A,P=f.P,events=setting.velocities.map((velocity,beat)=>({...setting,beat,velocity,duration:1})),selection={...defaults,[setting.track]:setting.id};
      events.forEach(event=>near(P.velocity(event),expectedVelocity(event)));
      const definition=manifests[P.catalog[setting.bank]],expected=events.map(event=>P.select(definition,setting.bank,event));
      expected.forEach((entry,i)=>{const v=Math.round(expectedVelocity(events[i])*127);assert.ok(v>=entry.velocityRange[0]&&v<=entry.velocityRange[1],'mapped velocity must select the actual performing layer');});
      if(['keys','strings'].includes(setting.track))assert.ok(new Set(expected.map(e=>e.velocityRange.join('-'))).size>=2,'recovered touch must cross real velocity layers');
      const snapshot=await A.prepareTimbres(selection,events);const requested=new Set(f.requests.filter(u=>!u.endsWith('manifest.json')));
      assert.deepEqual([...requested].sort(),[...new Set(expected.map(e=>'assets/audio/'+P.catalog[setting.bank]+'/'+e.file))].sort());
      A.commitTimbres(snapshot);const preparedCount=f.requests.length,t=new A.Transport();t.load(song(events,8));await t.play();f.advance(2.1);assert.equal(f.starts.length,events.length);assert.equal(f.requests.length,preparedCount);
      let referenceGain;
      f.starts.forEach((source,i)=>{
        const entry=expected[i],event=events[i],chain=ownChain(source);
        assert.equal(source.buffer.url,'assets/audio/'+P.catalog[setting.bank]+'/'+entry.file,'prepared and sounding layer/take must agree');
        assert.equal(chain[1].kind,'gain','level must apply immediately after the source, before tone FX');
        const envelope=chain.find(n=>n.kind==='gain'&&n.gain.events.some(e=>e.kind==='target'));near(envelope.gain.events.find(e=>e.kind==='linear').v,1);
        const originalResponse=expectedAmplitude(entry,expectedVelocity(event),definition)*(entry.level??1);
        const calibration=chain[1].gain.value/originalResponse;
        assert.ok(Number.isFinite(calibration)&&calibration>0);if(referenceGain===undefined)referenceGain=calibration;else near(calibration,referenceGain);
        if(setting.drive){const index=chain.findIndex(n=>n.kind==='drive');assert.ok(index>1,'mapped level reaches drive before the envelope');}
      });t.pause();
    }
    console.log('PASS: mapped touch selects identical prepared/played layers; original relative velocity curves and region levels survive calibration before FX');
  }
  {
    const f=fixture(),A=f.A;const events=[
      {track:'percussion',sample:'open-hat',percussionStyle:'shaker',beat:0},
      {track:'percussion',sample:'hat-1',percussionStyle:'shaker',beat:.2},
      {track:'percussion',sample:'snare-1',percussionStyle:'clap',beat:.4},
      {track:'percussion',sample:'hat-2',percussionStyle:'shaker',beat:.6},
      {track:'drums',sample:'open-hat',beat:.8},{track:'drums',sample:'hat-1',beat:1}]
      .map(e=>({...e,duration:.05,velocity:.7}));const snapshot=await A.prepareTimbres({},events);A.commitTimbres(snapshot);const t=new A.Transport();t.load(song(events,8));await t.play();f.advance(.8);
    assert.equal(f.starts.length,6);f.starts.slice(0,4).forEach(source=>{assert.equal(source.stops.length,1,'real shaker/clap cannot be legacy hat-choked');near(source.stopTime-source.startTime,source.buffer.duration);});
    assert.match(f.starts[2].buffer.url,/natural-percussion\/clap-/);assert.equal(f.starts[4].stops.length,2,'real drum open hat still chokes on its closed hat');
    assert.ok(f.starts[4].stopTime<f.starts[5].startTime+.03);t.pause();
    console.log('PASS: actual shaker/clap one-shots retain tails independently; closed hi-hat still chokes the drum open hat');
  }
  {
    const f=fixture(),A=f.A,old=leadSong(),next=leadSong(81),t=new A.Transport();next.events.forEach((e,i)=>e.midi=81+i%3*4);t.load(old);await t.play();const generation=t.generation,anchor=t.started;
    const entry=f.P.select(manifests['natural-strings'],'strings',next.events[0]),prefix='assets/audio/natural-strings/';
    f.networkFails.add(prefix+entry.file);f.networkFails.add(prefix+entry.fallback);
    const release=f.hold(prefix+'manifest.json'),job=A.prepareTimbres({lead:'violin'},next.events);await flush();f.advance(2.2);assert.equal(t.playing,true);assert.ok(f.starts.length>=4);assert.equal(A.getTimbre('lead'),'warm');release();await assert.rejects(job,/失败/);await flush();
    assert.equal(t.song,old);assert.equal(t.generation,generation);near(t.started,anchor);assert.equal(t.pendingUpdate,null);assert.equal(t.activeTimbres.lead,'warm');assert.equal(A.getTimbre('lead'),'warm');
    const successful=[...new Set(f.decodes)].filter(url=>url.startsWith(prefix)&&!url.includes(entry.file)&&!url.includes(entry.fallback)),counts=new Map(successful.map(url=>[url,f.count(url)]));
    assert.ok(successful.length>=2,'failed preparation must retain independently successful pitches');f.advance(3.3);assert.ok(f.starts.every(n=>n.buffer.url.includes('natural-guitar')));f.networkFails.clear();await A.prepareTimbres({lead:'violin'},next.events);
    for(const [url,count]of counts)assert.equal(f.count(url),count,'retry retains successful recordings');assert.equal(f.resumes,1);t.pause();
    console.log('PASS: slow/failed recording preparation preserves old sound, clock, active snapshot and successful partial downloads');
  }
  {
    const f=fixture(),A=f.A,old=leadSong(),next=leadSong(81),t=new A.Transport();t.load(old);await t.play();const generation=t.generation;f.advance(.4);
    const snapshot=await A.prepareTimbres({lead:'violin'},next.events);assert.ok(Object.isFrozen(snapshot));assert.equal(A.getTimbre('lead'),'warm');let commits=0;
    const info=t.queueUpdate(next,{timbres:snapshot,onCommit(data){commits++;assert.equal(data.song,next);assert.equal(data.timbres.lead,'violin');}});f.advance(info.at-.03);
    assert.equal(commits,0);assert.equal(t.song,old);assert.equal(t.activeTimbres.lead,'warm');assert.equal(A.getTimbre('lead'),'warm');const boundary=audible(f,info.at);assert.equal(boundary.length,1);assert.match(boundary[0].buffer.url,/natural-strings/);assert.ok(boundary[0].scheduledAt<info.at);
    f.advance(info.at+.02);assert.equal(commits,1);assert.equal(t.song,next);assert.equal(t.activeTimbres.lead,'violin');assert.equal(A.getTimbre('lead'),'violin');assert.equal(t.generation,generation);assert.equal(f.resumes,1);assert.equal(f.timers.size,1);t.pause();
    console.log('PASS: immutable prepared snapshot schedules one new downbeat ahead, then commits sound and song at the bar without clock restart');
  }
  {
    const f=fixture(),A=f.A,old=leadSong(),next=leadSong(81),t=new A.Transport();t.load(old);await t.play();
    const snapshot=await A.prepareTimbres({lead:'violin'},next.events),info=t.queueUpdate(next,{timbres:snapshot});f.advance(info.at-.03);
    const candidate=audible(f,info.at)[0],chain=ownChain(candidate),oldTail=f.starts.filter(n=>n.startTime<info.at&&!n.disconnected).at(-1),stop=oldTail.stopTime;
    f.setNow(info.at-.001);assert.equal(t.cancelUpdate(),true);assert.ok(chain.every(n=>n.disconnected));assert.equal(oldTail.stopTime,stop);assert.equal(oldTail.disconnected,undefined);
    const restored=audible(f,info.at);assert.equal(restored.length,1);assert.match(restored[0].buffer.url,/natural-guitar/);assert.equal(t.activeTimbres.lead,'warm');assert.equal(A.getTimbre('lead'),'warm');t.pause();
    console.log('PASS: cancelling queued real recordings disposes candidate nodes and restores the old downbeat without cutting its tail');
  }
  {
    const f=fixture(),A=f.A,old=leadSong(),t=new A.Transport();t.load(old);await t.play();f.advance(.4);
    const valid=await A.prepareTimbres({lead:'bright'},old.events),info=t.queueUpdate(old,{timbres:valid}),pending=t.pendingUpdate,active=plain(t.activeTimbres);
    assert.throws(()=>A.commitTimbres({lead:'missing'}),/未知音色/);assert.equal(A.getTimbre('lead'),'warm');assert.deepEqual(plain(t.activeTimbres),active);
    assert.throws(()=>t.queueUpdate(old,{timbres:{lead:'missing'}}),/未知音色/);assert.equal(t.pendingUpdate,pending);
    assert.throws(()=>t.queueUpdate(leadSong(81),{timbres:{lead:'violin'}}),/准备|采样|音源/,'unprepared recordings must fail before cancelling the existing valid pending plan');
    assert.equal(t.pendingUpdate,pending);assert.equal(t.song,old);assert.equal(t.playing,true);assert.equal(A.getTimbre('lead'),'warm');
    f.advance(info.at+.02);assert.equal(A.getTimbre('lead'),'bright');assert.equal(t.activeTimbres.lead,'bright');assert.equal(t.playing,true);t.pause();
    console.log('PASS: invalid commit and unprepared sample plans are rejected atomically while preserving the valid pending edit and old playback');
  }
  {
    const f=fixture(),A=f.A,events=leadSong().events;
    await A.prepareTimbres({lead:'warm'},events);
    const selected=f.P.select(manifests['natural-strings'],'strings',events[0]),prefix='assets/audio/natural-strings/';
    f.networkFails.add(prefix+selected.file);f.networkFails.add(prefix+selected.fallback);
    const release=f.hold(prefix+'manifest.json'),first=A.setTimbre('lead','violin',events);await flush();
    assert.equal(A.getTimbre('lead'),'warm','preparing must not publish an unready selection');
    // This fixture deliberately rejects the piano module import as well as the violin files.
    await assert.rejects(A.setTimbre('lead','piano',events));assert.equal(A.getTimbre('lead'),'warm');
    release();assert.equal(await first,false);assert.equal(A.getTimbre('lead'),'warm','two failed choices retain the last usable voice');
    const t=new A.Transport();t.load(song(events));await t.play();assert.match(f.starts[0].buffer.url,/natural-guitar/);t.pause();
    console.log('PASS: two overlapping failed stopped selections retain the last usable warm voice and it still plays');
  }
  {
    const f=fixture(),A=f.A,events=[{track:'lead',midi:60,beat:0,duration:1,velocity:.72},{track:'bass',midi:39,beat:0,duration:1,velocity:.72}];
    await A.prepareTimbres({lead:'warm',bass:'round'},events);
    const release=f.hold('assets/audio/natural-strings/manifest.json'),stale=A.setTimbre('lead','violin',events);await flush();
    assert.equal(await A.setTimbre('bass','bright',events),true);assert.equal(A.getTimbre('bass'),'bright');
    assert.equal(await A.setTimbre('lead','bright',events),true);release();assert.equal(await stale,false);
    assert.equal(A.getTimbre('lead'),'bright','a stale successful download cannot replace the newest successful choice');assert.equal(A.getTimbre('bass'),'bright');
    console.log('PASS: an obsolete successful voice load cannot overwrite the latest voice or an independently changed track');
  }
  {
    const f=fixture(),A=f.A,events=[{track:'lead',midi:60,beat:0,duration:1,velocity:.72},{track:'bass',midi:39,beat:0,duration:1,velocity:.72}];
    await A.prepareTimbres({lead:'warm',bass:'round'},events);
    const selected=f.P.select(manifests['natural-strings'],'strings',events[0]),prefix='assets/audio/natural-strings/';f.networkFails.add(prefix+selected.file);f.networkFails.add(prefix+selected.fallback);
    const release=f.hold(prefix+'manifest.json'),failed=A.setTimbre('lead','violin',events).then(result=>({result}),error=>({error}));
    await flush();const independent=A.setTimbre('bass','bright',events).then(result=>({result}),error=>({error}));await flush();release();
    assert.ok((await failed).error);assert.deepEqual(await independent,{result:true});
    assert.equal(A.getTimbre('lead'),'warm');assert.equal(A.getTimbre('bass'),'bright','failure of another track does not roll back this success');
    console.log('PASS: failed loading on one track neither contaminates nor rolls back a concurrent successful track selection');
  }
  console.log('Production recording integration passed. Tagged mock audio only; separate offline/browser PCM validation remains required.');
})().catch(error=>{console.error(error);process.exitCode=1;});
