(function () {
  'use strict';
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const KEY = 'tuner-reference-hz-v1';
  function pitchInfo(hz, reference = 440) {
    if (!Number.isFinite(hz) || hz < 54.5 || hz > 1205) return null;
    const exact = 69 + 12 * Math.log2(hz / reference), midi = Math.round(exact);
    return { hz, exact, midi, cents: (exact - midi) * 100, name: NAMES[(midi % 12 + 12) % 12], octave: Math.floor(midi / 12) - 1 };
  }
  function createHistory(capacity = 640) {
    const times = new Float64Array(capacity), pitches = new Float32Array(capacity);
    let count = 0, next = 0;
    return {
      add(time, pitch) { times[next] = time; pitches[next] = pitch == null ? NaN : pitch; next = (next + 1) % capacity; count = Math.min(capacity, count + 1); },
      each(fn) { for (let i = 0; i < count; i++) { const at = (next - count + i + capacity) % capacity; fn(times[at], pitches[at]); } },
      clear() { count = next = 0; },
      get length() { return count; }
    };
  }
  function mount(ui, options = {}) {
    const q = selector => ui.main.querySelector(selector);
    const view = q('#tuner-dial'), timelineView = q('#tuner-timeline'), canvas = q('#tuner-history');
    if (!view || !timelineView || !canvas) return null;
    const referenceSelect = q('#tuner-reference'), toneButton = q('#tuner-tone'), centsText = q('#tuner-cents');
    const pauseButton = q('#tuner-history-pause'), windowSelect = q('#tuner-history-window');
    const latest = q('#tuner-history-latest'), traceState = q('#tuner-history-state');
    let reference = Number(window.siteStorage?.getItem(KEY)) === 441 ? 441 : 440;
    let activeInput = 'idle', timeline = false, paused = false, lastVoiced = -Infinity, lastHz = null;
    let plotEnd = 0, center = 57, tone = null, toneGeneration = 0, disposed = false, latestNote = '';
    const history = createHistory(), closingTones = new Set();
    referenceSelect.value = String(reference);
    function updateToneLabel() {
      toneButton.textContent = tone ? (tone.started ? '停止标准音' : '取消标准音') : '播放 A4';
      toneButton.setAttribute('aria-pressed', String(Boolean(tone)));
      toneButton.setAttribute('aria-label', tone ? '停止标准音' : `播放 A4 标准音 ${reference} Hz`);
      q('#tuner-reference-copy').textContent = `A4 = ${reference} Hz`;
    }
    function closeTone(item) {
      if (!item) return;
      item.oscillator?.disconnect(); item.gain?.disconnect();
      if (item.context.state !== 'closed') Promise.resolve(item.context.close()).catch(() => {});
      closingTones.delete(item);
    }
    function stopTone(immediate = false) {
      toneGeneration++;
      const previous = tone; tone = null;
      if (previous) {
        if (previous.started && !immediate && previous.context.state === 'running') {
          const at = previous.context.currentTime;
          previous.gain.gain.cancelScheduledValues(at);
          previous.gain.gain.setTargetAtTime(0, at, .008);
          closingTones.add(previous);
          previous.oscillator.onended = () => closeTone(previous);
          try { previous.oscillator.stop(at + .04); } catch { closeTone(previous); }
        } else {
          try { previous.oscillator?.stop(); } catch {}
          closeTone(previous);
        }
      }
      if (immediate) for (const item of Array.from(closingTones)) closeTone(item);
      updateToneLabel();
    }
    async function startTone() {
      if (tone) { stopTone(); return; }
      options.stopInput?.();
      ui.error.style.display = 'none';
      const generation = ++toneGeneration;
      let item;
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        item = { context: new Context({ latencyHint: 'interactive' }), started: false };
        tone = item; updateToneLabel();
        await item.context.resume();
        if (generation !== toneGeneration || disposed) { closeTone(item); return; }
        item.oscillator = item.context.createOscillator(); item.gain = item.context.createGain();
        item.oscillator.type = 'sine'; item.oscillator.frequency.value = reference;
        item.gain.gain.setValueAtTime(0, item.context.currentTime);
        item.gain.gain.linearRampToValueAtTime(.08, item.context.currentTime + .035);
        item.oscillator.connect(item.gain); item.gain.connect(item.context.destination);
        item.started = true; item.oscillator.start(); updateToneLabel();
      } catch {
        closeTone(item);
        if (generation !== toneGeneration || disposed) return;
        tone = null; updateToneLabel();
        ui.error.textContent = '标准音未能播放，请再点一次。'; ui.error.style.display = 'block';
      }
    }
    function resetPitch() {
      ui.main.classList.remove('has-pitch', 'tuned');
      ui.note.textContent = ''; ui.octave.textContent = ''; ui.frequency.textContent = '等待声音';
      ui.needle.style.left = '50%'; centsText.textContent = '音分';
      ui.state.textContent = activeInput === 'running' ? '弹奏或哼唱一个持续音' : '准备聆听';
      lastHz = null;
    }
    function showReading(info) {
      ui.note.textContent = info.name; ui.octave.textContent = String(info.octave);
      ui.frequency.textContent = `${info.hz.toFixed(1)} Hz`;
      const tuned = Math.abs(info.cents) < 5;
      ui.needle.style.left = `${50 + Math.max(-50, Math.min(50, info.cents))}%`;
      centsText.textContent = `${info.cents >= 0 ? '+' : '−'}${Math.abs(info.cents).toFixed(0)} ct`;
      ui.state.textContent = tuned ? '正准' : info.cents < 0 ? '稍低 · 调紧一点' : '稍高 · 调松一点';
      ui.main.classList.add('has-pitch'); ui.main.classList.toggle('tuned', tuned);
    }
    function updatePause() {
      pauseButton.textContent = paused ? '继续画面' : '暂停画面';
      pauseButton.setAttribute('aria-pressed', String(paused));
      traceState.textContent = paused ? '画面已暂停' : activeInput === 'running' ? '正在描绘音高' : '开启麦克风后显示';
    }
    function draw() {
      if (!timeline || disposed) return;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const bounds = canvas.getBoundingClientRect(), width = Math.max(240, bounds.width || 680), height = Math.max(220, bounds.height || 330);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const left = 43, right = width - 14, top = 12, bottom = height - 25, low = center - 18, high = center + 18;
      const duration = Number(windowSelect.value) * 1000, start = plotEnd - duration;
      const x = time => left + (time - start) / duration * (right - left), y = midi => bottom - (midi - low) / (high - low) * (bottom - top);
      ctx.font = '10px ui-monospace, monospace'; ctx.textBaseline = 'middle';
      for (let midi = low; midi <= high; midi++) {
        const yy = y(midi), black = [1, 3, 6, 8, 10].includes((midi % 12 + 12) % 12);
        ctx.fillStyle = black ? '#10170f' : '#172015';
        ctx.fillRect(left, yy - (bottom - top) / 72, right - left, (bottom - top) / 36);
        ctx.strokeStyle = midi % 12 === 0 ? '#40503a' : '#253121'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
        if (midi % 3 === 0) { ctx.fillStyle = midi % 12 === 0 ? '#c1cdb9' : '#74816e'; ctx.fillText(`${NAMES[(midi % 12 + 12) % 12]}${Math.floor(midi / 12) - 1}`, 3, yy); }
      }
      ctx.textAlign = 'center'; ctx.fillStyle = '#85907e';
      for (let i = 0; i <= 4; i++) {
        const xx = left + i / 4 * (right - left); ctx.strokeStyle = '#2c3827'; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.stroke();
        ctx.fillText(i === 4 ? (paused ? '暂停处' : activeInput === 'running' ? '现在' : '结束处') : `${Math.round((i / 4 - 1) * duration / 1000)}s`, xx, height - 9);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
      let previous = null, drawn = 0;
      history.each((time, midi) => {
        if (time < start || time > plotEnd) return;
        if (!Number.isFinite(midi)) { previous = null; return; }
        const point = { time, midi, x: x(time), y: y(midi) };
        const joins = previous && time - previous.time <= 180 && Math.abs(midi - previous.midi) < 2;
        ctx.strokeStyle = '#bdf45d'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(joins ? previous.x : point.x - 1, joins ? previous.y : point.y); ctx.lineTo(point.x, point.y); ctx.stroke();
        previous = point; drawn++;
      });
      ctx.restore(); ctx.textAlign = 'left';
      if (!drawn) { ctx.fillStyle = '#9da895'; ctx.textAlign = 'center'; ctx.font = '13px sans-serif'; ctx.fillText('音高会在这里留下轨迹', (left + right) / 2, height / 2); ctx.textAlign = 'left'; }
    }
    function render(hz, now = performance.now()) {
      const info = pitchInfo(hz, reference);
      if (info) { lastHz = hz; lastVoiced = now; showReading(info); }
      else if (now - lastVoiced > 650) resetPitch();
      if (!timeline || paused) return;
      plotEnd = now; history.add(now, info?.exact ?? null);
      if (info && (info.exact < center - 15 || info.exact > center + 15)) center = Math.max(42, Math.min(72, Math.round(info.midi / 12) * 12));
      const note = info ? `${info.name}${info.octave} · ${info.hz.toFixed(1)} Hz` : '未识别到稳定音高';
      if (note !== latestNote) { latest.textContent = note; latestNote = note; }
      draw();
    }
    function inputState(state) {
      activeInput = state; ui.main.dataset.input = state;
      if (state !== 'running') { resetPitch(); lastVoiced = -Infinity; }
      ui.toggle.textContent = state === 'pending' ? '取消' : state === 'running' ? '停止聆听' : timeline ? '开始采集' : '开启麦克风';
      if (state === 'running' && timeline) { paused = false; updatePause(); }
      if (state === 'idle' && timeline) history.add(performance.now(), null);
      updatePause();
    }
    function setTimeline(next) {
      options.stopInput?.(); stopTone(true); timeline = next; paused = false;
      view.hidden = next; timelineView.hidden = !next; ui.main.classList.toggle('timeline-open', next);
      if (next) { plotEnd = performance.now(); draw(); }
      inputState('idle');
      (next ? q('#tuner-history-back') : q('#tuner-history-open')).focus({ preventScroll: true });
    }
    const onReference = () => {
      reference = referenceSelect.value === '441' ? 441 : 440;
      window.siteStorage?.setItem(KEY, String(reference));
      if (tone?.started) tone.oscillator.frequency.setTargetAtTime(reference, tone.context.currentTime, .025);
      if (lastHz) showReading(pitchInfo(lastHz, reference));
      history.clear(); latestNote = ''; latest.textContent = '等待稳定音高'; draw(); updateToneLabel();
    };
    const onPause = () => { paused = !paused; updatePause(); };
    const onClear = () => { history.clear(); plotEnd = performance.now(); latestNote = ''; latest.textContent = '等待稳定音高'; draw(); };
    const onVisibility = () => { if (document.hidden) { options.stopInput?.(); stopTone(true); } };
    const onPageHide = () => { options.stopInput?.(); stopTone(true); };
    const onResize = () => draw();
    referenceSelect.addEventListener('change', onReference); toneButton.addEventListener('click', startTone);
    q('#tuner-history-open').addEventListener('click', () => setTimeline(true));
    q('#tuner-history-back').addEventListener('click', () => setTimeline(false));
    pauseButton.addEventListener('click', onPause); q('#tuner-history-clear').addEventListener('click', onClear);
    windowSelect.addEventListener('change', draw); window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('pagehide', onPageHide);
    updateToneLabel(); resetPitch(); inputState('idle');
    return {
      render, inputState, beforeInput() { stopTone(true); }, getReference() { return reference; },
      onPage(page) { if (page !== 'tuner') { options.stopInput?.(); stopTone(true); if (timeline) setTimeline(false); } },
      dispose() { disposed = true; options.stopInput?.(); stopTone(true); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide); },
      getState() { return { reference, timeline, paused, points: history.length, tone: Boolean(tone), activeInput }; }
    };
  }
  window.tunerUI = { mount, pitchInfo, createHistory };
})();

