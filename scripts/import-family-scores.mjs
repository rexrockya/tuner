// Publish only the reviewed draft artifacts supplied for this upload batch.
import fs from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve(process.argv[2] || '小提琴四到六级练习曲');
const target = path.resolve('docs/assets/scores');
const date = '2026-09-06';
const ids = ['image-01-opening', 'image-02-moderato', 'image-03-scales'];
const catalog = JSON.parse(await fs.readFile(path.join(target, 'catalog.json'), 'utf8'));
await fs.mkdir(path.join(target, 'uploads', date), {recursive:true});
for (const [index, originalId] of ids.entries()) {
  const draft = JSON.parse(await fs.readFile(path.join(source, '识别草稿', originalId+'.json'), 'utf8'));
  const id = `violin-upload-${date}-${index+1}`;
  const title = `${date} · 谱页 ${String(index+1).padStart(2,'0')}${index===0?'（开头节选）':''}`;
  const extension = path.extname(draft.source);
  const original = `uploads/${date}/page-${index+1}${extension}`;
  const seconds = 60/draft.bpm;
  const score = {id,title,composer:'曲名／作曲者待确认',genre: index===2?'音阶与琶音 · 待校对':'来图转录 · 待校对',level:'识别草稿',
    duration:draft.totalQuarters*seconds,measures:draft.bars.length,collection:'violin',defaultInstrument:'violin',folder:'小提琴四级到六级',uploadDate:date};
  const manifest = {...score,musicXml:id+'.musicxml',sourceBpm:draft.bpm,timeSignature:draft.meter,
    measureStarts:draft.bars.map((_,i)=>i*draft.meter[0]*seconds),
    notes:draft.notes.map(n=>({track:0,pitch:n.midi,velocity:88,time:n.quarter*seconds,duration:n.duration*seconds})),
    initialPosition:index===0?draft.notes[0].quarter*seconds:0,
    reviewNotice:`待校对：${draft.coverage} ${draft.review.join(' ')}`,
    source:{label:'查看上传原图 · 2026-09-06',url:'assets/scores/'+original}};
  await fs.copyFile(path.join(source,'原图',draft.source),path.join(target,original));
  await fs.copyFile(path.join(source,'识别草稿',originalId+'.musicxml'),path.join(target,id+'.musicxml'));
  await fs.writeFile(path.join(target,id+'.json'),JSON.stringify(manifest,null,2)+'\n');
  const existing=catalog.findIndex(s=>s.id===id);
  if(existing>=0)catalog[existing]=score;else catalog.push(score);
}
await fs.writeFile(path.join(target,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log('Published draft inputs prepared: 3 scores, date folders, original images, explicit review notices.');
