const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const plain=value=>JSON.parse(JSON.stringify(value));
function midiNoteOns(bytes){let index=22,tick=0,result=[];const variable=()=>{let value=0,byte;do{byte=bytes[index++];value=(value<<7)+(byte&127);}while(byte&128);return value;};while(index<bytes.length){tick+=variable();const status=bytes[index++];if(status===0xff){index++;const length=variable();index+=length;continue;}if((status&0xf0)===0xc0||(status&0xf0)===0xd0){index++;continue;}const midi=bytes[index++],velocity=bytes[index++];if((status&0xf0)===0x90&&velocity)result.push({tick,midi,velocity});}return result;}

const isolated={};
for(const file of ['harmony.js','practice-arrangement.js'])vm.runInNewContext(fs.readFileSync('docs/'+file,'utf8'),{window:isolated});
const H=isolated.tunerHarmony,A=isolated.practiceArrangements,chart=H.parse('2m7,57,1maj7,67','C');
const base={style:'mixed',intensity:'auto',leadGroove:'follow',leadTexture:'single',phraseCycleMode:'repeat',densityCycleMode:'fixed'};
const fixed=A.planLeadCycle(chart,912,'blues',base,4);
assert.equal(fixed.rounds.length,4);assert.ok(fixed.rounds.every(round=>JSON.stringify(round.phrase)===JSON.stringify(fixed.rounds[0].phrase)),'fixed mode repeats the exact authored phrase');
assert.deepEqual(plain(fixed),plain(A.planLeadCycle(chart,912,'blues',base,4)),'lead cycle is seeded and reproducible');

const random=A.planLeadCycle(chart,912,'blues',{...base,phraseCycleMode:'random'},4),randomAgain=A.planLeadCycle(chart,912,'blues',{...base,phraseCycleMode:'random'},4);
assert.deepEqual(plain(random),plain(randomAgain));assert.ok(new Set(random.rounds.map(round=>round.style)).size>=3);for(let index=1;index<random.rounds.length;index++)assert.notEqual(random.rounds[index].style,random.rounds[index-1].style);assert.notEqual(random.rounds[0].style,random.rounds.at(-1).style,'random cycle avoids its loop seam');
const randomDensity=A.planLeadCycle(chart,912,'blues',{...base,phraseCycleMode:'random',densityCycleMode:'random'},4);
assert.deepEqual(plain(randomDensity.rounds.map(round=>round.style)),plain(random.rounds.map(round=>round.style)),'density randomness has an independent stream');
assert.ok(new Set(randomDensity.rounds.map(round=>round.intensity)).size>1);assert.ok(new Set(randomDensity.rounds.map(round=>round.phrase.notes.length)).size>1,'density changes actual onset counts');

const sequence=['call','motif','space','blues'],planned=A.planLeadCycle(chart,27,'blues',{...base,phraseCycleMode:'sequence',phraseStyleSequence:sequence},4);
assert.deepEqual(plain(planned.rounds.map(round=>round.style)),sequence);assert.deepEqual(plain(A.planLeadCycle(chart,27,'blues',{...base,phraseCycleMode:'sequence',phraseStyleSequence:['call','motif','space']},7).rounds.map(round=>round.style)),['call','motif','space','call','motif','space','call']);

for(const texture of ['double','voicing']){
  const cycle=A.planLeadCycle(chart,912,'blues',{...base,leadTexture:texture},4),phrase=cycle.rounds[0].phrase,voiced=phrase.notes.filter(note=>note.companions?.length);
  assert.ok(voiced.length>0,texture+' creates real voiced onsets');
  for(const note of voiced){
    assert.equal(note.companions.length,texture==='double'?1:2);assert.equal(new Set([note.string,...note.companions.map(voice=>voice.string)]).size,note.companions.length+1);
    const chord=chart.chords.find(item=>note.beat>=item.beat&&note.beat<item.beat+item.beats),tones=new Set(chord.intervals.map(interval=>H.mod(chord.root+interval)));
    for(const voice of note.companions){assert.equal([64,59,55,50,45,40][voice.string]+voice.fret,voice.midi);assert.ok(tones.has(H.mod(voice.midi)),'companions use the current chord');}
  }
  const expanded=A.leadCycleEvents(cycle,chart.bars.length*4,'shuffle'),first=expanded.find(event=>event.stackSize>1);
  assert.ok(first);assert.equal(expanded.filter(event=>event.chorus===0&&event.beat===first.beat).length,first.stackSize);assert.ok(expanded.every(event=>event.timingOffset>=0&&event.timingOffset<=.05));
}

