const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const { JSDOM } = require(path.join(root, 'node_modules/jsdom'));
const html = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: 'https://rexrockya.github.io/tuner/#lessons', runScripts: 'outside-only' });
const w = dom.window, d = w.document, sources = [], timers = new Map();
let now = 0, paused = true, sequence = 0;
class Param {
  value = 0; setValueAtTime(value) { this.value = value; } linearRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; } cancelScheduledValues() { this.cancelled = true; }
}
class Node {
  constructor(type) { this.type=type;this.connections=[];for(const key of ['gain','frequency','playbackRate','threshold','knee','ratio','attack','release'])this[key]=new Param(); }
  connect(node) { this.connections.push(node);return node; } disconnect() { this.disconnected=true; } setPeriodicWave() {}
  start(at) { this.startAt=at;sources.push(this); } stop(at) { this.stopAt=at ?? now; }
}
w.AudioContext = class {
  state='running';sampleRate=44100;destination=new Node('destination');get currentTime(){return now;}async resume(){}
  createGain(){return new Node('gain');}createDynamicsCompressor(){return new Node('compressor');}createConvolver(){return new Node('room');}
  createBiquadFilter(){return new Node('filter');}createWaveShaper(){return new Node('drive');}createOscillator(){return new Node('organ');}createBufferSource(){return new Node('sample');}
  createPeriodicWave(){return{};}createBuffer(channels,length,rate){return{duration:length/rate,getChannelData:()=>new Float32Array(length)};}
  async decodeAudioData(bytes){assert.ok(['fLaC','RIFF'].includes(Buffer.from(bytes).toString('ascii',0,4)));return{duration:3.2};}
};
w.fetch=async url=>{
  const file=path.resolve(root,'docs',String(url).split('?')[0]);assert.ok(file.startsWith(path.join(root,'docs/assets/audio/blues')), 'only bundled sample fixtures');
  return{ok:fs.existsSync(file),json:async()=>JSON.parse(fs.readFileSync(file,'utf8')),arrayBuffer:async()=>{const b=fs.readFileSync(file);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};
};
w.setInterval=fn=>{const id=++sequence;timers.set(id,fn);return id;};w.clearInterval=id=>timers.delete(id);
w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get:()=>paused});
w.HTMLMediaElement.prototype.play=function(){paused=false;this.dispatchEvent(new w.Event('play'));return Promise.resolve();};
w.HTMLMediaElement.prototype.pause=function(){if(!paused){paused=true;this.dispatchEvent(new w.Event('pause'));}};
for(const file of ['storage.js','harmony.js','practice-arrangement.js','music-genres.js','practice-audio.js'])w.eval(fs.readFileSync(path.join(root,'docs',file),'utf8'));
w.siteAssets={load:async name=>{assert.equal(name,'backingEngine');return w.practiceAudio;}};
for(const file of ['floating-backing.js','lessons.js'])w.eval(fs.readFileSync(path.join(root,'docs',file),'utf8'));
const click=id=>d.getElementById(id).click(), flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const change=(selector,value)=>{const node=d.querySelector(selector);node.value=value;node.dispatchEvent(new w.Event('change',{bubbles:true}));};
function releaseEnded(){for(const source of sources)if(!source.ended&&source.stopAt<=now){source.ended=true;source.onended?.();}}
function stoppedSince(index,label){for(const source of sources.slice(index))assert.ok(source.stopAt<=now+.030001,label+' stops every live sample/organ tail within 30 ms');assert.equal(timers.size,0,label+' cancels the transport scheduler');}
(async()=>{
  const F=w.floatingBacking;
  w.lessonPlayer.setBpm(40);click('toggle-backing');await flush();
  change('[data-fb-style="strings"]','none');change('[data-fb-style="percussion"]','none');change('[data-fb-style="key"]','pad');
  click('fb-play');await flush();assert.equal(F.getState().playing,true,d.getElementById('fb-status').textContent);assert.ok(sources.length>=4,'generated backing starts bass, drums and chord voices');
  assert.ok(Math.max(...sources.map(source=>source.stopAt-now))>2,'40 BPM fixture exercises long tails');
  click('fb-minimize');assert.equal(F.getState().playing,true,'minimize preserves generated playback');
  click('fb-mini-close');assert.equal(F.getState().playing,false);stoppedSince(0,'Close');
  now+=.04;releaseEnded();assert.ok(sources.every(source=>source.disconnected),'ended backing sources disconnect');

  click('toggle-backing');await flush();let prior=sources.length;click('fb-play');await flush();assert.equal(F.getState().playing,true);assert.ok(sources.length>prior,'reopen and play restarts');
  click('play-lick');await flush();assert.equal(paused,false,'original MP3 can still play');assert.equal(F.getState().playing,false,'original playback takes ownership');stoppedSince(prior,'Original play');
  now+=.04;releaseEnded();

  prior=sources.length;click('fb-play');await flush();assert.equal(paused,true,'generated play stops original MP3');assert.equal(F.getState().playing,true);
  w.lessonPlayer.select(1);assert.equal(F.getState().playing,false);stoppedSince(prior,'Lesson change');assert.equal(F.getState().contextId,'lick:yKz58nSf');
  now+=.04;releaseEnded();assert.ok(sources.every(source=>source.disconnected));

  const prepare=w.practiceAudio.prepareTimbres;let finish;
  w.practiceAudio.prepareTimbres=(selection)=>new Promise(resolve=>{finish=()=>resolve(selection);});
  click('fb-play');await flush();assert.equal(F.getState().loading,true);const before=sources.length;
  w.lessonPlayer.select(2);finish();await flush();assert.equal(F.getState().loading,false);assert.equal(F.getState().playing,false);assert.equal(sources.length,before,'stale sample readiness cannot restart the previous lesson');
  w.practiceAudio.prepareTimbres=prepare;F.close();dom.window.close();
  console.log('PASS lesson audio ownership: shared generated transport, real bundled sample scheduling, minimize continuity, close/source/MP3 tail cleanup, source-node disconnect and pending-start cancellation');
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
