const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{},console};vm.createContext(box);for(const file of ['harmony.js','practice-arrangement.js'])vm.runInContext(fs.readFileSync('docs/'+file,'utf8'),box);
const H=box.window.tunerHarmony,R=box.window.practiceArrangements,plain=value=>JSON.parse(JSON.stringify(value));
const chart=H.parse('2m7,57,1maj7','C'),oldPhrase=plain(H.generate(chart,128,'jazz',{intensity:'auto'})),oldSong=plain(R.arrangement(chart,'shuffle',128));
vm.runInContext(fs.readFileSync('docs/music-genres.js','utf8'),box);vm.runInContext(fs.readFileSync('docs/genre-curriculum.js','utf8'),box);
const G=box.window.tunerGenres;assert.deepEqual(plain(H.generate(chart,128,'jazz',{intensity:'auto'})),oldPhrase);assert.deepEqual(plain(R.arrangement(chart,'shuffle',128)),oldSong);
let cases=0;const fingerprints=new Set();
for(const [genre,profile] of Object.entries(G.profiles)){
  for(const key of ['C','F#','Bb'])for(const text of [profile.create,'1m7 47,57 1maj7','1 2 3 4,57','1sus2,6m7,4add9,1maj9'])for(const style of Object.keys(H.phraseStyles))for(const intensity of Object.keys(H.phraseIntensities)){
    const parsed=G.enrich(H.parse(text,key));assert.equal(parsed.error,'');const options={genre,style,intensity},phrase=H.generate(parsed,4231,profile.feel,options);
    assert.deepEqual(plain(phrase),plain(H.generate(parsed,4231,profile.feel,options)),'deterministic '+genre);
    assert.ok(phrase.notes.length>0&&phrase.notes.length<=256);
    phrase.notes.forEach((note,i)=>{
      const chord=parsed.chords.find(c=>note.beat>=c.beat-1e-8&&note.beat<c.beat+c.beats-1e-8);
      assert.ok(chord,genre+' has containing chord');assert.ok(note.beat+note.duration<=chord.beat+chord.beats+1e-6,'no crossing chord');assert.ok(note.duration>0&&note.notationDuration>0);
      assert.ok(note.velocity>0&&note.velocity<=1);assert.equal([64,59,55,50,45,40][note.string]+note.fret,note.midi);assert.ok(note.fret>=0&&note.fret<=24);
      if(i)assert.ok(phrase.notes[i-1].beat+phrase.notes[i-1].duration<=note.beat+1e-6,'monophonic');
    });cases++;
  }
  const parsed=G.enrich(H.parse('1m7,4m7,1m7,57','C'));
  fingerprints.add(JSON.stringify(H.generate(parsed,92,'straight',{genre,style:'motif',intensity:'standard'}).notes));
  const musical=phrase=>phrase.notes.map(({beat,duration,midi})=>[beat,duration,midi]);
  assert.notDeepEqual(musical(H.generate(parsed,4231,'straight',{genre,style:'motif',intensity:'standard'})),musical(H.generate(parsed,4231,'straight',{genre,style:'syncopated',intensity:'standard'})),'writing styles must alter audible music');
  for(const feel of Object.keys(R.feels)){
    const song=R.arrangement(parsed,feel,99,4,{genre});assert.deepEqual(plain(song),plain(R.arrangement(parsed,feel,99,4,{genre})));
    song.events.forEach(e=>{assert.ok(Number.isFinite(e.beat)&&e.beat>=0&&e.beat<song.beats);assert.ok(e.duration>0&&e.beat+e.duration<=song.beats+1e-6);assert.ok(e.velocity>0&&e.velocity<=1);if(e.track!=='drums')assert.ok(Number.isInteger(e.midi));});
    const muted=R.arrangement(parsed,feel,99,4,{genre,keyStyle:'none',rhythmStyle:'none',drumStyle:'none'});assert.ok(muted.events.every(e=>e.track==='bass'));
    assert.deepEqual(plain(song.events.filter(e=>e.track==='bass')),plain(muted.events),'muting other tracks preserves bass');
  }
  for(const [track,field,catalog]of[['bass','bassStyle',R.bassStyles],['drums','drumStyle',R.drumStyles],['keys','keyStyle',R.keyStyles],['rhythm','rhythmStyle',R.rhythmStyles]])for(const style of Object.keys(catalog)){
    const song=R.arrangement(parsed,profile.feel,3,4,{genre,[field]:style});if(style!=='auto')assert.ok(song.chorusStyles.every(round=>round[track]===style),'explicit style honored');
  }
}
assert.equal(fingerprints.size,6,'six genres change notes, not only metadata');
assert.notDeepEqual(plain(R.arrangement(chart,'straight',77,1,{genre:'rnb',drumStyle:'neo'}).events.filter(e=>e.track==='drums').map(e=>e.beat)),plain(R.arrangement(chart,'shuffle',77,1,{genre:'rnb',drumStyle:'neo'}).events.filter(e=>e.track==='drums').map(e=>e.beat)),'new drum styles follow chosen swing');
const colors=G.enrich(H.parse('1add9,1maj9,1m9,17b9','C'));assert.ok(colors.chords[0].colorIntervals.includes(14));assert.ok(colors.chords[1].colorIntervals.includes(11));assert.ok(colors.chords[3].colorIntervals.includes(13));assert.ok(!colors.chords[0].intervals.includes(14),'old intervals unchanged');
let lessons=0;for(const genre of box.window.tunerCurriculum.genres)for(const lesson of genre.lessons){assert.ok(G.profiles[genre.id]);assert.equal(H.parse(lesson.progression,lesson.key).error,'');assert.ok(H.phraseStyles[lesson.strategy]);assert.equal(lesson.steps.length,3);assert.equal(lesson.listenFor.length,2);lessons++;}
assert.equal(lessons,21);
console.log('PASS multi-genre: '+cases+' deterministic phrase cases, six distinct vocabularies, all feels/track styles, boundaries, stable independent parts, color tones, legacy equivalence and 21 courses');
