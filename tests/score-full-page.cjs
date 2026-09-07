const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const id='violin-upload-2026-09-06-1',base='docs/assets/scores/'+id;
const manifest=JSON.parse(fs.readFileSync(base+'.json','utf8'));
const source=JSON.parse(fs.readFileSync('notes/transcriptions/'+id+'.json','utf8'));
const xml=fs.readFileSync(base+'.musicxml','utf8');
const dom=new JSDOM('<div id="sheet"></div>',{runScripts:'outside-only',virtualConsole:new VirtualConsole()});
const w=dom.window,doc=new w.DOMParser().parseFromString(xml,'text/xml');
assert.equal(doc.querySelectorAll('parsererror').length,0);
assert.equal(doc.querySelectorAll('measure').length,35);
assert.equal(source.bars.length,35);
assert.deepEqual([...new Set(source.bars.map(b=>b.line))],[1,2,3,4,5,6,7,8,9,10]);
assert.equal(manifest.coverage,'full-page-playable-review');
assert.doesNotMatch(manifest.title,/节选/);
assert.equal(manifest.measureStarts.length,35);
assert.equal(manifest.sourceLineCount,10);
for(const measure of doc.querySelectorAll('measure')){
 let time=0,end=0;const totals=new Map();
 for(const element of measure.children){
  if(element.localName==='backup')time-=Number(element.querySelector('duration').textContent);
  if(element.localName==='note'&&!element.querySelector('grace')&&!element.querySelector('chord')){
   const duration=Number(element.querySelector('duration').textContent),voice=element.querySelector('voice').textContent;
   totals.set(voice,(totals.get(voice)||0)+duration);time+=duration;end=Math.max(end,time);
  }
 }
 assert.equal(end,192);for(const total of totals.values())assert.equal(total,192);
}
assert.equal(doc.querySelectorAll('backup').length,2);
assert.equal(doc.querySelectorAll('grace').length,3);
assert.equal(doc.querySelectorAll('trill-mark').length,1);
assert.equal([...doc.querySelectorAll('actual-notes')].filter(n=>n.textContent==='6').length,6);
const editorial=doc.querySelector('measure[number="18"] note[color="#B34B00"]');
assert.ok(editorial.querySelector('rest'));assert.equal(editorial.querySelector('duration').textContent,'24');
assert.equal(manifest.editorialCorrections.filter(item=>item.addedRestQuarters).length,1);
const playedMeasures=new Set(manifest.notes.map(n=>n.measure));
for(let i=7;i<=35;i++)assert.ok(playedMeasures.has(i),`No playable notes for bar ${i}`);
assert.ok(manifest.notes.some(n=>n.measure===32&&n.track===0&&Math.abs(n.duration-2*60/108)<1e-8));
assert.ok(manifest.notes.some(n=>n.measure===32&&n.track===1));
const lastNotes=manifest.notes.filter(n=>n.measure===35);
assert.ok(lastNotes.length>=14);
assert.ok(lastNotes.some(n=>n.pitch===64)&&lastNotes.some(n=>n.pitch===69));
assert.ok(Math.abs(Math.max(...manifest.notes.map(n=>n.time+n.duration))-manifest.duration)<1e-8);
w.eval(fs.readFileSync('docs/score-beats.js','utf8'));
const beats=w.scoreBeats.fromManifest({...manifest,musicXmlText:xml});
assert.equal(beats.issues.length,0);assert.equal(beats.beats.length,140);
beats.beats.forEach((beat,i)=>{assert.ok(Math.abs(beat.time-i*60/108)<1e-8);assert.equal(beat.beat,i%4);});
const midi=fs.readFileSync(base+'.mid');assert.equal(midi.toString('ascii',0,4),'MThd');assert.equal(midi.readUInt32BE(18),midi.length-22);
let offset=22,tick=0,noteOns=0,noteOffs=0;
const vlq=()=>{let v=0,b;do{b=midi[offset++];v=(v<<7)|(b&127);}while(b&128);return v;};
while(offset<midi.length){tick+=vlq();const status=midi[offset++];if(status===255){const type=midi[offset++],len=vlq();if(type===47)assert.equal(tick,140*480);offset+=len;}else if(status===192)offset++;else{if(status===144)noteOns++;if(status===128)noteOffs++;offset+=2;}}
assert.equal(noteOns,manifest.notes.length);assert.equal(noteOffs,noteOns);
(async()=>{
 const rendererPath=process.env.OSMD_TEST_BUNDLE||'docs/assets/vendor/opensheetmusicdisplay-2.1.2.min.js';
 assert.ok(fs.existsSync(rendererPath),'Required OSMD renderer is missing: '+rendererPath);
 {
  Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get:()=>1100});
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get:()=>1100});
  w.HTMLCanvasElement.prototype.getContext=()=>({measureText:text=>({width:String(text).length*7,actualBoundingBoxAscent:10,actualBoundingBoxDescent:3})});
  w.eval(fs.readFileSync(rendererPath,'utf8'));
  const renderer=new w.opensheetmusicdisplay.OpenSheetMusicDisplay(w.document.querySelector('#sheet'),{backend:'svg',autoResize:false,pageFormat:'Endless'});
  await renderer.load(xml);renderer.render();
  assert.equal(renderer.Sheet.SourceMeasures.length,35);assert.ok(w.document.querySelector('svg path'));
  console.log('PASS actual OSMD rendering: all 35 measures, tuplets, ornaments and two voices');
 }
 console.log('PASS full page: all 10 source lines, bars 7–35 audible, 276 attacks, 140 stable beats, explicit editorial rest, MusicXML and MIDI ending at final bar');
 dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
