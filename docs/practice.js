(function () {
  'use strict';
  const $ = id => document.getElementById(id), H = window.tunerHarmony, A = window.practiceAudio, G = window.tunerGenres;
  const page = $('lesson-page');
  if (!page || !H || !A) return;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const library = document.createElement('div'); library.id = 'lesson-library-pane';
  library.append(...page.childNodes); page.append(library);
  const nav = document.createElement('div'); nav.className = 'lesson-modes'; nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', '教学内容');
  nav.innerHTML = '<button type="button" data-lesson-mode="library" class="active" aria-pressed="true">乐句</button><button type="button" data-lesson-mode="create" aria-pressed="false">创作</button><button type="button" data-lesson-mode="backing" aria-pressed="false">伴奏</button>';
  page.prepend(nav);
  if (G) nav.insertAdjacentHTML('afterbegin','<button type="button" data-lesson-mode="courses" aria-pressed="false">课程</button>');
  if (G) nav.querySelector('[data-lesson-mode="library"]').textContent='乐句资料库';
  const pane = document.createElement('section'); pane.id = 'practice-pane'; pane.hidden = true; pane.setAttribute('aria-label', '和声练习');
  pane.innerHTML = `
    <div class="practice-heading"><h1 id="practice-title">Backing track</h1><select id="practice-preset" aria-label="伴奏和声预设"><option value="blues">12 小节 Blues</option><option value="quick">Quick change</option><option value="minor">Minor blues</option><option value="pop6415">6 · 4 · 1 · 5</option><option value="pop1564">1 · 5 · 6 · 4</option><option value="custom">自定和声</option></select></div>
    <form id="practice-form" class="practice-form">
      <label class="practice-changes">和声<input id="practice-progression" autocomplete="off" spellcheck="false" maxlength="512" aria-describedby="practice-help practice-error" autocapitalize="off" placeholder="1maj7,57,4sus2,6aug,37,2,7dim,1"></label>
      <label>调<select id="practice-key" aria-label="级数参考调"></select></label>
      <button type="submit" id="practice-generate">生成</button>
    </form>
    <p class="practice-help" id="practice-help">逗号分小节，例如 <code>6,4,1,5</code>；数字后可接和弦后缀。</p>
    <details class="harmony-input-guide" id="practice-input-guide"><summary>和声怎么输入</summary><div>
      <p>以所选调的大调音阶为级数参照。以下例子均以 C 为参考调，逗号和中文逗号都可以。</p>
      <dl>
        <dt>分小节</dt><dd><code>6,4,1,5</code> → Am、F、C、G，各一小节。<code>2m7 57,1maj7</code> → Dm7 与 G7 各两拍，下一小节 Cmaj7；同小节可写 1、2 或 4 个和弦，平均分配四拍。</dd>
        <dt>升降级数</dt><dd><code>b7</code> → B♭，<code>#4</code> → F♯；也接受 <code>♭7</code>、<code>♯4</code>，可继续加后缀，如 <code>b7maj7</code>。</dd>
        <dt>和弦性质</dt><dd>裸数字用调内三和弦：<code>1 2 3 4 5 6 7</code> → C、Dm、Em、F、G、Am、Bdim。升降级数未写后缀时为大三和弦。</dd>
        <dt>数字 + 后缀</dt><dd><code>1maj7</code> → Cmaj7，<code>57</code> → G7，<code>37</code> → E7，<code>2m7</code> → Dm7；显式 <code>7</code> 表示属七，小七请写 <code>m7</code>。</dd>
        <dt>更多色彩</dt><dd><code>4sus2</code> → Fsus2，<code>4sus4</code> → Fsus4，<code>6aug</code> → Aaug，<code>7dim</code> → Bdim，<code>7dim7</code> → Bdim7，<code>7m7b5</code> → Bm7b5。</dd>
        <dt>连写与旧写法</dt><dd><code>456456456</code> 可直接写成九小节。能构成和弦后缀时优先读后缀：<code>57</code> 是一个 G7，五级接七级请写 <code>5,7</code>。仍接受 <code>6-4-1-5</code>、罗马数字、和弦名及 <code>|</code> 分小节；没有逗号或竖线时，空格按每和弦一小节处理。</dd>
      </dl>
      <p>创作与伴奏最多 16 小节、32 个和弦。选一个示例填入，再点生成：</p>
      <div class="harmony-input-examples"><button type="button" data-harmony-example="6,4,1,5">6,4,1,5</button><button type="button" data-harmony-example="1,b7,#4,1">1,b7,#4,1</button><button type="button" data-harmony-example="1maj7,57,4sus2,6aug,37,2,7dim,1">1maj7,57,4sus2,6aug,37,2,7dim,1</button></div>
    </div></details>
    <div class="practice-colors" aria-label="乐句与伴奏风格">
      <label id="practice-phrase-style-wrap">乐句<select id="practice-phrase-style">${Object.entries(H.phraseStyles).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
      <label id="practice-intensity-wrap">音符密度<select id="practice-intensity" aria-describedby="practice-intensity-help">${Object.entries(H.phraseIntensities).map(([id, level]) => `<option value="${id}" ${id === 'auto' ? 'selected' : ''}>${level.label}</option>`).join('')}</select></label>
      <label>Bass<select id="practice-bass-style">${Object.entries(A.bassStyles).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
      <label>鼓<select id="practice-drum-style">${Object.entries(A.drumStyles).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label>
      <label>键盘<select id="practice-key-style">${Object.entries(A.keyStyles).map(([id,label])=>`<option value="${id}" ${id==='auto'?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>节奏吉他<select id="practice-rhythm-style">${Object.entries(A.rhythmStyles).map(([id,label])=>`<option value="${id}" ${id==='auto'?'selected':''}>${label}</option>`).join('')}</select></label>
    </div>
    <p id="practice-intensity-help" class="practice-intensity-help" aria-live="polite" hidden></p>
    <p id="practice-error" class="practice-error" role="alert" hidden></p>
    <div class="practice-transport" aria-label="练习播放控制">
      <button id="practice-rewind" class="practice-round" type="button" aria-label="回到开头">↤</button>
      <button id="practice-play" class="practice-round primary" type="button" aria-label="播放">▶</button>
      <label class="practice-tempo"><input id="practice-bpm" type="number" min="40" max="180" step="1" value="96" inputmode="numeric" aria-label="每分钟拍数"><span>BPM</span></label>
      <select id="practice-feel" aria-label="律动">${Object.entries(A.feels).map(([id, feel]) => `<option value="${id}">${feel.label}</option>`).join('')}</select>
      <button id="practice-loop" type="button" class="on" aria-pressed="true">循环</button>
      <button id="practice-bar-loop" type="button" aria-pressed="false" title="循环当前小节，点选和弦可换小节">单节</button>
      <span class="practice-position" id="practice-position">1 / 12</span>
    </div>
    <div id="practice-live-state" class="practice-live-state" hidden><span id="practice-live-status" role="status"></span><button id="practice-live-retry" type="button" hidden>重试切换</button></div>
    <div class="practice-beat-row"><div class="practice-beats" aria-label="当前拍点"><i></i><i></i><i></i><i></i></div><span id="practice-current-chord"></span><span id="practice-status" role="status"></span></div>
    <p class="practice-arrangement" id="practice-arrangement"></p>
    <div id="practice-chart" class="practice-chart" aria-label="点选小节"></div>
    <section id="practice-rhythm-score" class="rhythm-study" hidden aria-label="节奏吉他练习谱"></section>
    <div id="practice-notation-controls" class="practice-notation-controls" hidden><label>谱面<select id="practice-notation"><option value="tab">六线谱 · TAB</option><option value="staff">五线谱 · 实音高</option></select></label><span id="practice-notation-status" role="status"></span><button id="practice-notation-retry" type="button" hidden>重新载入谱面</button></div>
    <div id="practice-tab" class="practice-tab" aria-label="吉他六线谱" hidden></div><div id="practice-staff" class="practice-staff" hidden></div>
    <div class="practice-footer"><details class="practice-mixer"><summary>音色与音量</summary><div>${[['drums', '鼓', 78], ['bass', 'Bass', 82], ['keys', '键盘', 50], ['rhythm', '节奏吉他', 66], ['lead', 'Lead', 95]].map(([id, name, value]) => `<div class="practice-channel" data-mix-track="${id}"><label class="practice-voice"><span>${name}</span><select data-practice-timbre="${id}" aria-label="${name}音色">${Object.entries(A.timbres[id]).map(([voice,label])=>`<option value="${voice}" ${voice===A.getTimbre(id)?'selected':''}>${label}</option>`).join('')}</select></label><div class="practice-channel-volume"><input data-practice-volume="${id}" type="range" min="0" max="100" value="${value}" aria-label="${name}音量"><output data-practice-volume-value="${id}">${value}%</output></div><span class="practice-voice-state" data-voice-state="${id}" role="status"></span></div>`).join('')}</div></details><button id="practice-save" type="button" hidden>收藏乐句</button><button id="practice-midi" type="button" hidden>MIDI</button></div>
    <div id="practice-saved-wrap" hidden><label class="saved-picker">本机收藏<select id="practice-saved" aria-label="已收藏的原创乐句"><option value="">选择乐句</option></select></label></div>
    <details class="practice-notes"><summary>练习与来源</summary><p id="practice-origin"></p><p id="practice-tip"></p><a href="assets/audio/blues/credits.html" target="_blank" rel="noopener">音源与许可</a></details>`;
  page.append(pane);
  $('practice-key').innerHTML = H.names.map(name => `<option ${name === 'A' ? 'selected' : ''}>${name}</option>`).join('');
  const presets = {
    blues: '17,17,17,17,47,47,17,17,57,47,17,57',
    quick: '17,47,17,17,47,47,17,17,57,47,17,57',
    minor: '1m7,1m7,1m7,1m7,4m7,4m7,1m7,1m7,b67,57,1m7,57',
    pop6415: '6,4,1,5', pop1564: '1,5,6,4'
  };
  let mode = 'library', parsed = null, phrase = null, currentSeed = 1, selectedBar = 0, chartValid = false, notationRevision = 0, notationView = null, notationRendered = null;
  let genre = G?.normalize(window.siteStorage.getItem('tuner-genre-v1')) || (G ? 'blues' : null);
  const isPractice = value => value === 'create' || value === 'backing';
  const voiceRequests=new Map(),busyVoices=new Set(),defaultTimbres=Object.fromEntries(Object.keys(A.timbres).map(track=>[track,A.getTimbre(track)]));
  let activeSettings = null, liveDraft = null, liveRevision = 0, liveStage = '', liveMessage = '', cancelingLive = false;
  const drafts = { create: { text: '2m7,57,1maj7', key: 'C', feel: 'shuffle', bpm: 96, intensity: 'auto' }, backing: { text: presets.blues, key: 'A', feel: 'shuffle', bpm: 96, preset: 'blues' } };
  const genreDrafts = new Map();
  function defaults(id) {
    const profile=G.profiles[id];
    return Object.fromEntries(['create','backing'].map(value=>[value,{genre:id,text:profile[value],key:profile.key,feel:profile.feel,bpm:profile.bpm,style:profile.style,intensity:'auto',preset:'custom',bassStyle:'auto',drumStyle:'auto',keyStyle:'auto',rhythmStyle:'auto',timbres:{...profile.timbres}}]));
  }
  if(G)Object.assign(drafts,defaults(genre));
  const transport = new A.Transport(renderPosition);
  const pauseTransport = transport.pause.bind(transport);
  transport.pause = () => { cancelLive(true); return pauseTransport(); };
  const positionUI = {
    play: $('practice-play'), status: $('practice-status'), position: $('practice-position'),
    bpm: $('practice-bpm'), loop: $('practice-loop'), barLoop: $('practice-bar-loop'),
    chart: $('practice-chart'), tab: $('practice-tab'), chord: $('practice-current-chord'),
    feel: $('practice-feel'), beats: [...pane.querySelectorAll('.practice-beats i')]
  };
  let chartButtons = [], noteButtons = new Map();
  let activeBarButton = null, activeBeatLight = null, activeNoteButton = null;
  function refreshPositionNodes() {
    chartButtons = [...positionUI.chart.children];
    noteButtons = new Map(phrase ? [...positionUI.tab.querySelectorAll('[data-note-beat]')].map(button => [Number(button.dataset.noteBeat), button]) : []);
    // Generated chart/TAB nodes replace the previous ones, even when their beat is unchanged.
    activeBarButton = null; activeNoteButton = null;
  }
  function setPositionText(node, value) { if (node.textContent !== value) node.textContent = value; }
  function setPositionPressed(node, on) {
    if (node.classList.contains('on') === on) return;
    node.classList.toggle('on', on); node.setAttribute('aria-pressed', String(on));
  }
  function error(message = '') { $('practice-error').textContent = message; $('practice-error').hidden = !message; }
  function safe(promise) { Promise.resolve(promise).catch(e => error(e.message || '播放失败，请重试')); }
  function nextSeed() { const bytes = new Uint32Array(1); if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes); else bytes[0] = Date.now() ^ Math.floor(Math.random() * 1e9); return bytes[0]; }
  function stopOtherPlayers() { window.lessonPlayer?.stop(); window.scorePlayer?.pause(); window.metronome?.stop(); }
  function playAt(beat, bar) {
    error(); stopOtherPlayers();
    try { safe(A.getContext().resume()); } catch (e) { error(e.message); return; }
    transport.pause();
    if (transport.loopBar !== null) transport.loopBar = bar;
    selectedBar = bar;
    safe(transport.seek(beat));
    safe(transport.play().then(() => { for (const slider of pane.querySelectorAll('[data-practice-volume]')) A.volume(slider.dataset.practiceVolume, Number(slider.value) / 100); }));
  }
  function setMode(next, text) {
    if (!['library','courses','create','backing'].includes(next) || next==='courses'&&!G) return;
    if(mode===next&&!text){if(isPractice(mode))void showNotation();return;}
    cancelLive(true);
    if (isPractice(mode)) drafts[mode] = { ...readSettings(), seed: currentSeed, phrase: !chartValid ? null : phrase };
    transport.pause(); hideNotation(); window.lessonPlayer?.stop(); mode = next;
    page.dataset.lessonMode = mode;
    nav.querySelectorAll('button').forEach(button => { const active = button.dataset.lessonMode === mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    library.hidden = mode !== 'library'; pane.hidden = !isPractice(mode);
    if ($('genre-courses')) $('genre-courses').hidden=mode!=='courses';
    window.dispatchEvent(new CustomEvent('tuner:practice-mode',{detail:{mode,genre}}));
    if (!isPractice(mode)) return;
    const draft = drafts[mode];
    $('practice-progression').value = text || draft.text; $('practice-key').value = draft.key;
    $('practice-phrase-style').value = draft.style || 'mixed'; $('practice-bass-style').value = draft.bassStyle || 'auto';
    restoreStyles(draft); $('practice-phrase-style-wrap').hidden = mode !== 'create';
    $('practice-intensity').value = H.phraseIntensities[draft.intensity] ? draft.intensity : 'standard';
    $('practice-intensity-wrap').hidden = $('practice-intensity-help').hidden = mode !== 'create';
    describeIntensity();
    $('practice-feel').value = draft.feel; $('practice-bpm').value = draft.bpm; transport.bpm = draft.bpm;
    $('practice-title').textContent = (G?.profiles[genre]?.label ? G.profiles[genre].label+' · ' : '')+(mode === 'create' ? '原创乐句' : '伴奏');
    $('practice-generate').textContent = mode === 'create' ? '写一条' : '生成';
    $('practice-preset').hidden = mode !== 'backing'; $('practice-preset').value = draft.preset || 'custom';
    $('practice-save').hidden = $('practice-midi').hidden = mode !== 'create';
    pane.querySelector('[data-mix-track="lead"]').hidden = mode !== 'create';
    $('practice-saved-wrap').hidden = mode !== 'create';
    $('practice-notation-controls').hidden = mode !== 'create';
    if(draft.timbres)for(const [track,id] of Object.entries(draft.timbres))if(A.timbres[track]?.[id])pane.querySelector('[data-practice-timbre="'+track+'"]').value=id;
    renderSaved(); generate(text ? nextSeed() : draft.seed ?? nextSeed(), text ? {} : { phrase: draft.phrase });
    if (!navigator.connection?.saveData) {
      const warm = () => { if (isPractice(mode)) { try { A.preload().catch(() => {}); } catch {} } };
      if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 800 }); else setTimeout(warm, 0);
    }
  }
  function setGenre(id, options={}) {
    id=G?.normalize(id);if(!id)return;
    if(id===genre&&!options.reset)return;
    const previousMode=mode;
    if(isPractice(mode))setMode('courses');else{transport.pause();window.lessonPlayer?.stop();}
    genreDrafts.set(genre,{...drafts});
    genre=id;Object.assign(drafts,options.reset?defaults(id):genreDrafts.get(id)||defaults(id));
    for(const track of Object.keys(A.timbres)){voiceRequests.set(track,(voiceRequests.get(track)||0)+1);}busyVoices.clear();
    A.commitTimbres?.(timbreSelection());
    window.siteStorage.setItem('tuner-genre-v1',id);
    updateGenrePresets();
    window.dispatchEvent(new CustomEvent('tuner:genre-change',{detail:{genre:id}}));
    if(isPractice(previousMode))setMode(previousMode);
  }
  function updateGenrePresets() {
    if(!G)return;
    const profile=G.profiles[genre];
    $('practice-preset').innerHTML=profile.presets.map(([label,text],i)=>{presets['genre-'+i]=text;return '<option value="genre-'+i+'">'+escape(label)+'</option>';}).join('')+'<option value="custom">自定和声</option>';
  }
  function openLesson(lesson,next='create') {
    if(!G||!G.normalize(lesson.genre))return;
    if(isPractice(mode))setMode('courses');
    setGenre(lesson.genre);
    const profile=G.profiles[genre];
    drafts[next]={...defaults(genre)[next],text:lesson.progression,key:lesson.key||profile.key,bpm:lesson.bpm||profile.bpm,feel:lesson.feel||profile.feel,style:lesson.style||lesson.strategy||profile.style,intensity:lesson.intensity||'auto',...lesson.arrangement,rhythmStyle:lesson.rhythmStyle||lesson.arrangement?.rhythmStyle||'auto',...(lesson.timbres?{timbres:{...profile.timbres,...lesson.timbres}}:{}),seed:lesson.seed||1001};
    setMode(next);
  }
  function describeIntensity() {
    const selected = H.phraseIntensities[$('practice-intensity').value] || H.phraseIntensities.standard;
    $('practice-intensity-help').textContent = selected.description;
  }
  function arrangementOptions() { return { bassStyle:$('practice-bass-style').value,drumStyle:$('practice-drum-style').value,keyStyle:$('practice-key-style').value,rhythmStyle:$('practice-rhythm-style').value }; }
  function restoreStyles(value){
    for(const [field,registry] of [['drum',A.drumStyles],['key',A.keyStyles],['rhythm',A.rhythmStyles]]){
      const chosen=value[field+'Style']??(field==='rhythm'&&value.rhythm===false?'none':'auto');
      $('practice-'+field+'-style').value=registry[chosen]?chosen:'auto';
    }
  }
  function currentFeel() { return activeSettings?.feel || $('practice-feel').value; }
  function readSettings() {
    return { ...(genre?{genre}:{}), text: $('practice-progression').value, key: $('practice-key').value, feel: $('practice-feel').value,
      bpm: Math.max(40, Math.min(180, Number($('practice-bpm').value) || 96)), preset: $('practice-preset').value,
      style: $('practice-phrase-style').value, intensity: $('practice-intensity').value, ...arrangementOptions(), timbres: timbreSelection() };
  }
  function restoreActiveControls() {
    if (!activeSettings) return;
    const fields = { text:'progression',key:'key',feel:'feel',bpm:'bpm',preset:'preset',style:'phrase-style',intensity:'intensity',bassStyle:'bass-style',drumStyle:'drum-style',keyStyle:'key-style',rhythmStyle:'rhythm-style' };
    for (const [field,id] of Object.entries(fields)) $('practice-'+id).value = activeSettings[field];
    for (const [track,id] of Object.entries(activeSettings.timbres)) pane.querySelector('[data-practice-timbre="'+track+'"]').value = id;
    chartValid = true; $('practice-progression').removeAttribute('aria-invalid'); describeIntensity();
  }
  function cancelLive(restore = false) {
    const hadPending = !!liveDraft;
    cancelingLive = true;
    try { transport.cancelUpdate?.(restore ? 'stopped' : 'cancelled'); } finally { cancelingLive = false; }
    liveRevision++; liveDraft = null; liveStage = ''; liveMessage = '';
    if (restore && hadPending) restoreActiveControls();
    renderLiveState();
  }
  function renderLiveState() {
    $('practice-live-state').hidden = !liveMessage;
    setPositionText($('practice-live-status'), liveMessage);
    $('practice-live-retry').hidden = liveStage !== 'error';
    $('practice-save').disabled = $('practice-midi').disabled = !!liveDraft || !chartValid || busyVoices.size > 0;
  }
  function buildCandidate(seed, options = {}) {
    const settings = readSettings(), rawChanges = H.parse(settings.text, settings.key), changes = settings.genre&&G ? G.enrich(rawChanges) : rawChanges;
    if (changes.error || !changes.chords.length || changes.bars.length > 16) throw Error(changes.error || (changes.bars.length > 16 ? '练习最多 16 小节' : '先写一组和声'));
    const melody = mode === 'create' ? options.phrase || H.generate(changes, seed, ['straight','funk','latin'].includes(settings.feel) ? 'jazz' : 'blues', { genre:settings.genre,style:settings.style,intensity:settings.intensity,legacy:options.legacy }) : null;
    const song = A.arrangement(changes, settings.feel, seed, 4, settings), swing = A.feels[settings.feel].swing;
    if (melody) for (let chorus=0;chorus<4;chorus++) song.events.push(...melody.notes.map(note => ({...note,beat:chorus*song.chartBeats+A.swingBeat(note.beat,swing),duration:A.swingBeat(note.beat+note.duration,swing)-A.swingBeat(note.beat,swing),track:'lead'})));
    song.events.sort((a,b)=>a.beat-b.beat);
    return { settings, parsed:changes, phrase:melody, song, seed };
  }
  async function queueCandidate(candidate) {
    cancelLive();
    const revision = ++liveRevision, generation = transport.generation;
    liveDraft = candidate; liveStage = 'preparing'; liveMessage = '正在准备切换 · 当前音乐继续播放'; renderLiveState();
    try {
      const timbres = await A.prepareTimbres(candidate.settings.timbres, candidate.song.events);
      if (revision !== liveRevision) return;
      if (!transport.playing || generation !== transport.generation) { cancelLive(true); return; }
      liveStage = 'queued'; liveMessage = '已就绪 · 下一小节生效';
      const pending = transport.queueUpdate(candidate.song, { timbres, bpm:candidate.settings.bpm,
        onCommit: () => { if (revision !== liveRevision) return; liveDraft=null;liveStage='';liveMessage='已在小节线切换';commitCandidate(candidate); },
        onCancel: () => { if (cancelingLive || revision !== liveRevision) return; liveDraft=null;liveStage='';liveMessage='本轮即将结束 · 已保留当前版本';restoreActiveControls();renderLiveState(); }
      });
      if (!pending && liveDraft) { liveDraft=null;liveStage='';liveMessage='本轮即将结束 · 已保留当前版本';restoreActiveControls(); }
      renderPosition();
    } catch (e) {
      if (revision !== liveRevision) return;
      liveStage='error';liveMessage='准备失败 · 当前音乐继续播放';error(e.message || '资源未准备好，请重试切换');renderPosition();
    }
  }
  function hideNotation(){notationRevision++;notationView?.setVisible(false);$('practice-staff').hidden=true;$('practice-tab').hidden=true;}
  async function showNotation(){
    const revision=++notationRevision,staff=$('practice-notation').value==='staff'&&mode==='create'&&!!phrase;
    $('practice-tab').hidden=mode!=='create'||staff;$('practice-staff').hidden=!staff;$('practice-notation-retry').hidden=true;
    notationView?.setVisible(staff);if(!staff){$('practice-notation-status').textContent='';return;}
    const currentPhrase=phrase,currentFeelValue=currentFeel();
    $('practice-notation-status').textContent='正在准备五线谱…';
    try{
      if(!window.practiceNotation)await window.siteAssets.load('notation');
      if(revision!==notationRevision||mode!=='create')return;
      notationView??=window.practiceNotation.mount($('practice-staff'),{onSeek:(beat,bar)=>{if(chartValid&&!busyVoices.size)playAt(A.swingBeat(beat,A.feels[currentFeel()].swing),bar);}});
      notationView.setVisible(true);
      if(notationRendered?.phrase!==currentPhrase||notationRendered?.feel!==currentFeelValue){
        const rendered=await notationView.render({phrase:currentPhrase,parsed,feel:A.feels[currentFeelValue].label,swing:A.feels[currentFeelValue].swing});
        if(!rendered||revision!==notationRevision)return;notationRendered={phrase:currentPhrase,feel:currentFeelValue};
      }
      if(revision!==notationRevision)return;
      $('practice-notation-status').textContent='实音高 · 高音谱号';renderPosition();
    }catch(e){if(revision===notationRevision){$('practice-notation-status').textContent=e.message||'谱面载入失败，请重试';$('practice-notation-retry').hidden=false;}}
  }
  async function changeVoice(track,id){
    if (transport.playing) { if (!chartValid) { pane.querySelector('[data-practice-timbre="'+track+'"]').value=A.getTimbre(track);error('和声已修改，请先生成'); return; } generate(liveDraft?.seed ?? currentSeed,{phrase:liveDraft?.phrase || phrase}); return; }
    const request=(voiceRequests.get(track)||0)+1;voiceRequests.set(track,request);busyVoices.add(track);transport.pause();renderPosition();
    const label=pane.querySelector('[data-voice-state="'+track+'"]');label.textContent='正在准备音色…';
    try{const changed=await A.setTimbre(track,id,transport.song.events);if(voiceRequests.get(track)!==request)return;
      label.textContent=changed?'已切换 · 按播放试听':'';if(changed&&activeSettings)activeSettings.timbres=timbreSelection();
    }catch(e){if(voiceRequests.get(track)===request){pane.querySelector('[data-practice-timbre="'+track+'"]').value=A.getTimbre(track);label.textContent=e.message||'音色载入失败，请重选重试';}}
    finally{if(voiceRequests.get(track)===request){busyVoices.delete(track);renderPosition();}}
  }
  function timbreSelection(){return Object.fromEntries([...pane.querySelectorAll('[data-practice-timbre]')].map(select=>[select.dataset.practiceTimbre,select.value]));}
  function generate(seed = nextSeed(), options = {}) {
    error();
    let candidate;
    try { candidate = buildCandidate(seed, options); }
    catch (e) {
      cancelLive(); error(e.message); chartValid=false;$('practice-progression').setAttribute('aria-invalid','true');
      if (!transport.playing) { transport.pause();hideNotation(); } renderPosition();return;
    }
    chartValid=true;$('practice-progression').removeAttribute('aria-invalid');
    if (transport.playing) { void queueCandidate(candidate); return; }
    transport.pause(); transport.bpm=candidate.settings.bpm;
    transport.load(candidate.song); commitCandidate(candidate);
    for(const [track,id] of Object.entries(candidate.settings.timbres))if(A.getTimbre(track)!==id)void changeVoice(track,id);
  }
  function commitCandidate(candidate) {
    parsed=candidate.parsed;phrase=candidate.phrase;currentSeed=candidate.seed;activeSettings=candidate.settings;
    chartValid=true;$('practice-progression').removeAttribute('aria-invalid');
    $('practice-key').disabled=parsed.notation==='chord';$('practice-key').title=parsed.notation==='chord'?'和弦名使用所输入的原调':'级数的参考调';
    if (!transport.playing) selectedBar=0;
    $('practice-chart').innerHTML = parsed.bars.map((bar, i) => `<button type="button" data-practice-bar="${i}" aria-label="第 ${i + 1} 小节，${escape(bar.map(c => c.name).join('、'))}"><small>${String(i + 1).padStart(2, '0')}</small><strong>${bar.map(c => escape(c.name)).join(' <span>·</span> ')}</strong></button>`).join('');
    if(phrase)renderTab();void showNotation();
    renderRhythmScore();
    refreshPositionNodes();
    $('practice-origin').textContent = phrase ? '以动机、问答、蓝调回转、切分和留白写成的原创练习句。不同写法有不同节奏与走向；同一条乐句可换伴奏、收藏和导出 MIDI。非既有曲目转录。' : '鼓、Bass、键盘与节奏吉他可各选演奏风格。随机型每轮更换搭配，最后一两拍加入收尾 fill；关闭某声部请选择 None。音色与演奏风格独立。';
    $('practice-tip').textContent = phrase ? '默认六线谱按标准调弦 E A D G B E 显示；可整页切换实音高五线谱。切谱面或换音色都保留旋律。播放中更换音色、风格、音符密度或乐句，资源就绪后在下一小节生效。' : '先跟 Bass 找落点，再用少量音符呼应军鼓。点选小节开始，单节按钮可反复练这一处。';
    $('practice-save').textContent = '收藏乐句'; renderPosition();
  }
  function renderTab() {
    const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
    $('practice-tab').innerHTML = phrase.notes.length ? parsed.bars.map((bar, index) => {
      const notes = phrase.notes.filter(n => n.bar === index);
      const gaps = strings.flatMap((_, string) => { const row = notes.filter(note => note.string === string); return row.slice(1).map((note, i) => note.beat - row[i].beat); });
      const minGap = Math.min(.5, ...gaps.filter(gap => gap > 0)), width = minGap < .5 ? Math.ceil(60 + 112 / minGap) : 0;
      return `<div class="tab-measure"><div class="tab-scroll" tabindex="0" aria-label="第 ${index + 1} 小节六线谱，可横向滑动"><div class="tab-paper" style="min-width:${width}px"><div class="tab-measure-title"><span>${index + 1}</span><strong>${bar.map(c => escape(c.name)).join(' · ')}</strong></div><div class="tab-strings">${strings.map((s, i) => `<span class="tab-string" style="top:${i * 22}px"><i>${s}</i></span>`).join('')}${notes.map(note => `<button type="button" class="tab-fret" data-note-beat="${note.beat}" style="left:calc(30px + (100% - 60px) * ${(note.beat % 4) / 4});top:${note.string * 22 - 11}px" title="${escape(note.role)} · ${H.names[H.mod(note.midi)]}" aria-label="第 ${index + 1} 小节，第 ${note.beat % 4 + 1} 拍，${note.string + 1} 弦 ${note.fret} 品，${escape(note.role)}">${note.fret}</button>`).join('')}</div><div class="tab-beat-labels"><span>1</span><span>2</span><span>3</span><span>4</span></div></div></div></div>`;
    }).join('') : '';
  }
  let rhythmViewKey='';
  function renderRhythmScore(chorus=0,bar=0) {
    const host=$('practice-rhythm-score'),style=transport.song.chorusStyles?.[chorus]?.rhythm,visible=!!G&&activeSettings?.genre==='funk-soul'&&chartValid&&['sixteenth','soulcomp'].includes(style);
    host.hidden=!visible;if(!visible)return;
    const key=JSON.stringify([currentSeed,chorus,bar,activeSettings.rhythmStyle,activeSettings.text,activeSettings.feel]);
    if(key===rhythmViewKey)return;rhythmViewKey=key;
    const base=chorus*transport.song.chartBeats+bar*4;
    const events=transport.song.events.filter(event=>event.track==='rhythm'&&event.beat>=base&&event.beat<base+4);
    const counts=['1','e','&','a','2','e','&','a','3','e','&','a','4','e','&','a'];
    const tokens=counts.map((_,i)=>{const beat=base+A.swingBeat(i/4,A.feels[currentFeel()].swing),hits=events.filter(event=>Math.abs(event.beat-beat)<.065);return hits.some(event=>event.articulation!=='dead')?'●':hits.length?'×':'·';});
    const chordNames=parsed.bars[bar]?.map(chord=>chord.name).join(' / ')||'';
    host.innerHTML='<div class="rhythm-study-heading"><strong>节奏吉他 · '+escape(chordNames)+'</strong><button type="button" id="practice-rhythm-mute" aria-pressed="false">静音吉他，自己弹</button></div><div class="rhythm-count-grid">'+counts.map((count,i)=>'<div data-rhythm-step="'+i+'" class="'+(tokens[i]==='●'?'hit':tokens[i]==='×'?'ghost':'rest')+'"><small>'+escape(count)+'</small><b>'+tokens[i]+'</b><span>'+(i%2?'↑':'↓')+'</span></div>').join('')+'</div><p>● 和弦发声　× 模拟闷击　· 留空；下／上箭头表示持续的右手摆动。第 '+(bar+1)+' 小节，'+(chorus+1)+' 轮。先慢练，再对齐军鼓与 Bass。</p>';
    const button=$('practice-rhythm-mute'),slider=pane.querySelector('[data-practice-volume="rhythm"]');
    button.setAttribute('aria-pressed',String(slider.value==='0'));
    button.textContent=slider.value==='0'?'恢复吉他示范':'静音吉他，自己弹';
    button.onclick=()=>{const muted=slider.value==='0';slider.value=muted?(slider.dataset.previousVolume||'66'):'0';if(!muted)slider.dataset.previousVolume=pane.querySelector('[data-practice-volume-value="rhythm"]').textContent.replace('%','');slider.dispatchEvent(new Event('input'));button.setAttribute('aria-pressed',String(!muted));button.textContent=muted?'静音吉他，自己弹':'恢复吉他示范';};
  }
  function renderPosition() {
    const position = transport.current(), barCount = parsed?.bars.length || 1;
    const atEnd = !transport.playing && !transport.loop && position > 0 && position >= transport.bounds()[1];
    const chartPosition = transport.song.chartBeats ? (position - (atEnd ? .000001 : 0)) % transport.song.chartBeats : 0;
    const bar = Math.min(barCount - 1, Math.floor(chartPosition / 4));
    const chorus=Math.max(0,Math.floor((position-(atEnd ? .000001 : 0))/(transport.song.chartBeats||4))),parts=transport.song.chorusStyles?.[chorus];
    if(G&&activeSettings?.genre==='funk-soul'){
      renderRhythmScore(chorus,bar);
      const step=Math.max(0,Array.from({length:16},(_,i)=>A.swingBeat(i/4,A.feels[currentFeel()].swing)).findLastIndex(beat=>beat<=chartPosition%4+.005));
      for(const cell of $('practice-rhythm-score').querySelectorAll('[data-rhythm-step]'))cell.classList.toggle('current',transport.playing&&Number(cell.dataset.rhythmStep)===step);
    }
    if(parts){const labels=[['drums','鼓',A.drumStyles],['bass','Bass',A.bassStyles],['keys','键盘',A.keyStyles],['rhythm','吉他',A.rhythmStyles]];setPositionText($('practice-arrangement'),`本轮 ${chorus+1} · `+labels.filter(([track])=>parts[track]!=='none').map(([track,label,registry])=>label+' '+registry[parts[track]]).join(' · '));}
    if (transport.playing) selectedBar = bar;
    const playText = transport.loading ? '…' : transport.playing ? 'Ⅱ' : '▶';
    if (positionUI.play.textContent !== playText) {
      positionUI.play.textContent = playText;
      positionUI.play.setAttribute('aria-label', transport.loading ? '取消载入' : transport.playing ? '暂停' : '播放');
    }
    positionUI.play.disabled=!transport.playing&&(!chartValid||busyVoices.size>0);
    renderLiveState();
    setPositionText(positionUI.status,busyVoices.size?'正在准备音色…':transport.loading?'正在准备音源…':!chartValid?'和声已修改，点击生成':'');
    setPositionText(positionUI.position, `${bar + 1} / ${barCount}`);
    if (!liveDraft && document.activeElement !== positionUI.bpm && positionUI.bpm.value !== String(transport.bpm)) positionUI.bpm.value = transport.bpm;
    setPositionPressed(positionUI.loop, transport.loop);
    setPositionPressed(positionUI.barLoop, transport.loopBar !== null);
    const barButton = chartButtons[bar] || null;
    if (barButton !== activeBarButton) {
      activeBarButton?.classList.remove('active'); activeBarButton?.removeAttribute('aria-current');
      barButton?.classList.add('active'); barButton?.setAttribute('aria-current', 'true');
      activeBarButton = barButton;
    }
    const beatLight = transport.playing ? positionUI.beats[Math.floor(chartPosition % 4)] : null;
    if (beatLight !== activeBeatLight) {
      activeBeatLight?.classList.remove('active'); beatLight?.classList.add('active'); activeBeatLight = beatLight;
    }
    const chord = parsed?.chords.find(c => chartPosition >= c.beat && chartPosition < c.beat + c.beats);
    setPositionText(positionUI.chord, chord?.name || '');
    let noteButton = null,noteBeat=null;
    if (phrase && transport.playing) {
      const swing = A.feels[currentFeel()].swing;
      const active = phrase.notes.findLast(note => A.swingBeat(note.beat, swing) <= chartPosition + .02);
      noteBeat=active?.beat;noteButton=noteButtons.get(noteBeat)||null;
    }
    if(notationView&&mode==='create'&&$('practice-notation').value==='staff')notationView.update({beat:chartPosition,noteBeat,bar,playing:transport.playing,follow:transport.playing});
    if (noteButton !== activeNoteButton) {
      activeNoteButton?.classList.remove('active'); noteButton?.classList.add('active'); activeNoteButton = noteButton;
      if (noteButton && !$('practice-tab').hidden) {
        const viewport = noteButton.closest('.tab-scroll');
        if (viewport && viewport.scrollWidth > viewport.clientWidth) {
          const frame = viewport.getBoundingClientRect(), note = noteButton.getBoundingClientRect();
          if (note.left < frame.left + 12 || note.right > frame.right - 12) viewport.scrollTo({ left: Math.max(0, viewport.scrollLeft + note.left - frame.left - 28), behavior: 'auto' });
        }
      }
    }
  }
  const storageKey = 'tuner-original-licks-v1';
  function validPhrase(value) {
    return value && Number.isInteger(value.bars) && value.bars > 0 && value.bars <= 16 && Array.isArray(value.notes) && value.notes.length > 0 && value.notes.length <= 256 && value.notes.every(note => Number.isFinite(note.beat) && note.beat >= 0 && Number.isFinite(note.duration) && note.duration > 0 && (note.notationDuration===undefined||Number.isFinite(note.notationDuration)&&note.notationDuration>0&&note.beat+note.notationDuration<=value.bars*4+1e-6) && note.beat + note.duration <= value.bars * 4 + 1e-6 && Number.isInteger(note.midi) && note.midi >= 40 && note.midi <= 88 && Number.isInteger(note.string) && note.string >= 0 && note.string <= 5 && Number.isInteger(note.fret) && note.fret >= 0 && note.fret <= 24 && [64,59,55,50,45,40][note.string] + note.fret === note.midi && note.bar === Math.floor(note.beat / 4) && Number.isFinite(note.velocity) && note.velocity > 0 && note.velocity <= 1 && typeof note.role === 'string' && note.role.length < 100);
  }
  function saved() {
    try { const items = JSON.parse(window.siteStorage.getItem(storageKey) || '[]'); return Array.isArray(items) ? items.filter(x => (x.version === 1 || x.version === 2 && validPhrase(x.phrase)) && typeof x.text === 'string' && x.text.length <= 512 && H.names.includes(x.key) && A.feels[x.feel] && Number.isInteger(x.seed) && x.seed >= 0 && Number.isFinite(x.bpm)).slice(0, 50) : []; } catch { return []; }
  }
  function renderSaved() { $('practice-saved').innerHTML = '<option value="">选择乐句</option>' + saved().map((item, i) => `<option value="${i}">${escape(item.key + ' · ' + item.text)} · ${i + 1}</option>`).join(''); }
  function dirty() { cancelLive();error();$('practice-progression').removeAttribute('aria-invalid');chartValid=false;if(!transport.playing)transport.pause();renderPosition(); }
  nav.addEventListener('click', event => { const button = event.target.closest('[data-lesson-mode]'); if (button) setMode(button.dataset.lessonMode); });
  $('practice-input-guide').addEventListener('click', event => { const button = event.target.closest('[data-harmony-example]'); if (!button) return; $('practice-progression').value = button.dataset.harmonyExample; $('practice-preset').value = 'custom'; dirty(); $('practice-progression').focus(); });
  $('practice-form').addEventListener('submit', event => { event.preventDefault(); generate(); });
  $('practice-progression').addEventListener('input', () => { $('practice-preset').value = 'custom'; dirty(); });
  $('practice-key').addEventListener('change', () => generate());
  const refreshArrangement=()=>{if(!chartValid){error('和声已修改，请先生成');return;}generate(liveDraft?.seed ?? currentSeed,{phrase:liveDraft?.phrase || phrase});};
  $('practice-feel').addEventListener('change',()=>{$('practice-bpm').value=A.feels[$('practice-feel').value].bpm;refreshArrangement();});
  const rewritePhrase = () => { describeIntensity(); if (!chartValid) { error('和声已修改，请先生成'); return; } generate(liveDraft?.seed ?? currentSeed); };
  $('practice-phrase-style').addEventListener('change', rewritePhrase);
  $('practice-intensity').addEventListener('change', rewritePhrase);
  $('practice-bass-style').addEventListener('change',refreshArrangement);
  for(const id of ['drum','key','rhythm'])$('practice-'+id+'-style').addEventListener('change',refreshArrangement);
  $('practice-notation').addEventListener('change',()=>void showNotation());$('practice-notation-retry').onclick=()=>{notationRendered=null;void showNotation();};
  pane.querySelectorAll('[data-practice-timbre]').forEach(select=>select.addEventListener('change',()=>void changeVoice(select.dataset.practiceTimbre,select.value)));
  $('practice-preset').addEventListener('change', () => { const text = presets[$('practice-preset').value]; if (text) { $('practice-progression').value = text; generate(); } else $('practice-progression').focus(); });
  $('practice-play').addEventListener('click', () => { error(); if (transport.playing || transport.loading) transport.pause(); else { stopOtherPlayers(); safe(transport.play().then(() => { for (const slider of pane.querySelectorAll('[data-practice-volume]')) A.volume(slider.dataset.practiceVolume, Number(slider.value) / 100); })); } });
  $('practice-rewind').addEventListener('click', () => { selectedBar = 0; transport.loopBar = null; transport.stopBounds = [0, transport.song.chartBeats || transport.song.beats]; safe(transport.seek(0)); });
  $('practice-bpm').addEventListener('change', event => { if(transport.playing)refreshArrangement();else{safe(transport.tempo(event.target.value));if(activeSettings)activeSettings.bpm=transport.bpm;} });
  $('practice-live-retry').addEventListener('click',()=>{if(liveDraft&&transport.playing){error();void queueCandidate(liveDraft);}});
  $('practice-bpm').addEventListener('blur', renderPosition);
  $('practice-loop').addEventListener('click', () => safe(transport.setLoop(!transport.loop)));
  $('practice-bar-loop').addEventListener('click', () => safe(transport.setLoopBar(transport.loopBar === null ? selectedBar : null)));
  $('practice-chart').addEventListener('click', event => { const button = event.target.closest('[data-practice-bar]'); if (button && !$('practice-play').disabled) playAt(+button.dataset.practiceBar * 4, +button.dataset.practiceBar); });
  $('practice-tab').addEventListener('click', event => { const button = event.target.closest('[data-note-beat]'); if (button && !$('practice-play').disabled) playAt(A.swingBeat(+button.dataset.noteBeat, A.feels[currentFeel()].swing), Math.floor(+button.dataset.noteBeat / 4)); });
  pane.querySelectorAll('[data-practice-volume]').forEach(slider => slider.addEventListener('input', () => { pane.querySelector('[data-practice-volume-value="'+slider.dataset.practiceVolume+'"]').textContent=slider.value+'%';if(transport.playing)A.volume(slider.dataset.practiceVolume,Number(slider.value)/100); }));
  $('practice-save').addEventListener('click', () => {
    if (!phrase || $('practice-save').disabled || $('practice-play').disabled) return;
    const items = saved(), item = { version:2,harmonyVersion:2,...(genre?{genre}:{}),timbres:timbreSelection(),phrase:JSON.parse(JSON.stringify(phrase)), style: $('practice-phrase-style').value, intensity: $('practice-intensity').value, bassStyle: $('practice-bass-style').value, drumStyle: $('practice-drum-style').value, keyStyle: $('practice-key-style').value, rhythmStyle: $('practice-rhythm-style').value, text: $('practice-progression').value, key: $('practice-key').value, feel: $('practice-feel').value, seed: currentSeed, bpm: transport.bpm };
    if (!items.some(x => (x.genre||null)===(item.genre||null) && x.seed === item.seed && x.text === item.text && x.key === item.key && x.feel === item.feel && x.style === item.style && (x.intensity || 'standard') === item.intensity && x.bassStyle === item.bassStyle && x.rhythmStyle===item.rhythmStyle&&x.keyStyle===item.keyStyle&&x.drumStyle===item.drumStyle&&JSON.stringify(x.timbres)===JSON.stringify(item.timbres))) items.unshift(item);
    const persisted = window.siteStorage.setItem(storageKey, JSON.stringify(items.slice(0, 50)));
    $('practice-save').textContent = persisted ? '已收藏' : '本次暂存';
    error(persisted ? '' : '未能保存到本机，请在离开前导出 MIDI');
    renderSaved();
  });
  $('practice-saved').addEventListener('change', () => {
    if ($('practice-saved').value === '') return;
    const item = saved()[+$('practice-saved').value]; if (!item) return;
    if(G){const id=G.normalize(item.genre);if(id!==genre){drafts[mode]={...readSettings(),seed:currentSeed,phrase:chartValid?phrase:null};genreDrafts.set(genre,{...drafts});genre=id;if(id){Object.assign(drafts,genreDrafts.get(id)||defaults(id));updateGenrePresets();}else Object.assign(drafts,{create:{},backing:{text:presets.blues,key:'A',feel:'shuffle',bpm:96,preset:'blues'}});}window.dispatchEvent(new CustomEvent('tuner:genre-change',{detail:{genre:id}}));}
    $('practice-intensity').value = H.phraseIntensities[item.intensity] ? item.intensity : 'standard'; describeIntensity();
    $('practice-progression').value = item.harmonyVersion === 2 ? item.text : H.upgradeInput(item.text, item.key); $('practice-key').value = item.key; $('practice-feel').value = item.feel; $('practice-phrase-style').value = H.phraseStyles[item.style] ? item.style : 'mixed'; $('practice-bass-style').value = A.bassStyles[item.bassStyle] ? item.bassStyle : 'walking'; restoreStyles(item); $('practice-bpm').value = item.bpm;
    for(const track of Object.keys(A.timbres)){const id=A.timbres[track][item.timbres?.[track]]?item.timbres[track]:defaultTimbres[track];const select=pane.querySelector('[data-practice-timbre="'+track+'"]');select.value=id;}
    generate(item.seed,{phrase:item.version===2?item.phrase:null,legacy:item.version===1});
  });
  function midiFile() {
    if (!phrase) return null;
    const ppq = 480, swing = A.feels[currentFeel()].swing, micros = Math.round(60000000 / transport.bpm);
    const events = [{ tick: 0, bytes: [0xff, 0x51, 3, micros >> 16 & 255, micros >> 8 & 255, micros & 255] }, { tick: 0, bytes:[0xc0,({piano:0,violin:40,crunch:29})[A.getTimbre('lead')]??26] }];
    phrase.notes.forEach(note => { events.push({ tick: Math.round(A.swingBeat(note.beat, swing) * ppq), bytes: [0x90, note.midi, Math.round(note.velocity * 100)] }, { tick: Math.round(A.swingBeat(note.beat + note.duration, swing) * ppq), bytes: [0x80, note.midi, 0] }); });
    const priority = event => event.bytes[0] === 0xff ? 0 : event.bytes[0] === 0xc0 ? 1 : event.bytes[0] === 0x80 ? 2 : 3;
    events.sort((a, b) => a.tick - b.tick || priority(a) - priority(b));
    const variable = value => { const result = [value & 127]; while ((value >>= 7)) result.unshift((value & 127) | 128); return result; };
    let previous = 0; const track = [];
    for (const event of events) { track.push(...variable(event.tick - previous), ...event.bytes); previous = event.tick; }
    track.push(...variable(Math.max(0, phrase.bars * 4 * ppq - previous)), 0xff, 0x2f, 0);
    return new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, 77, 84, 114, 107, track.length >>> 24 & 255, track.length >>> 16 & 255, track.length >>> 8 & 255, track.length & 255, ...track]);
  }
  $('practice-midi').addEventListener('click', () => {
    if ($('practice-midi').disabled || $('practice-play').disabled) return;
    const bytes = midiFile(); if (!bytes) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })), link = document.createElement('a');
    link.href = url; link.download = `tuner-lick-${$('practice-key').value}-${currentSeed}.mid`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('harmony-create')?.addEventListener('click', () => setMode('create', $('lick-harmony').value));
  document.addEventListener('keydown', event => {
    if (!isPractice(mode) || page.style.display === 'none' || event.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault(); $('practice-play').click();
  });
  document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => { if (button.dataset.page !== 'lesson') transport.pause(); }));
  window.addEventListener('pagehide', () => transport.pause());
  window.addEventListener('tuner:lesson-play', () => transport.pause());
  if(G)updateGenrePresets();
  window.practiceStudio = { setMode,setGenre,openLesson,getGenre:()=>genre,getMode:()=>mode,activate:()=>{if(isPractice(mode))void showNotation();}, stop:()=>{transport.pause();hideNotation();},transport, generate, midiFile, getPhrase: () => phrase, getProgression: () => parsed };
})();
