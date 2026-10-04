// Floating player integration against the real arrangement, sample routing and
// Transport. WebAudio nodes/decoding are mocked; this does not measure PCM sound.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const docs = path.resolve(__dirname, '../docs');
const plain = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i=0;i<5;i++) await new Promise(resolve=>setImmediate(resolve)); };
const deferred = () => { let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; };
const lesson = (overrides={}) => ({id:'LcAoWGYi',title:'Major 2-5-1 · C Major · 3',key:'C',bpm:96,genre:'jazz',text:'Dm7 | G7 | Cmaj7',timingNote:'生成练习伴奏，未与原曲同步',...overrides});

function fixture({delayEngine=false}={}) {
  const dom=new JSDOM('<!doctype html><button id="opener">伴奏</button><audio id="original"></audio>',{url:'https://rexrockya.github.io/tuner/fretboard.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,nodes=[],starts=[],requests=[],timers=new Map();
  let now=0,timerId=0,resumes=0,loadCalls=0,engineGate=delayEngine?deferred():null;
  class Param {
    value=0;events=[];
    record(kind,value,at){this.value=value;this.events.push({kind,value,at});}
    setValueAtTime(v,t){this.record('set',v,t);}setTargetAtTime(v,t){this.record('target',v,t);}
    linearRampToValueAtTime(v,t){this.record('linear',v,t);}exponentialRampToValueAtTime(v,t){this.record('exponential',v,t);}
    cancelScheduledValues(at){this.events.push({kind:'cancel',at});}
  }
  class AudioNode {
    constructor(kind){this.kind=kind;this.connections=[];this.stops=[];for(const name of ['gain','frequency','Q','playbackRate','threshold','knee','ratio','attack','release','pan'])this[name]=new Param();nodes.push(this);}
    connect(node){this.connections.push(node);return node;}disconnect(){this.disconnected=true;}
    start(at){this.startTime=at;starts.push(this);}stop(at){this.stopTime=at;this.stops.push(at);}setPeriodicWave(){}
  }
  class AudioContext {
    sampleRate=44100;state='running';destination=new AudioNode('destination');get currentTime(){return now;}
    async resume(){resumes++;}
    createGain(){return new AudioNode('gain');}createDynamicsCompressor(){return new AudioNode('compressor');}
    createConvolver(){return new AudioNode('convolver');}createBiquadFilter(){return new AudioNode('filter');}
    createWaveShaper(){return new AudioNode('shaper');}createBufferSource(){return new AudioNode('source');}
    createStereoPanner(){return new AudioNode('panner');}createOscillator(){return new AudioNode('oscillator');}
    createPeriodicWave(){return {};}
    createBuffer(ch,length,rate){return {duration:length/rate,length,sampleRate:rate,numberOfChannels:ch,getChannelData:()=>new Float32Array(length)};}
    async decodeAudioData(data){return {url:new TextDecoder().decode(data),duration:8,length:8*44100,sampleRate:44100,numberOfChannels:2};}
  }
  w.AudioContext=AudioContext;w.AbortController=AbortController;
  w.HTMLMediaElement.prototype.pause=function(){this.pauseCalls=(this.pauseCalls||0)+1;};
  w.setInterval=fn=>{const id=++timerId;timers.set(id,fn);return id;};w.clearInterval=id=>timers.delete(id);
  w.fetch=async input=>{const url=String(input).split('?')[0];requests.push(url);assert.match(url,/^assets\/audio\//,'only generated instrument samples may be loaded');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(docs,url),'utf8')),arrayBuffer:async()=>new TextEncoder().encode(url).buffer};};
  const run=name=>w.eval(fs.readFileSync(path.join(docs,name),'utf8'));
  w.siteAssets={load:async name=>{assert.equal(name,'backingEngine');loadCalls++;if(engineGate)await engineGate.promise;for(const file of ['practice-arrangement.js','music-genres.js','practice-samples.js','practice-audio.js'])run(file);}};
  run('harmony.js');run('floating-backing.js');
  const f={w,d,nodes,starts,requests,timers,player:w.floatingBacking,
    get now(){return now;},get resumes(){return resumes;},get loadCalls(){return loadCalls;},
    click:id=>d.getElementById(id).click(),
    change(id,value){const node=d.getElementById(id);node.value=value;node.dispatchEvent(new w.Event('change',{bubbles:true}));},
    async open(ctx=lesson()){w.floatingBacking.open(ctx);await flush();},
    releaseEngine(){engineGate?.resolve();engineGate=null;},
    holdPrepare(){const A=w.practiceAudio,original=A.prepareTimbres,gate=deferred();A.prepareTimbres=async(...args)=>{await gate.promise;return original(...args);};return {release:()=>{A.prepareTimbres=original;gate.resolve();},reject:error=>{A.prepareTimbres=original;gate.reject(error);}};},
    advance(to){while(now<to){now=Math.min(to,now+.02);for(const fn of [...timers.values()])fn();for(const node of starts)if(!node.ended&&node.stopTime<=now){node.ended=true;node.onended?.();}}},
    close(){w.floatingBacking.close();dom.window.close();}
  };
  return f;
}

const cases=[];
function test(name,fn){cases.push([name,fn]);}
test('lazy open does not start audio or load source MP3; minimize keeps playback; close silences',async()=>{
  const f=fixture();try{
    await f.open();assert.equal(f.starts.length,0);assert.equal(f.requests.length,0);assert.equal(f.resumes,0);
    assert.equal(f.player.getState().progression.chords[2].name,'Cmaj7');
    f.click('fb-play');await flush();assert.equal(f.player.getState().playing,true);assert.ok(f.starts.length);
    assert.ok(f.requests.every(url=>url.includes('/natural-')),'defaults use real recordings');
    assert.ok(!f.player.transport.song.events.some(e=>e.track==='lead'),'backing contains no invented source melody');
    f.click('fb-minimize');assert.equal(f.player.getState().playing,true);assert.equal(f.player.getState().minimized,true);
    const before=f.starts.length;f.advance(.8);assert.ok(f.starts.length>before);
    f.click('fb-mini-close');assert.equal(f.player.getState().playing,false);assert.equal(f.player.getState().visible,false);assert.equal(f.timers.size,0);
  }finally{f.close();}
});
test('every token in a two-chord bar is retained; slash bass and all roots transpose',async()=>{
  const f=fixture();try{
    await f.open(lesson({text:'Cmaj7 A7 | Dm7 G7 | C/E'}));
    const p=f.player.getState().progression;
    assert.deepEqual(plain(p.chords.map(c=>[c.beat,c.beats])),[[0,2],[2,2],[4,2],[6,2],[8,4]]);
    f.change('fb-key','D');const q=f.player.getState().progression;
    assert.deepEqual(plain(q.chords.map(c=>[c.root,c.bass])),[[2,null],[11,null],[4,null],[9,null],[2,6]]);
    assert.equal(q.chords[4].name,'D/F#');assert.equal(q.beats,12);
  }finally{f.close();}
});
test('close while engine loads never starts late; opening/closing cancels engine retry race',async()=>{
  const f=fixture({delayEngine:true});try{
    f.player.open(lesson());f.click('fb-play');assert.equal(f.player.getState().loading,true);
    f.click('fb-close');f.releaseEngine();await flush();
    assert.equal(f.player.getState().playing,false);assert.equal(f.player.getState().loading,false);assert.equal(f.starts.length,0);assert.equal(f.resumes,0);
  }finally{f.close();}
});
test('lesson change cancels sample preparation and retains new chart',async()=>{
  const f=fixture();try{
    await f.open();const gate=f.holdPrepare();f.click('fb-play');await flush();
    f.player.setContext(lesson({id:'next',text:'F7 | Bb7',key:'F'}));gate.release();await flush();
    assert.equal(f.player.getState().contextId,'next');assert.equal(f.player.getState().playing,false);assert.equal(f.starts.length,0);
    assert.equal(f.player.getState().progression.chords[0].name,'F7');
  }finally{f.close();}
});
test('live key and BPM remain audible-state values until prepared barline commit',async()=>{
  const f=fixture();try{
    await f.open();f.click('fb-play');await flush();const gate=f.holdPrepare();
    f.change('fb-key','D');assert.equal(f.player.getState().key,'C','preparation must not mutate active key');
    assert.equal(f.player.getState().progression.chords[0].name,'Dm7');assert.equal(f.player.getState().pending,true);
    f.change('fb-bpm','120');assert.equal(f.player.getState().bpm,96,'active tempo must reflect sounding music');
    gate.release();await flush();const update=f.player.transport.pendingUpdate;assert.ok(update);
    assert.equal(f.player.getState().key,'C');f.advance(update.at+.05);
    assert.equal(f.player.getState().key,'D');assert.equal(f.player.getState().bpm,120);assert.equal(f.player.getState().progression.chords[0].name,'Em7');
  }finally{f.close();}
});
test('editing during initial preparation cannot late-start old settings',async()=>{
  const f=fixture();try{
    await f.open();const gate=f.holdPrepare();f.click('fb-play');await flush();f.change('fb-key','D');gate.release();await flush();
    assert.equal(f.player.getState().key,'D','new requested key cannot be overwritten by stale start');
    if(f.player.getState().playing)assert.equal(f.player.getState().progression.chords[0].name,'Em7');
    assert.equal(f.player.getState().loading,false);
  }finally{f.close();}
});
test('failed live preparation preserves old key, tempo and playing chart',async()=>{
  const f=fixture();try{
    await f.open();f.click('fb-play');await flush();const gate=f.holdPrepare();f.change('fb-key','D');gate.reject(Error('sample unavailable'));await flush();
    assert.equal(f.player.getState().playing,true);assert.equal(f.player.getState().key,'C');assert.equal(f.player.getState().progression.chords[0].name,'Dm7');
    assert.match(f.d.getElementById('fb-status').textContent,/sample unavailable/);
  }finally{f.close();}
});
test('stopped unrelated Transport cannot silence floating player; owner pause stops old live scopes',async()=>{
  const f=fixture();try{
    await f.open();f.click('fb-play');await flush();const A=f.w.practiceAudio,other=new A.Transport();
    const sounding=f.starts.filter(node=>node.stopTime>f.now),before=sounding.map(node=>node.stops.length);other.pause();
    assert.deepEqual(sounding.map(node=>node.stops.length),before);
    const owner=f.player.transport,oldScope=owner.voiceScope;f.change('fb-key','D');await flush();const update=owner.pendingUpdate;assert.ok(update);f.advance(update.at+.04);
    assert.notEqual(owner.voiceScope,oldScope);assert.ok(owner.voiceScopes.has(oldScope),'previous chorus tails retain owner until stopped');
    const active=f.starts.filter(node=>!node.ended&&node.stopTime>f.now),stops=active.map(node=>node.stops.length);
    f.player.stop();assert.ok(active.every((node,i)=>node.stops.length>stops[i]));assert.equal(owner.voiceScopes.size,0);
  }finally{f.close();}
});
test('invalid custom chart never replaces current chart, restore returns full page harmony',async()=>{
  const f=fixture();try{
    await f.open();f.d.getElementById('fb-progression').value='Cmaj7 Nope';f.d.getElementById('fb-form').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(f.player.getState().contextId,'LcAoWGYi');
    f.d.getElementById('fb-progression').value='F7 | Bb7';f.d.getElementById('fb-form').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
    assert.match(f.player.getState().contextId,/^custom:/);assert.equal(f.player.getState().progression.chords.length,2);
    f.click('fb-restore');assert.equal(f.player.getState().contextId,'LcAoWGYi');assert.equal(f.player.getState().progression.chords.length,3);
  }finally{f.close();}
});
test('minor key labels keep stable select values through repeated renders and custom degrees',async()=>{
  const f=fixture();try{
    await f.open(lesson({key:'Am',text:'Am7 | Dm7 | E7'}));
    f.click('fb-minimize');f.click('fb-expand');f.player.stop();
    assert.equal(f.d.getElementById('fb-key').value,'A');
    assert.equal(f.d.getElementById('fb-key').selectedOptions[0].textContent,'A 小调');
    f.change('fb-key','D');assert.equal(f.player.getState().progression.chords[0].name,'Dm7');
    f.d.getElementById('fb-progression').value='1 | 4 | 5';f.d.getElementById('fb-form').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(f.player.getState().progression.chords[0].family,'minor','numeric custom harmony retains displayed minor mode');
  }finally{f.close();}
});
test('volume edits made during live preparation survive the candidate commit',async()=>{
  const f=fixture();try{
    await f.open();f.click('fb-play');await flush();const gate=f.holdPrepare();f.change('fb-key','D');
    const volume=f.d.querySelector('[data-fb-volume="bass"]');volume.value='17';volume.dispatchEvent(new f.w.Event('input',{bubbles:true}));
    gate.release();await flush();const update=f.player.transport.pendingUpdate;assert.ok(update);f.advance(update.at+.05);
    assert.equal(volume.value,'17','new mix remains visible after harmonic change');
    f.player.stop();assert.equal(volume.value,'17','mix remains the committed audible mix after stop');
  }finally{f.close();}
});

(async()=>{let failed=0;for(const [name,fn]of cases){try{await fn();console.log('PASS floating backing: '+name);}catch(error){failed++;console.error('FAIL floating backing: '+name+'\n'+error.stack);}}if(failed)process.exitCode=1;else console.log(`PASS ${cases.length} floating-player integration scenarios (mock WebAudio decoder)`);})();
