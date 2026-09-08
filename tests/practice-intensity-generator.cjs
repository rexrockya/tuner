const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const candidate=process.argv[2]||'docs/harmony.js', w={};vm.runInNewContext(fs.readFileSync(candidate,'utf8'),{window:w});const H=w.tunerHarmony;
const openings=[64,59,55,50,45,40],stats={},styles=Object.keys(H.phraseStyles),levels=Object.keys(H.phraseIntensities);
const charts=['1maj7,57,4sus2,6aug,37,2,7dim,1','1 4,57 6m,2m 57,1maj7','1 b7 #4 6m,2m 57 7dim 1',Array(32).fill('57').join(',')];
let cases=0,slides=0,held=0;
for(const style of styles){stats[style]={};for(const intensity of levels){stats[style][intensity]=0;for(let seed=0;seed<24;seed++)for(const key of ['C','F#','Bb'])for(const text of charts){
 const parsed=H.parse(text,key),phrase=H.generate(parsed,seed,'shuffle',{style,intensity});assert.equal(parsed.error,'');assert.ok(phrase.notes.length>0&&phrase.notes.length<=256);assert.equal(phrase.bars,parsed.bars.length);assert.equal(phrase.notes.at(-1).midi%12,parsed.chords.at(-1).root,JSON.stringify({style,intensity,seed,key,text,tail:phrase.notes.slice(-3)}));
 assert.equal(JSON.stringify(phrase),JSON.stringify(H.generate(parsed,seed,'shuffle',{style,intensity})),'same seed reproducible');
 if(text===charts[0])stats[style][intensity]+=phrase.notes.length;
 phrase.notes.forEach((note,i)=>{const prev=phrase.notes[i-1],next=phrase.notes[i+1],chord=parsed.chords.find(c=>note.beat>=c.beat&&note.beat<c.beat+c.beats);assert.ok(chord);assert.equal(note.bar,chord.bar);assert.equal(openings[note.string]+note.fret,note.midi);assert.ok(note.fret>=0&&note.fret<=17);assert.ok(note.duration>0&&note.duration<=note.notationDuration);assert.ok(note.beat+note.notationDuration<=chord.beat+chord.beats+1e-8);if(next)assert.ok(note.beat+note.duration<=next.beat+1e-8);assert.ok(['picked','slide','vibrato'].includes(note.articulation));
  if(intensity!=='standard'){assert.equal(note.beat*4,Math.round(note.beat*4));assert.ok(note.notationDuration>=.25);if(prev)assert.ok(note.beat-prev.beat>=.25);if(note.articulation==='slide'){assert.equal(note.string,prev.string);assert.ok(Math.abs(note.midi-prev.midi)<=2);assert.ok(Math.abs(note.midi-prev.midi)>0);slides++;}if(note.articulation==='vibrato')held++;}
  if(intensity==='easy'){assert.equal(note.articulation,'picked');assert.equal(note.beat%1,0);assert.ok(note.fret>=4&&note.fret<=8);if(prev){assert.ok(Math.abs(note.midi-prev.midi)<=7);assert.ok(Math.abs(note.string-prev.string)<=2);}}
 });cases++;
}}}
for(const style of styles){const row=stats[style];assert.ok(row.easy<row.standard&&row.standard<row.advanced&&row.advanced<row.challenge,`${style}: density ladder ${JSON.stringify(row)}`);}
assert.ok(slides>100&&held>100);
console.log(`PASS intensity generation: ${cases} deterministic cases; 7 styles, 4 intensity levels, 3 keys, 4 chart rhythms, TAB/fingering/notation bounds, actual articulation, 256 note budget`);
console.log(JSON.stringify(stats));
