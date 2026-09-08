(function () {
  'use strict';
  const H = window.tunerHarmony, R = window.practiceArrangements;
  if (!H || !R || window.tunerGenres) return;
  const profiles = {
    blues: { label: 'Blues', subtitle: '蓝调 · 问答与摇摆', color: '#79a9ff', key: 'A', feel: 'shuffle', bpm: 96, style: 'blues', performer: 'storyteller', description: '从十二小节、蓝调音和问答句开始，让短句在和声变化中找到落点。', create: '17,47,17,57', backing: '17,17,17,17,47,47,17,17,57,47,17,57', timbres: { drums: 'vintage', bass: 'round', keys: 'jazz', rhythm: 'warm', percussion: 'natural', strings: 'warm', lead: 'warm' }, pools: { bass: ['walking','boogie','riff'], drums: ['shuffle','backbeat'], keys: ['soul','pad'], rhythm: ['boogie','offbeat'], percussion: ['shaker','none'], strings: ['response','none'] }, presets: [['十二小节', '17,17,17,17,47,47,17,17,57,47,17,57'], ['Quick change', '17,47,17,17,47,47,17,17,57,47,17,57'], ['小调 Blues', '1m7,1m7,4m7,1m7,b67,57,1m7,57']] },
    jazz: { label: 'Jazz', subtitle: '爵士 · 和弦音与连接', color: '#edbd68', key: 'C', feel: 'shuffle', bpm: 112, style: 'arpeggio', performer: 'navigator', description: '听三音和七音如何连接，以 ii–V–I、动机和留白练习即兴。', create: '2m7,57,1maj7,1maj7', backing: '2m7,57,1maj7,6m7,2m7,57,1maj7,1maj7', timbres: { drums: 'natural', bass: 'round', keys: 'jazz', rhythm: 'warm', percussion: 'bright', strings: 'chamber', lead: 'warm' }, pools: { bass: ['walking','fifths'], drums: ['ride','backbeat'], keys: ['offbeat','soul'], rhythm: ['chop','arpeggio'], percussion: ['shaker','none'], strings: ['response','none'] }, presets: [['ii–V–I', '2m7,57,1maj7,1maj7'], ['Turnaround', '1maj7,67,2m7,57'], ['小调 ii–V–i', '2m7b5,57,1m7,1m7']] },
    'funk-soul': { label: 'Funk / Soul', subtitle: '切分 · 短奏与应答', color: '#f1869f', key: 'A', feel: 'funk', bpm: 100, style: 'syncopated', performer: 'pocket', description: '让十六分切分与空拍交替；短奏锁住鼓和 Bass，再用 Soul 长句作回答。', create: '1m7,1m7,4m7,1m7', backing: '1m7,1m7,4m7,1m7,1m7,b7,4m7,1m7', timbres: { drums: 'crisp', bass: 'precision', keys: 'gospel', rhythm: 'dry', percussion: 'bright', strings: 'warm', lead: 'bright' }, pools: { bass: ['pocket','octave'], drums: ['funk','neo'], keys: ['soul','offbeat'], rhythm: ['sixteenth','soulcomp'], percussion: ['clap','tambourine','shaker'], strings: ['pulse','response'] }, presets: [['Minor pocket', '1m7,1m7,4m7,1m7'], ['Soul 应答', '1maj7,6m7,2m7,57'], ['Dominant vamp', '17,17,47,17']] },
    shoegaze: { label: 'Shoegaze', subtitle: '梦幻噪音 · 延音与层次', color: '#c4a2ef', key: 'D', feel: 'dream', bpm: 78, style: 'space', performer: 'atmospheric', description: '在缓慢变化的和弦上保持共同音，用重复动机、延音和空间音色建立层次。', create: '1sus2,6m7,4sus2,1sus2', backing: '1sus2,1sus2,6m7,6m7,4sus2,4sus2,1sus2,1sus2', timbres: { drums: 'vintage', bass: 'round', keys: 'soft', rhythm: 'ambient', percussion: 'natural', strings: 'air', lead: 'ambient' }, pools: { bass: ['sustain','fifths'], drums: ['wash','halftime'], keys: ['haze','pad'], rhythm: ['wash','arpeggio'], percussion: ['none','shaker'], strings: ['pad','response'] }, presets: [['悬挂音色', '1sus2,6m7,4sus2,1sus2'], ['缓慢展开', '1add9,1add9,b7add9,4add9'], ['共同音', '1maj7,6m7,4maj7,1maj7']] },
    folk: { label: 'Folk', subtitle: '民谣 · 旋律与分解', color: '#8fcea2', key: 'G', feel: 'folk', bpm: 92, style: 'motif', performer: 'storyteller', description: '用可唱的五声音阶动机、交替低音与分解伴奏，练习清楚的乐句呼吸。', create: '1,5,6,4', backing: '1,5,6,4,1,4,5,1', timbres: { drums: 'vintage', bass: 'muted', keys: 'soft', rhythm: 'dry', percussion: 'natural', strings: 'chamber', lead: 'dry' }, pools: { bass: ['fingerroot','fifths'], drums: ['soft','none'], keys: ['none'], rhythm: ['fingerpick','arpeggio'], percussion: ['shaker','tambourine','none'], strings: ['response','none'] }, presets: [['四和弦叙事', '1,5,6,4'], ['主属问答', '1,4,5,1'], ['小调叙事', '6,4,1,5']] },
    rnb: { label: 'R&B', subtitle: '节奏布鲁斯 · 留白与色彩', color: '#d99aed', key: 'C', feel: 'rnb', bpm: 76, style: 'call', performer: 'colorist', description: '在松弛的节奏上用七和弦、九音色彩和短装饰音作答，让休止也成为旋律。', create: '4maj7,3m7,6m7,2m7', backing: '4maj7,3m7,6m7,2m7,4maj7,3m7,6m7,57', timbres: { drums: 'vintage', bass: 'precision', keys: 'soft', rhythm: 'warm', percussion: 'bright', strings: 'warm', lead: 'warm' }, pools: { bass: ['pocket','sustain'], drums: ['neo','halftime'], keys: ['neo','soul'], rhythm: ['soulcomp','arpeggio'], percussion: ['clap','shaker','none'], strings: ['pad','response'] }, presets: [['七和弦循环', '4maj7,3m7,6m7,2m7'], ['九音色彩', '4maj9,3m7,6m9,2m9'], ['温柔终止', '2m7,57,1maj7,6m7']] }
  };
  const originalGenerate = H.generate, originalArrange = R.arrangement;
  const oldCatalogs = Object.fromEntries(['bass','drum','key','rhythm','percussion','strings'].map(track => [track, {...R[track+'Styles']}]));
  const oldFeels = {...R.feels};
  Object.assign(R.feels, { dream: {label:'Dream · 舒展四拍',swing:.5,bpm:78}, folk:{label:'Folk · 分解四拍',swing:.5,bpm:92}, rnb:{label:'R&B · 松弛四拍',swing:.5,bpm:76} });
  Object.assign(R.bassStyles, { pocket:'Pocket · 切分低音', sustain:'长音 · 根音铺底', fingerroot:'Folk · 交替低音' });
  Object.assign(R.drumStyles, { none:'None · 关闭', soft:'Folk · 轻鼓', wash:'Dream · 宽松重拍', neo:'R&B · 碎拍' });
  Object.assign(R.keyStyles, { haze:'Dream · 色彩长音', neo:'R&B · 七九和弦' });
  Object.assign(R.rhythmStyles, { sixteenth:'Funk · 十六分短切', fingerpick:'Folk · 交替分解', wash:'Dream · 延音和弦', soulcomp:'Soul · 留白应答' });
  for (const track of ['bass','drum','key','rhythm','percussion','strings']) R[track+'Styles'].auto = track === 'percussion' || track === 'strings' ? '风格与演奏取向自动变化' : '风格内自动变化';
  const normalize = id => Object.hasOwn(profiles,id) ? id : null;
  // Keep the historical parser and saved interval snapshots unchanged. New profiles
  // explicitly opt into sounding the color tones described by a chord's suffix.
  function enrich(parsed) {
    if (parsed.error) return parsed;
    const chords = parsed.chords.map(chord => {
      const intervals = [...chord.intervals], text = chord.suffix || '';
      const extension = text.replace(/^(maj|m|dim|aug|sus[24]?)/,'').match(/^(13|11|9)/)?.[1];
      if (extension) { intervals.push(14); if (+extension >= 11) intervals.push(17); if (+extension >= 13) intervals.push(21); }
      for (const match of text.matchAll(/add(2|4|9|11|13)/g)) intervals.push(({2:2,4:5,9:14,11:17,13:21})[match[1]]);
      for (const match of text.matchAll(/([b#])(9|11|13)/g)) {
        const natural = ({9:14,11:17,13:21})[match[2]], index = intervals.indexOf(natural);
        if (index !== -1) intervals.splice(index,1);
        intervals.push(natural+(match[1]==='b'?-1:1));
      }
      return {...chord, colorIntervals:[...new Set(intervals)]};
    });
    return {...parsed,chords,bars:parsed.bars.map((_,i)=>chords.filter(chord=>chord.bar===i))};
  }
  const cells = {
    'funk-soul': [[0,.75,1.5,2.25,2.75,3.5],[.25,.75,1.5,2.5,3.25,3.5]],
    shoegaze: [[0,2],[.5,2.5]], folk: [[0,.5,1,2,2.5,3],[0,1,1.5,2,3,3.5]],
    rnb: [[.5,1.25,1.5,2.75,3],[.25,1,1.25,2.5,3.25]]
  };
  function generate(parsed,seed,feel,options={}) {
    const genre=normalize(options.genre);
    if (!genre || options.legacy) return originalGenerate(parsed,seed,feel,options);
    if (genre==='blues') return {...originalGenerate(parsed,seed,genre,options),genre};
    if (genre==='jazz') {
      const phrase=originalGenerate(parsed,(seed>>>0)^0x5ab31,genre,options);let hand={fret:7,string:2};
      phrase.notes=phrase.notes.map((source,i,all)=>{
        const note={...source},index=parsed.chords.findIndex(chord=>note.beat>=chord.beat&&note.beat<chord.beat+chord.beats),chord=parsed.chords[index],next=parsed.chords[index+1];
        if(i!==all.length-1&&(!i||all[i-1].beat<chord.beat)){note.midi=H.nearest(chord.root+(index%2?chord.intervals[3]??chord.intervals[1]:chord.intervals[1]),note.midi,55,79);note.role=index%2?'七音连接':'三音连接';}
        else if(next&&options.style!=='arpeggio'&&note.beat>=chord.beat+chord.beats-.5){note.midi=Math.max(55,H.nearest(next.root+next.intervals[1],note.midi,55,79)-1);note.role='半音趋近下一和弦三音';}
        hand=finger(note.midi,hand);return {...note,...hand,articulation:note.duration>.9?'vibrato':'picked'};
      });
      return {...phrase,seed,genre};
    }
    if (parsed.error||!parsed.chords.length) throw Error(parsed.error||'先写一组和声');
    const random=H.rng((seed>>>0)^Object.keys(profiles).indexOf(genre)*0x45d9f3b), pick=items=>items[Math.floor(random()*items.length)];
    const requested=H.phraseStyles[options.style]?options.style:'mixed', intensity=H.phraseIntensities[options.intensity]?options.intensity:'standard';
    const styles=genre==='shoegaze'?['space','motif','arpeggio']:genre==='folk'?['motif','call','arpeggio']:['syncopated','call','motif','space'];
    const notes=[],structure=[],densityPlan=[], motif=pick([[0,1,0,2],[0,0,2,1],[2,1,0,1]]);
    let previous=64,hand={fret:7,string:2},activeStyle=requested==='mixed'?pick(styles):requested;
    parsed.chords.forEach((chord,index)=>{
      if (requested==='mixed'&&chord.bar%2===0&&index&&parsed.chords[index-1].bar!==chord.bar) activeStyle=pick(styles.filter(style=>style!==activeStyle));
      const answer=chord.bar%2===1,last=index===parsed.chords.length-1;
      const level=intensity==='auto'?(activeStyle==='call'?(answer?'easy':'advanced'):['easy','standard','advanced','standard'][chord.bar%4]):intensity;
      let count=({easy:2,standard:4,advanced:7,challenge:10})[level];
      if (genre==='shoegaze') count=({easy:1,standard:2,advanced:4,challenge:6})[level];
      if (activeStyle==='space') count=Math.max(1,Math.ceil(count*.65));
      if (activeStyle==='call'&&answer) count=Math.max(1,count-1);
      count=Math.max(1,Math.min(Math.round(count*chord.beats/4),Math.floor(chord.beats/.25)));
      const template=activeStyle==='syncopated'?[.25,.75,1.5,2.25,2.75,3.5]:activeStyle==='arpeggio'?[0,.5,1,1.5,2,2.5,3,3.5]:activeStyle==='blues'?[0,.5,1.5,2,2.5,3.5]:activeStyle==='space'?[0,2.5]:cells[genre][activeStyle==='motif'?0:chord.bar%cells[genre].length], maxOffset=chord.beats-(last ? .5 : .25);
      let offsets=[...new Set(template.map(beat=>Math.round(beat*chord.beats)*.25).filter(beat=>beat<=maxOffset))];
      // A sparse cell spans the phrase; dense cells add neighboring subdivisions.
      if (count<offsets.length) offsets=Array.from({length:count},(_,i)=>offsets[Math.floor(i*offsets.length/count)]);
      for (let beat=0;offsets.length<count&&beat<=maxOffset;beat+=.25) if (!offsets.includes(beat)) offsets.push(beat);
      offsets.sort((a,b)=>a-b);
      if (!offsets.length) offsets=[0];
      const minor=['minor','minor-major','half-dim'].includes(chord.family), tones=chord.colorIntervals||chord.intervals;
      const pent=minor?[0,3,5,7,10]:[0,2,4,7,9];
      const pool=activeStyle==='arpeggio'?tones:activeStyle==='blues'?[0,3,5,6,7,10]:genre==='shoegaze'?[0,tones[1],7,2]:genre==='rnb'?[...pent,14]:pent;
      structure.push({bar:chord.bar,style:activeStyle,response:answer});
      offsets.forEach((offset,n)=>{
        const interval=pool[(motif[n%motif.length]+(activeStyle==='arpeggio'?n:answer?1:0))%pool.length];
        let midi=H.nearest(chord.root+interval,genre==='shoegaze'?previous:previous+(n%2?2:-1),55,79),role=H.phraseStyles[activeStyle];
        if (genre==='shoegaze'&&n===0&&tones.some(tone=>H.mod(chord.root+tone)===H.mod(previous))) midi=previous;
        if (last&&n===offsets.length-1) {midi=H.nearest(chord.root,previous,55,79);role='根音收束';}
        const available=(offsets[n+1]??chord.beats)-offset, long=genre==='shoegaze'||last&&n===offsets.length-1;
        const gate=long?.96:genre==='funk-soul'?.55:genre==='folk'?.85:.76;
        const duration=available*gate; hand=H.fingering?H.fingering(midi,hand):finger(midi,hand);
        notes.push({beat:chord.beat+offset,duration,notationDuration:available,midi,bar:chord.bar,...hand,velocity:Math.min(.88,(n===0?.68:.48)+random()*.12),role,articulation:genre==='funk-soul'&&!long?'muted':genre==='shoegaze'&&duration>1?'vibrato':'picked',variant:Math.floor(random()*2)});
        previous=midi;
      });
      if (!densityPlan.some(plan=>plan.bar===chord.bar)) densityPlan.push({bar:chord.bar,style:activeStyle,level,role:answer?'回答':'展开'});
    });
    densityPlan.forEach(plan=>plan.count=notes.filter(note=>note.bar===plan.bar).length);
    return {version:2,genre,seed,feel,style:requested,intensity,notes,structure,bars:parsed.bars.length,chords:parsed.chords,...(intensity==='auto'?{densityPlan}:{})};
  }
  function finger(midi,previous) {
    return [64,59,55,50,45,40].map((open,string)=>({string,fret:midi-open})).filter(p=>p.fret>=0&&p.fret<=24).sort((a,b)=>(Math.abs(a.fret-previous.fret)+Math.abs(a.string-previous.string)*1.5)-(Math.abs(b.fret-previous.fret)+Math.abs(b.string-previous.string)*1.5))[0];
  }
  function sequence(pool,requested,count,seed) {
    if (requested&&requested!=='auto') return Array(count).fill(requested);
    if (pool.length <= 1) return Array(count).fill(pool[0] || 'none');
    const random=H.rng(seed),out=[];
    for(let i=0;i<count;i++){const choices=pool.filter(value=>value!==out[i-1]&&(i!==count-1||count<3||value!==out[0]));const list=choices.length?choices:pool;out.push(list[Math.floor(random()*list.length)]);}
    return out;
  }
  function arrange(parsed,feel,seed,choruses=4,options={}) {
    const genre=normalize(options.genre), trackKeys={bass:'bass',drums:'drum',keys:'key',rhythm:'rhythm',percussion:'percussion',strings:'strings'}, custom=Object.entries(trackKeys).some(([,key])=>options[key+'Style']&&!oldCatalogs[key][options[key+'Style']]);
    if (!genre&&!custom&&oldFeels[feel]) return originalArrange(parsed,feel,seed,choruses,options);
    const profile=profiles[genre||'blues'];
    choruses=Math.max(1,Math.min(32,Math.floor(Number(choruses)||1)));
    const chart=enrich(parsed),chartBeats=chart.bars.length*4,events=[],chorusStyles=[];
    if(chart.error||!chart.chords.length)throw Error(chart.error||'先写一组和声');
    const catalogs={bass:R.bassStyles,drums:R.drumStyles,keys:R.keyStyles,rhythm:R.rhythmStyles,percussion:R.percussionStyles,strings:R.stringsStyles},fields={bass:'bassStyle',drums:'drumStyle',keys:'keyStyle',rhythm:'rhythmStyle',percussion:'percussionStyle',strings:'stringsStyle'},player=R.performerProfiles[options.performerProfile]||R.performerProfiles.balanced;
    const selected=Object.fromEntries(Object.entries(fields).map(([track,field],i)=>{
      let requested=options[field];if(track==='rhythm'&&options.rhythm===false)requested='none';
      if(requested===undefined&&(track==='percussion'||track==='strings'))requested='none';
      if(!catalogs[track][requested])requested='auto';
      const affinity=(player.affinity[track]||[]).filter(value=>catalogs[track][value]&&profile.pools[track].includes(value)),pool=affinity.length?[...affinity,...profile.pools[track]]:profile.pools[track];
      return [track,sequence(pool,requested,choruses,(seed>>>0)^Math.imul(i+1,0x9e3779b9))];
    }));
    for(let chorus=0;chorus<choruses;chorus++) {
      const styles=Object.fromEntries(Object.entries(selected).map(([track,list])=>[track,list[chorus]])),base=chorus*chartBeats,localSeed=(seed+chorus*8191)>>>0;
      const legacyOptions={...Object.fromEntries(Object.entries(fields).map(([track,field])=>[field,oldCatalogs[field.replace('Style','')][styles[track]]?styles[track]:track==='bass'?'fifths':track==='drums'?'backbeat':'none'])),performerProfile:options.performerProfile};
      const legacy=originalArrange(chart,oldFeels[feel]?feel:'straight',localSeed,1,legacyOptions);
      for(const track of Object.keys(fields)) {
        const registry=oldCatalogs[fields[track].replace('Style','')];
        if(registry[styles[track]]) events.push(...legacy.events.filter(event=>event.track===track).map(event=>({...event,beat:event.beat+base})));
        else events.push(...part(chart,track,styles[track],feel,localSeed,chorus,options.performerProfile).map(event=>({...event,beat:event.beat+base})));
      }
      chorusStyles.push(styles);
    }
    events.sort((a,b)=>a.beat-b.beat);
    return {events,genre,beats:chartBeats*choruses,chartBeats,bassStyles:selected.bass,drumStyles:selected.drums,keyStyles:selected.keys,rhythmStyles:selected.rhythm,percussionStyles:selected.percussion,stringsStyles:selected.strings,performerProfile:R.performerProfiles[options.performerProfile]?options.performerProfile:'balanced',chorusStyles};
  }
  function part(parsed,track,style,feel,seed,chorus,performerProfile) {
    if(style==='none')return [];
    const events=[],random=H.rng(seed^({bass:11,drums:23,keys:37,rhythm:51})[track]),swing=R.feels[feel]?.swing??.5,total=parsed.bars.length*4;
    const add=(beat,duration,velocity,data={})=>{if(beat<total)events.push({track,beat,duration:Math.max(.006,Math.min(duration,total-beat)),velocity:Math.min(.9,velocity*(.96+random()*.08)),variant:Math.floor(random()*2),...data});};
    if(track==='drums') {
      for(let bar=0;bar<parsed.bars.length;bar++) {
        const base=bar*4,neo=style==='neo',soft=style==='soft';
        const hats=soft?[0,1,2,3]:neo?[0,.5,.75,1.5,2,2.5,2.75,3.5]:[0,.5,1,1.5,2,2.5,3,3.5];
        hats.forEach((beat,i)=>add(base+R.swingBeat(beat,swing),.1,soft?.13:i%2?.13:.24,{sample:style==='wash'&&i%4===0?'ride':'hat-'+(1+i%2),drumStyle:style}));
        (neo?[0,.75,2.5]:[0,2]).forEach(beat=>add(base+R.swingBeat(beat,swing),.12,soft?.32:.55,{sample:'kick-1',drumStyle:style}));
        (neo?[2]:[1,3]).forEach(beat=>add(base+R.swingBeat(beat,swing)+.012,.12,soft?.2:.48,{sample:'snare-2',drumStyle:style}));
        if(neo)[1.75,3.25].forEach(beat=>add(base+R.swingBeat(beat,swing),.08,.1,{sample:'snare-1',drumStyle:style}));
      }
      R.humanizeArrangement?.(events,seed,performerProfile);
      return events;
    }
    parsed.chords.forEach((chord,chordIndex)=>{
      const root=(track==='bass'?28:45)+H.mod(chord.root-(track==='bass'?4:9))+(track==='rhythm'&&['sixteenth','soulcomp'].includes(style)?12:0),end=chord.beat+chord.beats,tones=chord.colorIntervals||chord.intervals;
      const tone=(offset,midi,length,velocity,extra={})=>{const beat=chord.beat+R.swingBeat(offset,swing);if(beat<end-.006)add(beat,Math.min(length,end-beat),velocity,{midi,...{bass:{bassStyle:style},keys:{keyStyle:style},rhythm:{rhythmStyle:style,articulation:style==='sixteenth'?'muted':'picked'}}[track],...extra});};
      if(track==='bass') {
        const bassRoot=28+H.mod((chord.bass??chord.root)-4);
        const cell=style==='sustain'?[[0,0,chord.beats*.96]]:style==='fingerroot'?[[0,0,1.65],[2,7,1.65]]:[[0,0,.55],[.75,0,.22],[1.5,12,.32],[2.75,7,.34],[3.5,0,.23]];
        cell.filter(([beat])=>beat<chord.beats).forEach(([beat,interval,length],i)=>tone(beat,(i===0?bassRoot:root)+interval,length,i?.57:.7));
      } else if(track==='keys') {
        const voicing=[tones[1],tones[3]??tones[2],tones.at(-1)].map((interval,i)=>H.nearest(chord.root+interval,60+i*4,53,79));
        const offsets=style==='haze'?[0]:[.5,2.75];
        offsets.filter(beat=>beat<chord.beats).forEach(beat=>voicing.forEach(midi=>tone(beat,midi,style==='haze'?chord.beats*.96:.85,.18)));
      } else {
        const voicing=[0,tones[1],tones[2],tones.find(interval=>interval>=12)??tones[3]??12];
        if(style==='fingerpick') {
          const order=[0,2,1,3,2,1,3,1];
          for(let i=0;i/2<chord.beats;i++)tone(i/2,root+voicing[order[i%8]],.68,i%4===0?.52:.37);
        } else {
          const offsets=style==='wash'?[0]:style==='sixteenth'?[.25,.75,1.5,2.25,2.75,3.5]:[.5,2.75];
          offsets.filter(beat=>beat<chord.beats).forEach((beat,i)=>voicing.slice(style==='sixteenth'?1:0).forEach((interval,string)=>tone(beat+string*.01,root+interval,style==='wash'?chord.beats*.96:style==='sixteenth'?.16:.45,style==='wash'?.3:.4,{variant:(i+string+chordIndex+chorus)%2})));
          if(style==='sixteenth')for(const beat of [0,.5,1,2,3])if(beat<chord.beats)tone(beat,root+7,.045,.27,{articulation:'dead'});
        }
      }
    });
    R.humanizeArrangement?.(events,seed,performerProfile);
    return events;
  }
  H.generate=generate;R.arrangement=arrange;
  window.tunerGenres={profiles,normalize,enrich,generate,arrange};
})();
