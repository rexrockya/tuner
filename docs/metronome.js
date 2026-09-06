(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const clampBpm = value => Math.max(30, Math.min(240, Number(value) || 80));
  let manualBpm = clampBpm(localStorage.getItem("tuner-bpm-v1"));
  let manualSignature;
  try { manualSignature = JSON.parse(localStorage.getItem("tuner-meter-v1")); } catch {}
  if (!Array.isArray(manualSignature) || !manualSignature[0] || !manualSignature[1]) manualSignature = [4, 4];
  let bpm = manualBpm, signature = manualSignature, running = false, binding = null;
  let enabled = localStorage.getItem("tuner-score-metronome-v1") !== "off";
  let context = null, timer = null, nextAudio = 0, pulseIndex = 0, nextBeat = 0, countIn = false;
  const sounds = new Set(), flashes = new Set();

  function notify() {
    window.dispatchEvent(new CustomEvent("tuner:metro-change", {detail: {bpm, running,
      timeSignature: [...signature], source: binding ? "score" : "manual", enabled}}));
  }
  function render() {
    $("metro-bpm").textContent = String(Math.round(bpm));
    $("metro-start").textContent = running ? "停止" : "开始";
    $("metro-follow").textContent = binding ? `跟随乐谱 · ${binding.title}` : "独立节拍器";
    const value = signature.join("/");
    const select = $("metro-meter");
    if (!Array.from(select.options).some(option => option.value === value)) select.add(new Option(value, value));
    select.value = value;
    select.disabled = Boolean(binding);
    $("metro-minus").disabled = $("metro-plus").disabled = Boolean(binding);
    document.querySelectorAll(".tempo-presets button").forEach(button => { button.disabled = Boolean(binding); });
    $("sheet-meter").textContent = value;
    $("sheet-metronome").textContent = `节拍器：${enabled ? "开" : "关"}`;
    $("sheet-metronome").classList.toggle("on", enabled);
    $("sheet-metronome").setAttribute("aria-pressed", String(enabled));
    for (const id of ["metro-beats", "sheet-beats"]) {
      const row = $(id);
      if (row.dataset.meter === value) continue;
      row.dataset.meter = value;
      row.replaceChildren(...Array.from({length: signature[0]}, (_, beat) => {
        const dot = document.createElement("span");
        dot.className = `beat-light ${window.scoreBeats.accent(beat, signature)}`;
        dot.textContent = String(beat + 1);
        return dot;
      }));
    }
  }
  function clearPulses() {
    for (const sound of sounds) { try { sound.stop(); } catch {} }
    sounds.clear();
    for (const timeout of flashes) window.clearTimeout(timeout);
    flashes.clear();
    $("metro-dot").classList.remove("flash", "strong", "secondary", "weak");
    document.querySelectorAll(".beat-light.active").forEach(dot => dot.classList.remove("active"));
  }
  function later(callback, delay) {
    const timeout = window.setTimeout(() => { flashes.delete(timeout); callback(); }, delay);
    flashes.add(timeout);
  }
  function pulse(event, at, ctx, audible = true) {
    if (audible) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      const strong = event.accent === "strong", secondary = event.accent === "secondary";
      oscillator.type = strong ? "square" : "sine";
      oscillator.frequency.value = strong ? 1600 : secondary ? 1200 : 850;
      gain.gain.setValueAtTime(strong ? .12 : secondary ? .13 : .085, at);
      gain.gain.exponentialRampToValueAtTime(.001, at + .045);
      oscillator.connect(gain).connect(ctx.destination);
      sounds.add(oscillator);
      oscillator.onended = () => { sounds.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(at);
      oscillator.stop(at + .05);
    }
    later(() => {
      if (event.signature) signature = event.signature;
      if (event.bpm) bpm = event.bpm;
      render();
      if (event.countIn) $("metro-bpm").textContent = String(event.countIn);
      $("metro-dot").classList.remove("strong", "secondary", "weak");
      $("metro-dot").classList.add("flash", event.accent);
      for (const id of ["metro-beats", "sheet-beats"]) {
        Array.from($(id).children).forEach((dot, index) => dot.classList.toggle("active", index === event.beat));
      }
      later(() => {
        $("metro-dot").classList.remove("flash");
        document.querySelectorAll(".beat-light.active").forEach(dot => dot.classList.remove("active"));
      }, 90);
    }, Math.max(0, (at - ctx.currentTime) * 1000));
  }
  function stopManual() {
    window.clearInterval(timer); timer = null; running = false; clearPulses();
  }
  function scheduleManual() {
    if (!running || binding) return;
    if (nextAudio < context.currentTime - .1) {
      const period = 60 / bpm * 4 / signature[1];
      const missed = Math.ceil((context.currentTime - nextAudio) / period);
      nextAudio += missed * period;
      pulseIndex += missed;
    }
    while (nextAudio < context.currentTime + .12) {
      const beat = pulseIndex % signature[0];
      pulse({beat, accent: window.scoreBeats.accent(beat, signature),
        countIn: countIn && pulseIndex < signature[0] ? signature[0] - beat : 0}, nextAudio, context);
      nextAudio += 60 / bpm * 4 / signature[1];
      pulseIndex++;
    }
  }
  let manualGeneration = 0;
  async function start(withCountIn = false) {
    if (binding) return window.scorePlayer?.play();
    if (running) return;
    const generation = ++manualGeneration;
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    await context.resume();
    if (generation !== manualGeneration || binding || running) return;
    running = true; countIn = withCountIn; pulseIndex = 0; nextAudio = context.currentTime + .025;
    timer = window.setInterval(scheduleManual, 25);
    scheduleManual(); render(); notify();
  }
  function stop() {
    manualGeneration++;
    if (binding) return window.scorePlayer?.pause();
    stopManual(); render(); notify();
  }
  function setBpm(value) {
    if (binding) return;
    bpm = manualBpm = clampBpm(value);
    localStorage.setItem("tuner-bpm-v1", String(bpm));
    if (running) { clearPulses(); pulseIndex = 0; nextAudio = context.currentTime + .025; }
    render(); notify();
  }
  function setTimeSignature(value) {
    if (binding || !Array.isArray(value) || value[0] < 1 || value[0] > 32 || ![2,4,8,16].includes(value[1])) return;
    signature = manualSignature = [...value];
    localStorage.setItem("tuner-meter-v1", JSON.stringify(signature));
    if (running) { clearPulses(); pulseIndex = 0; nextAudio = context.currentTime + .025; }
    render(); notify();
  }
  function seekScore(position, playbackRate = binding?.rate || 1) {
    if (!binding) return;
    clearPulses(); binding.rate = playbackRate;
    nextBeat = window.scoreBeats.lowerBound(binding.timeline.beats, position);
    let bar = binding.timeline.bars[0];
    for (const item of binding.timeline.bars) { if (item.time > position + 1e-6) break; bar = item; }
    if (bar) { signature = bar.signature; bpm = bar.bpm * playbackRate; }
    render(); notify();
  }
  function bindScore(score, manifest, position, playbackRate) {
    manualGeneration++; stopManual();
    binding = {id: score.id, title: score.title, timeline: window.scoreBeats.fromManifest(manifest), rate: playbackRate};
    seekScore(position, playbackRate);
  }
  function releaseScore() {
    if (!binding) return;
    stopManual(); binding = null; bpm = manualBpm; signature = manualSignature;
    render(); notify();
  }
  function startScore(position, playbackRate, ctx) {
    if (!binding) return;
    seekScore(position, playbackRate); running = true; context = ctx; render(); notify();
  }
  function pauseScore() {
    if (!binding) return;
    running = false; clearPulses(); render(); notify();
  }
  function scheduleScore(now, horizon, ctx, end = Infinity) {
    if (!binding || !running) return;
    const beats = binding.timeline.beats;
    while (nextBeat < beats.length && beats[nextBeat].time <= horizon && beats[nextBeat].time < end - 1e-6) {
      const beat = beats[nextBeat++];
      if (beat.time < now - .03) continue;
      pulse({...beat, bpm: beat.bpm * binding.rate}, ctx.currentTime + Math.max(0, (beat.time - now) / binding.rate), ctx, enabled);
    }
  }
  $("sheet-metronome").addEventListener("click", () => {
    enabled = !enabled;
    localStorage.setItem("tuner-score-metronome-v1", enabled ? "on" : "off");
    if (binding) seekScore(window.scorePlayer?.getPosition() || 0);
    render(); notify();
  });
  $("metro-meter").addEventListener("change", event => setTimeSignature(event.target.value.split("/").map(Number)));
  window.metronome = {getBpm: () => bpm, getTimeSignature: () => [...signature], isRunning: () => running,
    getScoreId: () => binding?.id, setBpm, setTimeSignature, start, stop, toggle: () => running ? stop() : start(),
    bindScore, releaseScore, seekScore, startScore, pauseScore, scheduleScore};
  render();
})();
