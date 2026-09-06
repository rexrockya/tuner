const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {JSDOM}=require('jsdom');
const original=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const html=original.replace(/<script\b(?![^>]*id="score-catalog")[^>]*>[\s\S]*?<\/script>/g,'');
const dom=new JSDOM(html,{url:'https://rexrockya.github.io/tuner/',runScripts:'outside-only'});
const w=dom.window,doc=w.document,timers=new Map(),clicks=[],notes=[],flashes=new Map();
const instrumentOptions=[],gains=[];
let clock=0,seq=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
w.AudioContext=class {
  state='running'; get currentTime(){return clock;} destination={}; async resume(){}
  createOscillator(){return {frequency:param(),type:'sine',connect(gain){return gain;},disconnect(){},
    start(time){clicks.push({time,frequency:this.frequency.value,node:this});},stop(time){if(time===undefined)this.cancelled=true;}};}
  createGain(){const node={gain:param(),connect(destination){this.destination=destination;return destination;},disconnect(){}};gains.push(node);return node;}
};
w.setInterval=fn=>{const id=++seq;timers.set(id,fn);return id;};
w.clearInterval=id=>timers.delete(id);
w.setTimeout=(fn,delay)=>{const id=++seq;flashes.set(id,{fn,time:clock+delay/1000});return id;};
w.clearTimeout=id=>flashes.delete(id);
w.HTMLElement.prototype.scrollTo=()=>{};
w.sampleTestLibrary={SampleLoader:()=>({load:async()=>new Map()}),
  Soundfont:(_ctx,options)=>(instrumentOptions.push(options),{ready:Promise.resolve(),start:event=>notes.push(event),stop(){},dispose(){}}),
  SplendidGrandPiano:(_ctx,options)=>(instrumentOptions.push(options),{ready:Promise.resolve(),start:event=>notes.push(event),stop(){},dispose(){}})};
w.opensheetmusicdisplay={OpenSheetMusicDisplay:class {async load(){}render(){}}};
w.fetch=()=>Promise.reject(new Error('No network expected'));
Object.defineProperty(doc,'currentScript',{value:{src:'https://rexrockya.github.io/tuner/scores.js'}});
doc.head.append=script=>{const filename=new URL(script.src).pathname.split('/').pop();
  queueMicrotask(()=>{w.eval(fs.readFileSync(path.join(root,'docs/assets/scores',filename),'utf8'));script.onload();});};
