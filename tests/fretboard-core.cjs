const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('docs/fretboard-core.js','utf8'),context);
const F=context.FretboardCore,plain=value=>JSON.parse(JSON.stringify(value));
const rootNames=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const qualityCases={
  '':[0,4,7], m:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10],
  mMaj7:[0,3,7,11], 'm+7':[0,3,7,11], dim:[0,3,6], dim7:[0,3,6,9],
  m7b5:[0,3,6,10], 'm7-5':[0,3,6,10], 'ø7':[0,3,6,10], aug:[0,4,8],
  sus2:[0,2,7], sus4:[0,5,7], '7sus4':[0,5,7,10], '5':[0,7], '6':[0,4,7,9], m6:[0,3,7,9],
  '6/9':[0,2,4,7,9], '9':[0,2,4,7,10], maj9:[0,2,4,7,11], m9:[0,2,3,7,10],
  '11':[0,2,4,5,7,10], '13':[0,2,4,5,7,9,10], add9:[0,2,4,7],
  '7b9':[0,1,4,7,10], '7#9':[0,3,4,7,10], '7b9#11':[0,1,4,6,7,10],
  '7b5':[0,4,6,10], 'maj7#5':[0,4,8,11]
};
let shapesChecked=0;
// A barre may span higher fretted notes, but not lower/open sounding notes.
// Distinct such groups at each fret each need a finger; this rejects five-finger
// movable forms that a simple fret-span check would incorrectly accept.
function minimumFrettingGroups(frets) {
  let count=0;
  for(const fret of new Set(frets.filter(f=>f!==null&&f>0))) {
    let grouped=false;
    for(const f of frets) {
      if(f!==null&&f<fret) grouped=false;
      else if(f===fret&&!grouped){count++;grouped=true;}
    }
  }
  return count;
}
for(const [suffix,intervals] of Object.entries(qualityCases)) for(const [pc,name]of rootNames.entries()) {
  const ch=F.parseChord(name+suffix,{maxFret:24});
  assert.equal(ch.known,true,name+suffix);
  assert.equal(ch.rootPc,pc,name+suffix);
  assert.deepEqual(plain(ch.intervals),intervals,name+suffix);
  for(let midi=36;midi<84;midi++) assert.equal(F.role(ch,midi).kind,intervals.includes(F.mod(midi-pc))?'skeleton':'color',`${name+suffix}: ${midi}`);
  for(const [string,fret] of ch.anchors) {assert.ok([5,6].includes(string));assert.equal(F.mod(F.midi(string,fret)),pc);}
  if(['','m','7','maj7','m7','mMaj7','m+7','sus2','sus4'].includes(suffix)) assert.ok(ch.shapes.length,`No verified landmarks for ${name+suffix}`);
  for(const shape of ch.shapes) {
    shapesChecked++;
    assert.equal(shape.frets.length,6);
    assert.match(shape.family,/^[CAGED]$/);
    const stopped=[];
    shape.frets.forEach((f,i)=>{if(f===null)return;assert.ok(Number.isInteger(f)&&f>=0&&f<=24);assert.ok(intervals.includes(F.mod(F.midi(6-i,f)-pc)),`${name+suffix} ${shape.name} contains a nonchord tone`);if(f>0)stopped.push(f);});
    assert.ok(Math.max(...stopped)-Math.min(...stopped)<=4,'Landmark must have an ergonomic fret span');
    assert.ok(minimumFrettingGroups(shape.frets)<=4,`${name+suffix} ${shape.family} form must not require a fifth finger`);
    if(shape.complete) for(const interval of intervals) assert.ok(shape.frets.some((f,i)=>f!==null&&F.mod(F.midi(6-i,f)-pc)===interval));
  }
}
const cShapes=F.parseChord('C',{maxFret:24}).shapes;
for(const family of ['C','A','G','E','D'])assert.ok(cShapes.some(s=>s.family===family));
assert.ok(F.parseChord('C7').shapes.some(s=>s.family==='C'&&s.frets[1]===3&&s.frets[5]===0),'Retain playable open C7');
assert.ok(F.parseChord('D7').shapes.filter(s=>s.family==='C').every(s=>s.frets[5]===null),'Movable C7 form must mute string 1');
for(const [name,pc]of Object.entries({'Cb':11,'B#':0,'E#':5,'Fb':4,'Dbb':0,'F##':7,'Gx':9,'C♯':1,'D♭':1,'B𝄫':9}))assert.equal(F.pitchClass(name),pc,name);
assert.equal(F.pitchClass('H'),null);
assert.equal(F.parseChord('cbmaj',{notation:'bopland'}).tones[11],'7');
assert.equal(F.parseChord('Cmaj').tones[11],undefined,'Standard bare maj is a triad');
assert.equal(F.parseChord('C:maj',{notation:'bopland'}).tones[11],undefined,'Harte :maj remains a triad');
assert.equal(F.parseChord('CΔ').tones[11],'7');
assert.equal(F.parseChord('CM7').tones[11],'7');
assert.equal(F.parseChord('Cm(maj7)').tones[11],'7');
assert.equal(F.parseChord('C7(b9,#11)').tones[6],'♯11');
assert.equal(F.parseChord('Cø7').tones[6],'♭5');
assert.equal(F.parseChord('Cdim7').tones[9],'𝄫7');
assert.deepEqual(plain(F.parseChord('Dbmaj7').intervals),plain(F.parseChord('C#maj7').intervals));
assert.equal(F.parseChord('Dbmaj7').rootPc,F.parseChord('C#maj7').rootPc);
for(const name of ['','H7','Cgarbage','C7alt','Cfoo7','C7/3','C7(no5)','N.C.','?','Cminorsus4','Cmaj5']) {
  const ch=F.parseChord(name);assert.equal(ch.known,false,name);assert.equal(ch.rootPc,null);assert.equal(ch.shapes.length,0);assert.equal(ch.anchors.length,0);assert.equal(F.role(ch,60).kind,'unknown');
}
for(const name of ['C/E','Dm7/F','G/B','D/C','F#7/A#']) {
  const ch=F.parseChord(name);assert.equal(ch.known,true);assert.notEqual(ch.bassPc,null);assert.equal(ch.shapes.length,0,'Do not mislabel root-position form as a slash voicing');assert.match(ch.bridge,/斜线/);
}
assert.equal(F.role(F.parseChord('D/C'),60).kind,'bass');
assert.equal(F.role(F.parseChord('C/E'),64).kind,'skeleton');
const a7=F.parseChord('A7');
assert.equal(F.role(a7,56,'approach').kind,'color','A bare label cannot invent a verified analysis');
assert.equal(F.role(a7,56,{kind:'approach'}).kind,'color');
assert.equal(F.role(a7,56,{kind:'approach',analysis:{verified:true,description:'Source-verified resolution'}}).kind,'approach');
assert.equal(F.role(F.parseChord('?'),56,{kind:'approach',analysis:{verified:true,description:'Source'}}).kind,'unknown');
for(const value of [40,48,60,64,76,88]) for(const n of F.equivalents(value,24)) {
  assert.equal(F.mod(n.midi),F.mod(value));assert.equal(n.midi,F.midi(n.string,n.fret));assert.equal(n.octaves,(n.midi-value)/12);assert.equal(n.samePitch,n.midi===value);assert.equal(n.relation,n.midi===value?'unison':n.midi<value?'octave-down':'octave-up');
}
assert.ok(F.equivalents(60,24).some(n=>n.fret>12));
assert.ok(F.equivalents(48).some(n=>n.string===5&&n.fret===3&&n.samePitch));
assert.ok(F.equivalents(48).some(n=>n.string===6&&n.fret===8&&n.samePitch));
assert.ok(F.equivalents(48).some(n=>n.string===3&&n.fret===5&&n.octaves===1));
assert.equal(F.pitch(48),'C3');assert.equal(F.pitch(60.5),'?');assert.equal(F.midi(0,5),null);assert.equal(F.midi(1,-1),null);

