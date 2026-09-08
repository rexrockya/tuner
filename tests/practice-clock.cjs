const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let now=0, id=0;
const scheduled=[], nodes=[], timers=new Map();
class Param {value=0; setValueAtTime(v,t){this.value=v;return this;} setTargetAtTime(v,t,c){this.value=v;return this;} linearRampToValueAtTime(v,t){this.value=v;return this;} cancelScheduledValues(){} }
class Node {constructor(type){this.type=type;this.connections=[];this.gain=new Param();this.frequency=new Param();this.playbackRate=new Param();this.threshold=new Param();this.knee=new Param();this.ratio=new Param();this.attack=new Param();this.release=new Param();nodes.push(this)} connect(n){this.connections.push(n);return n;} disconnect(){} start(t){this.startTime=t;scheduled.push(this)} stop(t){this.stopTime=t} setPeriodicWave(){} }
class Ctx {state='running'; sampleRate=44100;destination=new Node('destination');get currentTime(){return now;}async resume(){}createGain(){return new Node('gain')}createDynamicsCompressor(){return new Node('compressor')}createConvolver(){return new Node('convolver')}createBiquadFilter(){return new Node('filter')}createOscillator(){return new Node('oscillator')}createBufferSource(){return new Node('source')}createPeriodicWave(){return {}}createBuffer(ch,n,rate){return {duration:n/rate,getChannelData:()=>new Float32Array(n)}}async decodeAudioData(){return {duration:1}}}
const w={AudioContext:Ctx,setInterval(fn){const i=++id;timers.set(i,fn);return i;},clearInterval(i){timers.delete(i)}};
const sandbox={AbortController,setTimeout,clearTimeout,window:w,fetch:async url=>({ok:true,json:async()=>({'kick-1':{file:'kick-1.wav'}}),arrayBuffer:async()=>new ArrayBuffer(1)}),Float32Array,Map,Set,console};
vm.createContext(sandbox);
const root=require('node:path').resolve(__dirname,'../docs')+'/';
vm.runInContext(fs.readFileSync(root+'harmony.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync(root+'practice-arrangement.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync(root+'practice-audio.js','utf8'),sandbox);
const A=w.practiceAudio, near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
function advance(to){while(now<to){now=Math.min(to,now+.017);for(const f of timers.values())f();}}
function song(n=8){return {beats:n,chartBeats:n,events:Array.from({length:n},(_,i)=>({track:'drums',sample:'kick-1',beat:i,velocity:.5}))};}
(async()=>{
 let t=new A.Transport();t.load(song());t.bpm=96;await t.play();const anchor=scheduled[0].startTime;
 advance(250);for(let i=0;i<scheduled.length;i++)near(scheduled[i].startTime,anchor+i*60/96);t.pause();assert.equal(timers.size,0);console.log('PASS: 50 loops absolute sample clock');
 scheduled.length=0;now=0;t.load(song(48));await t.setLoopBar(8);await t.play();const a=scheduled[0].startTime;advance(125);for(let i=0;i<scheduled.length;i++)near(scheduled[i].startTime,a+i*60/96);near(t.current(),32+((now-a)*96/60)%4);console.log('PASS: bar 9 repeated loop clock');
 scheduled.length=0;await t.seek(34);assert.equal(t.loopBar,8);near(t.position,34);advance(now+2);t.pause();console.log('PASS: seek within loop');
 now=0;scheduled.length=0;t.load(song(48));await t.play();now=350;for(const f of timers.values())f();const overdue=scheduled.filter(x=>x.startTime>1&&x.startTime<350);assert.equal(overdue.length,0);console.log('PASS: long background stall skips stale samples');t.pause();
 now=0;scheduled.length=0;t.load(song());const pending=t.play();t.pause();await pending;assert.equal(t.playing,false);assert.equal(timers.size,0);console.log('PASS: immediate pause cancels pending play');
 now=0;scheduled.length=0;t.load(song());t.loop=false;await t.play();advance(6);assert.equal(t.playing,false);near(t.position,8);assert.equal(scheduled.length,8);console.log('PASS: nonloop end stops at beat 8');
})().catch(e=>{console.error(e);process.exitCode=1;});
