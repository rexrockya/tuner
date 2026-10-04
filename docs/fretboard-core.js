/* Source-faithful fretboard navigation. Timing is in quarter-note beats.
   Shapes are optional landmarks, never replacement source fingerings. */
(function (root) {
  'use strict';
  const OPEN = [0, 64, 59, 55, 50, 45, 40];
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const LETTERS = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
  const DEGREES = ['1','♭9','9','♯9','3','11','♯11','5','♭13','13','♭7','7'];
  const mod = n => ((n % 12) + 12) % 12;
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const midi = (string, fret) => Number.isInteger(string) && string >= 1 && string <= 6 && Number.isInteger(fret) && fret >= 0 ? OPEN[string] + fret : null;
  const pitch = n => Number.isInteger(n) ? NAMES[mod(n)] + (Math.floor(n / 12) - 1) : '?';
  const normalizeAccidentals = value => String(value).replace(/♭/g, 'b').replace(/♯/g, '#').replace(/𝄫/g, 'bb').replace(/𝄪/g, '##');
  function pitchClass(value) {
    const match = normalizeAccidentals(value).match(/^([A-Ga-g])(bb|##|b|#|x)?$/);
    if (!match) return null;
    const alteration = {bb:-2, b:-1, '#':1, '##':2, x:2}[match[2]] || 0;
    return mod(LETTERS[match[1].toUpperCase()] + alteration);
  }
  function unknownChord(name, reason, noChord=false) {
    return {name:String(name || '和声未知'), sourceName:String(name || ''), known:false, noChord, rootPc:null, bassPc:null, tones:{}, intervals:[], family:'unknown', quality:'unknown', anchors:[], shapes:[], shapeReason:'和声未确认，不生成 CAGED 地标。', bridge:'没有已确认的根音。', reason};
  }

  // Templates are standard open-position forms. Every displayed transposition is
  // checked against the parsed chord tones; unsupported qualities get no shape.
  const SHAPES = {
    major: [
      ['C',0,[null,3,2,0,1,0]], ['A',9,[null,0,2,2,2,0]],
      ['G',7,[3,2,0,0,0,3]], ['E',4,[0,2,2,1,0,0]], ['D',2,[null,null,0,2,3,2]]
    ],
    minor: [['A',9,[null,0,2,2,1,0]], ['E',4,[0,2,2,0,0,0]], ['D',2,[null,null,0,2,3,1]]],
    dominant: [
      ['C',0,[null,3,2,3,1,0]], ['A',9,[null,0,2,0,2,0]],
      ['G',7,[3,2,0,0,0,1]], ['E',4,[0,2,0,1,0,0]], ['D',2,[null,null,0,2,1,2]]
    ],
    major7: [
      ['C',0,[null,3,2,0,0,0]], ['A',9,[null,0,2,1,2,0]],
      ['G',7,[3,2,0,0,0,2]], ['E',4,[0,2,1,1,0,0]], ['D',2,[null,null,0,2,2,2]]
    ],
    minor7: [['A',9,[null,0,2,0,1,0]], ['E',4,[0,2,0,0,0,0]], ['D',2,[null,null,0,2,1,1]]],
    minorMajor7: [['A',9,[null,0,2,1,1,0]], ['E',4,[0,2,1,0,0,0]], ['D',2,[null,null,0,2,2,1]]],
    sus2: [['A',9,[null,0,2,2,0,0]], ['D',2,[null,null,0,2,3,0]]],
    sus4: [['A',9,[null,0,2,2,3,0]], ['E',4,[0,2,2,2,0,0]], ['D',2,[null,null,0,2,3,3]]]
  };
  function landmarks(ch, options={}) {
    if (!ch.known || ch.bassPc !== null) return [];
    const templates = SHAPES[ch.shapeFamily] || [];
    const maxFret = Number.isInteger(options.maxFret) && options.maxFret >= 0 ? options.maxFret : 24;
    const focus = finite(options.focusFret) ? options.focusFret : 5;
    const result = [];
    for (const [family, templateRoot, template] of templates) {
      const base = mod(ch.rootPc - templateRoot);
      for (let shift=base; shift<=maxFret; shift+=12) {
        const frets = template.map(f => f === null ? null : f + shift);
        // Open C7 uses all four fretting fingers. When moved up the neck, mute
        // string 1 rather than inventing a fifth finger for its former open E.
        if(ch.shapeFamily==='dominant'&&family==='C'&&shift>0) frets[5]=null;
        const sounding = frets.flatMap((f,i) => f === null ? [] : [{string:6-i, fret:f, midi:midi(6-i,f)}]);
        if (sounding.some(n => n.fret > maxFret || !Object.hasOwn(ch.tones,mod(n.midi-ch.rootPc)))) continue;
        const stopped = sounding.filter(n => n.fret > 0).map(n => n.fret);
        if (stopped.length && Math.max(...stopped)-Math.min(...stopped)>4) continue;
        const complete = ch.intervals.every(interval => sounding.some(n => mod(n.midi-ch.rootPc) === interval));
        const notation = frets.map(f => f === null ? 'x' : String(f)).join('–');
        result.push({name:`${family}${/^minor/.test(ch.shapeFamily) ? ' 小调' : ''} 形 · ${ch.name}${complete ? '' : ' 骨架'}`, family, frets, notes:sounding, complete, minFret:Math.min(...sounding.map(n=>n.fret)), maxFret:Math.max(...sounding.map(n=>n.fret)),
          note:`${ch.name} 的 ${family} 形${complete ? '和弦' : '部分和弦音'}地标：${notation}（从 6 弦到 1 弦）。${complete ? '' : '未包含全部扩展音。'}只作位置参考，不要求整把按住，也不替换原谱指法。`,
          distance:Math.abs(sounding.reduce((sum,n)=>sum+n.fret,0)/sounding.length-focus)});
      }
    }
    return result.sort((a,b)=>a.distance-b.distance || a.family.localeCompare(b.family));
  }
  function rootPositions(ch, maxFret=24) {
    if (!ch || !ch.known || ch.rootPc === null) return [];
    const roots = [];
    for (const string of [6,5]) for (let fret=0;fret<=maxFret;fret++) if (mod(midi(string,fret))===ch.rootPc) roots.push({string,fret,midi:midi(string,fret),name:pitch(midi(string,fret))});
    return roots;
  }
  function parseChord(value, options={}) {
    const original = typeof value === 'string' ? value.trim() : '';
    if (!original || /^(?:N\.?\s*C\.?|no\s*chord|none|X|\?)$/i.test(original)) return unknownChord(original, '没有可确认的和弦标记。', /^N\.?\s*C\.?$|^no\s*chord$|^none$/i.test(original));
    const token = normalizeAccidentals(original).replace(/\s+/g,'').replace(/[−–]/g,'-');
    const match = token.match(/^([A-Ga-g])(bb|##|b|#|x)?(.*)$/);
    if (!match) return unknownChord(original,'无法识别根音或和弦名称。');
    const rootName = match[1].toUpperCase() + (match[2] || '');
    const rootPc = pitchClass(rootName);
    let suffix = match[3], bassPc=null, bassName='';
    const slash = suffix.match(/\/([A-Ga-g](?:bb|##|b|#|x)?)$/);
    if (slash) {bassName=slash[1][0].toUpperCase()+slash[1].slice(1);bassPc=pitchClass(bassName);suffix=suffix.slice(0,-slash[0].length);}
    const colon = suffix.startsWith(':');
    if (colon) suffix=suffix.slice(1);
    // BopLand's bare "maj" is maj7. Harte/GuitarSet :maj is a triad.
    if (!colon && options.notation === 'bopland' && /^maj$/i.test(suffix)) suffix='maj7';
    suffix=suffix.replace(/^Δ$/,'maj7').replace(/^Δ(?=\d)/,'maj').replace(/^M(?=\d|$)/,'maj')
      .replace(/^major/i,'maj').replace(/^minor/i,'m').replace(/^min/i,'m')
      .replace(/^maj/i,'maj').replace(/^-(?=\d|$)/,'m')
      .replace(/^(?:ø|hdim|half-diminished)(?:7)?$/i,'m7b5').replace(/^[o°](?=7|$)/,'dim')
      .replace(/^m(?:M|Maj|maj|\+)(?=7|9|11|13)/,'mmaj').replace(/7-5/g,'7b5');
    if (suffix.includes('(') || suffix.includes(')')) {
      if (!/^[^()]*\([^()]+\)$/.test(suffix)) return unknownChord(original,'不支持此和弦后缀。');
      suffix=suffix.replace(/[()]/g,'').replace(/,/g,'');
      suffix=suffix.replace(/^mmaj/i,'mmaj');
    }
    // Parse the entire suffix. An unrecognized tail must never become a C/major fallback.
    const quality = suffix.match(/^(maj|mmaj|m|dim|aug|\+)?(6\/9|13|11|9|7|6|5)?(sus2|sus4|sus)?((?:add(?:13|11|9|6|4|2)|[b#](?:13|11|9|5))*)$/);
    // Also allow the common sus4/sus2-before-7 spelling.
    if (!quality && /^(sus2|sus4|sus)(7|9|11|13)$/.test(suffix)) return parseChord(rootName+suffix.replace(/^(sus2|sus4|sus)(.*)$/,'$2$1')+(bassName?'/'+bassName:''), {...options, notation:'standard'});
    if (!quality) return unknownChord(original,'不支持此和弦后缀；不推测骨架或形状。');
    const base=quality[1] || '', extension=quality[2] || '', suspension=quality[3] || '', alterations=quality[4] || '';
    if (suspension && base && base!=='maj') return unknownChord(original,'混合的三度与挂留标记未支持。');
    if (extension==='5' && (base || suspension || alterations)) return unknownChord(original,'不支持此五和弦后缀。');
    let family=base==='m'||base==='mmaj'?'minor':base==='dim'?'diminished':base==='aug'||base==='+'?'augmented':suspension?'suspended':'major';
    const tones={0:'1'};
    if(extension==='5') tones[7]='5';
    else if(suspension) {tones[suspension==='sus2'?2:5]=suspension==='sus2'?'2':'4';tones[7]='5';}
    else {tones[family==='minor'||family==='diminished'?3:4]=family==='minor'||family==='diminished'?'♭3':'3';tones[family==='diminished'?6:family==='augmented'?8:7]=family==='diminished'?'♭5':family==='augmented'?'♯5':'5';}
    const seventh=['7','9','11','13'].includes(extension);
    if(seventh) {const semitones=base==='maj'||base==='mmaj'?11:family==='diminished'?9:10;tones[semitones]=semitones===11?'7':semitones===9?'𝄫7':'♭7';if(family==='major'&&base!=='maj') family='dominant';}
    if(extension==='6'||extension==='6/9') tones[9]='6';
    if(['9','11','13','6/9'].includes(extension)) tones[2]='9';
    if(['11','13'].includes(extension)) tones[5]='11';
    if(extension==='13') tones[9]='13';
    for(const alteration of alterations.match(/add(?:13|11|9|6|4|2)|[b#](?:13|11|9|5)/g)||[]) {
      if(alteration.startsWith('add')) {const degree=+alteration.slice(3),semitones={2:2,4:5,6:9,9:2,11:5,13:9}[degree];tones[semitones]=String(degree);}
      else {const degree=+alteration.slice(1),natural={5:7,9:2,11:5,13:9}[degree],semitones=mod(natural+(alteration[0]==='b'?-1:1));delete tones[natural];tones[semitones]=(alteration[0]==='b'?'♭':'♯')+degree;}
    }
    if(base==='m'&&extension==='7'&&alterations==='b5') family='half-diminished';
    let shapeFamily=family==='dominant'?'dominant':family==='minor'?(seventh?(base==='mmaj'?'minorMajor7':'minor7'):'minor'):family==='major'?(seventh?'major7':'major'):family==='suspended'?(suspension==='sus2'?'sus2':'sus4'):null;
    if(extension==='5'||/[b#]5/.test(alterations)) shapeFamily=null;
    const name=rootName+suffix+(bassName?'/'+bassName:'');
    const ch={name,sourceName:original,known:true,noChord:false,rootPc,bassPc,bassName,tones,intervals:Object.keys(tones).map(Number).sort((a,b)=>a-b),family,quality:suffix || 'major',shapeFamily};
    const maxFret=Number.isInteger(options.maxFret)&&options.maxFret>=0?options.maxFret:24;
    const roots=rootPositions(ch,maxFret),focus=finite(options.focusFret)?options.focusFret:5;
    roots.sort((a,b)=>Math.abs(a.fret-focus)-Math.abs(b.fret-focus)||a.string-b.string);
    ch.anchors=roots.map(n=>[n.string,n.fret]);
    ch.shapes=landmarks(ch,options);
    ch.shapeReason=ch.shapes.length?'':bassPc!==null?'斜线和弦保留指定低音；这里不套用根音位置的整把 CAGED 指法。':'此和弦暂不提供经过验证的 CAGED 形状，可查看根音与实际和弦音。';
    const first=roots[0],second=roots.find(n=>first&&!(n.string===first.string&&n.fret===first.fret));
    ch.bridge=first?`${first.name}（${first.string} 弦 ${first.fret} 品）是 ${name} 的根音。${second?`${second.name}（${second.string} 弦 ${second.fret} 品）${second.midi===first.midi?'是同一实音':`与它相差 ${Math.abs(second.midi-first.midi)/12} 个八度`}。`:''}${bassPc!==null?`斜线指定的低音是 ${bassName}，不一定是根音。`:''}`:'当前指板范围没有低弦根音。';
    return ch;
  }
  function role(ch, pc, annotation) {
    if(!ch||!ch.known||ch.rootPc===null||!finite(pc)) return {degree:'?',kind:'unknown',description:'当前和声未确认，暂不判断此音的和弦角色。'};
    const interval=mod(pc-ch.rootPc);
    if(annotation && typeof annotation==='object' && annotation.kind==='approach' && annotation.analysis?.verified===true && typeof annotation.analysis.description==='string' && annotation.analysis.description.trim()) return {degree:'趋近',kind:'approach',description:annotation.analysis.description};
    if(Object.hasOwn(ch.tones,interval)) return {degree:ch.tones[interval],kind:'skeleton',description:`${ch.name} 的 ${ch.tones[interval]} 音 · 和弦骨架`};
    if(ch.bassPc!==null&&mod(pc)===ch.bassPc) return {degree:DEGREES[interval],kind:'bass',description:`${ch.name} 明确指定的斜线低音 ${ch.bassName}；不属于上方和弦的基本音组。`};
    return {degree:DEGREES[interval],kind:'color',description:`${ch.name} 的 ${DEGREES[interval]} · 骨架外的音，需结合旋律走向判断；不据此指定音阶或趋近功能。`};
  }
  function equivalents(value,maxFret=24) {
    const n=typeof value==='object'&&value?value.midi:value;
    if(!Number.isInteger(n)||!Number.isInteger(maxFret)||maxFret<0) return [];
    const result=[];
    for(let string=1;string<=6;string++) for(let fret=0;fret<=maxFret;fret++) {
      const m=midi(string,fret);
      if(mod(m)!==mod(n)) continue;
      const octaves=(m-n)/12;
      result.push({string,fret,midi:m,name:pitch(m),samePitch:m===n,octaves,semitones:m-n,relation:octaves===0?'unison':octaves<0?'octave-down':'octave-up'});
    }
    return result;
  }
  function meterInfo(value) {
    let numerator,denominator;
    if(typeof value==='string') {const m=value.match(/^(\d+)\s*\/\s*(\d+)$/);if(m){numerator=+m[1];denominator=+m[2];}}
    else if(Array.isArray(value)) [numerator,denominator]=value;
    else if(value&&typeof value==='object') {numerator=value.numerator;denominator=value.denominator;}
    if(!Number.isInteger(numerator)||numerator<=0||!Number.isInteger(denominator)||denominator<=0) return {numerator:4,denominator:4,beatsPerBar:4,inferred:true};
    return {numerator,denominator,beatsPerBar:numerator*4/denominator,inferred:false};
  }
  function createLesson(source,options={}) {
    if(!source||!Array.isArray(source.notes)) throw new TypeError('Source lesson must contain a notes array.');
    if(source.timeUnit&&source.timeUnit!=='quarter-note-beats'&&!(source.timeUnit==='schematic-layout-units'&&source.timing?.schematic===true)) throw new TypeError('Source timing must be expressed in quarter-note-beats.');
    const meter=meterInfo(source.meter),warnings=[],NOTES=[],rests=[];
    for(const [sourceIndex,n] of source.notes.entries()) {
      if(!n||!finite(n.start)||!finite(n.duration)||n.duration<=0) throw new TypeError(`Invalid source timing at note ${sourceIndex}.`);
      if(n.rest===true||n.type==='rest') {rests.push({...n,type:'rest',sourceIndex});continue;}
      if(!Number.isInteger(n.midi)||n.midi<0||n.midi>127||midi(n.string,n.fret)===null) throw new TypeError(`Invalid source pitch or TAB position at note ${sourceIndex}.`);
      if(midi(n.string,n.fret)!==n.midi) warnings.push({type:'pitch-position-mismatch',sourceIndex,message:'原谱音高与标准调弦的位置不一致，保留两项原始数据，不自动改指法。'});
      NOTES.push({...n,index:NOTES.length,sourceIndex:n.index??sourceIndex,name:n.name||pitch(n.midi),end:n.start+n.duration});
    }
    for(const e of source.events||[]) if(e&&(e.type==='rest'||e.rest===true)&&finite(e.start)&&finite(e.duration)&&e.duration>0) rests.push({...e,type:'rest'});
    const maxSourceFret=Math.max(0,...NOTES.map(n=>n.fret)),maxFret=Math.max(24,Math.ceil(maxSourceFret/12)*12);
    const chordEvents=(source.chords||[]).map((c,index)=>{
      if(!c||!finite(c.start)||!finite(c.duration)||c.duration<=0) throw new TypeError(`Invalid source chord timing at ${index}.`);
      return {...c,sourceIndex:index,end:c.start+c.duration};
    }).sort((a,b)=>a.start-b.start||a.sourceIndex-b.sourceIndex);
    const rawDuration=Math.max(0,finite(source.duration)?source.duration:0,...NOTES.map(n=>n.end),...rests.map(n=>n.start+n.duration),...chordEvents.map(c=>c.end),!finite(source.duration)&&Number.isInteger(source.bars)?source.bars*meter.beatsPerBar:0);
    // GuitarSet's source crop is sample-accurate, while note time and duration
    // are each rounded to six decimals in seconds. Their sum can exceed the
    // crop by <= 1 microsecond. Clamp only that documented display boundary;
    // retain every original note start/duration/end, and never hide a real gap.
    const roundingToleranceBeats=source.source?.type==='guitarset'&&finite(source.originalBpm)?source.originalBpm/60*0.000001:0;
    const roundingExcess=finite(source.duration)?rawDuration-source.duration:0;
    const duration=roundingToleranceBeats>0&&roundingExcess>0&&roundingExcess<=roundingToleranceBeats+Number.EPSILON*64?source.duration:rawDuration;
    const CHORDS=Object.create(null),unknown=unknownChord('和声未知','该时间段没有和声标注。');CHORDS[unknown.name]=unknown;
    const notation=options.notation||source.notation||(/bopland/i.test([source.source?.name,source.source?.type].filter(Boolean).join(' '))?'bopland':'standard');
    const middle=values=>values.length?values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)]:5;
    for(const event of chordEvents) {
      const focusFret=middle(NOTES.filter(n=>n.start<event.end&&n.end>event.start).map(n=>n.fret));
      const ch=parseChord(event.name,{notation,maxFret,focusFret});
      event.chord=ch.name;
      if(!Object.hasOwn(CHORDS,ch.name)) CHORDS[ch.name]=ch;
    }
    const overlapping=unknownChord('和声标注重叠','同一时间存在不同和弦标注，暂不择一推测。');
    function chordEventAt(beat) {
      const active=chordEvents.filter(c=>c.start<=beat&&c.end>beat);
      if(!active.length) return null;
      if(new Set(active.map(c=>c.chord)).size>1) return {chord:overlapping.name,ambiguous:true,events:active};
      return active[active.length-1];
    }
    function chordAt(beat) {const event=chordEventAt(beat);return event?(event.ambiguous?overlapping:CHORDS[event.chord]):unknown;}
    const explicitSegments=Array.isArray(source.segments)?source.segments:[];
    const boundaries=[0,duration,...chordEvents.flatMap(c=>[c.start,c.end]),...explicitSegments.flatMap(s=>[s.start,s.start+s.duration])].filter(t=>finite(t)&&t>=0&&t<=duration);
    const points=[],SEGMENTS=[],machineTolerance=Number.EPSILON*Math.max(1,duration)*8;
    // Coalesce only floating-point representations of the same boundary (for
    // example 16 versus 16.000000000000004), keeping the source crop endpoint.
    for(const point of [...new Set(boundaries)].sort((a,b)=>a-b)) {
      if(points.length&&point-points[points.length-1]<=machineTolerance) {if(point===duration) points[points.length-1]=point;}
      else points.push(point);
    }
    for(let i=0;i<points.length-1;i++) {
      const start=points[i],end=points[i+1];if(end<=start) continue;
      const event=chordEventAt(start+(end-start)/2),ch=chordAt(start+(end-start)/2);
      if(event?.ambiguous) CHORDS[ch.name]=ch;
      const extra=explicitSegments.find(s=>s.start===start&&s.duration===end-start)||{};
      const bar=extra.bar??(event?.start===start?event.bar:null)??Math.floor(start/meter.beatsPerBar)+1;
      const beat=source.timing?.schematic?null:extra.beat??(event?.start===start?event.beat:null)??(start%meter.beatsPerBar)*meter.denominator/4+1;
      SEGMENTS.push({...extra,index:SEGMENTS.length,chord:ch.name,chordEvent:event,start,end,duration:end-start,bar,beat,schematic:source.timing?.schematic===true,notes:[],activeNotes:[],title:extra.title||`${ch.name} · ${source.timing?.schematic?'和声地标':'原谱位置'}`,text:extra.text||(source.timing?.schematic?'和弦顺序与所属小节来自原始目录。分块宽度仅用于导航，不表示和弦实际起止拍点；尚未核对原谱逐音路线。':ch.known?'保留原谱的弦、品位与时值；以当前和弦的根音和骨架音对照旋律。骨架外的音需要结合前后走向判断。':'此段没有可确认的和声，只显示原谱与同音位置，不推测和弦或音阶。')});
    }
    function segmentAt(beat) {return SEGMENTS.find(s=>s.start<=beat&&s.end>beat)||null;}
    for(const note of NOTES) {
      const segment=segmentAt(note.start)||(note.start<0?SEGMENTS[0]:null);
      note.segment=segment?segment.index:0;
      if(segment) segment.notes.push(note);
      for(const s of SEGMENTS) if(note.start<s.end&&note.end>s.start) s.activeNotes.push(note);
    }
    const notesAt=beat=>beat>=duration?[]:NOTES.filter(n=>n.start<=beat&&n.end>beat);
    const events=[...NOTES.map(n=>({...n,type:'note',note:n})),...rests].sort((a,b)=>a.start-b.start||(a.index??0)-(b.index??0));
    const gaps=[];let covered=0;
    for(const n of NOTES.slice().sort((a,b)=>a.start-b.start)) {if(n.start>covered) gaps.push({type:'gap',start:covered,duration:n.start-covered,end:n.start,derived:true});covered=Math.max(covered,n.end);}
    if(covered<duration) gaps.push({type:'gap',start:covered,duration:duration-covered,end:duration,derived:true});
    return {OPEN,NAMES,CHORDS,NOTES,SEGMENTS,midi,pitch,mod,role,equivalents,parseChord,rootPositions,landmarks,source,data:source,id:source.id,title:source.title||'',meter:source.meter||'4/4',meterInfo:meter,beatsPerBar:meter.beatsPerBar,bars:source.bars??Math.ceil(duration/meter.beatsPerBar),duration,maxFret,maxSourceFret,warnings,events,EVENTS:events,gaps,chordEvents,chordAt,chordEventAt,notesAt,segmentAt,timing:source.timing||{},roundingToleranceBeats,timeUnit:source.timeUnit||'quarter-note-beats',harmonyOnly:source.timing?.schematic===true};
  }
  function catalogLesson(entry) {
    if(!entry||typeof entry!=='object') throw new TypeError('A source catalog entry is required.');
    const barChords=Array.isArray(entry.barChords)?entry.barChords.map(bar=>Array.isArray(bar)?bar.slice():[]):String(entry.progression||entry.chord||'').split(/[|→]/).map(bar=>bar.trim()).filter(Boolean).map(bar=>bar.split(/\s+/));
    const meter=meterInfo(entry.meter),chords=[];
    // These coordinates are layout slots only. Catalog bar membership does not
    // establish onset, duration, rhythm, notes, or synchronization with the audio.
    barChords.forEach((bar,index)=>bar.forEach((name,slot)=>chords.push({name,start:index*meter.beatsPerBar+slot*meter.beatsPerBar/bar.length,duration:meter.beatsPerBar/bar.length,bar:index+1,beat:null,precision:'schematic-slot',schematic:true,sourceSlot:slot})));
    return {...entry,notes:[],chords,bars:barChords.length,duration:barChords.length*meter.beatsPerBar,timeUnit:'schematic-layout-units',notation:entry.sourceType==='bopland'?'bopland':entry.notation||'standard',navigationMode:'harmony-only',source:entry.source&&typeof entry.source==='object'?entry.source:{name:entry.sourceType==='bopland'?'BopLand.org':entry.sourceType||'原始乐句目录',type:entry.sourceType||'catalog'},timing:{schematic:true,harmony:'bar-membership-only',noteTimingVerified:false,chordTimingVerified:false,audioSyncVerified:false,label:'分块仅用于和声导航，不代表拍点或时值'}};
  }
  const api={OPEN,NAMES,midi,pitch,mod,pitchClass,parseChord,role,equivalents,rootPositions,landmarks,meterInfo,createLesson,adaptLesson:createLesson,catalogLesson};
  root.FretboardCore=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
