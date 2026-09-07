const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const ROOT=process.env.TUNER_QA_ROOT || path.resolve(__dirname,'../..');
const {JSDOM,VirtualConsole}=require(ROOT+'/node_modules/jsdom');
const raw=fs.readFileSync(ROOT+'/docs/index.html','utf8');
const inline=fs.existsSync(ROOT+'/docs/app.js')?fs.readFileSync(ROOT+'/docs/app.js','utf8'):raw.match(/<script>\s*(const NOTES=[\s\S]+?)<\/script>/)[1];
const html=raw.replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(options={}){
 const errors=[],calls=[],raf=new Map(),intervals=new Map(),timeouts=new Map();let nextId=1;
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:options.url||'https://rexrockya.github.io/tuner/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.HTMLElement.prototype.scrollTo=()=>{};w.scrollTo=()=>{};w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
 w.requestAnimationFrame=fn=>{const id=nextId++;raf.set(id,fn);return id};w.cancelAnimationFrame=id=>raf.delete(id);
 w.setInterval=(fn,ms)=>{const id=nextId++;intervals.set(id,{fn,ms});return id};w.clearInterval=id=>intervals.delete(id);
 w.setTimeout=(fn,ms)=>{const id=nextId++;timeouts.set(id,{fn,ms});return id};w.clearTimeout=id=>timeouts.delete(id);
 const response=(data={},status=200)=>({ok:status<400,status,json:async()=>data,headers:{get:()=>null}});
 w.fetch=async(url,opts={})=>{calls.push({url,opts});return options.fetch?options.fetch(url,opts,response):response(url.includes('/api/auth/me')?{user:null}:{});};
 class ES{constructor(url){this.url=url;calls.push({eventSource:this});}close(){this.closed=true;}}w.EventSource=ES;
 let stopped=0,closed=0,streams=[];const createStream=()=>{const track={stop:()=>{if(!track.stopped)stopped++;track.stopped=true}};const stream={getTracks:()=>[track]};streams.push(stream);return stream};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:options.getUserMedia|| (async()=>createStream())},configurable:true});
 class AC{constructor(){this.sampleRate=48000;this.state='running';this.currentTime=0;this.destination={}}createAnalyser(){return{fftSize:4096,getFloatTimeDomainData(b){for(let i=0;i<b.length;i++)b[i]=.15*Math.sin(2*Math.PI*440*i/48000)}}}createMediaStreamSource(){return{connect(){}}}close(){closed++;this.state='closed';return Promise.resolve()}}
 w.AudioContext=AC;
 let bpm=80,running=false,sig=[4,4],scoreId='';const metroNotify=()=>w.dispatchEvent(new w.CustomEvent('tuner:metro-change',{detail:{bpm,running,timeSignature:sig}}));
 w.metronome={getBpm:()=>bpm,getTimeSignature:()=>sig,getScoreId:()=>scoreId,setBpm:n=>{bpm=Math.max(30,Math.min(240,Number(n)||80));d.querySelector('#metro-bpm').textContent=bpm;metroNotify()},setTimeSignature:n=>{sig=n;metroNotify()},start:async()=>{running=true;metroNotify()},stop:()=>{running=false;metroNotify()},releaseScore:()=>{calls.push({releaseScore:true});scoreId=''}};
 w.lessonPlayer={stop:()=>calls.push({lessonStop:true})};w.scorePlayer={pause:()=>calls.push({scorePause:true}),open:id=>calls.push({scoreOpen:id}),showLibrary:()=>calls.push({scoreLibrary:true})};
 for(const[k,v]of Object.entries(options.storage||{}))w.localStorage.setItem(k,v);
 if(options.blockStorage)Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('Blocked','SecurityError')}});
 if(!options.skipApp&&fs.existsSync(ROOT+'/docs/tuner-pitch.js'))w.eval(fs.readFileSync(ROOT+'/docs/tuner-pitch.js','utf8'));
 let initError;try{if(!options.skipApp)w.eval(inline+`\nwindow.qa={detectPitch,render,renderAccount,accountRequest,setAccountMode,refreshAccount,pushRoomState,jamOpen,jamStartSequence,jamStartRecording,jamPress,jamRelease,jamStopPreview,jamAudioReady,jamSave,jamRender,rooms:()=>jamRooms,current:()=>jamRoom(jamCurrent),getSound:()=>jamSound,getAudio:()=>jamAudio,getRecording:()=>jamRecording,getHeld:()=>jamHeld,sections:JAM_SECTIONS,getRunning:()=>running};`)}catch(e){initError=e.message}
 return{dom,w,d,errors,calls,raf,intervals,timeouts,initError,response,createStream,streams,mic:()=>({stopped,closed}),q:s=>d.querySelector(s),click(s){const node=d.querySelector(s);assert.ok(node,'missing '+s);node.click()},close:()=>{setImmediate(()=>dom.window.close())}};
}
function toneStub(w,options={}){const log=[],schedules=new Map();let index=1;
 class Node{constructor(){this.volume={value:0,rampTo:(...a)=>log.push(['volume',...a])};this.loaded=true}connect(){return this}toDestination(){return this}set(){return this}start(...a){log.push(['start',...a]);return this}stop(){log.push(['stop']);return this}dispose(){log.push(['dispose'])}releaseAll(){}triggerAttack(...a){log.push(['attack',...a])}triggerRelease(...a){log.push(['release',...a])}triggerAttackRelease(...a){log.push(['note',...a])}player(){return this}}
 w.Tone={start:options.start|| (async()=>{}),now:()=>0,gainToDb:n=>20*Math.log10(n),Limiter:Node,Compressor:Node,Channel:Node,Players:Node,MembraneSynth:Node,NoiseSynth:Node,PolySynth:Node,FMSynth:Node,Synth:Node,Chorus:Node,FeedbackDelay:Node,MonoSynth:Node,Distortion:Node,Filter:Node,Reverb:Node,AMSynyth:Node,AMSynth:Node,Transport:{bpm:{value:80},position:0,scheduleRepeat(fn){const id=index++;schedules.set(id,fn);return id},clear:id=>schedules.delete(id),stop(){log.push(['transport-stop'])},start(...a){log.push(['transport-start',...a])}},Draw:{schedule:fn=>fn()}};return{log,schedules};}
module.exports={ROOT,setup,toneStub,tick,html,raw};
