const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const w = {}, plain = value => JSON.parse(JSON.stringify(value));
for (const file of ['harmony.js','practice-audio.js']) vm.runInNewContext(fs.readFileSync('docs/'+file,'utf8'),{window:w});
const H=w.tunerHarmony,A=w.practiceAudio;
const chart=H.parse('I7 | IV7 | I7 | V7','A');
const fingerprint = notes => notes.map(n=>`${n.beat}:${n.midi}:${n.duration.toFixed(2)}`).join('|');
for (const style of Object.keys(H.phraseStyles)) {
 const seen=new Set(),rhythms=new Set();
 for(let seed=0;seed<80;seed++) {
  const phrase=H.generate(chart,seed,'blues',{style});
  assert.deepEqual(plain(phrase),plain(H.generate(chart,seed,'blues',{style})),`${style} must be reproducible`);
  seen.add(fingerprint(phrase.notes));rhythms.add(phrase.notes.map(n=>n.beat).join(','));
  for(let i=0;i<phrase.notes.length;i++) {
   const note=phrase.notes[i],next=phrase.notes[i+1];
   assert.ok(note.midi>=55&&note.midi<=79);assert.equal([64,59,55,50,45,40][note.string]+note.fret,note.midi);
   assert.ok(note.duration>0&&note.beat+note.duration<=phrase.bars*4+1e-7);
   if(next)assert.ok(note.beat+note.duration<=next.beat+1e-7,'melody remains monophonic');
  }
 }
 assert.ok(seen.size>=70,`${style}: varied phrases ${seen.size}/80`);assert.ok(rhythms.size>=3,`${style}: different rhythms`);
}
const stylePrints=new Set(Object.keys(H.phraseStyles).filter(s=>s!=='mixed').map(style=>fingerprint(H.generate(chart,41,'blues',{style}).notes)));
assert.equal(stylePrints.size,6,'all six explicit vocabularies create distinct phrases');
assert.ok(H.generate(chart,41,'blues',{style:'space'}).notes.length<H.generate(chart,41,'blues',{style:'arpeggio'}).notes.length,'space really has fewer notes');
console.log('PASS phrase variety: 560 seeded compositions, six different vocabularies, rhythm diversity, monophony and playable TAB');
const groovePrints=new Set();
for(const feel of Object.keys(A.feels))for(const bassStyle of Object.keys(A.bassStyles)) {
 const song=A.arrangement(chart,feel,912,4,{bassStyle,rhythm:true});
 assert.deepEqual(plain(song),plain(A.arrangement(chart,feel,912,4,{bassStyle,rhythm:true})));
 for(const event of song.events){assert.ok(event.beat>=0&&event.beat<song.beats);assert.ok(event.velocity>0&&event.velocity<=1);if(event.duration)assert.ok(event.duration>0&&event.beat+event.duration<=song.beats+1e-7);}
 assert.ok(song.events.some(e=>e.track==='rhythm'));assert.ok(song.events.some(e=>e.track==='keys'));
 if(bassStyle==='auto')assert.ok(new Set(song.bassStyles).size>=2,'auto changes musical pattern between complete choruses');
 else assert.ok(song.events.filter(e=>e.track==='bass').every(e=>e.bassStyle===bassStyle));
 if(bassStyle==='walking')groovePrints.add(song.events.filter(e=>e.track==='drums').map(e=>e.beat+e.sample).join('|'));
 const dry=A.arrangement(chart,feel,912,1,{bassStyle,rhythm:false});assert.ok(!dry.events.some(e=>e.track==='rhythm'));
}
assert.equal(groovePrints.size,8,'all eight feels differ in actual drum arrangement');
const bassPrints=new Set(Object.keys(A.bassStyles).filter(s=>s!=='auto').map(bassStyle=>A.arrangement(chart,'shuffle',10,1,{bassStyle}).events.filter(e=>e.track==='bass').map(e=>e.beat+':'+e.midi).join('|')));
assert.equal(bassPrints.size,6,'all six explicit basslines differ in pitch/rhythm');
for(const input of ['C/E | F/A | G/B','Dm7 G7 | Cmaj7','C D E F | G A B C','i7 | bVI7 | V7'])for(const bassStyle of Object.keys(A.bassStyles)){
 const parsed=H.parse(input);const song=A.arrangement(parsed,'funk',31,2,{bassStyle});
 for(const chord of parsed.chords){const first=song.events.find(e=>e.track==='bass'&&Math.abs(e.beat-chord.beat)<1e-8);assert.equal(first.midi%12,chord.bass??chord.root,'first bass note respects chord/slash root');}
 for(const e of song.events.filter(e=>e.track==='bass'||e.track==='rhythm')) {const chord=parsed.chords.find(c=>e.beat%song.chartBeats>=c.beat&&e.beat%song.chartBeats<c.beat+c.beats);assert.ok(e.beat%song.chartBeats+e.duration<=chord.beat+chord.beats+1e-7,'short-chord events do not cross changes');}
}
console.log('PASS arrangement variety: 56 groove/bass combinations, coherent chorus changes, rhythm toggle, slash chords and short-chord boundaries');
const manifest=JSON.parse(fs.readFileSync('docs/assets/audio/blues/manifest.json','utf8'));
const guitars=Object.entries(manifest).filter(([name])=>name.startsWith('guitar-'));
assert.equal(guitars.length,24);assert.equal(new Set(guitars.map(([,v])=>v.midi)).size,6);
for(const [name,entry]of guitars){assert.ok([2,3].includes(entry.layer));assert.ok([0,1].includes(entry.variant));for(const key of ['file','fallback'])assert.ok(fs.statSync(path.join('docs/assets/audio/blues',entry[key])).size>1000);}
const provenance=JSON.parse(fs.readFileSync('docs/assets/audio/blues/shinyguitar-provenance.json','utf8'));assert.equal(provenance.license,'CC0-1.0');assert.equal(provenance.assets.length,24);assert.ok(provenance.assets.every(a=>a.source.includes(provenance.sourceCommit)&&/^[a-f0-9]{64}$/.test(a.sourceSha256)));
assert.ok(fs.readFileSync('docs/assets/audio/blues/SHINYGUITAR-LICENSE.txt','utf8').includes('CC0'));
console.log('PASS guitar assets: 24 real recordings, preserved roots/layers/takes, FLAC + WAV fallbacks and pinned CC0 provenance');
