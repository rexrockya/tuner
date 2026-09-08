const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const docs = path.resolve(process.argv[2] || path.join(__dirname, '../docs'));
const audioFile = process.argv[3] || path.join(docs, 'practice-audio.js');
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-7, a+' != '+b);
function fixture() {
  let now = 0, timerId = 0, resumes = 0, bankWait = Promise.resolve(), bankError = null;
  const nodes = [], starts = [], timers = new Map(), ensured = [], cached = new Set();
  class Param {value=0;setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
  class Node {constructor(type){this.type=type;this.connections=[];for(const k of ['gain','frequency','playbackRate','threshold','knee','ratio','attack','release'])this[k]=new Param();nodes.push(this);}connect(n){this.connections.push(n);return n;}disconnect(){this.disconnected=true;}start(at){this.startTime=at;this.scheduledAt=now;starts.push(this);}stop(at){this.stopTime=at;}setPeriodicWave(){}}
  class Context {state='running';sampleRate=44100;destination=new Node('destination');get currentTime(){return now;}async resume(){resumes++;}createGain(){return new Node('gain');}createDynamicsCompressor(){return new Node('compressor');}createConvolver(){return new Node('convolver');}createBiquadFilter(){return new Node('filter');}createWaveShaper(){return new Node('drive');}createOscillator(){return new Node('oscillator');}createBufferSource(){return new Node('source');}createPeriodicWave(){return {};}createBuffer(ch,n,rate){return {duration:n/rate,getChannelData:()=>new Float32Array(n)};}async decodeAudioData(){return {duration:2};}}
  const window={AudioContext:Context,setInterval(fn){const i=++timerId;timers.set(i,fn);return i;},clearInterval(i){timers.delete(i);},importTimbres:async()=>({createSampleBank:()=>({async ensure(id,events){ensured.push({id,events});await bankWait;if(bankError)throw bankError;events.filter(e=>e.track==='lead').forEach(e=>cached.add(id+e.midi));},get(id,event){assert.ok(cached.has(id+event.midi),'every new phrase pitch was prepared');return {kind:id,midi:event.midi,buffer:{duration:2}};}})})};
  const sandbox={window,AbortController,setTimeout,clearTimeout,Float32Array,Map,Set,console,fetch:async()=>({ok:true,json:async()=>({'kick-1':{file:'kick.wav'},'open-hat':{file:'open.wav'},'hat-1':{file:'closed.wav'},'guitar-1':{file:'guitar.wav',midi:60,layer:3,variant:0},'bass-1':{file:'bass.wav',midi:36}}),arrayBuffer:async()=>new ArrayBuffer(1)})};
  vm.createContext(sandbox);
  for(const name of ['harmony.js','practice-arrangement.js'])vm.runInContext(fs.readFileSync(path.join(docs,name),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(audioFile,'utf8').replace(/import\('\.\/practice-timbres\.js[^']*'\)/,'window.importTimbres()'),sandbox);
  return {A:window.practiceAudio,starts,nodes,timers,ensured,get now(){return now;},get resumes(){return resumes;},advance(to){while(now<to){now=Math.min(to,now+.017);for(const fn of [...timers.values()])fn();}},setNow(to){now=to;},stall(){let release;bankWait=new Promise(r=>release=r);return release;},fail(error){bankError=error;},tick(){for(const fn of [...timers.values()])fn();}};
}
function song(beats=32,chartBeats=8,midi=null){return {beats,chartBeats,events:Array.from({length:beats},(_,beat)=>midi===null?{track:'drums',sample:'kick-1',beat,velocity:.5}:{track:'lead',midi,beat,duration:.9,velocity:.75})};}
function audible(f,at){return f.starts.filter(n=>Math.abs(n.startTime-at)<1e-7&&(!n.disconnected)&&(n.stopTime===undefined||n.stopTime>n.startTime));}
function cutoff(n){return n.connections[0].frequency.value;}
(async()=>{
  {
    const f=fixture(),A=f.A,t=new A.Transport(),old=song();t.load(old);await t.play();const anchor=t.started,generation=t.generation;
    f.advance(.5);const snapshot=await A.prepareTimbres({drums:'vintage'},old.events);assert.ok(Object.isFrozen(snapshot));assert.equal(A.getTimbre('drums'),'natural');assert.equal(f.resumes,1);
    let committed=0;const info=t.queueUpdate(song(),{timbres:snapshot,onCommit(){committed++;assert.ok(f.now>=info.at);}});near(info.at,anchor+4*60/96);assert.equal(t.generation,generation);assert.equal(t.playing,true);
    f.advance(info.at-.06);assert.equal(committed,0);assert.equal(t.song,old);assert.equal(A.getTimbre('drums'),'natural');
    const first=audible(f,info.at);assert.equal(first.length,1);assert.equal(cutoff(first[0]),6400);assert.ok(first[0].scheduledAt<info.at-.03,'new downbeat is scheduled before the audio boundary');
    f.advance(info.at+.02);assert.equal(committed,1);assert.equal(A.getTimbre('drums'),'vintage');assert.equal(f.resumes,1);assert.equal(f.timers.size,1);assert.equal(t.generation,generation);
    f.advance(55);const notes=f.starts.filter(n=>!n.disconnected);for(let i=0;i<notes.length;i++)near(notes[i].startTime,anchor+i*60/96);
    t.pause();console.log('PASS: prepared timbre stays inactive, boundary is pre-scheduled once, real-time commit and drift-free continuous clock');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());await t.play();f.advance(.6);const snapshot=await A.prepareTimbres({drums:'vintage'});
    const first=t.queueUpdate(song(),{timbres:snapshot});f.advance(first.at-.04);const removed=audible(f,first.at)[0];assert.equal(cutoff(removed),6400);
    f.setNow(first.at-.001);assert.equal(t.cancelUpdate(),true);assert.equal(removed.disconnected,true);assert.ok(removed.stopTime<removed.startTime);
    const replacement=audible(f,first.at);assert.equal(replacement.length,1);assert.equal(cutoff(replacement[0]),18000);near(replacement[0].scheduledAt,first.at-.001);
    f.advance(first.at+.1);assert.equal(A.getTimbre('drums'),'natural');assert.equal(t.playing,true);t.pause();
    console.log('PASS: cancellation one millisecond before a pre-scheduled boundary restores exactly one old downbeat');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());await t.play();f.advance(.6);let committed=0;
    const first=t.queueUpdate(song(),{timbres:await A.prepareTimbres({drums:'vintage'}),onCommit(){assert.fail('stale choice committed');}});
    f.advance(first.at-.04);const second=t.queueUpdate(song(),{timbres:await A.prepareTimbres({drums:'crisp'}),onCommit(){committed++;}});
    near(second.at,first.at+4*60/96);assert.equal(cutoff(audible(f,first.at)[0]),18000);
    f.advance(second.at+.02);assert.equal(committed,1);assert.equal(A.getTimbre('drums'),'crisp');assert.equal(cutoff(audible(f,second.at)[0]),18000);
    const sounding=f.starts.filter(n=>!n.disconnected);for(let i=1;i<sounding.length;i++)near(sounding[i].startTime-sounding[i-1].startTime,60/96);t.pause();
    console.log('PASS: replacement inside lookahead cancels stale sound and safely moves the newest choice to the next bar');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());t.position=10.5;await t.play();
    const info=t.queueUpdate(song(48,12),{bpm:120,timbres:await A.prepareTimbres({})});
    assert.equal(info.beat,16,'keep second chorus and second chart bar in a longer chart');assert.equal(t.bpm,96);
    f.advance(info.at+.05);assert.equal(t.bpm,120);near(t.current(),16+(f.now-info.at)*2);
    f.advance(info.at+1.2);assert.equal(audible(f,info.at+.5).length,1);assert.equal(audible(f,info.at+1).length,1);t.pause();
    console.log('PASS: chart-length and tempo changes retain the musical bar and switch beat length only at the boundary');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());t.position=30.5;await t.play();const info=t.queueUpdate(song());assert.equal(info.beat,0);
    f.advance(info.at+.02);near(t.current(),(f.now-info.at)*96/60);assert.equal(audible(f,info.at).length,1);t.pause();
    t.load(song(48,48));await t.setLoopBar(8);await t.play();f.advance(f.now+.4);const single=t.queueUpdate(song(48,48));assert.equal(single.beat,32);f.advance(single.at+.02);assert.equal(t.loopBar,8);near(t.current(),32+(f.now-single.at)*96/60);t.pause();
    console.log('PASS: four-chorus seam and single-bar loop map to the correct next downbeat');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song(8,8));t.loop=false;await t.play();f.advance(3);
    let reason;assert.equal(t.queueUpdate(song(),{onCancel(value){reason=value;}}),null);assert.equal(reason,'ended');f.advance(6);assert.equal(t.playing,false);assert.equal(t.position,8);assert.equal(f.starts.length,8);
    console.log('PASS: a non-looping final bar ends naturally instead of resurrecting or extending playback');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());await t.play();f.advance(.5);const release=f.stall(),preparing=A.prepareTimbres({lead:'piano'},song(32,8,80).events);
    f.advance(3.5);assert.equal(t.playing,true);assert.equal(A.getTimbre('lead'),'warm');assert.ok(f.starts.length>=6,'old music continues while a resource is pending');release();const snapshot=await preparing;
    let committed=0;const info=t.queueUpdate(song(32,8,80),{timbres:snapshot,onCommit(){committed++;}});assert.ok(info.at>f.now+.14);
    f.advance(info.at-.03);assert.equal(audible(f,info.at).length,1);assert.equal(A.getTimbre('lead'),'warm');f.advance(info.at+.01);assert.equal(committed,1);assert.equal(A.getTimbre('lead'),'piano');t.pause();
    console.log('PASS: slow resources retain old music and every new sampled pitch is prepared before a safe boundary');
  }
  {
    for(const cancel of ['pause','seek','tempo','setLoop','setLoopBar']){
      const f=fixture(),A=f.A,t=new A.Transport();t.load(song());await t.play();f.advance(.5);let stale=0;
      const info=t.queueUpdate(song(),{timbres:await A.prepareTimbres({drums:'vintage'}),onCommit(){stale++;}});f.advance(info.at-.03);
      if(cancel==='pause')t.pause();else await t[cancel](({seek:2,tempo:110,setLoop:false,setLoopBar:1})[cancel]);
      assert.equal(t.pendingUpdate,null);assert.equal(A.getTimbre('drums'),'natural');f.advance(info.at+1);assert.equal(stale,0);if(cancel==='pause')assert.equal(t.playing,false);t.pause();
    }
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());await t.play();f.fail(Error('sample unavailable'));await assert.rejects(A.prepareTimbres({lead:'piano'},song(32,8,84).events),/unavailable/);assert.equal(A.getTimbre('lead'),'warm');assert.equal(t.playing,true);f.advance(4);assert.ok(f.starts.length>5);t.pause();
    await assert.rejects(A.prepareTimbres({lead:'invalid'}),/未知音色/);
    console.log('PASS: stop/seek/tempo/loop cancel queued audio; failed resources retain the active timbre and playback');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.bpm=120;t.load(song());await t.play();
    const dense=song();dense.events=Array.from({length:128},(_,i)=>({track:'drums',sample:'kick-1',beat:i/4,velocity:.5}));
    const info=t.queueUpdate(dense,{onCommit(){
      assert.equal(audible(f,info.at+.125).length,1,'the new sixteenth was scheduled before expensive DOM work');
      f.setNow(f.now+.13);
    }});
    f.setNow(info.at-.025);f.tick();assert.equal(audible(f,info.at+.125).length,0);
    f.setNow(info.at+.001);f.tick();assert.equal(audible(f,info.at+.125).length,1);assert.ok(audible(f,info.at+.125)[0].scheduledAt<info.at+.01);
    f.advance(info.at+.4);for(const node of f.starts)assert.ok(node.scheduledAt<=node.startTime);t.pause();
    console.log('PASS: audio horizon is filled before a slow notation callback can delay the next sixteenth');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport(),old=song();old.events.push({track:'drums',sample:'open-hat',beat:3.9,velocity:.5});old.events.sort((a,b)=>a.beat-b.beat);
    t.load(old);await t.play();const next=song();next.events.forEach(e=>e.sample='hat-1');
    const info=t.queueUpdate(next);f.advance(info.at-.04);
    const oldHat=audible(f,info.at-.1*60/96)[0],originalStop=oldHat.stopTime;assert.ok(originalStop>info.at+.5,'candidate closed hat has not shortened the old open hat');
    t.cancelUpdate();assert.equal(oldHat.stopTime,originalStop);assert.equal(oldHat.disconnected,undefined);t.pause();
    console.log('PASS: future hi-hat choking cannot mutate a previous plan tail when its candidate is cancelled');
  }
  {
    const f=fixture(),A=f.A,t=new A.Transport();t.load(song());await t.play();let committed=0;
    const info=t.queueUpdate(song(),{timbres:await A.prepareTimbres({drums:'vintage'}),onCommit(){committed++;}});
    f.advance(info.at-.04);f.setNow(info.at+.001);assert.equal(t.cancelUpdate(),false);assert.equal(committed,1);assert.equal(A.getTimbre('drums'),'vintage');t.tick();assert.equal(committed,1);
    const second=t.queueUpdate(song(48,12));f.setNow(second.at+350);t.tick();assert.equal(t.playing,true);assert.equal(t.pendingUpdate,null);
    assert.ok(!f.starts.some(n=>n.startTime>info.at+.2&&n.startTime<f.now),'background recovery skips stale samples');
    t.pause();console.log('PASS: actual audio boundary wins a late cancel, and pending plans recover from long background stalls');
  }

})().catch(error=>{console.error(error);process.exitCode=1;});
