const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");
const context = {window:{}};
vm.runInNewContext(fs.readFileSync("docs/score-beats.js", "utf8"), context);
const {buildBeats, lowerBound} = context.window.scoreBeats;
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

result = buildBeats([measure([3,4],1), measure([3,4],3)], manifest([0,.5],2));
assert.equal(result.beats[0].beat,2);
assert.equal(result.beats[0].accent,"weak", "pickup must not pretend to be the downbeat");
assert.equal(result.beats[1].accent,"strong");

result = buildBeats([measure([6,8],3)], manifest([0],2.25,
  {tempoMap:[{quarter:0,bpm:120},{quarter:1.5,bpm:60}]}));
assert.deepEqual(plain(result.beats.map(beat => beat.time)), [0,.25,.5,.75,1.25,1.75]);
assert.equal(result.beats[3].bpm,60);
console.log("score beat-grid tests passed: meters, compound accents, pickup, tempo change, seek");
