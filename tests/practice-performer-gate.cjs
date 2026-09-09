const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const w={};for(const file of ['docs/harmony.js',process.argv[2]||'docs/practice-arrangement.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),{window:w});
const H=w.tunerHarmony,A=w.practiceArrangements,close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-9,message+': '+actual+' != '+expected);
const parsed=H.parse('1,1');
const phrase={bars:2,seed:1,notes:[{beat:0,duration:.84,notationDuration:1,midi:64,bar:0,string:0,fret:0,velocity:.7,role:'test',articulation:'picked',variant:0}],chords:parsed.chords};
for(const [profile,expected] of [['balanced',.84],['navigator',.74],['pocket',.52]]){
 const shaped=A.shapeLeadPhrase(phrase,parsed,profile,1),before=JSON.stringify(shaped);
 const cycle={rounds:[{seed:1,style:'motif',intensity:'standard',phrase:shaped}],groove:'straight',performerProfile:profile};
 const events=A.leadCycleEvents(cycle,8,'straight');
 close(events[0].duration,expected,profile+' applies its audible gate once');
 close(events[0].duration*60/96,expected*.625,profile+' real duration at 96 BPM');
 assert.equal(JSON.stringify(shaped),before,'scheduling cannot rewrite the stored phrase');
 close(phrase.notes[0].duration,.84,'shaping does not mutate the original note');
 if(profile!=='balanced'){
  cycle.rounds=[cycle.rounds[0],cycle.rounds[0]];
  const loop=A.leadCycleEvents(cycle,8,'straight');close(loop[1].beat,8,'the next progression keeps its downbeat');close(loop[1].duration,expected,'the repeated progression does not apply gate again');
  const short={...phrase,notes:[{...phrase.notes[0],duration:.12}]};
  const shortShaped=A.shapeLeadPhrase(short,parsed,profile,1);cycle.rounds=[{...cycle.rounds[0],phrase:shortShaped}];
  close(A.leadCycleEvents(cycle,8,'straight')[0].duration,.12,'existing short '+profile+' notes retain their already-set gate');
  cycle.groove='shuffle';cycle.rounds=[{...cycle.rounds[0],phrase:shaped}];
  close(A.leadCycleEvents(cycle,8,'shuffle')[0].duration,A.warpLeadBeat(expected,'shuffle','shuffle'),'swing is applied to the single gate, not multiplied again');
 }
}
// Freeze the rest of the live performance: pitch, onsets, velocity, seeded jitter,
// detune, stacks, articulation, four-chorus expansion, and musical metadata.
const hash=crypto.createHash('sha256');
for(const profile of Object.keys(A.performerProfiles))for(const seed of [0,1,17,99])for(const groove of ['straight','shuffle','pocket']){
 const chart=H.parse('1maj7,6m7,2m7,57','C');const cycle=A.planLeadCycle(chart,seed,'blues',{style:'motif',intensity:'auto',performerProfile:profile,leadGroove:groove,leadTexture:'double'},4);
 hash.update(JSON.stringify(A.leadCycleEvents(cycle,16,'shuffle').map(({duration,...event})=>event)));
}
assert.equal(hash.digest('hex'),'d76e3b241a57daedb70e13b4423269bcb11afd99f6e92f103bfb3393057b6b55','all non-duration performance data retains its released fingerprint');
console.log('PASS performer gates: actual note lengths, short-note preservation, swing, unchanged snapshots and loop downbeats; non-duration musical fingerprint unchanged');
