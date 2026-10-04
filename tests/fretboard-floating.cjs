// Integration coverage uses a deterministic player contract, not a second audio
// engine. The player's own suite covers synthesis, loader races and scheduling.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<4;i++)await flush();}
(async()=>{
 const markup=fs.readFileSync('docs/fretboard.html','utf8');
 for(const file of ['floating-backing.css','asset-loader.js','harmony.js','floating-backing.js'])assert.ok(markup.includes(file),'loads '+file);
 const scripts=[...markup.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.ok(scripts.indexOf('asset-loader.js')<scripts.indexOf('floating-backing.js'));
 assert.ok(scripts.indexOf('harmony.js')<scripts.indexOf('floating-backing.js'));
 assert.ok(scripts.indexOf('floating-backing.js')<scripts.indexOf('fretboard.js'));
 const dom=new JSDOM(markup,{url:'https://rexrockya.github.io/tuner/fretboard.html?lesson=LcAoWGYi',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id),errors=[];
 w.addEventListener('error',event=>errors.push(event.error));
 w.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,value:true});};
 w.HTMLMediaElement.prototype.load=function(){};
 w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join('docs',String(url).split('?')[0]),'utf8'))});
 const fetchSource=w.fetch;
 let playerContext=null,playerState={contextId:null,visible:false,minimized:false,playing:false,loading:false,transpose:0},stops=0,opens=0,resets=0;
 const contexts=[];
 function emit(changes={}){
   playerState={...playerState,...changes};
   w.dispatchEvent(new w.CustomEvent('tuner:backing-change',{detail:{...playerState}}));
 }
 w.floatingBacking={
   setContext(context){contexts.push(context);playerContext=context;emit({contextId:context?.id||null,playing:false,loading:false,key:context?.key,transpose:0,bpm:context?.bpm,genre:context?.genre,chord:null,progression:context?.progression});},
   open(context){opens++;if(context?.id!==playerContext?.id)this.setContext(context);emit({visible:true,minimized:false});},
   stop(){stops++;emit({playing:false,loading:false});},
   resetKey(){resets++;emit({playing:false,loading:false,transpose:0,key:playerContext?.key,chord:null});},
   close(){emit({visible:false,playing:false,loading:false});},getState(){return {...playerState};}
 };
 const oscillators=[];let resumeResolve;
 class AudioContext{
  constructor(){this.destination={};this.currentTime=0;}
  resume(){return new Promise(resolve=>resumeResolve=resolve);}
  createOscillator(){const osc={frequency:{value:0},connect(){},disconnect(){},start(){oscillators.push(osc);},stop(at){if(at===undefined)osc.stopped=true;}};return osc;}
  createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 w.AudioContext=AudioContext;
 const choose=async id=>{$('lesson-select').value=id;$('lesson-select').dispatchEvent(new w.Event('change'));await settle();};
 function startOriginal(){Object.defineProperty($('original-audio'),'paused',{configurable:true,value:false});$('original-audio').dispatchEvent(new w.Event('play'));}
 try{
   for(const file of ['harmony.js','fretboard-core.js','fretboard.js'])w.eval(fs.readFileSync('docs/'+file,'utf8'));
   await settle();
   assert.equal(playerContext.id,'LcAoWGYi');assert.equal(playerContext.key,'C');
   assert.equal(playerContext.text,'| Dm7 | G7 | Cmaj7 |');
   assert.deepEqual(Array.from(playerContext.progression.chords,c=>[c.name,c.bar,c.beat,c.beats]),[['Dm7',0,0,4],['G7',1,4,4],['Cmaj7',2,8,4]]);
   assert.match(playerContext.timingNote,/均分拍数/);assert.match(playerContext.timingNote,/不与原始示范同步/);
   assert.equal($('open-backing').disabled,false);assert.equal($('follow-backing').checked,false);
   $('open-backing').click();assert.equal(opens,1);assert.equal(playerState.playing,false,'opening never autoplays');
   startOriginal();assert.equal($('original-audio').paused,false);
   emit({playing:true,chord:{name:'G7',bar:1,beat:4,duration:4,index:1}});
   assert.equal($('original-audio').paused,true,'backing takes source-audio ownership');
   assert.equal($('board-title').textContent,'Dm7','follow is opt-in');
   const stoppedBefore=stops;
   d.querySelector('#fretboard [data-string="1"][data-fret="5"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
   $('shape-select').value='-1';$('shape-select').dispatchEvent(new w.Event('change'));
   d.querySelector('#harmony-strip [data-segment="2"]').click();
   assert.equal(stops,stoppedBefore,'notes, shapes and manual chords do not stop accompaniment');assert.equal(playerState.playing,true);
   $('follow-backing').click();assert.equal($('board-title').textContent,'G7');
   emit({chord:{name:'Cmaj7',bar:2,beat:8,duration:4,index:2}});assert.equal($('board-title').textContent,'Cmaj7');
   $('follow-backing').click();emit({chord:{name:'Dm7',bar:0,beat:0,duration:4,index:0}});assert.equal($('board-title').textContent,'Cmaj7');
   emit({playing:false,key:'D',transpose:2});
   assert.equal($('board-title').textContent,'Dmaj7');assert.equal(d.querySelector('#fretboard [data-order]'),null);
   assert.match($('fidelity-note').textContent,/原谱图片和原始示范仍是原调/);
   const scoreSrc=$('score-image').src,audioSrc=$('original-audio').src;
   startOriginal();assert.equal(playerState.transpose,0);assert.equal($('board-title').textContent,'Cmaj7');
   assert.equal($('original-audio').paused,false,'restoring the map must not cancel new native audio playback');
   assert.equal($('score-image').src,scoreSrc);assert.equal($('original-audio').src,audioSrc);
   assert.ok(resets>=2);
   emit({transpose:2,key:'D'});
   emit({contextId:'custom:1',transpose:0,key:'A',playing:true});
   assert.equal($('board-title').textContent,'Cmaj7','custom progression restores source map rather than relabeling it');
   assert.equal($('follow-backing').disabled,true);assert.match($('backing-status').textContent,/自定和声/);
   playerContext={id:'custom:1'};$('open-backing').click();
   assert.equal(playerContext.id,'LcAoWGYi');assert.equal($('follow-backing').disabled,false);


   // Exact source chord boundaries survive multi-chord bars and key changes.
   await choose('Xbv40aTf');
   assert.equal(playerContext.text,'| Cmaj7 A7 | Dm7 G7 | Cmaj7 A7 | Dm7 G7 |');
   assert.deepEqual(Array.from(playerContext.progression.chords,c=>c.beats),Array(8).fill(2));
   assert.deepEqual(Array.from(playerContext.progression.chords,c=>c.beat),[0,2,4,6,8,10,12,14]);
   assert.match(playerContext.timingNote,/已核对的谱面和弦时值/);
   assert.equal(d.querySelector('.phrase-panel').hidden,false);assert.equal($('current-note').textContent,'E3');
   d.querySelector('#full-sequence [data-note="4"]').click();assert.equal($('current-note').textContent,'C♯4');
   const sourceChords=[...d.querySelectorAll('#harmony-strip strong')].map(n=>n.textContent);
   emit({transpose:1,key:'Db'});
   assert.equal($('board-title').textContent,'Bb7');assert.equal(d.querySelector('.phrase-panel').hidden,true);
   assert.equal(d.querySelector('.whole-line').hidden,true);assert.equal(d.querySelector('#fretboard [data-order]'),null);
   assert.equal($('current-note').textContent,'选音','no fabricated transposed source-note route');
   emit({transpose:0,key:'C'});
   assert.equal(d.querySelector('.phrase-panel').hidden,false);assert.equal($('current-note').textContent,'C♯4','source selection restores unchanged');
   assert.deepEqual([...d.querySelectorAll('#harmony-strip strong')].map(n=>n.textContent),sourceChords);
   $('follow-backing').click();emit({playing:true,chord:{name:'G7',bar:1,beat:6,duration:2,index:3}});
   assert.equal($('board-title').textContent,'G7');assert.match($('position-label').textContent,/第 2 小节 · 第 3 拍/);
   $('follow-backing').click();
   // Starting synth cancels backing before asynchronous audio resume, and
   // starting backing cancels that pending resume without scheduling notes.
   $('play').click();assert.equal(playerState.playing,false);emit({loading:true});resumeResolve();await settle();
   assert.equal(oscillators.length,0,'late synth resume cancelled by backing load');
   emit({loading:false,playing:false});$('play').click();resumeResolve();await settle();assert.ok(oscillators.length>0);
   emit({playing:true});assert.ok(oscillators.every(osc=>osc.stopped),'backing stops scheduled source synth');
   emit({playing:false,transpose:2,key:'D'});startOriginal();
   assert.equal(playerState.transpose,0);assert.equal($('original-audio').paused,false);assert.equal(d.querySelector('.phrase-panel').hidden,false);

   // Clear lesson context immediately, not only after the next JSON resolves.
   let resolvePending;
   w.fetch=url=>String(url).endsWith('/gs00bn5.json')?new Promise(resolve=>resolvePending=()=>resolve(fetchSource(url))):fetchSource(url);
   $('lesson-select').value='gs00bn5';$('lesson-select').dispatchEvent(new w.Event('change'));
   assert.equal(playerContext,null);assert.equal($('open-backing').disabled,true);
   emit({contextId:'Xbv40aTf',playing:true,transpose:3,key:'Eb'});
   assert.equal($('coach').hidden,true,'stale player event cannot revive old map');
   await choose('LcAoWGYi');resolvePending();await settle();
   assert.equal(playerContext.id,'LcAoWGYi');assert.equal($('board-title').textContent,'Dm7');w.fetch=fetchSource;

   const catalog=JSON.parse(fs.readFileSync('docs/assets/licks/fretboard/catalog.json','utf8'));
   for(const meter of ['3/4','5/4']){
     const lesson=catalog.lessons.find(item=>item.meter===meter);assert.ok(lesson,'catalog covers '+meter);
     await choose(lesson.id);assert.equal(playerContext,null);assert.equal($('open-backing').disabled,true);assert.match($('backing-status').textContent,new RegExp(meter));
   }
   await choose('LcAoWGYi');emit({playing:true});w.dispatchEvent(new w.Event('pagehide'));assert.equal(playerState.playing,false);
   assert.equal($('follow-backing').checked,false);
   assert.ok(contexts.filter(c=>c===null).length>=5);assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
 // Exercise the real shared player too, including a blocked soundbank load.
 const realDom=new JSDOM(markup,{url:'https://rexrockya.github.io/tuner/fretboard.html?lesson=LcAoWGYi',runScripts:'outside-only',pretendToBeVisual:true});
 const rw=realDom.window,rd=rw.document,r=id=>rd.getElementById(id);
 try{
   rw.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,value:true});};
   rw.HTMLMediaElement.prototype.load=function(){};
   rw.fetch=fetchSource;
   rw.siteAssets={load:()=>Promise.reject(Error('Test unavailable soundbank'))};
   for(const file of ['harmony.js','floating-backing.js','fretboard-core.js','fretboard.js'])rw.eval(fs.readFileSync('docs/'+file,'utf8'));
   await settle();r('open-backing').click();
   assert.equal(r('floating-backing').hidden,false);
   r('fb-key').value='D';r('fb-key').dispatchEvent(new rw.Event('change'));
   assert.equal(r('board-title').textContent,'Em7');
   const audio=r('original-audio');Object.defineProperty(audio,'paused',{configurable:true,value:false});audio.dispatchEvent(new rw.Event('play'));
   assert.equal(audio.paused,false);assert.equal(r('board-title').textContent,'Dm7');assert.equal(rw.floatingBacking.getState().key,'C');
   r('fb-progression').value='A7 | D7';r('fb-form').dispatchEvent(new rw.Event('submit',{cancelable:true}));
   assert.match(r('backing-status').textContent,/自定和声/);assert.equal(r('follow-backing').disabled,true);
   r('open-backing').click();assert.equal(rw.floatingBacking.getState().contextId,'LcAoWGYi');assert.equal(r('follow-backing').disabled,false);
   await settle();assert.match(r('fb-status').textContent,/unavailable/);assert.equal(r('fb-play').disabled,false,'engine failure remains retryable');
 }finally{realDom.window.close();}
 console.log('PASS fretboard floating backing: exact source context/multiple chords, opt-in follow, inspection ownership, honest transposition/source restore, native audio restart, late synth cancellation, stale lesson events and meter guard');
})().catch(error=>{console.error(error);process.exitCode=1;});
