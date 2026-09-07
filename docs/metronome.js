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
  let pendingPulses = [];
  const volumeBuses = new Map();
  let volume = Math.max(0, Math.min(100, Number(localStorage.getItem("tuner-click-volume-v1") ?? 100)));
  if (!Number.isFinite(volume)) volume = 100;
  function volumeBus(ctx) {
    if (!volumeBuses.has(ctx)) {
      const bus = ctx.createGain();
      bus.gain.value = (volume / 100) ** 2;
      bus.connect(ctx.destination);
      volumeBuses.set(ctx, bus);
    }
    return volumeBuses.get(ctx);
  }
  function setVolume(value) {
    volume = Math.max(0, Math.min(100, Number(value) || 0));
    localStorage.setItem("tuner-click-volume-v1", String(volume));
    for (const [ctx, bus] of volumeBuses) {
      if (bus.gain.setTargetAtTime) bus.gain.setTargetAtTime((volume / 100) ** 2, ctx.currentTime, .015);
      else bus.gain.value = (volume / 100) ** 2;
    }
    for (const id of ["sheet-click-volume", "metro-volume"]) {
      if ($(id)) $(id).value = String(volume);
      if ($(`${id}-value`)) $(`${id}-value`).textContent = `${volume}%`;
    }
  }

  function notify() {
    window.dispatchEvent(new CustomEvent("tuner:metro-change", {detail: {bpm, running,
      timeSignature: [...signature], source: binding ? "score" : "manual", enabled}}));
  }
  function render() {
    $("metro-bpm").textContent = String(Math.round(bpm));
    $("metro-start").textContent = running ? "停止" : "开始";
    $("metro-follow").textContent = binding ? `固定拍速 · ${binding.title}` : "独立节拍器";
    const value = signature.join("/");
    const select = $("metro-meter");
    if (!Array.from(select.options).some(option => option.value === value)) select.add(new Option(value, value));
    select.value = value;
    select.disabled = Boolean(binding);
    $("metro-minus").disabled = $("metro-plus").disabled = false;
    document.querySelectorAll(".tempo-presets button").forEach(button => { button.disabled = false; });
    $("sheet-meter").textContent = value;
    $("sheet-metronome").textContent = "节拍器";
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
    pendingPulses = [];
    for (const timeout of flashes) window.clearTimeout(timeout);
    flashes.clear();
    $("metro-dot").classList.remove("flash", "strong", "secondary", "weak");
    document.querySelectorAll(".beat-light.active").forEach(dot => dot.classList.remove("active"));
  }
  function later(callback, delay) {
    const timeout = window.setTimeout(() => { flashes.delete(timeout); callback(); }, delay);
    flashes.add(timeout);
  }
  function playClick(event, at, ctx) {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    const strong = event.accent === "strong", secondary = event.accent === "secondary";
    oscillator.type = strong ? "square" : "sine";
    oscillator.frequency.value = strong ? 1600 : secondary ? 1200 : 850;
    gain.gain.setValueAtTime(strong ? .12 : secondary ? .13 : .085, at);
    gain.gain.exponentialRampToValueAtTime(.001, at + .045);
    oscillator.connect(gain).connect(volumeBus(ctx));
    sounds.add(oscillator);
    oscillator.onended = () => { sounds.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at);
    oscillator.stop(at + .05);
  }
  function pulse(event, at, ctx, audible = true) {
    pendingPulses = pendingPulses.filter(item => item.at > item.ctx.currentTime);
    pendingPulses.push({event, at, ctx});
    if (audible) playClick(event, at, ctx);
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
    if (nextAudio < context.currentTime - .005) {
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
    if (binding) return window.scorePlayer?.setBpm(clampBpm(value));
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
    binding = {id: score.id, title: score.title, timeline: manifest.beatTimeline || window.scoreBeats.fromManifest(manifest), rate: playbackRate};
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
  function rewindScore(position) {
    if (binding) nextBeat = window.scoreBeats.lowerBound(binding.timeline.beats, position);
  }
  function scheduleScore(now, horizon, ctx, end = Infinity, audioTimeAt) {
    if (!binding || !running) return;
    const beats = binding.timeline.beats;
    while (nextBeat < beats.length && beats[nextBeat].time <= horizon && beats[nextBeat].time < end - 1e-6) {
      const beat = beats[nextBeat++];
      const at = audioTimeAt ? audioTimeAt(beat.time) : ctx.currentTime + (beat.time - now) / binding.rate;
      if (at < ctx.currentTime - .005) continue;
      pulse({...beat, bpm: beat.bpm * binding.rate}, Math.max(ctx.currentTime, at), ctx, enabled);
    }
  }
  $("sheet-metronome").addEventListener("click", () => {
    enabled = !enabled;
    localStorage.setItem("tuner-score-metronome-v1", enabled ? "on" : "off");
    if (binding) {
      // Muting is an audio switch, not a transport seek. Keep already scheduled
      // visual beats and loop cursors; unmute pending clicks at their exact times.
      for (const sound of sounds) { try { sound.stop(); } catch {} }
      sounds.clear();
      pendingPulses = pendingPulses.filter(item => item.at >= item.ctx.currentTime);
      if (enabled) for (const item of pendingPulses) playClick(item.event, item.at, item.ctx);
    }
    render(); notify();
  });
  $("metro-meter").addEventListener("change", event => setTimeSignature(event.target.value.split("/").map(Number)));
  window.metronome = {getBpm: () => bpm, getTimeSignature: () => [...signature], isRunning: () => running,
    getVolume: () => volume, setVolume,
    getScoreId: () => binding?.id, setBpm, setTimeSignature, start, stop, toggle: () => running ? stop() : start(),
    bindScore, releaseScore, seekScore, startScore, pauseScore, scheduleScore, rewindScore};
  render();
  for (const id of ["sheet-click-volume", "metro-volume"]) $(id)?.addEventListener("input", event => setVolume(event.target.value));
  setVolume(volume);
})();
