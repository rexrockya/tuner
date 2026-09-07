(function () {
  'use strict';
  const H = window.tunerHarmony;
  const swingBeat = (beat, swing) => Math.floor(beat) + (beat % 1 <= .5 ? beat % 1 * swing * 2 : swing + (beat % 1 - .5) * (1 - swing) * 2);
  const feels = { shuffle: { swing: 2 / 3, bpm: 96 }, slow: { swing: 2 / 3, bpm: 62 }, straight: { swing: .5, bpm: 110 } };
  function arrangement(parsed, feel = 'shuffle', seed = 1, choruses = 4) {
    const { swing } = feels[feel] || feels.shuffle, random = H.rng(seed), events = [];
    const chartBeats = parsed.bars.length * 4;
    const add = (track, beat, data) => events.push({ track, beat, ...data });
    let previousVoicing = [60, 64, 67];
    for (let chorus = 0; chorus < choruses; chorus++) {
      const base = chorus * chartBeats;
      parsed.bars.forEach((bar, barIndex) => {
        const b = base + barIndex * 4, turnaround = barIndex >= parsed.bars.length - 2;
        for (let beat = 0; beat < 4; beat++) {
          // The backbeat sits a little behind the bass; light upbeats leave space for the guitar.
          add('drums', b + beat + .006, { sample: feel === 'slow' ? 'ride' : `hat-${1 + (beat + chorus) % 2}`, velocity: beat % 2 ? .48 : .38 });
          add('drums', b + beat + swing, { sample: `hat-${1 + (beat + 1) % 2}`, velocity: .2 + random() * .08 });
          if (beat % 2 === 0 || (turnaround && beat === 3)) add('drums', b + beat, { sample: `kick-${1 + (barIndex + beat) % 2}`, velocity: beat === 0 ? .7 : .52 });
          if (beat % 2) add('drums', b + beat + .018, { sample: `snare-${1 + (barIndex + chorus) % 2}`, velocity: .64 + random() * .12 });
          if (feel === 'slow') add('drums', b + beat + 1 / 3, { sample: 'hat-1', velocity: .12 });
        }
        if (barIndex % 4 === 3 && chorus % 2 === 1) add('drums', b + 3 + swing, { sample: 'open-hat', velocity: .25 });
        if (turnaround && barIndex === parsed.bars.length - 1) {
          add('drums', b + 2 + swing, { sample: 'snare-2', velocity: .2 });
          add('drums', b + 3 + 1 / 3, { sample: 'snare-1', velocity: .26 });
        } else if (barIndex % 2) add('drums', b + 2 + swing, { sample: 'snare-2', velocity: .13 });
        bar.forEach(c => {
          const chordIndex = parsed.chords.indexOf(c), next = parsed.chords[(chordIndex + 1) % parsed.chords.length];
          const root = 28 + H.mod((c.bass ?? c.root) - 4); // E1–Eb2
          const path = c.family === 'minor' || c.family === 'minor-major' ? [0, 7, 10, 7] : c.family === 'dim' || c.family === 'half-dim' ? [0, 3, 6, 10] : [0, 4, 7, 9];
          for (let i = 0; i < c.beats; i++) {
            const chordRoot = 28 + H.mod(c.root - 4);
            let midi = chordRoot + path[(i + (chorus % 2 ? 2 : 0)) % path.length];
            if (i === 0) midi = root;
            if (i === c.beats - 1 && c.beats >= 2 && next.root !== c.root) midi = H.nearest(next.bass ?? next.root, midi, 28, 51) - 1;
            add('bass', base + c.beat + i, { midi, duration: feel === 'slow' ? .86 : .76, velocity: i === 0 ? .73 : .58 + random() * .09 });
          }
          const colors = [c.intervals[1], c.intervals[3] ?? c.intervals[2], c.intervals[2] + 12];
          const voicing = colors.map((n, i) => H.nearest(c.root + n, previousVoicing[i], 53, 77));
          previousVoicing = voicing;
          const placements = c.beats >= 4 ? chorus % 2 ? [swing, 2 + swing] : [0, 2 + swing] : [0];
          placements.forEach((offset, i) => voicing.forEach(midi => add('keys', base + c.beat + offset, { midi, duration: Math.min(feel === 'slow' ? 1.9 : .9, c.beats - offset), velocity: i ? .22 : .28 })));
        });
      });
    }
    return { events: events.sort((a, b) => a.beat - b.beat), beats: chartBeats * choruses, chartBeats };
  }
  let context, master, room, compressor, ready, assets = {}, voices = new Set(), buses = {};
  const plucks = new Map(), decodedAssets = new Map();
  let organWave, bassAssets = [];
  function getContext() {
    if (context) return context;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('这个浏览器暂不支持音频播放');
    context = new Context({ latencyHint: 'interactive' });
    master = context.createGain(); master.gain.value = .65;
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -14; compressor.knee.value = 18; compressor.ratio.value = 3; compressor.attack.value = .008; compressor.release.value = .18;
    master.connect(compressor).connect(context.destination);
    room = context.createConvolver();
    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * .28), context.sampleRate), random = H.rng(12);
    for (let ch = 0; ch < 2; ch++) {
      const samples = impulse.getChannelData(ch);
      for (let i = 0; i < samples.length; i++) samples[i] = (random() * 2 - 1) * Math.exp(-i / context.sampleRate * 24) * .18;
    }
    room.buffer = impulse; room.connect(master);
    for (const track of ['drums', 'bass', 'keys', 'lead']) { buses[track] = context.createGain(); buses[track].gain.value = 1; buses[track].connect(master); }
    buses.keys.connect(room);
    return context;
  }
  async function fetchAsset(url, method = 'arrayBuffer') {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw Error('音源载入失败，请重试');
      // Keep the timeout active while the body streams too.
      return await response[method]();
    } finally { clearTimeout(timeout); }
  }
  function preload() {
    const ctx = getContext();
    if (!ready) ready = (async () => {
      const manifest = await fetchAsset('assets/audio/blues/manifest.json', 'json');
      const loaded = await Promise.all(Object.entries(manifest).map(async ([name, entry]) => {
        if (decodedAssets.has(name)) return [name, decodedAssets.get(name)];
        let buffer;
        try { buffer = await ctx.decodeAudioData(await fetchAsset(`assets/audio/blues/${entry.file}`)); }
        catch (error) {
          if (!entry.fallback) throw error;
          buffer = await ctx.decodeAudioData(await fetchAsset(`assets/audio/blues/${entry.fallback}`));
        }
        const asset = { buffer, midi: entry.midi }; decodedAssets.set(name, asset);
        return [name, asset];
      }));
      assets = Object.fromEntries(loaded);
      bassAssets = loaded.filter(([name]) => name.startsWith('bass-')).map(([, asset]) => asset);
    })().catch(error => { ready = null; throw error; });
    return ready;
  }
  async function ensure() {
    const ctx = getContext();
    // Resume inside the user gesture; preloading never starts playback.
    const unlocked = ctx.resume();
    await Promise.all([unlocked, preload()]);
    return ctx;
  }
  function trackVoice(source, gain, extra = []) {
    const item = { source, gain, extra }; voices.add(item);
    source.onended = () => { voices.delete(item); source.disconnect(); gain.disconnect(); extra.forEach(node => node.disconnect()); };
  }
  function sample(asset, at, duration, velocity, track, midi) {
    if (!asset) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = asset.buffer;
    const rate = midi === undefined ? 1 : 2 ** ((midi - asset.midi) / 12);
    source.playbackRate.value = rate;
    gain.gain.setValueAtTime(velocity, at);
    const length = duration || asset.buffer.duration / rate;
    gain.gain.setTargetAtTime(.0001, at + Math.max(.01, length - .06), .02);
    source.connect(gain).connect(buses[track]);
    trackVoice(source, gain);
    source.start(at); source.stop(at + Math.min(asset.buffer.duration / rate, length + .12));
  }
  function pluck(midi) {
    if (plucks.has(midi)) return plucks.get(midi);
    const rate = context.sampleRate, length = Math.floor(rate * 2.5), period = Math.round(rate / (440 * 2 ** ((midi - 69) / 12)));
    const buffer = context.createBuffer(1, length, rate), data = buffer.getChannelData(0), random = H.rng(midi * 83);
    for (let i = 0; i < period; i++) data[i] = (random() * 2 - 1) * .7;
    for (let i = period; i < length; i++) data[i] = .497 * (data[i - period] + data[i - period + 1]);
    plucks.set(midi, { buffer, midi }); return plucks.get(midi);
  }
  function organ(event, at, seconds) {
    const gain = context.createGain(), filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2600;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(event.velocity * .16, at + .018);
    gain.gain.setTargetAtTime(event.velocity * .11, at + .05, .15);
    gain.gain.setTargetAtTime(.0001, at + seconds * .75, .06);
    gain.connect(filter).connect(buses.keys);
    organWave ??= context.createPeriodicWave(new Float32Array(9), new Float32Array([0, 1, .48, .23, .13, 0, .08, 0, .04]));
    const oscillator = context.createOscillator(); oscillator.setPeriodicWave(organWave);
    oscillator.frequency.value = 440 * 2 ** ((event.midi - 69) / 12);
    oscillator.connect(gain); trackVoice(oscillator, gain, [filter]); oscillator.start(at); oscillator.stop(at + seconds + .25);
  }
  function sound(event, at, beatSeconds) {
    if (event.track === 'drums') sample(assets[event.sample], at, 0, event.velocity * .62, 'drums');
    else if (event.track === 'bass') {
      const closest = bassAssets.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
      sample(closest, at, event.duration * beatSeconds, event.velocity * .66, 'bass', event.midi);
    } else if (event.track === 'lead') sample(pluck(event.midi), at, event.duration * beatSeconds, event.velocity * .9, 'lead', event.midi);
    else organ(event, at, event.duration * beatSeconds);
  }
  function silence() {
    if (!context) return;
    for (const { source, gain } of [...voices]) {
      gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setTargetAtTime(.0001, context.currentTime, .006);
      try { source.stop(context.currentTime + .03); } catch {}
    }
  }
  function volume(track, value) { getContext(); buses[track].gain.setTargetAtTime(Math.max(0, Math.min(1, value)) ** 2, context.currentTime, .015); }
  class Transport {
    constructor(update = () => {}) { this.update = update; this.bpm = 96; this.position = 0; this.playing = false; this.loading = false; this.loop = true; this.loopBar = null; this.song = { events: [], beats: 0, chartBeats: 0 }; this.generation = 0; }
    bounds() { return this.loopBar === null ? (!this.loop && this.stopBounds || [0, this.song.beats]) : [this.loopBar * 4, this.loopBar * 4 + 4]; }
    load(song) { this.pause(); this.song = song; this.position = 0; this.loopBar = null; this.stopBounds = [0, song.chartBeats || song.beats]; this.update(); }
    current() {
      if (!this.playing) return this.position;
      const [start, end] = this.bounds(), position = this.startBeat + Math.max(0, context.currentTime - this.started) * this.bpm / 60;
      return this.loop && position >= end ? start + (position - start) % (end - start) : Math.min(end, position);
    }
    async play() {
      if (this.playing || this.loading || !this.song.beats) return;
      const generation = ++this.generation;
      this.loading = true; this.update();
      try {
        await ensure();
        if (generation !== this.generation) return;
        this.loading = false;
        const [start, end] = this.bounds();
        if (this.position >= end || this.position < start) this.position = start;
        this.startBeat = this.position; this.started = context.currentTime + .025; this.cycle = 0;
        this.next = this.song.events.findIndex(e => e.beat >= this.position - 1e-8);
        if (this.next < 0) this.next = this.song.events.length;
        this.playing = true;
        this.timer = window.setInterval(() => this.tick(), 25); this.tick(); this.update();
      } catch (error) { if (generation !== this.generation) return; this.loading = false; this.update(); throw error; }
    }
    tick() {
      if (!this.playing) return;
      const [start, end] = this.bounds(), length = end - start, seconds = 60 / this.bpm;
      const now = context.currentTime, horizon = now + .14;
      // Recover from background throttling without a burst of stale notes or accumulated drift.
      const elapsed = this.startBeat + Math.max(0, now - this.started) / seconds;
      if (this.loop && elapsed > end + this.cycle * length + length) {
        this.cycle = Math.floor((elapsed - start) / length);
        this.next = this.song.events.findIndex(e => e.beat >= start);
      }
      let guard = 0;
      while (guard++ < 1000) {
        let event = this.song.events[this.next];
        if (!event || event.beat >= end) {
          if (!this.loop) break;
          this.cycle++; this.next = this.song.events.findIndex(e => e.beat >= start); event = this.song.events[this.next];
          if (!event || event.beat >= end) break;
        }
        const at = this.started + (event.beat + this.cycle * length - this.startBeat) * seconds;
        if (at > horizon) break;
        if (at >= now - .012) sound(event, Math.max(now, at), seconds);
        this.next++;
      }
      if (!this.loop && this.current() >= end) { this.pause(); this.position = end; }
      this.update();
    }
    pause() { this.generation++; this.loading = false; this.position = this.current(); this.playing = false; window.clearInterval(this.timer); this.timer = null; silence(); this.update(); }
    seek(value) { const playing = this.playing; this.pause(); const [start, end] = this.bounds(); this.position = Math.max(start, Math.min(end, Number(value) || 0)); this.update(); return playing ? this.play() : Promise.resolve(); }
    tempo(value) { const playing = this.playing; this.pause(); this.bpm = Math.max(40, Math.min(180, Number(value) || 96)); this.update(); return playing ? this.play() : Promise.resolve(); }
    setLoop(enabled) {
      const playing = this.playing; this.pause(); this.loop = enabled;
      if (!enabled) {
        this.loopBar = null;
        const length = this.song.chartBeats || this.song.beats;
        const start = Math.min(this.song.beats - length, Math.floor(this.position / length) * length);
        this.stopBounds = [start, start + length];
      }
      this.update(); return playing ? this.play() : Promise.resolve();
    }
    setLoopBar(bar) { const playing = this.playing; this.pause(); this.loopBar = bar; if (bar !== null) { this.loop = true; this.position = bar * 4; } this.update(); return playing ? this.play() : Promise.resolve(); }
  }
  window.practiceAudio = { arrangement, swingBeat, feels, Transport, volume, ensure, preload, silence, getContext };
})();