for(const file of ['score-audio.js','score-beats.js','metronome.js','scores.js','score-reader.js']) {
  w.eval(fs.readFileSync(path.join(root,'docs',file),'utf8').replace('import(LOCAL_SMPLR_URL)','Promise.resolve(window.sampleTestLibrary)'));
}
function tick(time){clock=time;for(const fn of [...timers.values()])fn();for(const [id,item] of [...flashes]){if(item.time<=clock){flashes.delete(id);item.fn();}}}
function advance(seconds){const end=clock+seconds;while(clock<end){tick(Math.min(end,clock+.017));}}
function close(actual,expected,tolerance=1e-7){assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);}
function spacing(events,period){for(let i=1;i<events.length;i++)close(events[i].time-events[i-1].time,period);}
(async()=>{
  await w.scorePlayer.showLibrary();
  await Promise.resolve();await Promise.resolve();
  const folder=doc.querySelector('#score-violin-grid .score-folder');
  assert.ok(folder);assert.equal(folder.open,false);
  assert.match(folder.querySelector('summary').textContent,/小提琴四级到六级/);
  assert.equal(folder.querySelectorAll('.score-card').length,3);
  assert.match(folder.querySelector('.score-upload-batch summary').textContent,/2026-09-06/);
  for(let page=1;page<=3;page++){
    const id=`violin-upload-2026-09-06-${page}`;
    await w.scorePlayer.open(id);
    assert.equal(doc.querySelector('#sheet-instrument').value,'violin');
    assert.match(doc.querySelector('#sheet-timing-warning').textContent,/待校对/);
    assert.equal(doc.querySelector('#sheet-loop').disabled,false);
    const start=w.scorePlayer.getPosition();
    if(page===1)close(start,24*60/108);
    clicks.length=0;notes.length=0;
    await w.scorePlayer.play();advance(page===1?66:5);
    assert.ok(notes.length>0,'uploaded score produces note events');
    if(page===1){
      const full=JSON.parse(fs.readFileSync(path.join(root,`docs/assets/scores/${id}.json`),'utf8'));
      assert.equal(notes.length,full.notes.length,'all notes through the final source line are scheduled');
      close(w.scorePlayer.getPosition(),full.duration);
      assert.equal(timers.size,0,'full-page playback ends cleanly');
    }
    spacing(clicks,60/[108,96,60][page-1]);
    clicks.forEach((event,i)=>assert.equal(event.frequency,i%(page===3?3:4)===0?1600:page!==3&&i%4===2?1200:850));
    w.scorePlayer.pause();
  }
  clicks.length=0;notes.length=0;
  console.log('PASS: date folder, three uploaded scores, draft notices, violin events, correct 3/4 and 4/4 beat clocks, opening rests skipped');
  for(const score of JSON.parse(fs.readFileSync(path.join(root,'docs/assets/scores/catalog.json'),'utf8'))){
    await w.scorePlayer.open(score.id);
    assert.equal(doc.querySelector('#sheet-loop').disabled,score.id.startsWith('seitz'));
  }
  await w.scorePlayer.open('seitz-student-concerto-1-mvt1');
  assert.equal(doc.querySelector('#sheet-timing-warning').hidden,false);
  assert.equal(w.metronome.getBpm(),90);
  await w.scorePlayer.play();
  assert.equal(timers.size,1);
  const sampleBus=instrumentOptions.at(-1).destination;
  const masterBuses=gains.filter(node=>node!==sampleBus && node.destination===sampleBus.destination);
  const metroBus=masterBuses.at(-1);
  const beforeVolume=notes.length,positionBeforeVolume=w.scorePlayer.getPosition();
  w.scorePlayer.setVolume(40);close(sampleBus.gain.value,.16);
  w.metronome.setVolume(25);close(metroBus.gain.value,.0625);
  assert.equal(doc.querySelector('#sheet-click-volume').value,'25');
  assert.equal(doc.querySelector('#metro-volume').value,'25');
  close(w.scorePlayer.getPosition(),positionBeforeVolume);
  assert.equal(notes.length,beforeVolume,'volume changes do not retrigger notes');
  w.scorePlayer.setVolume(0);assert.equal(sampleBus.gain.value,0);
  assert.equal(w.metronome.getVolume(),25,'instrument mute leaves metronome volume alone');
  w.scorePlayer.setVolume(100);w.metronome.setVolume(100);
  const anchor=clicks[0].time;
  advance(180);
  assert.ok(clicks.length>=270);
  spacing(clicks,2/3);
  clicks.forEach((event,i)=>assert.equal(event.frequency,i%4===0?1600:i%4===2?1200:850));
  const source=JSON.parse(fs.readFileSync(path.join(root,'docs/assets/scores/seitz-student-concerto-1-mvt1.json'),'utf8'));
  notes.forEach((note,i)=>{close(note.time,anchor+source.notes[i].time);close(note.duration,source.notes[i].duration);});
  console.log('PASS: 3 minutes of Seitz: exact 90 BPM, repeating 4-beat accents, notes on the same clock');
  // A long main-thread stall skips old clicks instead of catching up in a burst.
  tick(clock+2.17);const afterStall=clicks.length;advance(2);
  for(const event of clicks.slice(afterStall))close((event.time-anchor)/(2/3),Math.round((event.time-anchor)/(2/3)));
  w.scorePlayer.pause();assert.equal(timers.size,0);
  await w.scorePlayer.open('fur-elise');
  w.scorePlayer.seekMeasure(2);doc.querySelector('#sheet-loop').click();
  clicks.length=0;notes.length=0;
  await w.scorePlayer.play();advance(60);
  assert.ok(clicks.length>140);
  spacing(clicks,60/72/2);
  clicks.forEach((event,i)=>assert.equal(event.frequency,i%3===0?1600:850));
  assert.ok(notes.length>250);
  console.log('PASS: 48 piano loops have no cumulative drift or boundary double-clicks');
  w.scorePlayer.seekMeasure(2);const loopAnchor=clock;
  advance(1.17);doc.querySelector('#sheet-metronome').click();
  advance(.01);const beforeEnable=clicks.length;doc.querySelector('#sheet-metronome').click();
  assert.ok(clicks.length>beforeEnable,'unmute restores the queued downbeat across a loop boundary');
  close(clicks.at(-1).time,loopAnchor+1.25,.00001);
  advance(1.1);
  const saved=w.scorePlayer.getPosition();w.metronome.setBpm(96);
  close(w.scorePlayer.getPosition(),saved);assert.equal(w.metronome.getBpm(),96);
  clicks.length=0;advance(5);spacing(clicks,60/96/2);
  doc.querySelector('#sheet-metronome').click();const count=clicks.length;advance(1);assert.equal(clicks.length,count);
  doc.querySelector('#sheet-metronome').click();advance(1);assert.ok(clicks.length>count);
  doc.querySelector('#sheet-loop').click();const beforeExit=notes.length;advance(2);
  assert.ok(notes.length>beforeExit,'exiting a loop resumes linear playback');
  w.scorePlayer.pause();await w.scorePlayer.play();advance(1);assert.equal(timers.size,1);
  w.scorePlayer.showLibrary();assert.equal(timers.size,0);
  w.metronome.setTimeSignature([6,8]);w.metronome.setBpm(120);
  clicks.length=0;await w.metronome.start();advance(10);spacing(clicks,.25);
  clicks.forEach((event,i)=>assert.equal(event.frequency,i%6===0?1600:i%6===3?1200:850));
  w.metronome.stop();assert.equal(timers.size,0);
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
  const main=[...original.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(match=>!match[1].includes('src=')&&!match[1].includes('application/json'))[2];
  w.eval(main);await w.scorePlayer.open('fur-elise');await w.scorePlayer.play();
  doc.querySelector('.tab[data-page="metro"]').click();assert.equal(w.metronome.isRunning(),true);
  doc.querySelector('.tab[data-page="sheet"]').click();await Promise.resolve();await Promise.resolve();assert.equal(w.metronome.isRunning(),true);
  doc.querySelector('.tab[data-page="tuner"]').click();assert.equal(w.metronome.isRunning(),false);
  console.log('PASS: BPM control from metronome, mute, pause/resume, 6/8 standalone, navigation');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>dom.window.close());
