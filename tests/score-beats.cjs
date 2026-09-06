const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");
const context = {window:{}};
vm.runInNewContext(fs.readFileSync("docs/score-beats.js", "utf8"), context);
const {buildBeats, lowerBound, fixedTempoManifest} = context.window.scoreBeats;
const plain = value => JSON.parse(JSON.stringify(value));
const manifest = (starts, duration, extra = {}) => ({sourceBpm:120, measureStarts:starts, duration, ...extra});
const measure = (signature, quarters) => ({signature, quarters});

let result = buildBeats([measure([4,4],4), measure([3,4],3)], manifest([0,2],3.5));
assert.deepEqual(plain(result.beats.map(beat => beat.time)), [0,.5,1,1.5,2,2.5,3]);
assert.deepEqual(plain(result.beats.filter(beat => beat.accent === "strong").map(beat => beat.time)), [0,2]);
assert.deepEqual(plain(result.bars[1].signature), [3,4]);
assert.equal(lowerBound(result.beats,.65),2, "seeking between beats preserves the next grid point");
assert.equal(lowerBound(result.beats,2),4);

result = buildBeats([measure([6,8],3)], manifest([0],1.5));
assert.deepEqual(plain(result.beats.map(beat => beat.time)), [0,.25,.5,.75,1,1.25]);
assert.deepEqual(plain(result.beats.map(beat => beat.accent)), ["strong","weak","weak","secondary","weak","weak"]);
result = buildBeats([measure([2,2],4)], manifest([0],2));
assert.deepEqual(plain(result.beats.map(beat => beat.time)), [0,1]);

result = buildBeats([{...measure([3,4],1), implicit:true}, measure([3,4],3)], manifest([0,.5],2));
assert.equal(result.beats[0].beat,2);
assert.equal(result.beats[0].accent,"weak", "pickup must not pretend to be the downbeat");
assert.equal(result.beats[1].accent,"strong");

result = buildBeats([measure([6,8],3)], manifest([0],2.25,
  {tempoMap:[{quarter:0,bpm:120},{quarter:1.5,bpm:60}]}));
assert.deepEqual(plain(result.beats.map(beat => beat.time)), [0,.25,.5,.75,1,1.25]);
assert.equal(result.beats[3].bpm,120, 'practice BPM does not follow embedded tempo changes');
const changing = manifest([0,2.25],3.25, {tempoMap:[{quarter:0,bpm:120},{quarter:1.5,bpm:60}],
  notes:[{time:.5,duration:.75},{time:1.25,duration:.5}]});
const fixed = fixedTempoManifest(changing);
assert.deepEqual(plain(fixed.measureStarts),[0,1.5]);
assert.equal(fixed.duration,2);
assert.deepEqual(plain(fixed.notes),[{time:.5,duration:.5},{time:1,duration:.25}]);
assert.equal(changing.notes[0].duration,.75, 'cached original remains untouched');

result = buildBeats([{...measure([4,4],.5),implicit:true},measure([4,4],4)],manifest([0,.25],2.25));
assert.equal(result.beats[0].time,.25, 'fractional pickup leads into the next full beat without an extra click');
assert.equal(result.beats[0].accent,'strong');

result = buildBeats([measure([4,4],2.5),measure([4,4],6),measure([4,4],4)],manifest([0,1.25,4.25],6.25));
assert.equal(result.issues.length,2);
assert.deepEqual(plain(result.beats.filter(b=>b.accent==='strong').map(b=>b.time)),[0,2,4,6]);
for(let i=1;i<result.beats.length;i++) assert.equal(result.beats[i].time-result.beats[i-1].time,.5);

for(const score of JSON.parse(fs.readFileSync('docs/assets/scores/catalog.json','utf8'))) {
  const source = JSON.parse(fs.readFileSync(`docs/assets/scores/${score.id}.json`,'utf8'));
  const grid = buildBeats(source.measureStarts.map(()=>measure(source.timeSignature,0)),source);
  const period = 60/source.sourceBpm*4/source.timeSignature[1];
  for(let i=1;i<grid.beats.length;i++) {
    assert.ok(Math.abs(grid.beats[i].time-grid.beats[i-1].time-period)<1e-9,`${score.id}: every click has identical spacing`);
    assert.equal(grid.beats[i].beat,i%source.timeSignature[0]);
  }
}
console.log("score beat-grid tests passed: all catalog scores have fixed spacing; malformed bars, pickup, tempo normalization, meter change, seek");