const grooveBeats=[.25,.5,.75,1.25,1.5,1.75],groovePrints=new Set(['straight','swing','shuffle','pocket','laidback'].map(groove=>grooveBeats.map(beat=>A.warpLeadBeat(beat,groove,'shuffle').toFixed(4)).join(',')));
assert.equal(groovePrints.size,5,'every Lead groove has a distinct timing map');assert.equal(A.warpLeadBeat(.5,'follow','shuffle'),A.swingBeat(.5,A.feels.shuffle.swing),'follow retains the previous mapping');
const human=A.arrangement(chart,'shuffle',99,4,{bassStyle:'walking',drumStyle:'backbeat',keyStyle:'soul',rhythmStyle:'chop'}),humanAgain=A.arrangement(chart,'shuffle',99,4,{bassStyle:'walking',drumStyle:'backbeat',keyStyle:'soul',rhythmStyle:'chop'});
assert.deepEqual(plain(human),plain(humanAgain));assert.ok(human.events.every(event=>Number.isFinite(event.timingOffset)&&event.timingOffset>=0&&event.timingOffset<.03));assert.ok(human.events.filter(event=>event.midi!==undefined).every(event=>Number.isFinite(event.detuneCents)));
vm.runInNewContext(fs.readFileSync('docs/practice-notation.js','utf8'),{window:isolated});
const voicedForScore=A.planLeadCycle(chart,912,'blues',{...base,leadTexture:'voicing'},4).rounds[0].phrase,score=isolated.practiceNotation.scoreData({phrase:voicedForScore,parsed:chart,feel:'Swing',swing:.6}),companionCount=voicedForScore.notes.reduce((sum,note)=>sum+(note.companions?.length||0),0);
assert.ok(companionCount>0);assert.ok((score.xml.match(/<chord\/>/g)||[]).length>=companionCount,'MusicXML writes every companion as a chord head');

(async()=>{
  const dom=new JSDOM(fs.readFileSync('docs/index.html','utf8'),{url:'https://rexrockya.github.io/tuner/#lessons',runScripts:'outside-only'}),w=dom.window,d=w.document,q=id=>d.getElementById(id),change=(id,value)=>{q(id).value=value;q(id).dispatchEvent(new w.Event('change'));};
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};Object.defineProperty(w.navigator,'connection',{value:{saveData:true}});
  for(const file of ['storage.js','harmony.js','lessons.js','practice-arrangement.js','practice-audio.js','practice.js'])w.eval(fs.readFileSync('docs/'+file,'utf8'));
  const S=w.practiceStudio;d.getElementById('lesson-page').style.display='block';S.setMode('create');S.generate(912);
  for(const id of ['practice-lead-groove','practice-lead-texture','practice-phrase-cycle','practice-density-cycle','practice-round'])assert.ok(q(id));
  for(const id of ['jazz','blues','singing'])assert.ok(d.querySelector('[data-practice-timbre="lead"] option[value="'+id+'"]'));
  const accompaniment=plain(S.transport.song.events.filter(event=>event.track!=='lead'));
  change('practice-phrase-cycle','random');change('practice-density-cycle','random');change('practice-lead-groove','pocket');change('practice-lead-texture','voicing');
  const cycle=plain(S.getLeadCycle());assert.equal(cycle.mode,'random');assert.equal(cycle.densityMode,'random');assert.equal(cycle.groove,'pocket');assert.equal(cycle.texture,'voicing');assert.equal(q('practice-round-wrap').hidden,false);assert.deepEqual(plain(S.transport.song.events.filter(event=>event.track!=='lead')),accompaniment,'Lead choices leave accompaniment exact');
  const expectedVoices=cycle.rounds.reduce((sum,round)=>sum+round.phrase.notes.reduce((count,note)=>count+1+(note.companions?.length||0),0),0),midi=Buffer.from(S.midiFile()),noteOns=midiNoteOns(midi);
  assert.equal(noteOns.length,expectedVoices,'variation MIDI exports every round and every chord head');
  const performed=w.practiceAudio.leadCycleEvents(cycle,S.transport.song.chartBeats,q('practice-feel').value),stack=performed.filter(event=>event.chorus===0&&event.stackSize>1&&event.beat===performed.find(item=>item.chorus===0&&item.stackSize>1).beat);
  const expectedStack=stack.map(event=>({tick:Math.round((event.beat+event.timingOffset*S.transport.bpm/60)*480),midi:event.midi}));assert.ok(new Set(expectedStack.map(event=>event.tick)).size>1,'voicing keeps its millisecond strum');for(const expected of expectedStack)assert.ok(noteOns.some(note=>note.tick===expected.tick&&note.midi===expected.midi),'MIDI carries performed groove and strum timing');
  change('practice-phrase-cycle','sequence');const selects=[...d.querySelectorAll('[data-practice-cycle-style]')];['call','motif','space','blues'].forEach((value,index)=>{selects[index].value=value;selects[index].dispatchEvent(new w.Event('change'));});
  assert.deepEqual(plain(S.getLeadCycle().rounds.map(round=>round.style)),['call','motif','space','blues']);assert.equal(q('practice-phrase-sequence').hidden,false);
  q('practice-save').click();const saved=JSON.parse(w.siteStorage.getItem('tuner-original-licks-v1'))[0];assert.equal(saved.version,3);assert.deepEqual(saved.phraseStyleSequence,['call','motif','space','blues']);assert.deepEqual(saved.leadCycle,plain(S.getLeadCycle()));
  change('practice-round','2');assert.equal(S.getPhrase().style,'space');
  q('practice-rewind').click();assert.equal(q('practice-round').value,'0');assert.equal(S.getPhrase().style,'call','rewind returns the score view to the first round');
  dom.window.close();
  console.log('PASS performance: Lead grooves, deterministic progression cycles, random density, playable double-stops/voicings, humanized backing, UI, v3 save and full-cycle MIDI');
})().catch(error=>{console.error(error);process.exit(1);});
