(function () {
  'use strict';
  let M = null, catalog = null, lesson = null, loadGeneration = 0;
  const $ = id => document.getElementById(id), original = $('original-audio');
  const state = {index:0, segment:0, rest:false, inspected:null, wide:false, shape:0, skeleton:true, equivalents:true, path:true, bpm:72, loop:false, playing:false};
  let context, timer, generation=0;
  const voices = new Set();
  const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = () => M?.NOTES[state.index] || null;
  const segment = () => M.SEGMENTS[state.segment];
  const chord = () => M.CHORDS[segment().chord];
  const selected = () => state.inspected || (state.rest?null:(current()&&current().start<segment().end&&current().end>segment().start ? current() : segment().activeNotes?.[0]) || null);
  const pos = n => `${n.string} 弦 ${n.fret === 0 ? '空弦' : n.fret + ' 品'}`;
  function noteName(n) { return n.name || M.pitch(n.midi); }
  function selectNote(index, keepPlaying=false) {
    if (!keepPlaying) stopAll();
    const before = state.segment;
    state.index = Math.max(0, Math.min(M.NOTES.length-1, index)); state.segment=current().segment; state.inspected=null;state.rest=false;
    if (state.segment !== before) state.shape=0;
    render(); revealSelected();
  }
  function inspect(string, fret) {
    stopAll(); state.inspected={string,fret,midi:M.midi(string,fret),name:M.pitch(M.midi(string,fret))};
    if (fret < focusRange()[0] || fret > focusRange()[1]) state.wide=true;
    render(); revealSelected();
  }
  function choosePosition(string, fret) {
    const played=segment().notes.find(n=>n.string===string&&n.fret===fret);
    if(played) selectNote(played.index); else inspect(string,fret);
  }
  function revealSelected() {
    if (!M || !selected()) return;
    const cell=$('fretboard').querySelector(`[data-string="${selected().string}"][data-fret="${selected().fret}"]`);
    const scroller=$('fretboard-scroll');
    if (cell) {const r=cell.getBoundingClientRect(),v=scroller.getBoundingClientRect();if(r.left<v.left+35||r.right>v.right-20) scroller.scrollLeft+=r.left-v.left-v.width/2+r.width/2;}
  }
  function focusRange() {
    const notes=segment().notes.length?segment().notes:segment().activeNotes||[];
    const frets=notes.map(n=>n.fret).filter(Number.isFinite);
    const lo=frets.length?Math.min(...frets):3,hi=frets.length?Math.max(...frets):10;
    const first=Math.max(0,Math.min(lo-1,hi-7)); return [first,Math.max(first+7,hi+1)];
  }
  const beats = n => Number.isFinite(n)?Number(n.toFixed(3)).toString():"—";
  function selectSegment(index, keepPlaying=false) {
    if (!keepPlaying) stopAll();
    state.segment=Math.max(0,Math.min(M.SEGMENTS.length-1,index));state.inspected=null;state.rest=false;state.shape=0;
    if(segment().notes.length)state.index=segment().notes[0].index;
    render();revealSelected();
  }
  function renderHarmony() {
    const bars=[...new Set(M.SEGMENTS.map(s=>s.bar))];
    $('harmony-strip').innerHTML=bars.map(bar=>`<div class="measure"><span class="measure-label">第 ${bar} 小节</span><div class="measure-pair">${M.SEGMENTS.filter(s=>s.bar===bar).map(s=>`<button type="button" class="chord-segment ${s.index===state.segment?'active':''}" data-segment="${s.index}" aria-pressed="${s.index===state.segment}"><strong>${html(s.chord||'和声未知')}</strong><small>${M.harmonyOnly?'和声地标 · 非拍点':lesson?.sourceType==='guitarset'?'每小节和声采样':`第 ${beats(s.beat)} 拍 · ${beats(s.duration)} 拍长`}</small></button>`).join('')}</div></div>`).join('');
  }
  function renderBoard() {
    const s=segment(),c=chord(),n=selected(),focus=focusRange(),first=state.wide?0:focus[0],last=state.wide?Math.max(12,M.maxFret||12,n?.fret||0):focus[1];
    const count=last-first+1,w=state.wide?Math.max(1140,(last+1)*70):Math.max(820,count*70),dx=(w-80)/count,x=f=>60+(f-first+.5)*dx,y=string=>48+(string-1)*48;
    const shape=c.shapes[Math.max(0,Math.min(state.shape,c.shapes.length-1))];
    const shapeLocations = state.shape<0 || !shape ? [] : shape.frets.flatMap((f,i)=>f===null?[]:[{string:6-i,fret:f}]);
    if(c.name==='Cmaj7'&&state.shape===0&&c.shapes[0]?.name==='A 形 + G 形') shapeLocations.push(...c.shapes[2].frets.flatMap((f,i)=>f===null?[]:[{string:6-i,fret:f}]));
    const isShape=(string,fret)=>shapeLocations.some(v=>v.string===string&&v.fret===fret);
    let out=`<svg style="width:${w}px;min-width:${w}px;max-width:none" viewBox="0 0 ${w} 338" xmlns="http://www.w3.org/2000/svg" aria-label="${c.name} 指板，${first} 到 ${last} 品"><title>${c.name} 指板。数字标记实弹顺序；虚线环为同音名位置。</title><defs><marker id="path-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#edeedd"/></marker></defs>`;
    for(let f=first;f<=last;f++){
      out+=`<line x1="${x(f)+dx/2}" y1="29" x2="${x(f)+dx/2}" y2="306" stroke="#34432d" stroke-width="${f===0?4:1}"/><text x="${x(f)}" y="20" text-anchor="middle" class="fret-label">${f===0?'0 空弦':f}</text>`;
      if([3,5,7,9,12,15,17,19,21,24].includes(f))out+=`<circle cx="${x(f)}" cy="323" r="3" fill="#536347"/>${f===12?`<circle cx="${x(f)+11}" cy="323" r="3" fill="#536347"/>`:''}`;
    }
    for(let string=1;string<=6;string++) out+=`<text x="13" y="${y(string)+4}" class="string-label">${string} · ${['','e','B','G','D','A','E'][string]}</text><line x1="60" y1="${y(string)}" x2="${w-20}" y2="${y(string)}" stroke="#67745c" stroke-width="${.6+string*.21}"/>`;
    if(state.shape>=0)out+=`<polyline class="shape-trace" points="${shapeLocations.filter(v=>v.fret>=first&&v.fret<=last).map(v=>`${x(v.fret)},${y(v.string)}`).join(' ')}"/>`;
    if(state.path) {
      for(let i=1;i<s.notes.length;i++) {
        const a=s.notes[i-1],b=s.notes[i];
        if(a.fret<first||a.fret>last||b.fret<first||b.fret>last)continue;
        const vx=x(b.fret)-x(a.fret),vy=y(b.string)-y(a.string),len=Math.hypot(vx,vy),pad=24;
        if(len<1 || Math.abs(a.start-b.start)<1e-6)continue;
        out+=`<path class="path-line" d="M${x(a.fret)+vx/len*pad},${y(a.string)+vy/len*pad} L${x(b.fret)-vx/len*pad},${y(b.string)-vy/len*pad}" marker-end="url(#path-arrow)"/>`;
      }
    }
    for(let string=1;string<=6;string++)for(let fret=first;fret<=last;fret++){
      const m=M.midi(string,fret),r=M.role(c,m),lowRoot=string>=5&&M.mod(m)===c.rootPc,exact=state.path?s.notes.filter(a=>a.string===string&&a.fret===fret):[];
      const same=state.equivalents&&n&&M.mod(m)===M.mod(n.midi),active=n&&n.string===string&&n.fret===fret,inShape=isShape(string,fret);
      const show=lowRoot||exact.length||same||active||(state.skeleton&&r.kind==='skeleton')||inShape;
      const role=exact.length?M.role(c,m,exact[0]):r;
      const fill=lowRoot?'#bdf45d':exact.length?'#f2f0e6':inShape?'#344a25':role.kind==='skeleton'?'#23331d':'#171c16';
      const stroke=role.kind==='approach'?'#ff9a88':role.kind==='color'?'#ffcc73':'#88ae61';
      out+=`<g class="fret-note" tabindex="0" role="button" aria-label="${html(M.pitch(m))}，${pos({string,fret})}，${html(role.degree)}${exact.length?'，实弹第 '+exact.map(a=>a.index+1).join('、')+' 音':''}" data-string="${string}" data-fret="${fret}"><rect class="hitbox" x="${x(fret)-dx/2+2}" y="${y(string)-23}" width="${dx-4}" height="46" fill="transparent" rx="5"/>`;
      if(show){
        if(same)out+=`<circle data-equivalent="true" cx="${x(fret)}" cy="${y(string)}" r="25" fill="none" stroke="#c9b4ff" stroke-width="1.4" stroke-dasharray="3 3"/>`;
        if(active)out+=`<circle cx="${x(fret)}" cy="${y(string)}" r="27.5" fill="none" stroke="#f2f0e6" stroke-width="2"/>`;
        if(lowRoot)out+=`<rect data-root="true" x="${x(fret)-20}" y="${y(string)-18}" width="40" height="36" rx="5" fill="${fill}" stroke="#bdf45d"/>`;
        else if(role.kind==='approach')out+=`<path d="M${x(fret)},${y(string)-23} l23,23 -23,23 -23,-23Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
        else out+=`<circle cx="${x(fret)}" cy="${y(string)}" r="19.5" fill="${fill}" stroke="${exact.length&&role.kind==='skeleton'?'#f2f0e6':stroke}" stroke-width="${inShape?2:1}"/>`;
        const label=exact.length?exact[0].name.replace(/\d+$/,''):M.NAMES[M.mod(m)],textColor=lowRoot||exact.length?'#13200e':'#edf1e8';
        out+=`<text x="${x(fret)}" y="${y(string)-2}" text-anchor="middle" fill="${textColor}" font-size="12" font-weight="650">${html(label)}</text><text x="${x(fret)}" y="${y(string)+12}" text-anchor="middle" fill="${lowRoot||exact.length?'#3b4c31':stroke}" font-size="10">${html(role.degree)}</text>`;
        if(exact.length)out+=`<circle cx="${x(fret)+18}" cy="${y(string)-17}" r="8.5" fill="${stroke}" stroke="#111810"/><text data-order="${exact[0].index+1}" x="${x(fret)+18}" y="${y(string)-14}" text-anchor="middle" fill="#10180c" font-size="10" font-weight="800">${exact.map(a=>s.notes.indexOf(a)+1).join(',')}</text>`;
      } else out+=`<circle cx="${x(fret)}" cy="${y(string)}" r="2" fill="#43523b"/>`;
      out+='</g>';
    }
    $('fretboard').innerHTML=out+'</svg>';
    $('board-title').textContent=c.name;
    $('position-label').textContent=M.harmonyOnly?`第 ${s.bar} 小节 · 和声地标`:lesson?.sourceType==='guitarset'?`第 ${s.bar} 小节 · 和声采样区域`:`第 ${s.bar} 小节 · 第 ${beats(s.beat)} 拍 · ${beats(s.duration)} 拍长`;
    $('shape-select').innerHTML=c.shapes.map((v,i)=>`<option value="${i}" ${state.shape===i?'selected':''}>${v.name}</option>`).join('')+`<option value="-1" ${state.shape<0?'selected':''}>不显示形状</option>`;
    $('shape-note').textContent=(state.shape<0?'CAGED 形状已隐藏。':shape?shape.note:'该和弦没有已验证 CAGED 按形，先看音程与根音。')+' 形状是定位地标，不是必须整把按住的指法，也不限制乐句边界。';
    $('range-toggle').textContent=state.wide?`聚焦 ${focus[0]}–${focus[1]} 品`:`全指板 0–${Math.max(12,M.maxFret||12)} 品`;
    $('range-toggle').setAttribute('aria-pressed',String(state.wide));
  }
  function renderNote() {
    const n=selected(),c=chord();
    if(!n){$('note-panel-title').textContent=M.harmonyOnly?'和弦地图 · 无逐音路线':'原谱留白';$('current-note').textContent=M.harmonyOnly?'选音':'休止';$('current-degree').textContent='';$('current-position').textContent=M.harmonyOnly?'点指板或根音探索':'本段没有新的起音';$('note-role').textContent=M.harmonyOnly?'这里只标注和弦骨架，不代表原谱旋律。':'保留原始留白；请听原示范。';$('note-counter').textContent='';$('root-anchors').innerHTML=c.anchors.map(([string,fret])=>`<button type="button" data-location="${string},${fret}">${M.pitch(M.midi(string,fret))} · ${string}/${fret}</button>`).join('');$('root-bridge-copy').textContent=c.bridge;$('equivalent-buttons').innerHTML='';$('reverse-copy').textContent='';$('return-to-note').hidden=true;return;}
    const r=M.role(c,n.midi,state.inspected?null:n);
    $('note-panel-title').textContent=state.inspected?'探索位置 · 非原谱改指法':n.carryIn?'片段开始前已起音':'当前原谱音';
    $('note-counter').textContent=state.inspected?'':`${n.index+1} / ${M.NOTES.length}`;
    $('current-note').innerHTML=html(noteName(n)).replace(/(\d+)$/, '<sub>$1</sub>');
    $('current-degree').textContent=r.degree;
    $('current-degree').style.color=r.kind==='approach'?'var(--coral)':r.kind==='color'?'var(--amber)':'var(--lime)';
    $('current-position').textContent=pos(n);
    $('note-role').textContent=r.description;
    $('return-to-note').hidden=!state.inspected||M.harmonyOnly;
    $('root-anchors').innerHTML=c.anchors.map(([string,fret])=>`<button type="button" data-location="${string},${fret}">${M.pitch(M.midi(string,fret))} · ${string}/${fret}</button>`).join('');
    $('root-bridge-copy').textContent=c.bridge;
    let targets=M.equivalents(n.midi,Math.max(12,M.maxFret||12,n.fret+2)).filter(a=>a.string>=3&&!(a.string===n.string&&a.fret===n.fret));
    targets.sort((a,b)=> (Math.abs(a.fret-n.fret)-Math.abs(b.fret-n.fret)) || a.string-b.string);
    // Put the useful three-string / two-fret reverse octave bridge first.
    if(n.string<=2)targets.sort((a,b)=>Number(b.string===n.string+3&&b.fret===n.fret+2)-Number(a.string===n.string+3&&a.fret===n.fret+2));
    $('equivalent-buttons').innerHTML=targets.slice(0,4).map(a=>{const diff=(a.midi-n.midi)/12;const relation=diff===0?'同一实音':`${diff<0?'低':'高'} ${Math.abs(diff)} 个八度`;return `<button type="button" data-location="${a.string},${a.fret}">${html(a.name)} · ${a.string}/${a.fret}<small>${relation}</small></button>`;}).join('');
    $('reverse-copy').textContent=n.string<=2?'从 1 / 2 弦往低音方向跨 3 根弦、加 2 品，就是低一个八度。虚线圈是同音名，不是实弹路线。':'对照虚线圈，读出弦 / 品与八度关系。它们是同音名位置，不是原谱要求换指法。';
  }
  function renderPhrase() {
    const s=segment(),c=chord();
    $('phrase-title').textContent=s.title||`第 ${s.bar} 小节 · ${s.chord||'原谱路线'}`;
    $('note-sequence').innerHTML=s.notes.map((n,i)=>{const r=M.role(c,n.midi,n);return `<button type="button" class="sequence-note ${r.kind} ${n.index===state.index?'active':''}" data-note="${n.index}" aria-pressed="${n.index===state.index}"><span class="order">${String(i+1).padStart(2,'0')}</span><span><strong>${html(n.name)}</strong><small>${n.string} 弦 ${n.fret} 品 · ${beats(n.duration)} 拍${n.carryIn?' · 接入延音':''}${s.notes.some(other=>other!==n&&Math.abs(other.start-n.start)<1e-6)?' · 同时起音':''}</small></span><span class="degree">${html(r.degree)}</span></button>`;}).join('');
    if(!s.notes.length)$('note-sequence').innerHTML='<span class="source-rest">本段无新起音，保留休止或前音延续</span>';
    $('phrase-explanation').textContent=s.text||'音程仅说明这个音与当前和弦根音的关系，不自动推断音阶、经过音或演奏意图。';
    $('previous-note').disabled=!M.NOTES.length||state.index===0;$('next-note').disabled=!M.NOTES.length||state.index===M.NOTES.length-1;
    $('previous-segment').disabled=s.index===0;$('next-segment').disabled=s.index===M.SEGMENTS.length-1;
    $('full-sequence').innerHTML=M.SEGMENTS.map(s=>`<div class="full-segment"><h3>${s.bar} 小节 / ${beats(s.beat)} 拍 · ${html(s.chord)}</h3><div>${s.notes.map(n=>`<button type="button" data-note="${n.index}" class="${n.index===state.index?'active':''}" aria-label="第 ${n.index+1} 音 ${html(n.name)} ${pos(n)}">${html(n.name)} <small>${n.string}/${n.fret}</small></button>`).join('')}</div></div>`).join('');
  }
  function render() {if(!M)return;renderHarmony();renderBoard();renderNote();if(!M.harmonyOnly)renderPhrase();updatePlayButton();}
  function updatePlayButton() {$('play').textContent=state.playing?'■ 停止核对':'▶ 合成音高核对';$('play').setAttribute('aria-pressed',String(state.playing));}
  function stop() {
    generation++;clearTimeout(timer);timer=null;state.playing=false;
    for(const v of voices){try{v.osc.stop();}catch(_){}v.osc.disconnect();v.gain.disconnect();}voices.clear();updatePlayButton();
  }
  function stopAll() {stop();original.pause();}
  function tone(n, offset=0, duration=n.duration) {
    const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime+offset;
    duration=60/state.bpm*duration;
    osc.type='triangle';osc.frequency.value=440*Math.pow(2,(n.midi-69)/12);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.08,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+Math.max(.02,duration*.88));
    osc.connect(gain);gain.connect(context.destination);const voice={osc,gain};voices.add(voice);
    osc.onended=()=>{voices.delete(voice);osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+Math.max(.025,duration));
  }
  async function play() {
    if(!M)return;if(state.playing){stop();return;}original.pause();
    const token=++generation;state.playing=true;updatePlayButton();$('audio-status').textContent='仅作音高 / 标注时值核对，音色与语气不代表原演奏；请以上方原始示范为准。';
    try {
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)throw new Error('unsupported');context=context||new AudioContext();await context.resume();
      if(token!==generation)return;
      state.inspected=null;const loopSegment=state.segment;
      const from=state.loop?segment().start:segment().notes.includes(current())?current().start:segment().start;
      const to=state.loop?segment().start+segment().duration:M.duration;
      function run() {
        if(token!==generation)return;
        const startClock=context.currentTime;
        for(const n of M.NOTES)if(n.start<to&&n.start+n.duration>from)tone(n,Math.max(0,n.start-from)*60/state.bpm,Math.min(to,n.start+n.duration)-Math.max(from,n.start));
        function tick() {
          if(token!==generation)return;
          const at=from+(context.currentTime-startClock)*state.bpm/60;
          if(at>=to){if(state.loop){selectSegment(loopSegment,true);run();}else stop();return;}
          const si=M.SEGMENTS.findIndex(s=>at>=s.start&&at<s.start+s.duration);
          const sounding=M.NOTES.filter(n=>n.start<=at&&n.start+n.duration>at);
          const n=sounding[sounding.length-1];
          if(si>=0&&si!==state.segment){state.segment=si;state.shape=0;}
          const changed=state.rest!==!n||(n&&state.index!==n.index)||state.lastRenderedSegment!==state.segment;
          state.rest=!n;if(n)state.index=n.index;if(changed){render();revealSelected();state.lastRenderedSegment=state.segment;}
          timer=setTimeout(tick,45);
        }tick();
      }run();
    }catch(_){if(token===generation){stop();$('audio-status').textContent='合成核对暂时无法播放，仍可听原示范或逐音查看。';}}
  }
  $('harmony-strip').addEventListener('click',e=>{const b=e.target.closest('[data-segment]');if(b)selectSegment(+b.dataset.segment);});
  for(const id of ['note-sequence','full-sequence'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-note]');if(b)selectNote(+b.dataset.note);});
  for(const id of ['root-anchors','equivalent-buttons'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-location]');if(b)inspect(...b.dataset.location.split(',').map(Number));});
  $('fretboard').addEventListener('click',e=>{const b=e.target.closest('[data-string]');if(b)choosePosition(+b.dataset.string,+b.dataset.fret);});
  $('fretboard').addEventListener('keydown',e=>{const b=e.target.closest('[data-string]');if(b&&['Enter',' '].includes(e.key)){e.preventDefault();choosePosition(+b.dataset.string,+b.dataset.fret);}});
  $('return-to-note').addEventListener('click',()=>selectNote(state.index));
  $('shape-select').addEventListener('change',e=>{state.shape=+e.target.value;renderBoard();});
  $('range-toggle').addEventListener('click',()=>{state.wide=!state.wide;if(!state.wide&&state.inspected&&(state.inspected.fret<focusRange()[0]||state.inspected.fret>focusRange()[1]))state.inspected=null;render();revealSelected();});
  for(const [id,key]of [['show-skeleton','skeleton'],['show-equivalents','equivalents'],['show-path','path']])$(id).addEventListener('change',e=>{state[key]=e.target.checked;renderBoard();});
  $('previous-note').addEventListener('click',()=>selectNote(state.index-1));$('next-note').addEventListener('click',()=>selectNote(state.index+1));
  $('previous-segment').addEventListener('click',()=>selectSegment(state.segment-1));
  $('next-segment').addEventListener('click',()=>selectSegment(state.segment+1));
  $('play').addEventListener('click',play);
  $('tempo').addEventListener('input',e=>{if(state.playing)stop();state.bpm=+e.target.value;$('tempo-value').textContent=state.bpm+' BPM';});
  $('loop').addEventListener('change',e=>{state.loop=e.target.checked;if(state.playing)stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});window.addEventListener('pagehide',stopAll);
  function filteredLessons() {
    if(!catalog)return [];
    const query=$('lesson-search').value.trim().toLowerCase();
    return catalog.lessons.filter(item=>(!$('only-supported').checked||item.supported)&&(!query||`${item.title} ${item.id} ${item.chord} ${item.key}`.toLowerCase().includes(query)));
  }
  function renderPicker() {
    const items=filteredLessons();
    const selectedId=lesson?.id||new URL(location.href).searchParams.get('lesson')||'Xbv40aTf';
    $('lesson-select').innerHTML=items.map(item=>`<option value="${html(item.id)}">${item.supported?'逐音':'和弦地图'} · ${html(item.title)} · ${html(item.id)}</option>`).join('');
    $('lesson-select').value=selectedId;
    const i=items.findIndex(item=>item.id===selectedId);
    $('previous-lesson').disabled=i<=0;$('next-lesson').disabled=i<0||i===items.length-1;
    $('coverage-status').textContent=`${catalog.total.toLocaleString()} 条原始乐句 · ${catalog.supportedCount} 条已核对逐音路线 · 筛选 ${items.length} 条`;
  }
  async function readJson(path) {const response=await fetch(path);if(!response.ok)throw Error('HTTP '+response.status);return response.json();}
  async function loadLesson(id, push=false) {
    stopAll();M=null;const token=++loadGeneration;
    $('coach').hidden=true;$('unavailable').hidden=true;$('load-status').textContent='正在读取原始乐句…';
    original.removeAttribute('src');original.load();$('original-status').textContent='';
    const item=catalog.lessons.find(x=>x.id===id);
    if(!item){lesson=null;$('lesson-eyebrow').textContent='SOURCE PHRASES / 未知 ID';$('lesson-meta').textContent='';$('lesson-harmony').textContent='';$('lesson-select').selectedIndex=-1;document.querySelector('.source-panel').hidden=true;for(const link of document.querySelectorAll('.original-link')){link.href='./';link.textContent='返回弦音 Tuner';}$('lesson-title').textContent='未找到这条乐句';$('score-image').removeAttribute('src');$('score-link').removeAttribute('href');$('source-caption').textContent='请选择资料库中的有效乐句';$('load-status').textContent='这个 ID 不在资料库中，请从上方选择。';return;}
    lesson=item;document.querySelector('.source-panel').hidden=false;for(const link of document.querySelectorAll('.original-link'))link.textContent='返回这条乐句 ↗';
    if(!$('only-supported').checked||!item.supported)$('only-supported').checked=false;
    renderPicker();
    if(push){const url=new URL(location.href);url.searchParams.set('lesson',id);history.pushState(null,'',url);}
    document.title=`${item.title} · 指板导航 · 弦音 Tuner`;
    $('lesson-title').textContent=item.title;$('lesson-eyebrow').textContent=`${item.sourceType==='guitarset'?'GUITARSET':'BOPLAND'} / ${item.id}`;
    $('lesson-meta').textContent=`${item.bars} 小节 · ${item.meter} · ${item.key||''}`;$('lesson-harmony').textContent=item.chord;
    for(const link of document.querySelectorAll('.original-link'))link.href=`./#lick/${encodeURIComponent(id)}`;
    original.src=item.audio;$('score-image').src=item.score;$('score-image').alt=item.title+' 原始谱面';$('score-link').href=item.score;
    $('source-caption').textContent=item.sourceType==='guitarset'?'原始真人演奏节选，保留录音中的时值、力度与语气；逐音标注来自 GuitarSet。':'播放资料库原有的 BopLand 示范。未验证录音与谱面的逐音对齐，不显示伪同步光标。';
    const source=item.sourceType==='guitarset'?['GuitarSet · Xi 等','https://zenodo.org/records/3371780','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/']:['BopLand','https://bopland.org/database#guitar-licks','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'];
    $('provenance').innerHTML=`来源：<a href="${source[1]}" target="_blank" rel="noopener">${source[0]}</a> · <a href="${source[3]}" target="_blank" rel="noopener">${source[2]}</a> · 指板导航为改编`;
    try {
      let data;
      if(item.supported)data=await readJson(item.data);
      else data=window.FretboardCore.catalogLesson(item);
      if(token!==loadGeneration)return;
      M=window.FretboardCore.adaptLesson(data);M.harmonyOnly=!item.supported;
      state.index=0;state.segment=0;state.rest=false;state.inspected=null;state.shape=0;state.wide=false;state.playing=false;
      state.bpm=Math.min(140,Math.max(40,data.originalBpm||72));$('tempo').value=state.bpm;$('tempo-value').textContent=state.bpm+' BPM';
      $('fidelity-note').textContent=item.supported?(item.sourceType==='guitarset'?'按原始演奏标注保留弦、品、起音和延音；片段接入的延音会标明。和声是每小节采样标签，不能据此断定小节内部换和弦的精确时刻。':'此例逐音核对原 PNG / TAB，保留原弦、品与谱面时值。原始示范的节奏处理与语气仍以录音为准。'):'和弦地图，尚未核对原谱逐音路线。和弦顺序来自资料库索引；每个按钮仅是和声地标，不表示精确换和弦拍点。不会用生成乐句代替原谱。';
      $('full-summary').textContent=`查看完整 ${M.bars} 小节${M.harmonyOnly?'和弦地图':'原谱路线'}`;
      document.querySelector('.phrase-panel').hidden=M.harmonyOnly;
      document.querySelector('.whole-line').hidden=M.harmonyOnly;
      document.querySelector('.practice-panel').hidden=M.harmonyOnly;
      $('show-path').closest('label').hidden=M.harmonyOnly;
      $('load-status').textContent='';$('coach').hidden=false;
      render();requestAnimationFrame(revealSelected);
    }catch(error){if(token!==loadGeneration)return;M=null;$('load-status').textContent='';$('unavailable').hidden=false;$('unavailable-reason').textContent='导航数据暂时无法读取。原谱和原始示范仍可使用；选择其他课或刷新可重试。';}
  }
  async function boot() {
    try{catalog=await readJson('assets/licks/fretboard/catalog.json?v=20261004-1');renderPicker();await loadLesson(new URL(location.href).searchParams.get('lesson')||'Xbv40aTf');}
    catch(_){$('load-status').textContent='乐句目录暂时无法读取，请检查网络后刷新重试。';}
  }
  for(const id of ['lesson-search','only-supported'])$(id).addEventListener('input',renderPicker);
  $('lesson-select').addEventListener('change',event=>loadLesson(event.target.value,true));
  for(const [id,step]of [['previous-lesson',-1],['next-lesson',1]])$(id).addEventListener('click',()=>{const items=filteredLessons(),i=items.findIndex(x=>x.id===lesson?.id);if(items[i+step])loadLesson(items[i+step].id,true);});
  $('show-available').addEventListener('click',()=>{$('only-supported').checked=true;$('lesson-search').value='';renderPicker();const first=filteredLessons()[0];if(first)loadLesson(first.id,true);});
  window.addEventListener('popstate',()=>{if(catalog)loadLesson(new URL(location.href).searchParams.get('lesson')||'Xbv40aTf');});
  original.addEventListener('play',()=>{stop();$('original-status').textContent=lesson?.sourceType==='guitarset'?'原始演奏 · 光标跟随原标注（标注可能包含误差）':'原始示范 · 逐音对齐未验证，指板保留手动导航';});
  original.addEventListener('timeupdate',()=>{
    if(!M||lesson?.sourceType!=='guitarset'||original.paused)return;
    const at=original.currentTime,notes=M.NOTES.filter(n=>Number.isFinite(n.timeSeconds)&&n.timeSeconds<=at&&n.timeSeconds+n.durationSeconds>at);
    state.rest=!notes.length;
    const atSegment=M.segmentAt(at*(M.source.originalBpm||lesson.originalBpm)/60);
    if(atSegment&&state.segment!==atSegment.index){state.segment=atSegment.index;state.shape=0;state.inspected=null;}
    if(notes.length){const n=notes[notes.length-1];state.index=n.index;state.inspected=null;}
    render();revealSelected();
  });
  original.addEventListener('error',()=>{$('original-status').textContent='原始示范未能载入；请稍后重试，或返回原乐句页。不会自动换成合成音。';});
  $('score-image').addEventListener('error',()=>{$('score-image').alt='原谱图片暂时无法加载，点击尝试打开原文件';});

  boot();
})();