const source={id:'test',title:'Exact notes',meter:'4/4',bars:2,duration:8,timeUnit:'quarter-note-beats',
 notes:[
  {index:10,midi:76,string:1,fret:12,name:'E5',start:1.125,duration:2.375,sourceField:'unchanged',tie:true},
  {index:11,midi:67,string:2,fret:8,name:'G4',start:1.125,duration:.25},
  {index:12,midi:60,string:3,fret:5,name:'C4',start:3,duration:2,carryIn:true},
  {index:13,midi:81,string:1,fret:17,name:'A5',start:6.125,duration:.375}
 ],chords:[{name:'Cmaj7',start:0,duration:2,bar:1,beat:1},{name:'A7',start:2,duration:2,bar:1,beat:3},{name:'?',start:5,duration:3,bar:2,beat:2}],
 segments:[{start:0,duration:2,title:'Verified heading',text:'Verified explanation'}]};
const before=JSON.stringify(source),M=F.adaptLesson(source);
assert.equal(JSON.stringify(source),before,'Never mutate source arrays or fields');
assert.equal(M.NOTES.length,4);assert.equal(M.SEGMENTS.length,4);assert.equal(M.maxFret,24);
for(const [i,n]of M.NOTES.entries())for(const field of ['midi','string','fret','name','start','duration'])assert.equal(n[field],source.notes[i][field],field);
assert.deepEqual(plain(M.NOTES.map(n=>n.sourceIndex)),[10,11,12,13]);
assert.equal(M.NOTES[0].sourceField,'unchanged');assert.equal(M.NOTES[0].tie,true);assert.equal(M.NOTES[2].carryIn,true);
assert.equal(M.SEGMENTS[0].title,'Verified heading');assert.equal(M.SEGMENTS[0].text,'Verified explanation');
assert.equal(M.SEGMENTS[1].notes.length,1);assert.equal(M.SEGMENTS[1].activeNotes.length,2,'A sustaining earlier note remains active across harmony changes');
assert.equal(M.SEGMENTS[2].notes.length,0,'Silence/onset-free segments are retained');
assert.equal(M.SEGMENTS[2].activeNotes.length,1,'Carry-in note spans a segment with no new onset');
assert.equal(M.CHORDS[M.SEGMENTS[2].chord].known,false,'A harmony gap must remain unknown');
assert.equal(M.notesAt(1.125).length,2,'Simultaneous source notes remain polyphonic');
assert.equal(M.notesAt(1.375).length,1,'Note ends are exclusive');
assert.equal(M.notesAt(3.25).length,2);assert.equal(M.notesAt(3.5).length,1);assert.equal(M.notesAt(5).length,0);
assert.equal(M.chordAt(1.999).name,'Cmaj7');assert.equal(M.chordAt(2).name,'A7');assert.equal(M.chordAt(4).known,false);
assert.deepEqual(plain(M.gaps.map(g=>[g.start,g.duration])),[[0,1.125],[5,1.125],[6.5,1.5]]);
assert.equal(M.EVENTS.filter(e=>e.type==='note').length,4);
const unsorted=F.createLesson({...source,notes:[source.notes[3],source.notes[0]]});assert.equal(unsorted.NOTES[0].midi,81,'Source order is not sorted or regenerated');
assert.equal(unsorted.EVENTS[0].midi,76,'Playback events independently order by onset');
const rest=F.createLesson({meter:'3/4',duration:3,notes:[{type:'rest',start:0,duration:1},{midi:64,string:1,fret:0,name:'E4',start:1,duration:1}],chords:[]});
assert.equal(rest.NOTES.length,1);assert.equal(rest.EVENTS[0].type,'rest');assert.equal(rest.notesAt(.5).length,0);
const carry=F.createLesson({meter:'4/4',duration:2,notes:[{midi:64,string:1,fret:0,start:-.25,duration:1,carryIn:true}],chords:[]});assert.equal(carry.NOTES[0].start,-.25);assert.equal(carry.notesAt(0).length,1);
const mismatch=F.createLesson({notes:[{midi:65,string:1,fret:0,start:0,duration:1}]});assert.equal(mismatch.NOTES[0].midi,65);assert.equal(mismatch.NOTES[0].fret,0);assert.equal(mismatch.warnings[0].type,'pitch-position-mismatch');
const overlap=F.createLesson({notes:[],duration:4,chords:[{name:'C',start:0,duration:4},{name:'G7',start:2,duration:2}]});assert.equal(overlap.chordAt(2).known,false,'Conflicting chord annotations do not silently choose a harmony');
assert.equal(F.createLesson({notes:[],bars:4,duration:15.99999}).duration,15.99999,'Do not pad a verified audio duration to a nominal bar');
const roundedSource={source:{type:'guitarset'},originalBpm:120,notes:[{midi:64,string:1,fret:0,start:3,duration:1.000001}],duration:4,chords:[{name:'C',start:0,duration:4}]};
const rounded=F.createLesson(roundedSource);assert.equal(rounded.duration,4);assert.equal(rounded.SEGMENTS.length,1);assert.equal(rounded.NOTES[0].duration,1.000001);assert.equal(rounded.NOTES[0].end,4.000001);assert.equal(rounded.notesAt(4).length,0);
const substantive=F.createLesson({...roundedSource,notes:[{...roundedSource.notes[0],duration:1.01}]});assert.equal(substantive.duration,4.01);assert.equal(substantive.SEGMENTS.length,2);assert.equal(substantive.chordAt(4.005).known,false,'Substantive missing-harmony tails must remain visible');
assert.equal(F.createLesson({...roundedSource,source:{type:'other'}}).duration,4.000001,'Do not silently round sources with no verified rounding contract');
const machineTail=F.createLesson({notes:[],duration:16.000000000000004,chords:[{name:'C',start:0,duration:16}]});assert.equal(machineTail.SEGMENTS.length,1);assert.equal(machineTail.duration,16.000000000000004);assert.equal(machineTail.SEGMENTS[0].end,16.000000000000004);
assert.equal(F.meterInfo('6/8').beatsPerBar,3);assert.equal(F.meterInfo('5/4').beatsPerBar,5);assert.equal(F.meterInfo('3/4').beatsPerBar,3);
assert.throws(()=>F.createLesson({notes:[{midi:64,string:1,fret:0,start:0,duration:-1}]}),/timing/);
assert.throws(()=>F.createLesson({notes:[{midi:64,start:0,duration:1}]}),/position/);
assert.throws(()=>F.createLesson({notes:[],timeUnit:'seconds'}),/timing/);

