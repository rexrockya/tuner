(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', GRID = 16;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
  const spelling = [['C', 0], ['C', 1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
  const values = [[64, 'whole', 0], [48, 'half', 1], [32, 'half', 0], [24, 'quarter', 1], [16, 'quarter', 0], [12, 'eighth', 1], [8, 'eighth', 0], [6, '16th', 1], [4, '16th', 0], [3, '32nd', 1], [2, '32nd', 0], [1, '64th', 0]];
  const name = midi => { const [step, alter] = spelling[((midi % 12) + 12) % 12]; return step + (alter > 0 ? '♯' : alter < 0 ? '♭' : '') + (Math.floor(midi / 12) - 1); };
  function splitSpan(start, duration, rest) {
    let cursor = Math.round(start * GRID), left = Math.round(duration * GRID); const pieces = [];
    while (left > 0) {
      const inBar = cursor % (GRID * 4), inBeat = cursor % GRID;
      // Make syncopation visible by tying off-beat notes across the next beat.
      let limit = Math.min(left, GRID * 4 - inBar);
      if (inBeat) limit = Math.min(limit, GRID - inBeat);
      else if (rest || inBar % (GRID * 2)) limit = Math.min(limit, GRID);
      const value = values.find(([ticks]) => ticks <= limit);
      pieces.push({ beat: cursor / GRID, duration: value[0] / GRID, type: value[1], dots: value[2] });
      cursor += value[0]; left -= value[0];
    }
    return pieces;
  }
  function scoreData({ phrase, parsed, feel = '', swing = .5 }) {
    if (!phrase || !parsed?.bars?.length || !Array.isArray(phrase.notes)) throw Error('先生成一条乐句');
    const notes = [...phrase.notes].sort((a, b) => a.beat - b.beat), end = parsed.bars.length * 4;
    if (notes.length > 256 || end > 64 || notes.some(n => !Number.isFinite(n.beat) || !Number.isFinite(n.duration) || n.duration <= 0 || n.beat < 0 || n.beat >= end || !Number.isInteger(n.midi) || n.midi < 0 || n.midi > 127)) throw Error('乐句音符无法写入五线谱');
    const segments = [], measures = parsed.bars.map(() => []); let cursor = 0;
    const add = (start, duration, note) => {
      const pieces = splitSpan(start, duration, !note);
      pieces.forEach((piece, i) => {
        const segment = { ...piece, bar: Math.floor(piece.beat / 4), sourceBeat: note?.beat, midi: note?.midi, rest: !note, tieStart: Boolean(note && i < pieces.length - 1), tieStop: Boolean(note && i > 0), detached: Boolean(note && i === 0 && note.duration / duration < .76) };
        segments.push(segment); measures[segment.bar].push(segment);
      });
    };
    notes.forEach((note, i) => {
      const start = Math.round(note.beat * GRID) / GRID;
      if (Math.abs(start - note.beat) > 1e-5 || start < cursor - 1e-5) throw Error('这条乐句的节奏暂不能写入五线谱');
      if (start > cursor) add(cursor, start - cursor);
      const chord = parsed.chords.find(chord => note.beat >= chord.beat && note.beat < chord.beat + chord.beats);
      const boundary = Math.min(notes[i + 1]?.beat ?? end, chord ? chord.beat + chord.beats : end);
      // The generator's duration is an audio gate. notationDuration is its written
      // rhythmic value; older saved phrases recover that value from the next onset.
      const written = Number.isFinite(note.notationDuration) && note.notationDuration > 0 ? note.notationDuration : boundary - note.beat;
      const duration = Math.round(Math.min(written, boundary - note.beat) * GRID) / GRID;
      if (duration <= 0) throw Error('乐句中存在重叠音符');
      add(start, duration, note); cursor = start + duration;
    });
    if (cursor < end) add(cursor, end - cursor);
    const words = swing > .51 ? `${feel || 'Swing'} · 直写节奏，按 Swing 演奏` : `${feel || 'Straight'} · 实音高`;
    const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<score-partwise version="3.1"><work><work-title>原创乐句</work-title></work><part-list><score-part id="P1"><part-name>Lead</part-name><part-abbreviation>Lead</part-abbreviation></score-part></part-list><part id="P1">' +
      measures.map((items, bar) => '<measure number="' + (bar + 1) + '">' +
        (bar === 0 ? `<attributes><divisions>${GRID}</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><words>${escape(words)}</words></direction-type></direction>` : '') +
        `<direction placement="above"><direction-type><words font-weight="bold">${escape(parsed.bars[bar].map(c => c.name).join(' · '))}</words></direction-type></direction>` +
        items.map(item => {
          const pitch = item.rest ? '<rest/>' : (() => { const [step, alter] = spelling[item.midi % 12]; return `<pitch><step>${step}</step>${alter ? '<alter>' + alter + '</alter>' : ''}<octave>${Math.floor(item.midi / 12) - 1}</octave></pitch>`; })();
          const ties = (item.tieStop ? '<tie type="stop"/>' : '') + (item.tieStart ? '<tie type="start"/>' : '');
          const notations = (item.tieStop ? '<tied type="stop"/>' : '') + (item.tieStart ? '<tied type="start"/>' : '') + (item.detached ? '<articulations><staccato/></articulations>' : '');
          return `<note>${pitch}<duration>${Math.round(item.duration * GRID)}</duration>${ties}<voice>1</voice><type>${item.type}</type>${'<dot/>'.repeat(item.dots)}${notations ? '<notations>' + notations + '</notations>' : ''}</note>`;
        }).join('') + (bar === measures.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : '') + '</measure>').join('') + '</part></score-partwise>';
    return { xml, segments };
  }
  function mount(host, { onSeek = () => {} } = {}) {
    host.classList.add('practice-staff');
    const message = document.createElement('p'), viewport = document.createElement('div');
    message.className = 'practice-staff-message'; message.setAttribute('role', 'status');
    viewport.className = 'practice-staff-viewport'; viewport.setAttribute('aria-label', '原创乐句五线谱，可横向滑动');
    viewport.setAttribute('tabindex', '0'); host.replaceChildren(message, viewport);
    let generation = 0, disposed = false, visible = !host.hidden, data, renderer, canvas, lastWidth = 0, resizeTimer;
    let targets = new Map(), bars = [], activeTargets = [], activeBar, position = {};
    const stages = new Set();
    function update(next = {}) {
      position = { ...position, ...next };
      if (!visible || disposed) return;
      const selected = position.playing ? targets.get(position.noteBeat) || [] : [];
      const noteChanged = selected !== activeTargets;
      if (noteChanged) {
        activeTargets.forEach(node => { node.classList.remove('active'); node.removeAttribute('aria-current'); });
        selected.forEach(node => { node.classList.add('active'); node.setAttribute('aria-current', 'true'); }); activeTargets = selected;
      }
      const nextBar = bars[position.bar], barChanged = nextBar !== activeBar;
      if (barChanged) {
        activeBar?.classList.remove('active'); nextBar?.classList.add('active'); activeBar = nextBar;
      }
      if (position.follow && position.playing && nextBar && (noteChanged || barChanged)) {
        const frame = viewport.getBoundingClientRect(), barBox = nextBar.getBoundingClientRect();
        const note = selected.find(node => Number(node.dataset.noteBar) === position.bar);
        const box = note ? note.getBoundingClientRect() : barBox;
        let left = viewport.scrollLeft, top = viewport.scrollTop;
        if (box.left < frame.left + 12 || box.right > frame.right - 12) left += box.left - frame.left - 28;
        if (barChanged && (barBox.top < frame.top + 12 || barBox.bottom > frame.bottom - 12)) top += barBox.top - frame.top - 18;
        if (Math.abs(left - viewport.scrollLeft) > 1 || Math.abs(top - viewport.scrollTop) > 1) viewport.scrollTo?.({ left: Math.max(0, left), top: Math.max(0, top), behavior: 'auto' });
      }
    }
    function attachTargets(score, stage, model) {
      const svg = stage.querySelector('svg'); if (!svg) throw Error('五线谱没有生成，请重试');
      targets = new Map(); bars = [];
      const group = document.createElementNS(NS, 'g'); group.classList.add('practice-staff-targets');
      const segments = new Map(model.segments.filter(n => !n.rest).map(n => [Math.round(n.beat * GRID), n]));
      (score.GraphicSheet?.MeasureList || []).forEach((staffMeasures, bar) => {
        const measure = staffMeasures[0]; if (!measure) return;
        const box = measure.PositionAndShape, xy = box.AbsolutePosition;
        const rect = document.createElementNS(NS, 'rect');
        const left = (xy.x + box.BorderLeft) * 10, right = (xy.x + box.BorderRight) * 10;
        rect.setAttribute('x', left); rect.setAttribute('y', (xy.y + box.BorderTop) * 10 - 14);
        rect.setAttribute('width', Math.max(8, right - left)); rect.setAttribute('height', Math.max(64, (box.BorderBottom - box.BorderTop) * 10 + 28));
        rect.classList.add('practice-staff-bar'); rect.dataset.practiceStaffBar = String(bar); group.append(rect); bars[bar] = rect;
        for (const entry of measure.staffEntries || []) for (const voice of entry.graphicalVoiceEntries || []) for (const note of voice.notes || []) {
          if (note.sourceNote.isRest?.()) continue;
          const stamp = note.sourceNote.ParentVoiceEntry.Timestamp.RealValue;
          const segment = segments.get(Math.round((bar * 4 + stamp * 4) * GRID)); if (!segment) continue;
          const point = note.PositionAndShape.AbsolutePosition, target = document.createElementNS(NS, 'rect');
          target.setAttribute('x', point.x * 10 - 6); target.setAttribute('y', point.y * 10 - 16);
          target.setAttribute('width', '26'); target.setAttribute('height', '32'); target.setAttribute('rx', '5');
          target.setAttribute('class', 'practice-staff-note'); target.setAttribute('tabindex', '0'); target.setAttribute('role', 'button');
          target.dataset.noteBeat = String(segment.sourceBeat); target.dataset.noteBar = String(Math.floor(segment.sourceBeat / 4));
          target.setAttribute('aria-label', `第 ${bar + 1} 小节，第 ${segment.sourceBeat % 4 + 1} 拍，${name(segment.midi)}，点击播放`);
          const title = document.createElementNS(NS, 'title'); title.textContent = name(segment.midi); target.append(title); group.append(target);
          if (!targets.has(segment.sourceBeat)) targets.set(segment.sourceBeat, []); targets.get(segment.sourceBeat).push(target);
        }
      });
      svg.append(group);
      const width = parseFloat(svg.getAttribute('width')) || lastWidth, height = parseFloat(svg.getAttribute('height')) || 400;
      if (!svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.style.width = width + 'px'; svg.style.height = height + 'px';
      activeTargets = []; activeBar = null;
    }
    async function render(next) {
      data = next; const own = ++generation; if (disposed || !visible) return false;
      host.setAttribute('aria-busy', 'true'); message.hidden = false; message.textContent = '正在准备五线谱…';
      let stage;
      try {
        const model = scoreData(next); await window.siteAssets.load('score');
        if (disposed || !visible || generation !== own) return false;
        stage = document.createElement('div'); stage.className = 'practice-staff-canvas';
        lastWidth = Math.max(560, host.clientWidth || 560); stage.style.width = lastWidth + 'px';
        stage.style.position = 'absolute'; stage.style.visibility = 'hidden'; viewport.append(stage); stages.add(stage);
        const score = new window.opensheetmusicdisplay.OpenSheetMusicDisplay(stage, { backend: 'svg', autoResize: false, drawTitle: false, drawComposer: false, drawPartNames: false, drawPartAbbreviations: false, drawMeasureNumbers: true, pageFormat: 'Endless', drawingParameters: 'compact' });
        score.Zoom = 1; await score.load(model.xml);
        if (disposed || !visible || generation !== own) return false;
        score.render(); attachTargets(score, stage, model);
        stage.style.position = ''; stage.style.visibility = ''; viewport.replaceChildren(stage); stages.delete(stage);
        canvas = stage; renderer = score; message.textContent = '实音高 · 点击音符定位' + (next.swing > .51 ? ' · Swing 按直写节奏演奏' : '');
        host.removeAttribute('aria-busy'); update(position); return true;
      } catch (error) {
        if (generation !== own || disposed || !visible) return false;
        message.textContent = '五线谱暂未载入，切回六线谱后可重试'; host.removeAttribute('aria-busy'); throw error;
      } finally {
        if (stage && stage !== canvas) { stage.remove(); stages.delete(stage); }
      }
    }
    const click = event => {
      const note = event.target.closest?.('.practice-staff-note');
      if (!note || !viewport.contains(note)) return;
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); onSeek(Number(note.dataset.noteBeat), Number(note.dataset.noteBar));
    };
    viewport.addEventListener('click', click); viewport.addEventListener('keydown', click);
    const resize = () => {
      clearTimeout(resizeTimer); if (!visible || disposed || !renderer || !data) return;
      resizeTimer = setTimeout(() => { if (Math.max(560, host.clientWidth || 560) !== lastWidth) void render(data).catch(() => {}); }, 180);
    };
    window.addEventListener('resize', resize);
    return {
      render, update,
      setVisible(value) { visible = Boolean(value); host.hidden = !visible; if (!visible) { generation++; host.removeAttribute('aria-busy'); stages.forEach(stage => stage.remove()); stages.clear(); clearTimeout(resizeTimer); } },
      destroy() { disposed = true; generation++; clearTimeout(resizeTimer); window.removeEventListener('resize', resize); viewport.removeEventListener('click', click); viewport.removeEventListener('keydown', click); stages.forEach(stage => stage.remove()); stages.clear(); host.replaceChildren(); renderer = canvas = data = null; }
    };
  }
  window.practiceNotation = { mount, scoreData };
})();
