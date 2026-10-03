(function () {
  'use strict';
  const M = window.FretboardLesson, $ = id => document.getElementById(id);
  const state = {index:0, inspected:null, wide:false, shape:0, skeleton:true, equivalents:true, path:true, bpm:72, loop:false, playing:false};
  let context, timer, generation=0;
  const voices = new Set();
  const html = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = () => M.NOTES[state.index];
  const segment = () => M.SEGMENTS[current().segment];
  const chord = () => M.CHORDS[segment().chord];
  const selected = () => state.inspected || current();
  const pos = n => `${n.string} 弦 ${n.fret === 0 ? '空弦' : n.fret + ' 品'}`;
  function noteName(n) { return n.name || M.pitch(n.midi); }
  function selectNote(index, keepPlaying=false) {
    if (!keepPlaying) stop();
    const before = current().segment;
    state.index = Math.max(0, Math.min(M.NOTES.length-1, index)); state.inspected=null;
    if (current().segment !== before) state.shape=0;
    render(); revealSelected();
  }
  function inspect(string, fret) {
    stop(); state.inspected={string,fret,midi:M.midi(string,fret),name:M.pitch(M.midi(string,fret))};
    if (fret < 3 || fret > 10) state.wide=true;
    render(); revealSelected();
  }
  function choosePosition(string, fret) {
    const played=segment().notes.find(n=>n.string===string&&n.fret===fret);
    if(played) selectNote(played.index); else inspect(string,fret);
  }
  function revealSelected() {
    const cell=$('fretboard').querySelector(`[data-string="${selected().string}"][data-fret="${selected().fret}"]`);
    const scroller=$('fretboard-scroll');
    if (cell) {const r=cell.getBoundingClientRect(),v=scroller.getBoundingClientRect();if(r.left<v.left+35||r.right>v.right-20) scroller.scrollLeft+=r.left-v.left-v.width/2+r.width/2;}
  }
  function renderHarmony() {
    $('harmony-strip').innerHTML = Array.from({length:4},(_,bar)=>`<div class="measure"><span class="measure-label">第 ${bar+1} 小节</span><div class="measure-pair">${M.SEGMENTS.slice(bar*2,bar*2+2).map(s=>`<button type="button" class="chord-segment ${s.index===segment().index?'active':''}" data-segment="${s.index}" aria-pressed="${s.index===segment().index}"><strong>${s.chord}</strong><small>第 ${s.beat}–${s.beat+1} 拍</small></button>`).join('')}</div></div>`).join('');
  }
  function renderBoard() {
    const s=segment(),c=chord(),n=selected(),first=state.wide?0:3,last=state.wide?12:10;
    const count=last-first+1,w=state.wide?1140:820,dx=(w-80)/count,x=f=>60+(f-first+.5)*dx,y=string=>48+(string-1)*48;
    const shape=c.shapes[Math.min(state.shape,c.shapes.length-1)];
    const shapeLocations = state.shape<0 ? [] : shape.frets.flatMap((f,i)=>f===null?[]:[{string:6-i,fret:f}]);
    if(c.name==='Cmaj7'&&state.shape===0) shapeLocations.push(...c.shapes[2].frets.flatMap((f,i)=>f===null?[]:[{string:6-i,fret:f}]));
    const isShape=(string,fret)=>shapeLocations.some(v=>v.string===string&&v.fret===fret);
    let out=`<svg viewBox="0 0 ${w} 338" xmlns="http://www.w3.org/2000/svg" aria-label="${c.name} 指板，${first} 到 ${last} 品"><title>${c.name} 指板。数字标记实弹顺序；虚线环为同音名位置。</title><defs><marker id="path-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#edeedd"/></marker></defs>`;
    for(let f=first;f<=last;f++){
      out+=`<line x1="${x(f)+dx/2}" y1="29" x2="${x(f)+dx/2}" y2="306" stroke="#34432d" stroke-width="${f===0?4:1}"/><text x="${x(f)}" y="20" text-anchor="middle" class="fret-label">${f===0?'0 空弦':f}</text>`;
      if([3,5,7,9,12].includes(f))out+=`<circle cx="${x(f)}" cy="323" r="3" fill="#536347"/>${f===12?`<circle cx="${x(f)+11}" cy="323" r="3" fill="#536347"/>`:''}`;
    }
    for(let string=1;string<=6;string++) out+=`<text x="13" y="${y(string)+4}" class="string-label">${string} · ${['','e','B','G','D','A','E'][string]}</text><line x1="60" y1="${y(string)}" x2="${w-20}" y2="${y(string)}" stroke="#67745c" stroke-width="${.6+string*.21}"/>`;
    if(state.shape>=0)out+=`<polyline class="shape-trace" points="${shapeLocations.filter(v=>v.fret>=first&&v.fret<=last).map(v=>`${x(v.fret)},${y(v.string)}`).join(' ')}"/>`;
    if(state.path) {
      for(let i=1;i<s.notes.length;i++) {
        const a=s.notes[i-1],b=s.notes[i];
        if(a.fret<first||a.fret>last||b.fret<first||b.fret>last)continue;
        const vx=x(b.fret)-x(a.fret),vy=y(b.string)-y(a.string),len=Math.hypot(vx,vy),pad=24;
        out+=`<path class="path-line" d="M${x(a.fret)+vx/len*pad},${y(a.string)+vy/len*pad} L${x(b.fret)-vx/len*pad},${y(b.string)-vy/len*pad}" marker-end="url(#path-arrow)"/>`;
      }
    }
    for(let string=1;string<=6;string++)for(let fret=first;fret<=last;fret++){
      const m=M.midi(string,fret),r=M.role(c,m),lowRoot=string>=5&&M.mod(m)===c.rootPc,exact=state.path?s.notes.filter(a=>a.string===string&&a.fret===fret):[];
      const same=state.equivalents&&M.mod(m)===M.mod(n.midi),active=n.string===string&&n.fret===fret,inShape=isShape(string,fret);
      const show=lowRoot||exact.length||same||active||(state.skeleton&&r.kind==='skeleton')||inShape;
      const role=exact.length?M.role(c,m,exact[0].kind):r;
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
    $('position-label').textContent=`第 ${s.bar} 小节 · 第 ${s.beat}–${s.beat+1} 拍`;
    $('shape-select').innerHTML=c.shapes.map((v,i)=>`<option value="${i}" ${state.shape===i?'selected':''}>${v.name}</option>`).join('')+`<option value="-1" ${state.shape<0?'selected':''}>不显示形状</option>`;
    $('shape-note').textContent=(state.shape<0?'CAGED 形状已隐藏。':shape.note)+' 形状是定位地标，不是必须整把按住的指法，也不限制乐句边界。';
    $('range-toggle').textContent=state.wide?'聚焦 3–10 品':'全指板 0–12';
    $('range-toggle').setAttribute('aria-pressed',String(state.wide));
  }
  function renderNote() {
    const n=selected(),c=chord(),r=M.role(c,n.midi,state.inspected?null:n.kind);
    $('note-panel-title').textContent=state.inspected?'探索位置 · 非原谱改指法':'当前实弹音';
    $('note-counter').textContent=state.inspected?'':`${state.index+1} / ${M.NOTES.length}`;
    $('current-note').innerHTML=html(noteName(n)).replace(/(\d+)$/, '<sub>$1</sub>');
    $('current-degree').textContent=r.degree;
    $('current-degree').style.color=r.kind==='approach'?'var(--coral)':r.kind==='color'?'var(--amber)':'var(--lime)';
    $('current-position').textContent=pos(n);
    $('note-role').textContent=r.description;
    $('return-to-note').hidden=!state.inspected;
    $('root-anchors').innerHTML=c.anchors.map(([string,fret])=>`<button type="button" data-location="${string},${fret}">${M.pitch(M.midi(string,fret))} · ${string}/${fret}</button>`).join('');
    $('root-bridge-copy').textContent=c.bridge;
    let targets=M.equivalents(n.midi).filter(a=>a.string>=3&&!(a.string===n.string&&a.fret===n.fret));
    targets.sort((a,b)=> (Math.abs(a.fret-n.fret)-Math.abs(b.fret-n.fret)) || a.string-b.string);
    // Put the useful three-string / two-fret reverse octave bridge first.
    if(n.string<=2)targets.sort((a,b)=>Number(b.string===n.string+3&&b.fret===n.fret+2)-Number(a.string===n.string+3&&a.fret===n.fret+2));
    $('equivalent-buttons').innerHTML=targets.slice(0,4).map(a=>{const diff=(a.midi-n.midi)/12;const relation=diff===0?'同一实音':`${diff<0?'低':'高'} ${Math.abs(diff)} 个八度`;return `<button type="button" data-location="${a.string},${a.fret}">${html(a.name)} · ${a.string}/${a.fret}<small>${relation}</small></button>`;}).join('');
    $('reverse-copy').textContent=n.string<=2?'从 1 / 2 弦往低音方向跨 3 根弦、加 2 品，就是低一个八度。虚线圈是同音名，不是实弹路线。':'对照虚线圈，读出弦 / 品与八度关系。它们是同音名位置，不是原谱要求换指法。';
  }
  function renderPhrase() {
    const s=segment(),c=chord();
    $('phrase-title').textContent=s.title;
    $('note-sequence').innerHTML=s.notes.map((n,i)=>{const r=M.role(c,n.midi,n.kind);return `<button type="button" class="sequence-note ${r.kind} ${n.index===state.index?'active':''}" data-note="${n.index}" aria-pressed="${n.index===state.index}"><span class="order">0${i+1}</span><span><strong>${html(n.name)}</strong><small>${n.string} 弦 ${n.fret} 品 · ${n.duration===.5?'½':n.duration} 拍</small></span><span class="degree">${html(r.degree)}</span></button>`;}).join('');
    $('phrase-explanation').textContent=s.text;
    $('previous-note').disabled=state.index===0;$('next-note').disabled=state.index===M.NOTES.length-1;
    $('previous-segment').disabled=s.index===0;$('next-segment').disabled=s.index===7;
    $('full-sequence').innerHTML=M.SEGMENTS.map(s=>`<div class="full-segment"><h3>${s.bar}.${s.beat===1?'前':'后'} · ${s.chord}</h3><div>${s.notes.map(n=>`<button type="button" data-note="${n.index}" class="${n.index===state.index?'active':''}" aria-label="第 ${n.index+1} 音 ${html(n.name)} ${pos(n)}">${html(n.name)} <small>${n.string}/${n.fret}</small></button>`).join('')}</div></div>`).join('');
  }
  function render() {renderHarmony();renderBoard();renderNote();renderPhrase();updatePlayButton();}
  function updatePlayButton() {$('play').textContent=state.playing?'■ 停止':'▶ 慢速听';$('play').setAttribute('aria-pressed',String(state.playing));}
  function stop() {
    generation++;clearTimeout(timer);timer=null;state.playing=false;
    for(const v of voices){try{v.osc.stop();}catch(_){}v.osc.disconnect();v.gain.disconnect();}voices.clear();updatePlayButton();
  }
  function tone(n) {
    const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime,duration=60/state.bpm*n.duration;
    osc.type='triangle';osc.frequency.value=440*Math.pow(2,(n.midi-69)/12);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.12,now+.012);gain.gain.exponentialRampToValueAtTime(.001,now+Math.max(.08,duration*.88));
    osc.connect(gain);gain.connect(context.destination);const voice={osc,gain};voices.add(voice);
    osc.onended=()=>{voices.delete(voice);osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+duration);
  }
  async function play() {
    if(state.playing){stop();return;}
    const token=++generation;state.playing=true;updatePlayButton();$('audio-status').textContent='';
    try {
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)throw new Error('unsupported');
      context=context||new AudioContext();await context.resume();
      if(token!==generation)return;
      state.inspected=null;const loopSegment=segment().index;
      function tick(){
        if(token!==generation)return;
        render();revealSelected();tone(current());
        timer=setTimeout(()=>{
          if(token!==generation)return;
          const next=state.index+1;
          if(state.loop&&(next===M.NOTES.length||M.NOTES[next].segment!==loopSegment))selectNote(M.SEGMENTS[loopSegment].notes[0].index,true);
          else if(next>=M.NOTES.length){stop();return;}
          else selectNote(next,true);
          tick();
        },60/state.bpm*current().duration*1000);
      }
      tick();
    } catch (_) {if(token===generation){stop();$('audio-status').textContent='示音暂时无法播放，请再点一次；仍可逐音查看与练习。';}}
  }
  $('harmony-strip').addEventListener('click',e=>{const b=e.target.closest('[data-segment]');if(b)selectNote(M.SEGMENTS[+b.dataset.segment].notes[0].index);});
  for(const id of ['note-sequence','full-sequence'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-note]');if(b)selectNote(+b.dataset.note);});
  for(const id of ['root-anchors','equivalent-buttons'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-location]');if(b)inspect(...b.dataset.location.split(',').map(Number));});
  $('fretboard').addEventListener('click',e=>{const b=e.target.closest('[data-string]');if(b)choosePosition(+b.dataset.string,+b.dataset.fret);});
  $('fretboard').addEventListener('keydown',e=>{const b=e.target.closest('[data-string]');if(b&&['Enter',' '].includes(e.key)){e.preventDefault();choosePosition(+b.dataset.string,+b.dataset.fret);}});
  $('return-to-note').addEventListener('click',()=>selectNote(state.index));
  $('shape-select').addEventListener('change',e=>{state.shape=+e.target.value;renderBoard();});
  $('range-toggle').addEventListener('click',()=>{state.wide=!state.wide;if(!state.wide&&state.inspected&&(state.inspected.fret<3||state.inspected.fret>10))state.inspected=null;render();revealSelected();});
  for(const [id,key]of [['show-skeleton','skeleton'],['show-equivalents','equivalents'],['show-path','path']])$(id).addEventListener('change',e=>{state[key]=e.target.checked;renderBoard();});
  $('previous-note').addEventListener('click',()=>selectNote(state.index-1));$('next-note').addEventListener('click',()=>selectNote(state.index+1));
  $('previous-segment').addEventListener('click',()=>selectNote(M.SEGMENTS[Math.max(0,segment().index-1)].notes[0].index));
  $('next-segment').addEventListener('click',()=>selectNote(M.SEGMENTS[Math.min(7,segment().index+1)].notes[0].index));
  $('play').addEventListener('click',play);
  $('tempo').addEventListener('input',e=>{state.bpm=+e.target.value;$('tempo-value').textContent=state.bpm+' BPM';});
  $('loop').addEventListener('change',e=>{state.loop=e.target.checked;if(state.playing)stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
  render();
  requestAnimationFrame(revealSelected);
})();
