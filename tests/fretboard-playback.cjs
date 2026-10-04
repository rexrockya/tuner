const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const dom=new JSDOM(fs.readFileSync('docs/fretboard.html','utf8'),{url:'https://rexrockya.github.io/tuner/fretboard.html?lesson=Xbv40aTf',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 w.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,value:true});};w.HTMLMediaElement.prototype.load=function(){};
 w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join('docs',String(url).split('?')[0]),'utf8'))});
 let resumeResolve,clock=0,voices=[],timerId=0;const pending=new Map();
 class AudioContext{get currentTime(){return clock;}constructor(){this.destination={};}resume(){return new Promise(r=>resumeResolve=r);}createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){},start(at){o.at=at;voices.push(o);},stop(at){o.until=at;o.stopped=at===undefined;}};return o;}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}
 w.AudioContext=AudioContext;w.setTimeout=(fn,ms)=>{pending.set(++timerId,{fn,ms});return timerId;};w.clearTimeout=id=>pending.delete(id);
 w.eval(fs.readFileSync('docs/fretboard-core.js','utf8'));w.eval(fs.readFileSync('docs/fretboard.js','utf8'));await flush();await flush();
 const click=s=>d.querySelector(s).click(),nextTick=()=>{const[id,task]=[...pending][0];pending.delete(id);task.fn();};
 click('#play');click('#play');resumeResolve();await flush();assert.equal(voices.length,0,'late resume cancelled');
 click('#play');resumeResolve();await flush();assert.equal(voices.length,28,'all source attacks scheduled once');assert.equal(voices[0].at,0);assert.equal(voices[1].at,60/72*.5);assert.ok(Math.abs(voices[27].until-60/72*16)<1e-9);assert.ok(Math.abs(voices[0].frequency.value-164.813778)<.001);
 click('#next-segment');assert.equal(pending.size,0);assert.ok(voices.every(v=>v.stopped),'navigation cancels every scheduled source');
 voices=[];click('#loop');click('#play');resumeResolve();await flush();assert.equal(voices.length,4);clock=60/72*2+.001;nextTick();assert.equal(voices.length,8,'segment loop repeats only its exact source notes');click('#loop');assert.equal(pending.size,0);
 // Source player takes ownership and never starts synthetic playback.
 voices=[];click('#play');resumeResolve();await flush();const audio=d.querySelector('#original-audio');audio.dispatchEvent(new w.Event('play'));assert.equal(pending.size,0);assert.ok(voices.every(v=>v.stopped));assert.match(d.querySelector('#original-status').textContent,/未验证/);
 const gs='gs00bn5';d.querySelector('#lesson-select').value=gs;d.querySelector('#lesson-select').dispatchEvent(new w.Event('change'));await flush();await flush();
 const data=JSON.parse(fs.readFileSync('docs/assets/licks/fretboard/'+gs+'.json','utf8'));
 Object.defineProperty(audio,'paused',{configurable:true,value:false});audio.currentTime=data.notes[3].timeSeconds+.000001;audio.dispatchEvent(new w.Event('timeupdate'));assert.equal(d.querySelector('#current-note').textContent,data.notes[3].name);
 // Start/end offsets are exact source annotation gaps, not a straight-eighth rewrite.
 click('#full-sequence [data-note="0"]');voices=[];clock=0;click('#play');resumeResolve();await flush();const bpm=+d.querySelector('#tempo').value;
 for(let i=0;i<data.notes.length;i++){assert.ok(Math.abs(voices[i].at-(data.notes[i].start-data.notes[0].start)*60/bpm)<1e-8);assert.ok(Math.abs(voices[i].until-voices[i].at-data.notes[i].duration*60/bpm)<1e-8);}
 d.querySelector('#tempo').value=80;d.querySelector('#tempo').dispatchEvent(new w.Event('input'));assert.equal(pending.size,0,'tempo edit stops pre-scheduled voices');assert.ok(voices.every(v=>v.stopped));
 audio.dispatchEvent(new w.Event('error'));assert.match(d.querySelector('#original-status').textContent,/不会自动换成合成音/);
 dom.window.close();console.log('PASS fretboard playback: source MP3 ownership, late-resume cancel, all original attacks/durations/gaps, original annotation sync, loop, end boundaries, navigation/tempo stop and error transparency');
})().catch(e=>{console.error(e);process.exitCode=1;});
