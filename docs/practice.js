(function () {
  'use strict';
  const $ = id => document.getElementById(id), H = window.tunerHarmony, A = window.practiceAudio;
  const page = $('lesson-page');
  if (!page || !H || !A) return;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const library = document.createElement('div'); library.id = 'lesson-library-pane';
  library.append(...page.childNodes); page.append(library);
  const nav = document.createElement('div'); nav.className = 'lesson-modes'; nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', '教学内容');
  nav.innerHTML = '<button type="button" data-lesson-mode="library" class="active" aria-pressed="true">乐句</button><button type="button" data-lesson-mode="create" aria-pressed="false">创作</button><button type="button" data-lesson-mode="backing" aria-pressed="false">伴奏</button>';
  page.prepend(nav);
  const pane = document.createElement('section'); pane.id = 'practice-pane'; pane.hidden = true; pane.setAttribute('aria-label', '和声练习');
  pane.innerHTML = `
    <div class="practice-heading"><h1 id="practice-title">Backing track</h1><select id="practice-preset" aria-label="伴奏和声预设"><option value="blues">12 小节 Blues</option><option value="quick">Quick change</option><option value="minor">Minor blues</option><option value="custom">自定和声</option></select></div>
    <form id="practice-form" class="practice-form">
      <label class="practice-changes">和声<input id="practice-progression" autocomplete="off" spellcheck="false" maxlength="256" aria-describedby="practice-help practice-error" placeholder="Dm7 G7 Cmaj7，或 2-5-1"></label>
      <label>调<select id="practice-key" aria-label="级数参考调"></select></label>
      <button type="submit" id="practice-generate">生成</button>
    </form>
    <p class="practice-help" id="practice-help">每个和弦一小节；同小节写成 Dm7 G7 | Cmaj7。级数以大调为参照。</p>
    <p id="practice-error" class="practice-error" role="alert" hidden></p>
    <div class="practice-transport" aria-label="练习播放控制">
      <button id="practice-rewind" class="practice-round" type="button" aria-label="回到开头">↤</button>
      <button id="practice-play" class="practice-round primary" type="button" aria-label="播放">▶</button>
      <label class="practice-tempo"><input id="practice-bpm" type="number" min="40" max="180" step="1" value="96" inputmode="numeric" aria-label="每分钟拍数"><span>BPM</span></label>
      <select id="practice-feel" aria-label="律动"><option value="shuffle">Shuffle</option><option value="slow">Slow blues</option><option value="straight">Straight</option></select>
      <button id="practice-loop" type="button" class="on" aria-pressed="true">循环</button>
      <button id="practice-bar-loop" type="button" aria-pressed="false" title="循环当前小节，点选和弦可换小节">单节</button>
      <span class="practice-position" id="practice-position">1 / 12</span>
    </div>
    <div class="practice-beat-row"><div class="practice-beats" aria-label="当前拍点"><i></i><i></i><i></i><i></i></div><span id="practice-current-chord"></span><span id="practice-status" role="status"></span></div>
    <div id="practice-chart" class="practice-chart" aria-label="点选小节"></div>
    <div id="practice-tab" class="practice-tab" aria-label="吉他六线谱" hidden></div>
    <div class="practice-footer"><details class="practice-mixer"><summary>音量</summary><div>${[['drums', '鼓', 78], ['bass', 'Bass', 82], ['keys', '风琴', 65], ['lead', '吉他', 95]].map(([id, name, value]) => `<label data-mix-track="${id}">${name}<input data-practice-volume="${id}" type="range" min="0" max="100" value="${value}" aria-label="${name}音量"></label>`).join('')}</div></details><button id="practice-save" type="button" hidden>收藏乐句</button><button id="practice-midi" type="button" hidden>MIDI</button></div>
    <div id="practice-saved-wrap" hidden><label class="saved-picker">本机收藏<select id="practice-saved" aria-label="已收藏的原创乐句"><option value="">选择乐句</option></select></label></div>
    <details class="practice-notes"><summary>练习与来源</summary><p id="practice-origin"></p><p id="practice-tip"></p><a href="assets/audio/blues/credits.html" target="_blank" rel="noopener">音源与许可</a></details>`;
  page.append(pane);
  $('practice-key').innerHTML = H.names.map(name => `<option ${name === 'A' ? 'selected' : ''}>${name}</option>`).join('');
  const presets = {
    blues: 'I7 | I7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7',
    quick: 'I7 | IV7 | I7 | I7 | IV7 | IV7 | I7 | I7 | V7 | IV7 | I7 | V7',
    minor: 'i7 | i7 | i7 | i7 | iv7 | iv7 | i7 | i7 | bVI7 | V7 | i7 | V7'
  };
  let mode = 'library', parsed = null, phrase = null, currentSeed = 1, selectedBar = 0;
  const drafts = { create: { text: 'ii7 | V7 | Imaj7', key: 'C', feel: 'shuffle', bpm: 96 }, backing: { text: presets.blues, key: 'A', feel: 'shuffle', bpm: 96, preset: 'blues' } };
  const transport = new A.Transport(renderPosition);
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
    if (mode === next && !text) return;
    if (mode !== 'library') drafts[mode] = { text: $('practice-progression').value, key: $('practice-key').value, feel: $('practice-feel').value, bpm: transport.bpm, preset: $('practice-preset').value, seed: currentSeed };
    transport.pause(); window.lessonPlayer?.stop(); mode = next;
    page.dataset.lessonMode = mode;
    nav.querySelectorAll('button').forEach(button => { const active = button.dataset.lessonMode === mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    library.hidden = mode !== 'library'; pane.hidden = mode === 'library';
    if (mode === 'library') return;
    const draft = drafts[mode];
    $('practice-progression').value = text || draft.text; $('practice-key').value = draft.key;
    $('practice-feel').value = draft.feel; $('practice-bpm').value = draft.bpm; transport.bpm = draft.bpm;
    $('practice-title').textContent = mode === 'create' ? '原创乐句' : 'Backing track';
    $('practice-generate').textContent = mode === 'create' ? '写一条' : '生成';
    $('practice-preset').hidden = mode !== 'backing'; $('practice-preset').value = draft.preset || 'custom';
    $('practice-save').hidden = $('practice-midi').hidden = mode !== 'create';
    pane.querySelector('[data-mix-track="lead"]').hidden = mode !== 'create';
    $('practice-saved-wrap').hidden = mode !== 'create';
    $('practice-tab').hidden = mode !== 'create';
    renderSaved(); generate(text ? nextSeed() : draft.seed ?? nextSeed());
    if (!navigator.connection?.saveData) {
      const warm = () => { if (mode !== 'library') { try { A.preload().catch(() => {}); } catch {} } };
      if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 800 }); else setTimeout(warm, 0);
    }
  }
  function songForPhrase() {
    const song = A.arrangement(parsed, $('practice-feel').value, currentSeed, 1);
    const swing = A.feels[$('practice-feel').value].swing;
    song.events.push(...phrase.notes.map(note => ({ ...note, beat: A.swingBeat(note.beat, swing), duration: A.swingBeat(note.beat + note.duration, swing) - A.swingBeat(note.beat, swing), track: 'lead' })));
    song.events.sort((a, b) => a.beat - b.beat); return song;
  }
  function generate(seed = nextSeed()) {
    transport.pause(); error();
    const candidate = H.parse($('practice-progression').value, $('practice-key').value);
    if (candidate.error || !candidate.chords.length || candidate.bars.length > 16) {
      error(candidate.error || (candidate.bars.length > 16 ? '练习最多 16 小节' : '先写一组和声'));
      $('practice-progression').setAttribute('aria-invalid', 'true');
      $('practice-play').disabled = true; return;
    }
    $('practice-progression').removeAttribute('aria-invalid'); $('practice-play').disabled = false;
    $('practice-key').disabled = candidate.notation === 'chord';
    $('practice-key').title = candidate.notation === 'chord' ? '和弦名使用所输入的原调' : '级数的参考调';
    parsed = candidate; currentSeed = seed;
    phrase = mode === 'create' ? H.generate(parsed, currentSeed, $('practice-feel').value === 'straight' ? 'jazz' : 'blues') : null;
    selectedBar = 0;
    transport.load(phrase ? songForPhrase() : A.arrangement(parsed, $('practice-feel').value, currentSeed));
    $('practice-chart').innerHTML = parsed.bars.map((bar, i) => `<button type="button" data-practice-bar="${i}" aria-label="第 ${i + 1} 小节，${escape(bar.map(c => c.name).join('、'))}"><small>${String(i + 1).padStart(2, '0')}</small><strong>${bar.map(c => escape(c.name)).join(' <span>·</span> ')}</strong></button>`).join('');
    if (phrase) renderTab();
    refreshPositionNodes();
    $('practice-origin').textContent = phrase ? '浏览器按和弦音、趋近音与问答节奏写成的原创练习句，可试听、点选和收藏。不是经典曲目的转录。' : '真实爵士鼓、电贝斯采样与合成风琴。Shuffle 使用三连音律动；四轮编配包含力度变化、轻击与过门。';
    $('practice-tip').textContent = phrase ? '标准调弦 E A D G B E。六线谱从上到下对应细弦到粗弦；点击音符可定位，悬停查看落点。' : '先跟 Bass 找落点，再用少量音符呼应军鼓。点选小节开始，单节按钮可反复练这一处。';
    $('practice-save').textContent = '收藏乐句'; renderPosition();
  }
  function renderTab() {
    const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
    $('practice-tab').innerHTML = phrase.notes.length ? parsed.bars.map((bar, index) => {
      const notes = phrase.notes.filter(n => n.bar === index);
      return `<div class="tab-measure"><div class="tab-measure-title"><span>${index + 1}</span><strong>${bar.map(c => escape(c.name)).join(' · ')}</strong></div><div class="tab-strings">${strings.map((s, i) => `<span class="tab-string" style="top:${i * 22}px"><i>${s}</i></span>`).join('')}${notes.map(note => `<button type="button" class="tab-fret" data-note-beat="${note.beat}" style="left:calc(30px + (100% - 60px) * ${(note.beat % 4) / 4});top:${note.string * 22 - 11}px" title="${escape(note.role)} · ${H.names[H.mod(note.midi)]}" aria-label="第 ${index + 1} 小节，第 ${note.beat % 4 + 1} 拍，${note.string + 1} 弦 ${note.fret} 品，${escape(note.role)}">${note.fret}</button>`).join('')}</div><div class="tab-beat-labels"><span>1</span><span>2</span><span>3</span><span>4</span></div></div>`;
    }).join('') : '';
  }
  function renderPosition() {
    const position = transport.current(), barCount = parsed?.bars.length || 1;
    const atEnd = !transport.playing && !transport.loop && position > 0 && position >= transport.bounds()[1];
    const chartPosition = transport.song.chartBeats ? (position - (atEnd ? .000001 : 0)) % transport.song.chartBeats : 0;
    const bar = Math.min(barCount - 1, Math.floor(chartPosition / 4));
    if (transport.playing) selectedBar = bar;
    const playText = transport.loading ? '…' : transport.playing ? 'Ⅱ' : '▶';
    if (positionUI.play.textContent !== playText) {
      positionUI.play.textContent = playText;
      positionUI.play.setAttribute('aria-label', transport.loading ? '取消载入' : transport.playing ? '暂停' : '播放');
    }
    setPositionText(positionUI.status, transport.loading ? '正在准备音源…' : '');
    setPositionText(positionUI.position, `${bar + 1} / ${barCount}`);
    if (document.activeElement !== positionUI.bpm && positionUI.bpm.value !== String(transport.bpm)) positionUI.bpm.value = transport.bpm;
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
    let noteButton = null;
    if (phrase && transport.playing) {
      const swing = A.feels[positionUI.feel.value].swing;
      const active = phrase.notes.findLast(note => A.swingBeat(note.beat, swing) <= chartPosition + .02);
      noteButton = noteButtons.get(active?.beat) || null;
    }
    if (noteButton !== activeNoteButton) {
      activeNoteButton?.classList.remove('active'); noteButton?.classList.add('active'); activeNoteButton = noteButton;
    }
  }
  const storageKey = 'tuner-original-licks-v1';
  function saved() {
    try { const items = JSON.parse(window.siteStorage.getItem(storageKey) || '[]'); return Array.isArray(items) ? items.filter(x => x.version === 1 && typeof x.text === 'string' && x.text.length <= 256 && H.names.includes(x.key) && A.feels[x.feel] && Number.isInteger(x.seed) && x.seed >= 0 && Number.isFinite(x.bpm)).slice(0, 50) : []; } catch { return []; }
  }
  function renderSaved() { $('practice-saved').innerHTML = '<option value="">选择乐句</option>' + saved().map((item, i) => `<option value="${i}">${escape(item.key + ' · ' + item.text)} · ${i + 1}</option>`).join(''); }
  function dirty() { transport.pause(); $('practice-play').disabled = true; $('practice-status').textContent = '和声已修改，点击生成'; }
  nav.addEventListener('click', event => { const button = event.target.closest('[data-lesson-mode]'); if (button) setMode(button.dataset.lessonMode); });
  $('practice-form').addEventListener('submit', event => { event.preventDefault(); generate(); });
  $('practice-progression').addEventListener('input', () => { $('practice-preset').value = 'custom'; dirty(); });
  $('practice-key').addEventListener('change', () => generate());
  $('practice-feel').addEventListener('change', () => { transport.bpm = A.feels[$('practice-feel').value].bpm; generate(currentSeed); });
  $('practice-preset').addEventListener('change', () => { const text = presets[$('practice-preset').value]; if (text) { $('practice-progression').value = text; generate(); } else $('practice-progression').focus(); });
  $('practice-play').addEventListener('click', () => { error(); if (transport.playing || transport.loading) transport.pause(); else { stopOtherPlayers(); safe(transport.play().then(() => { for (const slider of pane.querySelectorAll('[data-practice-volume]')) A.volume(slider.dataset.practiceVolume, Number(slider.value) / 100); })); } });
  $('practice-rewind').addEventListener('click', () => { selectedBar = 0; transport.loopBar = null; transport.stopBounds = [0, transport.song.chartBeats || transport.song.beats]; safe(transport.seek(0)); });
  $('practice-bpm').addEventListener('change', event => safe(transport.tempo(event.target.value)));
  $('practice-bpm').addEventListener('blur', renderPosition);
  $('practice-loop').addEventListener('click', () => safe(transport.setLoop(!transport.loop)));
  $('practice-bar-loop').addEventListener('click', () => safe(transport.setLoopBar(transport.loopBar === null ? selectedBar : null)));
  $('practice-chart').addEventListener('click', event => { const button = event.target.closest('[data-practice-bar]'); if (button && !$('practice-play').disabled) playAt(+button.dataset.practiceBar * 4, +button.dataset.practiceBar); });
  $('practice-tab').addEventListener('click', event => { const button = event.target.closest('[data-note-beat]'); if (button && !$('practice-play').disabled) playAt(A.swingBeat(+button.dataset.noteBeat, A.feels[$('practice-feel').value].swing), Math.floor(+button.dataset.noteBeat / 4)); });
  pane.querySelectorAll('[data-practice-volume]').forEach(slider => slider.addEventListener('input', () => { if (transport.playing) A.volume(slider.dataset.practiceVolume, Number(slider.value) / 100); }));
  $('practice-save').addEventListener('click', () => {
    if (!phrase || $('practice-play').disabled) return;
    const items = saved(), item = { version: 1, text: $('practice-progression').value, key: $('practice-key').value, feel: $('practice-feel').value, seed: currentSeed, bpm: transport.bpm };
    if (!items.some(x => x.seed === item.seed && x.text === item.text && x.key === item.key && x.feel === item.feel)) items.unshift(item);
    const persisted = window.siteStorage.setItem(storageKey, JSON.stringify(items.slice(0, 50)));
    $('practice-save').textContent = persisted ? '已收藏' : '本次暂存';
    error(persisted ? '' : '未能保存到本机，请在离开前导出 MIDI');
    renderSaved();
  });
  $('practice-saved').addEventListener('change', () => {
    if ($('practice-saved').value === '') return;
    const item = saved()[+$('practice-saved').value]; if (!item) return;
    $('practice-progression').value = item.text; $('practice-key').value = item.key; $('practice-feel').value = item.feel; transport.bpm = item.bpm; generate(item.seed);
  });
  function midiFile() {
    if (!phrase) return null;
    const ppq = 480, swing = A.feels[$('practice-feel').value].swing, micros = Math.round(60000000 / transport.bpm);
    const events = [{ tick: 0, bytes: [0xff, 0x51, 3, micros >> 16 & 255, micros >> 8 & 255, micros & 255] }, { tick: 0, bytes: [0xc0, 26] }];
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
    if ($('practice-play').disabled) return;
    const bytes = midiFile(); if (!bytes) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })), link = document.createElement('a');
    link.href = url; link.download = `tuner-lick-${$('practice-key').value}-${currentSeed}.mid`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('harmony-create')?.addEventListener('click', () => setMode('create', $('lick-harmony').value));
  document.addEventListener('keydown', event => {
    if (mode === 'library' || page.style.display === 'none' || event.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault(); $('practice-play').click();
  });
  document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => { if (button.dataset.page !== 'lesson') transport.pause(); }));
  window.addEventListener('pagehide', () => transport.pause());
  window.addEventListener('tuner:lesson-play', () => transport.pause());
  window.practiceStudio = { setMode, stop: () => transport.pause(), transport, generate, midiFile, getPhrase: () => phrase, getProgression: () => parsed };
})();
