const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const candidate=process.argv[2]||'docs/harmony.js',w={};
vm.runInNewContext(fs.readFileSync(candidate,'utf8'),{window:w});
const H=w.tunerHarmony,styles=['mixed','call','motif','blues','arpeggio','syncopated','space'];
const fixedLevels=['easy','standard','advanced','challenge'];
const opens=[64,59,55,50,45,40],close=(a,b)=>Math.abs(a-b)<1e-7;
const fingerprints=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/practice-density-legacy-fingerprints.json'),'utf8'));
// Freeze original fixed-level behavior: 1,344 complete output comparisons,
// including rhythms, pitches, fingering, articulation, metadata and RNG order.
const legacyCharts=['1maj7,57,4sus2,6aug,37,2,7dim,1','1 4,57 6m,2m 57,1maj7','1 b7 #4 6m,2m 57 7dim 1',Array(16).fill('57').join(',')];
for(const style of styles)for(const intensity of fixedLevels){
 const hash=crypto.createHash('sha256');
 for(const seed of [0,1,17,41])for(const key of ['C','F#','Bb'])for(const text of legacyCharts)
  hash.update(JSON.stringify(H.generate(H.parse(text,key),seed,'shuffle',{style,intensity})));
 assert.equal(hash.digest('hex'),fingerprints[style+':'+intensity],`${style}/${intensity}: original fixed-level output must remain exact`);
}
assert.ok(H.phraseIntensities.auto,'auto is a supported density');
const charts=['1maj7','2m7,57','4,5,3m,6m,2m,57,1maj7',Array.from({length:16},(_,i)=>['1maj7','6m7','2m7','57'][i%4]).join(','),Array.from({length:7},(_,i)=>i%2?'2m 57 7dim 1':'1 b7 #4 6m').join(',')];
let cases=0,breaths=0,offbeats=0,slides=0;
for(const style of styles)for(let seed=0;seed<16;seed++)for(const key of ['C','F#','Bb'])for(const text of charts){
 const parsed=H.parse(text,key);assert.equal(parsed.error,'');
 const phrase=H.generate(parsed,seed,'shuffle',{style,intensity:'auto'});
 const context=`${style} seed ${seed} key ${key} chart ${text}`;
 assert.equal(phrase.intensity,'auto',context);assert.equal(phrase.style,style,context);assert.equal(phrase.bars,parsed.bars.length);
 assert.equal(JSON.stringify(phrase),JSON.stringify(H.generate(parsed,seed,'shuffle',{style,intensity:'auto'})),context+': deterministic seed');
 assert.ok(phrase.notes.length>0&&phrase.notes.length<=256,context+': bounded phrase');
 assert.ok(Array.isArray(phrase.densityPlan)&&phrase.densityPlan.length===phrase.bars,context+': one plan entry per bar');
 phrase.densityPlan.forEach((entry,bar)=>{
  assert.equal(entry.bar,bar);assert.ok(fixedLevels.includes(entry.level),context+': known density level');
  assert.ok(typeof entry.role==='string'&&entry.role.length>0,context+': musical phrase role');
  assert.equal(entry.count,phrase.notes.filter(n=>n.bar===bar).length,context+': planned count matches actual audible notes');
  assert.ok(styles.includes(entry.style),context+': style metadata');
  if(style!=='mixed')assert.equal(entry.style,style,context+': fixed vocabulary retained');
 });
 phrase.notes.forEach((note,i)=>{
  const next=phrase.notes[i+1],prev=phrase.notes[i-1],chord=parsed.chords.find(c=>note.beat>=c.beat-1e-8&&note.beat<c.beat+c.beats-1e-8);
  assert.ok(chord,context+': note belongs to a chord');assert.equal(note.bar,chord.bar);
  for(const property of ['beat','duration','notationDuration','midi','velocity','string','fret'])assert.ok(Number.isFinite(note[property]),context+': finite '+property);
  assert.ok(note.beat>=0&&note.beat<phrase.bars*4);assert.ok(close(note.beat*4,Math.round(note.beat*4)),context+': sixteenth-note grid');
  assert.ok(Number.isInteger(note.midi)&&note.midi>=48&&note.midi<=84,context+': melodic range');
  assert.ok(Number.isInteger(note.string)&&note.string>=0&&note.string<6&&Number.isInteger(note.fret)&&note.fret>=0&&note.fret<=17,context+': playable TAB');
  assert.equal(opens[note.string]+note.fret,note.midi,context+': TAB matches MIDI');
  assert.ok(note.velocity>0&&note.velocity<=1);assert.ok(note.duration>0&&note.duration<=note.notationDuration+1e-8);
  assert.ok(note.notationDuration>=.25-1e-8&&note.beat+note.notationDuration<=chord.beat+chord.beats+1e-8,context+': no note crosses harmonic change');
  if(next){assert.ok(next.beat-note.beat>=.25-1e-8,context+': note rate bounded');assert.ok(note.beat+note.duration<=next.beat+1e-8,context+': single melodic voice');if(next.beat-note.beat-note.duration>=.2)breaths++;}
  assert.ok(['picked','slide','vibrato'].includes(note.articulation));
  if(note.articulation==='slide'){assert.ok(prev&&prev.string===note.string&&Math.abs(prev.midi-note.midi)>0&&Math.abs(prev.midi-note.midi)<=2,context+': slides are playable');slides++;}
  if(note.beat%1!==0)offbeats++;
  if(style==='arpeggio')assert.ok(chord.intervals.some(n=>(n+chord.root)%12===note.midi%12),context+': arpeggio remains chord tones');
 });
 const tail=phrase.notes.at(-1),lastChord=parsed.chords.at(-1);
 assert.equal(tail.midi%12,lastChord.root,context+': root cadence');assert.ok(tail.notationDuration>=.5&&tail.duration>=.4,context+': audible held ending');
 assert.ok(close(tail.beat+tail.notationDuration,lastChord.beat+lastChord.beats),context+': cadence reaches phrase boundary');
 if(phrase.bars>=2&&parsed.chords.length===phrase.bars)assert.ok(new Set(phrase.densityPlan.map(x=>x.count)).size>=2,context+': automatic density changes actual note count');
 cases++;
}
assert.ok(breaths>100,'automatic phrases contain audible breathing gaps');assert.ok(offbeats>100,'automatic phrases retain offbeat rhythm');
// Expose musical intent through actual notes instead of accepting metadata labels.
const same=H.parse(Array(16).fill('1maj7').join(','),'C'),summary={};
for(const style of styles){
 let count=0,weak=0,totalDuration=0;const seen=new Set();
 for(let seed=0;seed<32;seed++){
  const p=H.generate(same,seed,'shuffle',{style,intensity:'auto'});count+=p.notes.length;weak+=p.notes.filter(n=>n.beat%1!==0).length;totalDuration+=p.notes.reduce((sum,n)=>sum+n.duration,0);
  seen.add(p.notes.map(n=>n.beat+':'+n.midi+':'+n.duration).join('|'));
  const counts=p.densityPlan.map(x=>x.count);
  if(style==='call'){
   let direction;
   for(let bar=0;bar<14;bar+=2){
    assert.notEqual(counts[bar],counts[bar+1],'call and answer have complementary density');
    const sign=Math.sign(counts[bar+1]-counts[bar]);if(direction===undefined)direction=sign;else assert.equal(sign,direction,'call/answer direction stays coherent across the phrase');
   }
  }
  if(style==='motif'){
   assert.ok(counts[0]<Math.max(...counts.slice(1,-1)),'motif starts simple and develops');
   assert.ok(counts.at(-1)<=Math.max(...counts.slice(1,-1)),'motif resolves after development');
   // On unchanged harmony at least one later bar must audibly restate the opening
   // two-note rhythm/pitch cell while adding or changing the remaining material.
   const first=p.notes.filter(n=>n.bar===0).slice(0,2);
   if(first.length===2){
    const repeated=Array.from({length:Math.min(4,p.bars)-1},(_,i)=>i+1).some(bar=>{
     const cell=p.notes.filter(n=>n.bar===bar).slice(0,2);
     return cell.length===2&&close(cell[1].beat-cell[0].beat,first[1].beat-first[0].beat)&&cell[0].midi%12===first[0].midi%12&&cell[1].midi%12===first[1].midi%12;
    });
    assert.ok(repeated,'motif retains a recognizable two-note opening cell during its first development unit');
   }
  }
 }
 assert.ok(seen.size>=28,style+': distinct seeds yield distinct compositions');summary[style]={count,weakRatio:weak/count,meanDuration:totalDuration/count};
}
assert.ok(summary.space.count<summary.arpeggio.count*.7,'space stays substantially sparser than arpeggio');
assert.ok(summary.space.meanDuration>summary.arpeggio.meanDuration,'space retains longer held notes');
assert.ok(summary.syncopated.weakRatio>summary.space.weakRatio+.1,'syncopation keeps a distinct emphasis on offbeat onsets');
console.log(`PASS auto density: ${cases} deterministic cases across 7 styles, 3 keys, 1/2/7/16 bars and fast chord changes; legal notation/TAB, breathing, cadence, contrast, motif/call structure, style identity and 1,344 unchanged fixed-level outputs`);
console.log(JSON.stringify(summary));
