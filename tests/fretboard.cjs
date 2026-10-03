const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('docs/fretboard-model.js','utf8'),ctx);const M=ctx.FretboardLesson;
assert.equal(M.NOTES.length,28);assert.equal(M.SEGMENTS.length,8);
const expectedPitches=[52,55,59,62,61,64,67,70,69,65,62,60,59,55,56,58,55,64,62,60,61,58,55,56,57,53,50,53];
assert.deepEqual(Array.from(M.NOTES,n=>n.midi),expectedPitches);
assert.deepEqual(Array.from(M.NOTES,n=>n.duration),[...Array(24).fill(.5),1,.5,.5,2]);
const expectedDegrees=['3','5','7','9','3','5','♭7','♭9','5','♭3','1','♭7','3','1','♭9','♯9','5','3','9','1','3','♭9','♭7','趋近','5','♭3','1','♭7'];
assert.deepEqual(Array.from(M.NOTES,n=>M.role(M.CHORDS[M.SEGMENTS[n.segment].chord],n.midi,n.kind).degree),expectedDegrees);
for(const s of M.SEGMENTS){assert.equal(s.notes.reduce((v,n)=>v+n.duration,0),2);for(const n of s.notes){assert.equal(n.midi,M.midi(n.string,n.fret));}}
for(const c of Object.values(M.CHORDS)){
 for(const [string,fret]of c.anchors)assert.equal(M.mod(M.midi(string,fret)),c.rootPc);
 for(const shape of c.shapes)for(let i=0;i<6;i++)if(shape.frets[i]!==null)assert.equal(M.role(c,M.midi(6-i,shape.frets[i])).kind,'skeleton',`${c.name} ${shape.name}`);
}
assert.equal(M.midi(2,5)-M.midi(5,7),12);assert.equal(M.midi(1,3)-M.midi(4,5),12);
assert.equal(M.midi(5,3),M.midi(6,8));assert.equal(M.midi(5,0),M.midi(6,5));assert.equal(M.midi(5,5),M.midi(6,10));assert.equal(M.midi(5,10)-M.midi(6,3),12);
for(const n of M.NOTES)for(const v of M.equivalents(n.midi))assert.equal(M.mod(v.midi),M.mod(n.midi));
const{JSDOM}=require('jsdom');const h=fs.readFileSync('docs/fretboard.html','utf8');const dom=new JSDOM(h,{runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,d=w.document;
w.eval(fs.readFileSync('docs/fretboard-model.js','utf8'));w.eval(fs.readFileSync('docs/fretboard.js','utf8'));
const click=selector=>d.querySelector(selector).click();
assert.equal(d.querySelector('#current-note').textContent,'E3');assert.equal(d.querySelectorAll('.chord-segment').length,8);
for(let i=0;i<28;i++){click(`#full-sequence [data-note="${i}"]`);assert.equal(d.querySelector('#current-note').textContent,M.NOTES[i].name);assert.equal(d.querySelector('#current-degree').textContent,expectedDegrees[i]);}
click('[data-segment="1"]');assert.equal(d.querySelector('#board-title').textContent,'A7');assert.equal(d.querySelector('#current-note').textContent,'C♯4');
click('#root-anchors [data-location="5,0"]');assert.equal(d.querySelector('#current-note').textContent,'A2');assert.equal(d.querySelector('#range-toggle').getAttribute('aria-pressed'),'true');assert.ok(!d.querySelector('#return-to-note').hidden);
click('#return-to-note');assert.equal(d.querySelector('#current-note').textContent,'C♯4');
const select=d.querySelector('#shape-select');select.value='-1';select.dispatchEvent(new w.Event('change'));assert.match(d.querySelector('#shape-note').textContent,/已隐藏/);
for(const id of ['show-skeleton','show-equivalents','show-path'])click('#'+id);
assert.equal(d.querySelectorAll('[data-equivalent]').length,0);assert.equal(d.querySelectorAll('[data-order]').length,0);
click('[data-segment="0"]');assert.ok(d.querySelector('#previous-note').disabled);click('#next-note');assert.equal(d.querySelector('#current-note').textContent,'G3');
click('[data-segment="7"]');assert.ok(d.querySelector('#next-note').disabled);
const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
for(const el of d.querySelectorAll('[aria-labelledby],label[for]'))assert.ok(d.getElementById(el.getAttribute('aria-labelledby')||el.htmlFor));
dom.window.close();console.log('PASS fretboard: 28 pitches + original TAB, durations, 8 harmonies, all degrees, CAGED voicings, roots, octaves, navigation, exploration, layers and labels');

(async()=>{
 const dom=new JSDOM(h,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const pending=new Map(),played=[];let timerId=0,resumeResolve;
 w.setTimeout=(fn,ms)=>{const id=++timerId;pending.set(id,{fn,ms});return id;};w.clearTimeout=id=>pending.delete(id);
 class AudioContext {constructor(){this.currentTime=0;this.destination={};}resume(){return new Promise(r=>resumeResolve=r);}createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){},start(){played.push(o.frequency.value);},stop(){}};return o;}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}}
 w.AudioContext=AudioContext;w.eval(fs.readFileSync('docs/fretboard-model.js','utf8'));w.eval(fs.readFileSync('docs/fretboard.js','utf8'));
 const click=s=>d.querySelector(s).click(),flush=()=>new Promise(r=>setImmediate(r));
 click('#play');click('#play');resumeResolve();await flush();assert.equal(played.length,0,'cancel pending resume');assert.equal(d.querySelector('#play').getAttribute('aria-pressed'),'false');
 click('#play');resumeResolve();await flush();assert.equal(played.length,1);assert.ok(Math.abs(played[0]-164.813778)<.001);assert.equal(pending.size,1);
 click('#next-segment');assert.equal(pending.size,0,'navigation cancels timer');assert.equal(d.querySelector('#play').getAttribute('aria-pressed'),'false');
 click('#loop');click('#play');resumeResolve();await flush();
 for(let i=0;i<4;i++){const[id,task]=[...pending][0];pending.delete(id);task.fn();}
 assert.equal(d.querySelector('#current-note').textContent,'C♯4','four eighths loop to segment start');
 click('#loop');assert.equal(pending.size,0,'changing loop stops cleanly');
 click('[data-segment="7"]');click('#play');resumeResolve();await flush();assert.equal([...pending.values()][0].ms,60/72*2000,'final half note lasts two beats');
 const[id,task]=[...pending][0];pending.delete(id);task.fn();assert.equal(d.querySelector('#play').getAttribute('aria-pressed'),'false','end stops');assert.equal(pending.size,0);
 click('[data-segment="5"]');const el=d.querySelector('#fretboard [data-string="4"][data-fret="6"]');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(d.querySelector('#current-note').textContent,'G♯3');assert.equal(d.querySelector('#current-degree').textContent,'趋近','clicking source note preserves approach role');
 dom.window.close();console.log('PASS fretboard playback: pending-start cancellation, repeated play/stop, navigation stop, segment loop, exact rhythm, final stop, source-note spelling');
})().catch(e=>{console.error(e);process.exitCode=1;});
