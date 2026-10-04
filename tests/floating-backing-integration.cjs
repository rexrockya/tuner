const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('docs/index.html', 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
function floatingStub(w) {
  const calls = [];
  let context = null, state = { contextId:null, visible:false, minimized:false, playing:false, loading:false };
  const emit = () => w.dispatchEvent(new w.CustomEvent('tuner:backing-change', { detail:{ ...state } }));
  const player = {
    calls,
    setContext(value) { calls.push(['context', plain(value)]); context=value; state.contextId=value?.id || null; state.playing=false; state.loading=false; emit(); },
    open(value) { calls.push(['open', plain(value)]); if(value) this.setContext(value); state.visible=true; state.minimized=false; emit(); },
    stop() { calls.push(['stop']); state.playing=false; state.loading=false; emit(); },
    close() { this.stop(); state.visible=false; emit(); },
    getState:() => ({ ...state }),
    resetKey() {},
    getContext:() => context,
    setState(value) { Object.assign(state,value); emit(); }
  };
  w.floatingBacking=player;
  return player;
}
(async () => {
  const floatingEntry=html.match(/src="(floating-backing(?:-loader)?\.js\?[^"]+)"/)[1];
  assert.ok(html.indexOf('harmony.js?') < html.indexOf(floatingEntry));
  assert.ok(html.indexOf(floatingEntry) < html.indexOf('lessons.js?'));
  assert.doesNotMatch(fs.readFileSync('docs/lessons.js','utf8'), /createOscillator|triggerBackingBeat|startBackingClock/);
  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,''), { url:'https://rexrockya.github.io/tuner/#lessons', runScripts:'outside-only' });
  const w=dom.window,d=w.document,q=id=>d.getElementById(id);
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;
  Object.defineProperty(w.navigator,'connection',{value:{saveData:true}});
  let paused=true, originalAudio;
  Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get:()=>paused});
  w.HTMLMediaElement.prototype.play=function(){originalAudio=this;paused=false;this.dispatchEvent(new w.Event('play'));return Promise.resolve();};
  w.HTMLMediaElement.prototype.pause=function(){paused=true;this.dispatchEvent(new w.Event('pause'));};
  const F=floatingStub(w);
  for(const file of ['storage.js','harmony.js','lessons.js'])w.eval(fs.readFileSync('docs/'+file,'utf8'));
  const first=w.lessonPlayer.getBackingContext();
  assert.equal(first.id,'lick:eLDBSVZa');assert.equal(first.text,'A7 | D7 | A7');
  q('toggle-backing').click();assert.equal(F.calls.at(-2)[0],'open');assert.equal(F.getContext().id,first.id);
  assert.equal(q('toggle-backing').getAttribute('aria-expanded'),'true');
  F.setState({minimized:true,playing:true});assert.equal(q('toggle-backing').getAttribute('aria-expanded'),'false');
  q('play-lick').click();await tick();assert.equal(F.getState().playing,false);assert.equal(paused,false);
  assert.match(originalAudio.src,/eLDBSVZa\.mp3$/);assert.match(q('play-lick').getAttribute('aria-label'),/原曲 MP3/);
  const originalSource=originalAudio.src;q('toggle-demo').click();assert.equal(originalAudio.muted,true);assert.equal(originalAudio.src,originalSource);assert.equal(q('toggle-demo').textContent,'原曲声音');
  F.setState({loading:true});const callsBefore=F.calls.length;w.lessonPlayer.select(7);
  assert.equal(F.getState().loading,false);assert.equal(F.calls[callsBefore][0],'context');assert.equal(F.calls[callsBefore][1],null);
  assert.equal(w.lessonPlayer.getBackingContext().key,'Am');assert.equal(paused,true);
  w.lessonPlayer.registerSupplemental([{id:'gsTestA',sourceType:'guitarset',name:'Two chords per bar',group:'Jazz',kind:'major',key:'C Major',chord:'Dm7 G7 → Cmaj7',bars:2,meter:'4/4',originalBpm:90,audio:'assets/licks/guitarset/gsTestA.mp3',score:'assets/licks/guitarset/gsTestA.svg'}]);
  w.history.replaceState(null,'','#lick/gsTestA');w.dispatchEvent(new w.Event('hashchange'));
  const exact=w.lessonPlayer.getBackingContext();assert.equal(exact.text,'Dm7 G7 | Cmaj7');assert.equal(exact.bpm,90);
  assert.deepEqual(plain(w.tunerHarmony.parse(exact.text,exact.key).chords.map(c=>[c.name,c.beat,c.beats])),[['Dm7',0,2],['G7',2,2],['Cmaj7',4,4]]);
  F.setState({loading:true});w.history.replaceState(null,'','#lick/Unknown404');w.dispatchEvent(new w.Event('hashchange'));
  assert.equal(w.lessonPlayer.getBackingContext(),null);assert.equal(F.getContext(),null);assert.equal(F.getState().loading,false);assert.equal(q('toggle-backing').disabled,true);
  const openCount=F.calls.filter(c=>c[0]==='open').length;q('toggle-backing').click();assert.equal(F.calls.filter(c=>c[0]==='open').length,openCount);
  w.history.replaceState(null,'','#lick/gsTestA');w.dispatchEvent(new w.Event('hashchange'));
  assert.equal(q('toggle-backing').disabled,false);assert.equal(F.getContext().id,'lick:gsTestA');
  w.lessonPlayer.registerSupplemental([{id:'gsTestWaltz',sourceType:'guitarset',name:'Waltz',group:'Waltz',kind:'minor',key:'A minor',chord:'Am7 → Dm7',bars:2,meter:'3/4',originalBpm:90,audio:'assets/licks/guitarset/gsTestWaltz.mp3',score:'assets/licks/guitarset/gsTestWaltz.svg'}]);
  w.history.replaceState(null,'','#lick/gsTestWaltz');w.dispatchEvent(new w.Event('hashchange'));
  assert.match(w.lessonPlayer.getBackingContext().error,/3\/4/,'unsupported meter is blocked rather than silently converted');
  assert.equal(w.lessonPlayer.getBackingContext().key,'Am');
  w.history.replaceState(null,'','#lick/gsTestA');w.dispatchEvent(new w.Event('hashchange'));
  for(const file of ['practice-arrangement.js','music-genres.js','practice-audio.js','practice.js'])w.eval(fs.readFileSync('docs/'+file,'utf8'));
  const S=w.practiceStudio;S.setMode('create');S.generate(1717);
  const phrase=plain(S.getPhrase()),hash=w.location.hash,mode=S.getMode();
  q('practice-progression').value='2m7 57,1maj7';S.generate(1717);const withSplit=plain(S.getPhrase());
  S.setMode('backing');assert.equal(S.getMode(),mode);assert.equal(q('practice-pane').hidden,false);assert.equal(w.location.hash,hash);assert.deepEqual(plain(S.getPhrase()),withSplit);assert.equal(F.getContext().text,'2m7 57,1maj7');
  assert.equal(F.getContext().id,'create:blues');assert.equal(d.querySelector('[data-lesson-mode="backing"]'),null);assert.ok(d.querySelector('[data-open-backing]'));
  await tick();await tick();q('practice-save').click();assert.ok(S.midiFile().length>30);assert.equal(JSON.parse(w.siteStorage.getItem('tuner-original-licks-v1')).length,1);
  // Floating uses the shared audio engine; resuming creation must claim its
  // own visible timbres before both Play and chart-seek starts.
  const A=w.practiceAudio, own=Object.fromEntries([...d.querySelectorAll('[data-practice-timbre]')].map(node=>[node.dataset.practiceTimbre,node.value]));
  const foreign={...own,bass:own.bass==='bright'?'muted':'bright',keys:own.keys==='soft'?'jazz':'soft'};
  const observed=[],volumes=[];A.volume=(track,value)=>volumes.push([track,value]);A.getContext=()=>({resume:async()=>{}});
  const originalCurrent=S.transport.current;S.transport.current=()=>S.transport.position;
  const originalPlay=S.transport.play;S.transport.play=async()=>{observed.push(Object.fromEntries(Object.keys(A.timbres).map(track=>[track,A.getTimbre(track)])));S.transport.playing=true;};
  A.commitTimbres(foreign);q('practice-play').click();await tick();assert.deepEqual(observed.at(-1),own,'Play restores create timbres');S.stop();
  A.commitTimbres(foreign);d.querySelector('[data-practice-bar="0"]').click();await tick();assert.deepEqual(observed.at(-1),own,'chart starts restore create timbres');S.stop();
  let ready;S.transport.play=()=>new Promise(resolve=>{ready=resolve;});const volumeCount=volumes.length;
  q('practice-play').click();S.stop();ready();await tick();assert.equal(volumes.length,volumeCount,'cancelled create start cannot overwrite another transport volume');S.transport.play=originalPlay;S.transport.current=originalCurrent;
  S.setMode('courses');S.openLesson({id:'jazz-test',title:'Exact course',genre:'jazz',progression:'2m7 57,1maj7',key:'C',bpm:82},'backing');
  assert.equal(S.getMode(),'courses');assert.equal(F.getContext().id,'course:jazz-test');assert.equal(F.getContext().text,'2m7 57,1maj7');assert.equal(F.getContext().bpm,82);
  assert.equal(phrase.notes.length>0,true);dom.window.close();

  const {setup}=require('./qa/harness.cjs');const h=setup({skipApp:true});const P=floatingStub(h.w);
  h.w.eval(fs.readFileSync('docs/storage.js','utf8'));h.w.lessonPlayer.getBackingContext=()=>({id:'lick:route',title:'Route test',text:'C | G',key:'C',bpm:96,genre:'jazz'});
  h.w.eval(fs.readFileSync('docs/app.js','utf8'));
  for(const hash of ['#backing','#lessons/backing']){
    h.w.history.replaceState(null,'',hash);h.w.dispatchEvent(new h.w.Event('hashchange'));
    assert.equal(h.w.location.hash,'#lessons');assert.equal(P.getState().visible,true);assert.equal(P.getContext().id,'lick:route');assert.equal(h.q('#lesson-page').style.display,'block');
    P.setState({playing:true,loading:true,minimized:true});h.click('.brand');assert.equal(P.getState().playing,false);assert.equal(P.getState().loading,false);assert.equal(P.getContext(),null);
  }
  assert.deepEqual(h.errors,[]);h.close();
  console.log('PASS floating integration: full multi-chord bars, minor key, exact source and pending cancellation, separate MP3, unchanged create/course pages, saved phrases/MIDI, legacy routes and navigation cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
