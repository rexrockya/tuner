/* Shared generated accompaniment. Source recordings are never routed through this player. */
(function () {
  'use strict';
  if (window.floatingBacking?.isReady) return;
  const H = window.tunerHarmony, $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tracks = [['drums','鼓','drum'],['bass','Bass','bass'],['keys','键盘','key'],['rhythm','节奏吉他','rhythm'],['percussion','辅助打击','percussion'],['strings','弦乐','strings']];
  let source = null, context = null, settings = null, active = null, transport = null, engine = null, enginePromise = null;
  let visible = false, minimized = false, revision = 0, starting = false, pending = false, message = '', error = '', returnFocus = null, lastEvent = '';
  const panel = document.createElement('section');
  panel.id = 'floating-backing'; panel.hidden = true; panel.setAttribute('aria-label','生成伴奏悬浮播放器');
  panel.innerHTML = `<header class="fb-head"><div><span class="fb-eyebrow">GENERATED BACKING / 生成伴奏</span><h2 id="fb-title">当前和声</h2></div><button id="fb-minimize" type="button" aria-label="最小化伴奏播放器">⌄</button><button id="fb-close" type="button" aria-label="关闭并停止伴奏">×</button></header>
    <div class="fb-body" id="fb-body"><p class="fb-source" id="fb-source"></p><div class="fb-controls"><label>练习速度<input id="fb-bpm" type="number" min="40" max="180" step="1" value="96"><span>BPM</span></label><label>曲风<select id="fb-genre"></select></label><label>调<select id="fb-key"></select></label></div>
    <div id="fb-chart" class="fb-chart" aria-label="生成伴奏和弦顺序"></div><p class="fb-note" id="fb-timing"></p>
    <details id="fb-advanced"><summary>配器、音色与和声</summary><div class="fb-extra"><label>律动<select id="fb-feel"></select></label><label>演奏取向<select id="fb-performer"></select></label></div><div id="fb-mixer"></div><form id="fb-form"><label>自定和声<textarea id="fb-progression" rows="2" maxlength="512" aria-label="伴奏和声"></textarea></label><p class="fb-note">逗号或 | 分小节；小节内 1、2 或 4 个和弦均分四拍，如 Dm7 G7 | Cmaj7</p><div class="fb-actions"><button type="submit">应用和声</button><button id="fb-restore" type="button">恢复本页和声</button></div></form></details></div>
    <footer class="fb-transport"><button id="fb-play" type="button" class="fb-primary" aria-pressed="false">▶ 开始伴奏</button><div class="fb-now"><strong id="fb-chord">—</strong><span id="fb-position">准备开始</span></div><button id="fb-expand" type="button" hidden aria-label="展开伴奏播放器">展开</button><button id="fb-mini-close" type="button" hidden aria-label="关闭并停止伴奏">×</button></footer><p id="fb-status" class="fb-status" role="status" aria-live="polite"></p>`;
  document.body.append(panel);
  $('fb-key').innerHTML = H.names.map(name=>`<option value="${name}">${name}</option>`).join('');
  const setText = (id,value) => { if($(id).textContent!==String(value))$(id).textContent=value; };
  const cloneSettings = value => ({...value,styles:{...value.styles},timbres:{...value.timbres},volumes:{...value.volumes}});
  const normalizedKey = value => H.names[H.tonic(value || 'C').root];
  const defaults = ctx => ({key:normalizedKey(ctx.key),bpm:Math.max(40,Math.min(180,Number(ctx.bpm)||96)),genre:ctx.genre||'jazz',feel:null,performerProfile:null,styles:{},timbres:{},volumes:{drums:.72,bass:.8,keys:.55,rhythm:.58,percussion:.5,strings:.38}});
  function progressionFor(value) {
    if(context?.error)throw Error(context.error);
    const base = context?.progression || H.parse(context?.text || '', context?.key || 'C');
    if (base.error || !base.chords?.length) throw Error(base.error || '当前页面还没有可播放的和声');
    if (base.bars.length > 16) throw Error('生成伴奏最多支持 16 小节');
    const transpose=H.mod(H.tonic(value.key).root-H.tonic(context.key).root);
    const chords=base.chords.map((chord,index)=>{
      const root=H.mod(chord.root+transpose),bass=chord.bass===null||chord.bass===undefined?null:H.mod(chord.bass+transpose);
      const suffix=chord.name.replace(/^[A-Ga-g][#b♯♭]?/,'').replace(/\/[A-Ga-g][#b♯♭]?$/,'');
      return {...chord,index,root,bass,name:transpose?H.names[root]+suffix+(bass===null?'':'/'+H.names[bass]):chord.name};
    });
    const result={...base,key:value.key,tonic:H.tonic(value.key).root,chords,bars:base.bars.map((_,i)=>chords.filter(c=>c.bar===i)),beats:base.bars.length*4};
    return window.tunerGenres?.enrich(result)||result;
  }
  function snapshot() {
    let progression=active?.progression;
    if(!progression&&settings&&context){try{progression=progressionFor(settings);}catch(_){}}
    const value=active?.settings||settings, at=transport?.current()||0, beat=at%(progression?.beats||1);
    const chord=progression?.chords.find(c=>beat>=c.beat-1e-7&&beat<c.beat+c.beats-1e-7)||progression?.chords[0]||null;
    return {contextId:context?.id||null,visible,minimized,playing:!!transport?.playing,loading:starting||!!transport?.loading,pending,key:value?.key||null,transpose:value&&context?H.mod(H.tonic(value.key).root-H.tonic(context.key).root):0,bpm:value?.bpm||96,genre:value?.genre||'jazz',chord:chord?{...chord,duration:chord.beats}:null,progression,beat};
  }
  function publish(force=false) {
    const detail=snapshot(), signature=JSON.stringify([detail.contextId,visible,minimized,detail.playing,detail.loading,pending,detail.key,detail.bpm,detail.genre,detail.chord?.index]);
    if(force||lastEvent!==signature){lastEvent=signature;window.dispatchEvent(new CustomEvent('tuner:backing-change',{detail}));}
  }
  function drawPosition() {
    const state=snapshot();
    setText('fb-play',state.loading?'■ 取消载入':state.playing?'■ 停止伴奏':'▶ 开始伴奏');
    $('fb-play').setAttribute('aria-pressed',String(state.playing));$('fb-play').disabled=!context||!!context.error;
    setText('fb-chord',state.chord?.name||'—');
    setText('fb-position',state.playing?`第 ${state.chord.bar+1} 小节 · ${Math.floor(state.beat%4)+1}/4 · ${state.bpm} BPM`:`${state.key||'—'} · ${state.bpm} BPM · 循环练习`);
    for(const node of panel.querySelectorAll('[data-fb-chord]'))node.classList.toggle('active',+node.dataset.fbChord===state.chord?.index);
    setText('fb-status',error||message||(state.loading?'正在准备真实录音音源，可随时取消…':state.playing?'生成伴奏正在播放 · 可最小化后练琴':''));
    publish();
  }
  function render() {
    panel.hidden=!visible;panel.classList.toggle('fb-minimized',minimized);document.body.classList.toggle('has-floating-backing',visible);
    $('fb-body').hidden=minimized;$('fb-minimize').hidden=minimized;$('fb-expand').hidden=!minimized;$('fb-mini-close').hidden=!minimized;
    setText('fb-title',context?.title||'当前和声');setText('fb-source','按当前和声独立生成 · 原始示范音频与谱面保持原调');
    if(settings){for(const option of $('fb-key').options)option.textContent=option.value+(H.tonic(context?.key).minor?' 小调':'');$('fb-key').value=settings.key;$('fb-bpm').value=settings.bpm;$('fb-genre').value=settings.genre;$('fb-progression').value=context?.text||'';}
    const state=snapshot();
    $('fb-chart').innerHTML=(state.progression?.bars||[]).map((bar,i)=>`<div class="fb-bar"><small>${i+1}</small>${bar.map(c=>`<span data-fb-chord="${c.index}" class="${state.chord?.index===c.index?'active':''}">${esc(c.name)}<small>${c.beats} 拍</small></span>`).join('')}</div>`).join('');
    setText('fb-timing',context?.timingNote||'生成练习按 4/4 播放，小节内和弦均分四拍；不与原始示范同步。');
    drawPosition();
  }
  async function loadEngine() {
    if(engine)return engine;
    if(!enginePromise)enginePromise=window.siteAssets.load('backingEngine').then(()=>{
      engine=window.practiceAudio;transport=new engine.Transport(drawPosition);
      const G=window.tunerGenres;
      $('fb-genre').innerHTML=Object.entries(G.profiles).map(([id,p])=>`<option value="${id}">${esc(p.label)}</option>`).join('');
      $('fb-feel').innerHTML=Object.entries(engine.feels).map(([id,p])=>`<option value="${id}">${esc(p.label)}</option>`).join('');
      $('fb-performer').innerHTML=Object.entries(engine.performerProfiles).map(([id,p])=>`<option value="${id}">${esc(p.label)}</option>`).join('');
      $('fb-mixer').innerHTML=tracks.map(([track,label,style])=>`<div class="fb-track"><strong>${label}</strong><label>演奏<select data-fb-style="${style}">${Object.entries(engine[style+'Styles']).map(([id,text])=>`<option value="${id}">${esc(text)}</option>`).join('')}</select></label><label>音色<select data-fb-timbre="${track}">${Object.entries(engine.timbres[track]).map(([id,text])=>`<option value="${id}">${esc(text)}</option>`).join('')}</select></label><label>音量<input type="range" min="0" max="100" data-fb-volume="${track}" aria-label="${label}音量"></label></div>`).join('');
      syncAdvanced();render();return engine;
    }).catch(e=>{enginePromise=null;throw e;});
    return enginePromise;
  }
  function resolved(value) {
    const profile=window.tunerGenres.profiles[value.genre]||window.tunerGenres.profiles.jazz;
    return {...cloneSettings(value),genre:window.tunerGenres.normalize(value.genre)||'jazz',feel:value.feel||profile.feel,performerProfile:value.performerProfile||profile.performer||'balanced',timbres:{...profile.timbres,...value.timbres}};
  }
  function syncAdvanced() {
    if(!engine||!settings)return;
    const s=resolved(settings);$('fb-feel').value=s.feel;$('fb-performer').value=s.performerProfile;
    for(const [track,,style]of tracks){panel.querySelector(`[data-fb-style="${style}"]`).value=s.styles[style]||'auto';panel.querySelector(`[data-fb-timbre="${track}"]`).value=s.timbres[track];panel.querySelector(`[data-fb-volume="${track}"]`).value=Math.round(s.volumes[track]*100);}
  }
  function build() {
    const value=resolved(settings),progression=progressionFor(value),options={genre:value.genre,performerProfile:value.performerProfile};
    for(const [, ,style]of tracks)options[style+'Style']=value.styles[style]||'auto';
    return {settings:value,progression,song:engine.arrangement(progression,value.feel,20261004,4,options)};
  }
  function stop() {
    revision++;starting=false;pending=false;message='';
    transport?.pause();if(transport)transport.position=0;
    if(active)settings={...active.settings,styles:{...active.settings.styles},timbres:{...active.settings.timbres},volumes:{...active.settings.volumes}};
    render();syncAdvanced();
  }
  function stopOthers() {
    window.lessonPlayer?.stop();window.practiceStudio?.transport?.pause();window.scorePlayer?.pause();window.metronome?.stop();
    for(const audio of document.querySelectorAll('audio'))audio.pause();
    window.dispatchEvent(new CustomEvent('tuner:backing-start',{detail:{contextId:context?.id}}));
  }
  async function start() {
    if(!context||context.error)return;
    if(starting||transport?.playing||transport?.loading){stop();return;}
    const token=++revision;starting=true;error='';message='';drawPosition();
    try {
      // If modules are ready, unlock inside the click. Otherwise load first and
      // resume immediately; browser denial is surfaced with a retryable button.
      const unlocked=engine?engine.getContext().resume():null;
      await loadEngine();if(token!==revision)return;
      stopOthers();if(token!==revision)return;
      await (unlocked||engine.getContext().resume());if(token!==revision)return;
      const candidate=build();
      const timbres=await engine.prepareTimbres(candidate.settings.timbres,candidate.song.events);
      if(token!==revision)return;
      candidate.settings.volumes={...settings.volumes};engine.commitTimbres(timbres);active=candidate;settings=cloneSettings(candidate.settings);
      transport.load(candidate.song);transport.bpm=settings.bpm;
      for(const [track]of tracks)engine.volume(track,settings.volumes[track]);
      await transport.play();if(token!==revision)return;starting=false;render();
    }catch(e){if(token!==revision)return;starting=false;transport?.pause();error=e.message||'伴奏未能载入，请点击开始重试';render();}
  }
  async function update() {
    error='';syncAdvanced();
    if(starting||transport?.loading){revision++;starting=false;transport?.pause();active=null;void start();return;}
    if(!transport?.playing){active=null;render();return;}
    const token=++revision;pending=true;message='正在准备切换，当前伴奏继续播放';transport.cancelUpdate('replaced');drawPosition();
    try {
      const candidate=build(),timbres=await engine.prepareTimbres(candidate.settings.timbres,candidate.song.events);
      if(token!==revision||!transport.playing)return;
      transport.queueUpdate(candidate.song,{timbres,bpm:candidate.settings.bpm,onCommit:()=>{if(token!==revision)return;candidate.settings.volumes={...settings.volumes};active=candidate;settings=cloneSettings(candidate.settings);pending=false;message='已在小节线切换';render();},onCancel:()=>{}});
      message='已就绪，下一小节生效';drawPosition();
    }catch(e){if(token!==revision)return;pending=false;error=(e.message||'切换失败')+'；当前伴奏继续播放，可调整后重试';settings=cloneSettings(active.settings);syncAdvanced();render();}
  }
  function setContext(value) {
    if(value&&context&&value.id===context.id&&value.text===context.text&&value.key===context.key)return;
    stop();source=value?{...value}:null;context=source;active=null;settings=context?defaults(context):null;error='';
    if(context){try{progressionFor(settings);}catch(e){error=e.message;}}
    syncAdvanced();render();publish(true);
  }
  function open(value) {
    if(value)setContext(value);returnFocus=document.activeElement;visible=true;minimized=false;render();
    void loadEngine().catch(e=>{error=e.message||'播放器资源未能加载，请点击开始重试';render();});
    $('fb-play').focus();
  }
  function close() {stop();visible=false;minimized=false;render();if(returnFocus?.isConnected)returnFocus.focus();}
  function resetKey() {stop();if(!context)return;settings.key=normalizedKey(context.key);active=null;render();publish(true);}
  $('fb-play').addEventListener('click',()=>void start());
  for(const id of ['fb-close','fb-mini-close'])$(id).addEventListener('click',close);
  $('fb-minimize').addEventListener('click',()=>{minimized=true;render();$('fb-expand').focus();});
  $('fb-expand').addEventListener('click',()=>{minimized=false;render();$('fb-minimize').focus();});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();minimized=true;render();returnFocus?.focus();}});
  $('fb-bpm').addEventListener('change',()=>{if(!settings)return;settings.bpm=Math.max(40,Math.min(180,Number($('fb-bpm').value)||96));$('fb-bpm').value=settings.bpm;void update();});
  $('fb-key').addEventListener('change',()=>{if(settings){settings.key=$('fb-key').value;void update();}});
  $('fb-genre').addEventListener('change',()=>{if(settings){settings.genre=$('fb-genre').value;settings.feel=null;settings.performerProfile=null;settings.timbres={};settings.styles={};void update();}});
  $('fb-feel').addEventListener('change',()=>{if(settings){settings.feel=$('fb-feel').value;void update();}});
  $('fb-performer').addEventListener('change',()=>{if(settings){settings.performerProfile=$('fb-performer').value;void update();}});
  $('fb-mixer').addEventListener('change',e=>{if(!settings)return;if(e.target.dataset.fbStyle){settings.styles[e.target.dataset.fbStyle]=e.target.value;void update();}if(e.target.dataset.fbTimbre){settings.timbres[e.target.dataset.fbTimbre]=e.target.value;void update();}});
  $('fb-mixer').addEventListener('input',e=>{const track=e.target.dataset.fbVolume;if(!settings||!track)return;settings.volumes[track]=Number(e.target.value)/100;if(active)active.settings.volumes[track]=settings.volumes[track];if(transport?.playing)engine.volume(track,settings.volumes[track]);});
  $('fb-form').addEventListener('submit',e=>{e.preventDefault();const text=$('fb-progression').value,parsed=H.parse(text,settings?.key||'C');if(parsed.error||!parsed.chords.length){error=parsed.error||'请先输入和声';drawPosition();return;}const key=(settings?.key||'C')+(H.tonic(context?.key).minor?'m':''),previous=source;setContext({id:'custom:'+Date.now(),title:'自定和声',text,key,bpm:settings?.bpm,genre:settings?.genre});source=previous;});
  $('fb-restore').addEventListener('click',()=>{if(source){const previous=source;context=null;setContext(previous);}});
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('tuner:lesson-play',stop);
  window.floatingBacking={isReady:true,open,close,stop,setContext,resetKey,getState:snapshot,get transport(){return transport;}};
})();
