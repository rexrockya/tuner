const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const core={};vm.createContext(core);vm.runInContext(fs.readFileSync('docs/fretboard-core.js','utf8'),core);
const F=core.FretboardCore,plain=value=>JSON.parse(JSON.stringify(value));
const empty={id:'map',meter:'4/4',bars:1,notes:[],chords:[{name:'Cmaj7',start:0,duration:4}]};
for(const notes of [[],[{midi:64,string:1,fret:0,start:0,duration:1}]])assert.equal(F.adaptLesson({...empty,notes}).maxFret,24);
const C=F.adaptLesson(empty).CHORDS.Cmaj7;
const highC=C.shapes.find(s=>s.family==='C'&&s.minFret===12);
assert.deepEqual(plain(highC.frets),[null,15,14,12,12,12]);assert.equal(highC.complete,true);
assert.deepEqual(plain(highC.notes.map(n=>n.midi)),[60,64,67,71,76]);
for(const [family,frets] of [['A',[null,15,17,16,17,15]],['G',[20,19,17,17,17,19]],['E',[20,22,21,21,20,20]],['D',[null,null,22,24,24,24]]])assert.ok(C.shapes.some(s=>s.family===family&&JSON.stringify(s.frets)===JSON.stringify(frets)));
for(const [string,fret] of [[5,15],[6,20]])assert.ok(C.anchors.some(n=>n[0]===string&&n[1]===fret));
for(const [string,fret] of [[1,12],[2,17],[3,21]])assert.ok(F.equivalents(76).some(n=>n.string===string&&n.fret===fret&&n.samePitch));
assert.ok(F.equivalents(76).some(n=>n.string===4&&n.fret===14&&n.octaves===-1));
assert.equal(F.adaptLesson({...empty,notes:[{midi:89,string:1,fret:25,start:0,duration:1}]}).maxFret,36);
const catalog=JSON.parse(fs.readFileSync('docs/assets/licks/fretboard/catalog.json','utf8'));
const flush=()=>new Promise(r=>setImmediate(r));async function settle(){for(let i=0;i<4;i++)await flush();}
(async()=>{
 const dom=new JSDOM(fs.readFileSync('docs/fretboard.html','utf8'),{url:'https://rexrockya.github.io/tuner/fretboard.html?lesson=LcAoWGYi',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id),errors=[];w.addEventListener('error',e=>errors.push(e.error));
 w.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{configurable:true,value:true});};w.HTMLMediaElement.prototype.load=function(){};
 w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join('docs',String(url).split('?')[0]),'utf8'))});
 let player={},stops=0;function emit(changes){player={...player,...changes};w.dispatchEvent(new w.CustomEvent('tuner:backing-change',{detail:player}));}
 w.floatingBacking={setContext(c){emit({contextId:c?.id,playing:false,loading:false,transpose:0,key:c?.key,chord:null});},stop(){stops++;emit({playing:false});},resetKey(){emit({transpose:0});}};
 const click=selector=>{const el=d.querySelector(selector);assert.ok(el,selector);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
 const range=(first,last)=>{assert.match(d.querySelector('#fretboard svg').getAttribute('aria-label'),new RegExp(`${first} 到 ${last} 品`));assert.equal(d.querySelectorAll('.fret-label').length,last-first+1);};
 const shape=label=>{const option=[...$('shape-select').options].find(o=>label.test(o.textContent));assert.ok(option,String(label));$('shape-select').value=option.value;$('shape-select').dispatchEvent(new w.Event('change'));};
 const cell=(string,fret)=>d.querySelector(`#fretboard [data-string="${string}"][data-fret="${fret}"]`);
 const choose=async id=>{$('lesson-select').value=id;$('lesson-select').dispatchEvent(new w.Event('change'));await settle();};
 try{
  for(const file of ['harmony.js','fretboard-core.js','fretboard.js'])w.eval(fs.readFileSync('docs/'+file,'utf8'));await settle();
  range(0,15);assert.equal(d.querySelector('[data-fret-range="focus"]').hidden,true);
  click('[data-segment="2"]');assert.equal($('board-title').textContent,'Cmaj7');
  const score=$('score-image').src,audio=$('original-audio').src;
  shape(/^C 形.*12–15/);range(12,24);
  assert.equal(d.querySelectorAll('[data-shape="true"]').length,5);
  for(const n of highC.notes)assert.equal(cell(n.string,n.fret).dataset.shape,'true');
  assert.match($('shape-note').textContent,/x–15–14–12–12–12/);
  assert.equal(d.querySelector('[data-fret-range="high"]').getAttribute('aria-pressed'),'true');
  assert.equal($('current-note').textContent,'选音');assert.equal($('score-image').src,score);assert.equal($('original-audio').src,audio);
  for(const control of ['[data-fret-range="low"]','[data-fret-range="high"]','#range-toggle','[data-fret-range="low"]']){
   click(control);const svg=d.querySelector('#fretboard svg'),width=+svg.getAttribute('viewBox').split(' ')[2];
   assert.equal(parseFloat(svg.style.width),width);assert.equal(parseFloat(svg.style.minWidth),width);assert.equal(svg.style.maxWidth,'none');
   assert.ok(+d.querySelector('.hitbox').getAttribute('width')>=59,'frets retain wide targets');
   assert.equal(d.querySelector('.fret-note text').getAttribute('font-size'),'12');
  }
  shape(/^D 形.*10–12/);range(0,15);assert.equal(cell(4,10).dataset.shape,'true');
  shape(/^D 形.*22–24/);range(12,24);assert.equal(cell(1,24).dataset.shape,'true');
  cell(1,24).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.ok([...d.querySelectorAll('#equivalent-buttons [data-location]')].every(el=>+el.dataset.location.split(',')[1]<=24),'No off-neck octave targets');
  shape(/^C 形.*12–15/);cell(1,12).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal($('current-note').textContent,'E5');assert.equal($('current-degree').textContent,'3');assert.equal(cell(1,12).dataset.active,'true');
  assert.ok(cell(2,17).querySelector('[data-equivalent]'));assert.ok(cell(3,21).querySelector('[data-equivalent]'));
  assert.match(d.querySelector('#equivalent-buttons button[data-location="4,14"]').textContent,/低 1 个八度/);
  click('#equivalent-buttons button[data-location="4,14"]');range(12,24);assert.equal($('current-note').textContent,'E4');
  click('#root-anchors button[data-location="6,20"]');range(12,24);assert.equal($('current-note').textContent,'C4');assert.equal(cell(6,20).dataset.active,'true');
  assert.equal(d.querySelector('[data-order]'),null);
  click('#follow-backing');const beforeStops=stops;
  for(const [index,name] of [[0,'Dm7'],[1,'G7'],[2,'Cmaj7']]){emit({playing:true,chord:{name,index,beat:index*4}});range(12,24);assert.equal($('board-title').textContent,name);assert.ok(d.querySelector('[data-shape="true"]'));for(const n of d.querySelectorAll('[data-shape="true"]'))assert.equal(n.dataset.role,'skeleton');}
  assert.equal(stops,beforeStops,'following high-register chords does not stop backing');
  emit({playing:false,transpose:2,key:'D'});range(12,24);assert.equal($('board-title').textContent,'Dmaj7');assert.equal(cell(5,17).querySelector('[data-root]').dataset.root,'true');
  emit({transpose:0,key:'C'});range(12,24);assert.equal($('board-title').textContent,'Cmaj7');assert.equal($('score-image').src,score);assert.equal($('original-audio').src,audio);

  await choose('Xbv40aTf');const sourceRoute=$('full-sequence').textContent;assert.equal($('current-note').textContent,'E3');
  emit({transpose:2,key:'D'});range(0,15);assert.equal(d.querySelector('[data-fret-range="low"]').getAttribute('aria-pressed'),'true');
  emit({transpose:0,key:'C'});assert.equal(d.querySelector('[data-fret-range="focus"]').getAttribute('aria-pressed'),'true');
  shape(/^C 形.*12–15/);range(12,24);assert.equal($('current-note').textContent,'E3');assert.equal($('note-counter').textContent,'1 / 28');assert.equal($('current-position').textContent,'5 弦 7 品');
  emit({transpose:2,key:'D'});range(12,24);assert.equal(d.querySelector('[data-order]'),null);
  emit({transpose:0,key:'C'});range(12,24);assert.equal($('current-note').textContent,'E3');assert.equal($('full-sequence').textContent,sourceRoute);
  click('[data-fret-range="focus"]');assert.equal(cell(5,7).dataset.active,'true');

  // A high-note fixture exercises the existing source-audio clock without
  // changing any checked-in source annotation or pretending it is a new TAB.
  const item=catalog.lessons.find(l=>l.supported&&l.sourceType==='guitarset');
  const source=JSON.parse(fs.readFileSync(path.join('docs',item.data),'utf8'));
  const highNote={...source.notes[0],string:1,fret:17,midi:81,name:'A5',timeSeconds:.1,durationSeconds:.25,start:.1*source.originalBpm/60,duration:.25*source.originalBpm/60};
  const realFetch=w.fetch;w.fetch=async url=>String(url).split('?')[0]===item.data?{ok:true,json:async()=>({...source,notes:[highNote]})}:realFetch(url);
  await choose(item.id);click('[data-fret-range="low"]');
  Object.defineProperty($('original-audio'),'paused',{configurable:true,value:false});$('original-audio').currentTime=.11;$('original-audio').dispatchEvent(new w.Event('timeupdate'));
  range(12,24);assert.equal(cell(1,17).dataset.active,'true');assert.equal($('current-note').textContent,'A5');
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
 console.log('PASS fretboard range: 24-fret model, complete Cmaj7 octave shapes, high roots/unisons/bridges, labeled auto-reveal, readable ranges, keyboard notes, backing follow/transposition, unchanged TAB and high source-audio follow');
})().catch(e=>{console.error(e);process.exitCode=1;});
