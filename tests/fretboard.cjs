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
console.log("PASS original1297 reference: 28 source positions, durations, harmony, voicings and octave bridges");
require("./fretboard-ui.cjs");
