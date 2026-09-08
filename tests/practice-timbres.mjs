import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = path.resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const docs = path.join(root, 'docs');
const module = await import(pathToFileURL(path.join(docs, 'practice-timbres.js')).href);
const manifest = JSON.parse(fs.readFileSync(path.join(docs, 'assets/audio/blues/manifest.json'), 'utf8'));
const requests = [], decodes = [], nodes = [], starts = [], stops = [], timers = new Map();
let now = 10, resumed = 0, nextTimer = 0, failPiano = false, stallViolin = null;
class Param { value=0; setValueAtTime(value) {this.value=value;} linearRampToValueAtTime(value) {this.value=value;} exponentialRampToValueAtTime(value){this.value=value;} setTargetAtTime(value) {this.value=value;} cancelScheduledValues(){} }
class Node { constructor(type) { this.type=type; this.connections=[]; for(const key of ['gain','frequency','playbackRate','threshold','knee','ratio','attack','release']) this[key]=new Param(); nodes.push(this); } connect(next) {this.connections.push(next);return next;} disconnect(){this.disconnected=true;} setPeriodicWave(wave){this.wave=wave;} start(at){starts.push({node:this,at});} stop(at){stops.push({node:this,at});} }
class Context { sampleRate=44100; state='suspended'; destination=new Node('destination');get currentTime(){return now;} async resume(){resumed++;this.state='running';} createGain(){return new Node('gain');}createDynamicsCompressor(){return new Node('compressor');}createConvolver(){return new Node('room');}createBiquadFilter(){return new Node('filter');}createWaveShaper(){return new Node('drive');}createOscillator(){return new Node('organ');}createBufferSource(){return new Node('sample');}createPeriodicWave(real,imag){return Array.from(imag);}createBuffer(ch,length,rate){const data=Array.from({length:ch},()=>new Float32Array(length));return {duration:length/rate,length,sampleRate:rate,numberOfChannels:ch,getChannelData:c=>data[c]};} async decodeAudioData(bytes){const tag=Buffer.from(bytes).toString('utf8',0,160);decodes.push(tag);const b=this.createBuffer(1,154350,44100);b.tag=tag;return b;} }
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
  const text=String(url);requests.push(text);
  if(text.includes('violin-mp3.js')) {if(stallViolin)await stallViolin;return {ok:true,text:async()=>fs.readFileSync(path.join(docs,'assets/audio/violin-mp3.js'),'utf8')};}
  if(text.includes('sfzinstruments-splendid-grand-piano'))return {ok:!failPiano,arrayBuffer:async()=>new TextEncoder().encode('PIANO '+decodeURIComponent(text)).buffer};
  if(text.includes('electro/manifest.json'))return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(docs,'assets/audio/electro/manifest.json'),'utf8'))};
  if(text.includes('manifest.json'))return {ok:true,json:async()=>manifest};
  const b=fs.readFileSync(path.join(docs,text.split('?')[0]));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
};
const window={AudioContext:Context,setInterval(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearInterval(id){timers.delete(id);},importTimbres:async()=>module};
const sandbox={window,console,AbortController,Float32Array,Map,Set,setTimeout,clearTimeout,fetch:globalThis.fetch};vm.createContext(sandbox);
for(const name of ['harmony.js','practice-arrangement.js','score-audio.js'])vm.runInContext(fs.readFileSync(path.join(docs,name),'utf8'),sandbox);
// Native dynamic imports execute outside a VM realm. Replace only this loader boundary
// so the real module and all real mapping code use the test's fetch/context doubles.
vm.runInContext(fs.readFileSync(path.join(docs,'practice-audio.js'),'utf8').replace(/import\('\.\/practice-timbres\.js[^']*'\)/,"window.importTimbres()"),sandbox);
const A=window.practiceAudio, event=(midi=69,velocity=.72)=>({track:'lead',midi,velocity,duration:1,beat:0});
try {
  assert.equal(A.getTimbre('lead'),'warm');for(const track of ['drums','bass','keys','rhythm','lead'])assert.ok(Object.keys(A.timbres[track]).length>=3);
  const ctx=A.getContext(), bank=module.createSampleBank(ctx,window.scoreAudio);
  await bank.ensure('piano',[event()]);
  const pianoRequests=requests.filter(url=>url.includes('sfzinstruments-splendid-grand-piano'));
  assert.equal(pianoRequests.length,1,'one pitch/velocity requires one original region, not the entire piano');
  const sample=bank.get('piano',event());assert.equal(sample.midi,69);assert.ok(sample.buffer.tag.includes('Mp A3.ogg'),'Lead uses the score piano original Mp A3 mapping');
  assert.ok(!sample.loop,'piano never loops');assert.equal(starts.length,0);assert.equal(resumed,0);
  await bank.ensure('piano',[event(70)]);assert.equal(requests.filter(url=>url.includes('sfzinstruments-splendid-grand-piano')).length,1,'neighbor A# shares A3 region exactly as score');
  failPiano=true;await assert.rejects(bank.ensure('piano',[event(76)]),/音色载入失败/);failPiano=false;await bank.ensure('piano',[event(76)]);assert.ok(bank.get('piano',event(76)),'failed region retry succeeds');
  const before=decodes.length;await bank.ensure('violin',[event(69),event(72)]);assert.equal(decodes.length-before,2,'only selected violin notes decoded');
  const violin=bank.get('violin',event());assert.equal(violin.midi,69);assert.equal(violin.loop,true);assert.equal(violin.loopStart,.8);assert.equal(violin.loopEnd,2.8);assert.ok(!violin.buffer.tag.includes('PIANO'));
  console.log('PASS: original score piano regions, requested pitch/velocity only, cache, retry and real local violin sustain mapping');
  const transport=new A.Transport();transport.load({events:[event()],beats:4,chartBeats:4});
  await A.setTimbre('lead','piano',transport.song.events);assert.equal(starts.length,0);assert.equal(resumed,0,'timbre loads never unlock audio');
  await transport.play();assert.equal(timers.size,1);const playingPiano=starts.at(-1).node;assert.ok(playingPiano.buffer.tag.includes('PIANO'));assert.equal(playingPiano.loop,undefined);transport.pause();assert.equal(timers.size,0);
  await A.setTimbre('lead','violin',transport.song.events);await transport.play();assert.equal(starts.at(-1).node.loop,true,'actual scheduled violin retains bow sustain');transport.pause();assert.ok(stops.some(item=>item.node===starts.at(-1).node),'pause stops sampled instrument voices too');
  for(const track of ['drums','bass','rhythm','lead']){
    const id=track==='drums'?'vintage':track==='bass'?'muted':'crunch';await A.setTimbre(track,id);
    const e=track==='drums'?{track,sample:'kick-1',velocity:.7,beat:0}: {...event(57),track};
    transport.load({events:[e],beats:4,chartBeats:4});await transport.play();transport.pause();
  }
  assert.ok(nodes.some(node=>node.type==='drive'&&node.curve.length===1024),'crunch is an actual saturating guitar patch');
  assert.ok(nodes.filter(node=>node.type==='lowpass').some(node=>node.frequency.value===1100),'muted bass changes the sound path: '+nodes.filter(n=>n.type==='lowpass').map(n=>n.frequency.value));
  assert.ok(nodes.filter(node=>node.type==='lowpass').some(node=>node.frequency.value===6400),'vintage drum patch changes the sound path');
  console.log('PASS: shared sample clock, actual piano/violin buffers, silence on pause and audible per-track patch processing');
  assert.ok(!requests.some(url=>url.includes('electro/')),'electronic drum kit is not part of initial preload');
  const electro={track:'drums',sample:'kick-1',beat:0,velocity:.7,duration:.12};
  await Promise.all([A.prepareTimbres({drums:'electro'},[electro]),A.prepareTimbres({drums:'electro'},[electro])]);assert.equal(requests.filter(url=>url.includes('electro/manifest.json')).length,1);assert.equal(requests.filter(url=>url.includes('electro/')&&url.endsWith('.wav')).length,8);
  assert.equal(A.getTimbre('drums'),'vintage','preparing kit leaves active selection unchanged');await A.setTimbre('drums','electro',[electro]);transport.load({events:[electro],beats:4,chartBeats:4});await transport.play();assert.ok(starts.at(-1).node.buffer.tag.startsWith('RIFF'),'electro playback uses supplied WAV buffer');transport.pause();
  for(const [track,id]of[['bass','synth'],['bass','acid'],['keys','synth'],['keys','pad']]){
    await A.setTimbre(track,id);const before=starts.length;transport.load({events:[{...event(track==='bass'?36:64),track}],beats:4,chartBeats:4});await transport.play();const voices=starts.slice(before);assert.equal(voices.length,2,'synth really schedules two oscillators');assert.ok(voices.every(v=>['sine','triangle','sawtooth'].includes(v.node.type)));transport.pause();assert.ok(voices.every(v=>stops.some(stop=>stop.node===v.node&&stop.at<=now+.031)),'pause stops every synth layer');
  }
  await A.setTimbre('lead','ambient');transport.load({events:[{...event(57),duration:.5}],beats:4,chartBeats:4});await transport.play();const ambientSource=starts.at(-1).node,convolver=nodes.findLast(node=>node.type==='room'&&Math.abs((node.buffer?.duration||0)-1.4)<.001),wet=convolver.connections[0];assert.ok(convolver);ambientSource.onended();assert.ok(!convolver.disconnected,'natural note end preserves spatial tail');transport.pause();assert.equal(wet.gain.value,.0001,'pause also fades wet tail');await new Promise(resolve=>setTimeout(resolve,45));assert.equal(convolver.disconnected,true,'paused tail resources are disposed');
  console.log('PASS: lazy/cache-safe electronic kit, both synth basses/keys, oscillator cancellation and natural/paused ambient tails');
  // A new bank is needed to force a genuinely pending violin download.
  let release;stallViolin=new Promise(resolve=>release=resolve);
  const isolated={...window,importTimbres:async()=>module};const racebox={...sandbox,window:isolated};vm.createContext(racebox);for(const name of ['harmony.js','practice-arrangement.js','score-audio.js'])vm.runInContext(fs.readFileSync(path.join(docs,name),'utf8'),racebox);
  vm.runInContext(fs.readFileSync(path.join(docs,'practice-audio.js'),'utf8').replace(/import\('\.\/practice-timbres\.js[^']*'\)/,"window.importTimbres()"),racebox);
  const R=isolated.practiceAudio;const old=R.setTimbre('lead','violin',[event()]);await Promise.resolve();const latest=await R.setTimbre('lead','bright',[event()]);release();await old;stallViolin=null;assert.equal(latest,true);assert.equal(R.getTimbre('lead'),'bright');
  const t=new R.Transport();t.load({events:[event()],beats:4,chartBeats:4});await R.setTimbre('lead','piano');const startCount=starts.length,pending=t.play();t.pause();await pending;assert.equal(starts.length,startCount,'pause during selected instrument load cannot emit a note');assert.equal(t.playing,false);assert.equal(timers.size,0);
  console.log('PASS: newest timbre wins and stopping during asynchronous sample load cannot start playback');
} finally {globalThis.fetch=originalFetch;}
