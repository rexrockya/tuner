import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const source=JSON.parse(await fs.readFile('notes/transcriptions/violin-upload-2026-09-06-1.json','utf8'));
const out=path.resolve('docs/assets/scores'), id=source.id, divisions=48;
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Integer ticks preserve tuplets without accumulating rounding drift.
const rhythm={w:[192,'whole'],h:[96,'half'],dh:[144,'half',1],q:[48,'quarter'],dq:[72,'quarter',1],e:[24,'eighth'],de:[36,'eighth',1],s:[12,'16th'],st:[8,'16th',0,3,2],et:[16,'eighth',0,3,2],sx:[8,'16th',0,6,4]};
const natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function pitch(name){const m=/^([A-G])([#b]?)(\d)$/.exec(name);assert.ok(m,`Invalid pitch ${name}`);const alter=m[2]==='#'?1:m[2]==='b'?-1:0;return{step:m[1],alter,octave:+m[3],midi:12*(+m[3]+1)+natural[m[1]]+alter};}
const pitchXml=p=>`<pitch><step>${p.step}</step><alter>${p.alter}</alter><octave>${p.octave}</octave></pitch>`;
const notes=[],measureStarts=[],xmlBars=[],ties=new Map();let absolute=0;
function attack(name,start,length,voice,measure,extra={}){assert.ok(length>0);const n={pitch:pitch(name).midi,quarter:start/divisions,durationQuarters:length/divisions,track:voice,velocity:88,measure,...extra};notes.push(n);return n;}
function tokens(text){let time=0;return text.split(/\s+/).map(token=>{const [names,raw]=token.split('/'),tie=raw.endsWith('~')?'start':raw.endsWith('_')?'stop':null,kind=raw.replace(/[~_]$/,'');assert.ok(rhythm[kind],token);const def=rhythm[kind],n={names:names.split('+'),kind,tie,def,start:time};time+=def[0];return n;});}
function graceXml(names,voice,previous,percent){return names.map(name=>`<note><grace slash="yes" steal-time-${previous?'previous':'following'}="${percent}"/>${pitchXml(pitch(name))}<voice>${voice+1}</voice><type>16th</type></note>`).join('');}
for(const [barIndex,bar] of source.bars.entries()){
  const number=barIndex+1,voices=(bar.voices||[bar.notes]).map(tokens);
  measureStarts.push(absolute/divisions*60/source.bpm);
  for(const voice of voices)assert.equal(voice.reduce((sum,n)=>sum+n.def[0],0),192,`Measure ${number} must contain 4 beats in each voice`);
  let xml=`<measure number="${number}">`;
  if(barIndex===0)xml+=`<attributes><divisions>${divisions}</divisions><key><fifths>2</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${source.bpm}</per-minute></metronome></direction-type><sound tempo="${source.bpm}"/></direction>`;
  if(bar.words||bar.warning)xml+=`<direction placement="above"><direction-type><words font-size="9"${bar.warning?' color="#B34B00"':''}>${escape([bar.words,bar.warning].filter(Boolean).join(' · '))}</words></direction-type></direction>`;
  if(bar.dynamic)xml+=`<direction placement="below"><direction-type><dynamics><${bar.dynamic}/></dynamics></direction-type></direction>`;
  for(const [voiceIndex,voice] of voices.entries()){
    if(voiceIndex)xml+='<backup><duration>192</duration></backup>';
    const accidentals=new Map();
    const slurs=bar.voiceSlurs?.[voiceIndex] || (voiceIndex===0?bar.slurs:[]) || [];
    // Beam runs are bounded by beats; written tuplet numbers remain separate.
    const groupAt=idx=>{const n=voice[idx];return n&&n.names[0]!=='R'&&n.def[0]<=36?Math.floor(n.start/48):-1;};
    let tupletIndex=0;
    for(const [index,n] of voice.entries()){
      const before=voiceIndex===0&&bar.graceBefore?.at===index?bar.graceBefore:null;
      const after=voiceIndex===0&&bar.graceAfter?.at===index?bar.graceAfter:null;
      const trill=voiceIndex===0&&bar.trill?.at===index?bar.trill:null;
      const beforeTicks=before?6*before.pitches.length:0,afterTicks=after?6*after.pitches.length:0;
      if(before){xml+=graceXml(before.pitches,voiceIndex,false,6/n.def[0]*100);before.pitches.forEach((name,i)=>attack(name,absolute+n.start+i*6,6,voiceIndex,number,{ornament:'grace'}));}
      if(n.def[3]){if(index===0||voice[index-1].kind!==n.kind||tupletIndex===n.def[3])tupletIndex=0;}else tupletIndex=0;
      for(const [chordIndex,name] of n.names.entries()){
        const rest=name==='R',p=rest?null:pitch(name),editorial=bar.editorialRest===index;
        const hiddenRest=rest&&voices.length>1&&voiceIndex===0;
        xml+=`<note${editorial?' color="#B34B00"':''}${hiddenRest?' print-object="no"':''}>${chordIndex?'<chord/>':''}${rest?'<rest/>':pitchXml(p)}<duration>${n.def[0]}</duration>${n.tie?`<tie type="${n.tie}"/>`:''}<voice>${voiceIndex+1}</voice><type>${n.def[1]}</type>${n.def[2]?'<dot/>':''}`;
        if(p){
          const key=p.step+p.octave,baseline='FC'.includes(p.step)?1:0,previous=accidentals.has(key)?accidentals.get(key):baseline;
          if(previous!==p.alter)xml+=`<accidental>${p.alter===1?'sharp':p.alter===-1?'flat':'natural'}</accidental>`;
          accidentals.set(key,p.alter);
          const tieKey=voiceIndex+':'+p.midi;
          if(n.tie==='stop'){
            const earlier=ties.get(tieKey);assert.ok(earlier,`Missing tie start ${number}:${name}`);
            assert.ok(Math.abs((earlier.quarter+earlier.durationQuarters)*48-absolute-n.start)<1e-8);
            earlier.durationQuarters+=n.def[0]/48;ties.delete(tieKey);
          }else if(trill){
            const length=n.def[0]-beforeTicks-afterTicks;
            for(let t=0,i=0;t<length;t+=6,i++)attack(i%2?trill.upper:name,absolute+n.start+beforeTicks+t,Math.min(6,length-t),voiceIndex,number,{ornament:'trill'});
          }else{
            const event=attack(name,absolute+n.start+beforeTicks,n.def[0]-beforeTicks-afterTicks,voiceIndex,number);
            if(n.tie==='start')ties.set(tieKey,event);
          }
        }
        if(n.def[3])xml+=`<time-modification><actual-notes>${n.def[3]}</actual-notes><normal-notes>${n.def[4]}</normal-notes><normal-type>${n.def[1]}</normal-type></time-modification>`;
        if(voices.length>1&&!rest)xml+=`<stem>${voiceIndex===0?'up':'down'}</stem>`;
        const group=groupAt(index),previousGroup=groupAt(index-1),nextGroup=groupAt(index+1);
        if(!chordIndex&&group>=0&&(previousGroup===group||nextGroup===group)){
          xml+=`<beam number="1">${previousGroup!==group?'begin':nextGroup!==group?'end':'continue'}</beam>`;
          if(n.def[1]==='16th'){
            const previousShort=previousGroup===group&&voice[index-1].def[1]==='16th',nextShort=nextGroup===group&&voice[index+1].def[1]==='16th';
            xml+=`<beam number="2">${previousShort?(nextShort?'continue':'end'):(nextShort?'begin':previousGroup===group?'backward hook':'forward hook')}</beam>`;
          }
        }
        const notation=[];
        if(n.tie)notation.push(`<tied type="${n.tie}"/>`);
        if(!chordIndex){
          slurs.forEach(([start,end],i)=>{if(index===start)notation.push(`<slur type="start" number="${i+1}"/>`);if(index===end)notation.push(`<slur type="stop" number="${i+1}"/>`);});
          if(bar.fermata?.includes(index))notation.push('<fermata/>');
          if(trill)notation.push('<ornaments><trill-mark/></ornaments>');
          if(n.def[3]){if(tupletIndex===0)notation.push('<tuplet type="start" number="1" bracket="no"/>');if(tupletIndex===n.def[3]-1)notation.push('<tuplet type="stop" number="1"/>');}
        }
        if(notation.length)xml+='<notations>'+notation.join('')+'</notations>';
        xml+='</note>';
      }
      if(after){xml+=graceXml(after.pitches,voiceIndex,true,6/n.def[0]*100);after.pitches.forEach((name,i)=>attack(name,absolute+n.start+n.def[0]-afterTicks+i*6,6,voiceIndex,number,{ornament:'grace'}));}
      if(n.def[3])tupletIndex++;
    }
  }
  if(number===source.bars.length)xml+='<barline location="right"><bar-style>light-light</bar-style></barline>';
  xmlBars.push(xml+'</measure>');absolute+=192;
}
assert.equal(ties.size,0);assert.equal(source.bars.length,35);
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="4.0"><work><work-title>Allegro moderato · 整页可播放校对版</work-title></work><identification><creator type="transcriber">来图人工辅助转录 · 2026-09-07</creator></identification><part-list><score-part id="P1"><part-name>小提琴</part-name><score-instrument id="I1"><instrument-name>Violin</instrument-name></score-instrument><midi-instrument id="I1"><midi-channel>1</midi-channel><midi-program>41</midi-program></midi-instrument></score-part></part-list><part id="P1">${xmlBars.join('\n')}</part></score-partwise>\n`;
notes.sort((a,b)=>a.quarter-b.quarter||a.track-b.track||a.pitch-b.pitch);
const seconds=60/source.bpm, catalogPath=path.join(out,'catalog.json'),catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
const entry=catalog.find(score=>score.id===id);assert.ok(entry,'Upload must already exist');
Object.assign(entry,{title:source.title,genre:'来图转录 · 整页可播放',level:'整页校对版',duration:absolute/48*seconds,measures:35});
const manifest={...entry,musicXml:id+'.musicxml',midi:id+'.mid',sourceBpm:source.bpm,timeSignature:source.meter,measureStarts,
  coverage:source.coverage,sourceLineCount:10,transcriptionVersion:'20260907-full-page-1',
  notes:notes.map(({quarter,durationQuarters,...n})=>({...n,time:quarter*seconds,duration:durationQuarters*seconds})),
  initialPosition:24*seconds,reviewNotice:'整页可播放，仍待校对。'+source.review.join(' '),
  editorialCorrections:source.bars.flatMap((bar,i)=>bar.warning?[{measure:i+1,text:bar.warning,addedRestQuarters:bar.editorialRest!==undefined?.5:0}]:[]),
  source:{label:'查看上传完整原图 · 2026-09-06',url:source.sourceImage}};
function vlq(value){let a=[value&127];while(value>>=7)a.unshift((value&127)|128);return a;}
const tempo=Math.round(60000000/source.bpm),events=[{tick:0,order:0,bytes:[255,81,3,tempo>>16,(tempo>>8)&255,tempo&255]},
  {tick:0,order:1,bytes:[255,88,4,4,2,24,8]},{tick:0,order:2,bytes:[255,89,2,2,0]},{tick:0,order:3,bytes:[192,40]}];
for(const n of notes){events.push({tick:Math.round(n.quarter*480),order:5,bytes:[144,n.pitch,n.velocity]},{tick:Math.round((n.quarter+n.durationQuarters)*480),order:4,bytes:[128,n.pitch,0]});}
events.push({tick:absolute*10,order:9,bytes:[255,47,0]});events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
let previous=0;const bytes=[];for(const e of events){bytes.push(...vlq(e.tick-previous),...e.bytes);previous=e.tick;}
const trackHeader=Buffer.alloc(8);trackHeader.write('MTrk');trackHeader.writeUInt32BE(bytes.length,4);
const midi=Buffer.concat([Buffer.from([77,84,104,100,0,0,0,6,0,0,0,1,1,224]),trackHeader,Buffer.from(bytes)]);
await fs.writeFile(path.join(out,id+'.musicxml'),xml);
await fs.writeFile(path.join(out,id+'.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(out,id+'.mid'),midi);
await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(`Full page: 10 source systems, ${source.bars.length} measures, ${notes.length} attacks, ${absolute/48} quarters, ${manifest.duration.toFixed(3)} seconds; 1 explicitly marked editorial half-beat rest.`);