// Full real-library audit. These are checked-in source inputs, not generated notes.
const catalog=JSON.parse(fs.readFileSync('docs/assets/licks/fretboard/catalog.json','utf8'));
let precise=0,sourceNotes=0,maps=0;const tokens=new Set();
for(const item of catalog.lessons) {
  if(item.supported) {
    precise++;const data=JSON.parse(fs.readFileSync('docs/'+item.data,'utf8')),serialized=JSON.stringify(data),lesson=F.adaptLesson(data);
    assert.equal(JSON.stringify(data),serialized);assert.equal(lesson.NOTES.length,data.notes.length,item.id);assert.equal(lesson.warnings.length,0,item.id);sourceNotes+=lesson.NOTES.length;
    if(data.source.type==='guitarset'){assert.equal(lesson.duration,data.duration,item.id+' source crop duration');assert.equal(lesson.SEGMENTS.length,4,item.id+' no phantom rounding-tail segment');}
    for(const [i,n]of lesson.NOTES.entries())for(const field of ['midi','string','fret','name','start','duration'])assert.equal(n[field],data.notes[i][field],`${item.id} note ${i} ${field}`);
    if(item.id==='Xbv40aTf') {assert.equal(lesson.SEGMENTS.length,8);assert.equal(lesson.NOTES.length,28);const n=lesson.NOTES[23];assert.equal(lesson.role(lesson.CHORDS[lesson.SEGMENTS[n.segment].chord],n.midi,n).kind,'approach');assert.match(lesson.SEGMENTS[0].text,/3–5–7–9/);}
  } else {
    maps++;const source=F.catalogLesson(item),lesson=F.adaptLesson(source);
    assert.equal(source.timeUnit,'schematic-layout-units');assert.equal(source.timing.schematic,true);assert.equal(source.timing.audioSyncVerified,false);assert.equal(lesson.NOTES.length,0);assert.equal(lesson.harmonyOnly,true);assert.equal(lesson.SEGMENTS.length,item.barChords.flat().length,item.id);
    for(const segment of lesson.SEGMENTS) {assert.equal(segment.beat,null);assert.equal(segment.schematic,true);assert.equal(lesson.CHORDS[segment.chord].known,true,`${item.id} ${segment.chord}`);}
  }
  for(const token of item.barChords.flat()){tokens.add(token);assert.equal(F.parseChord(token,{notation:item.sourceType==='bopland'?'bopland':'standard'}).known,true,token);}
}
assert.equal(catalog.lessons.length,2545);assert.equal(precise,21);assert.equal(maps,2524);assert.equal(sourceNotes,623);
console.log(`PASS fretboard core: all 12 roots, ${Object.keys(qualityCases).length} qualities, ${shapesChecked} validated CAGED landmarks, enharmonics, slash/unknown harmony, exact source timing/polyphony/rests/ties, ${precise} precise lessons (${sourceNotes} notes), ${maps} honest harmony maps, ${tokens.size} catalog chord tokens`);
