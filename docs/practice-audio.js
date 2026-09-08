(function () {
  'use strict';
  const H=window.tunerHarmony;
  const {arrangement,swingBeat,feels,bassStyles,drumStyles,keyStyles,rhythmStyles}=window.practiceArrangements;
  const timbres = {
    drums: { natural: '原声 Studio', vintage: '复古暖鼓', crisp: '明亮紧致' },
    bass: { round: '圆润指弹', bright: '明亮指弹', muted: '闷音短奏' },
    keys: { jazz: 'Jazz 风琴', gospel: 'Gospel 风琴', soft: '柔和风琴' },
    rhythm: { warm: '温暖爵士吉他', bright: '明亮吉他', crunch: '轻过载吉他' },
    lead: { warm: '温暖爵士吉他', bright: '明亮吉他', crunch: '轻过载吉他', piano: '大钢琴 · 乐谱音色', violin: '小提琴' }
  };
  const selectedTimbres = { drums: 'natural', bass: 'round', keys: 'jazz', rhythm: 'warm', lead: 'warm' }, timbreRequests = {};
  const patches = {
    drums: { natural: { cutoff: 18000, level: 1 }, vintage: { cutoff: 6400, level: 1.07, rate: .96 }, crisp: { cutoff: 18000, level: .98, rate: 1.04, highpass: 48 } },
    bass: { round: { cutoff: 2200, level: 1, release: .07 }, bright: { cutoff: 7200, level: .86, release: .05 }, muted: { cutoff: 1100, level: 1.12, release: .025, length: .58 } },
    guitar: { warm: { cutoff: 3100, level: 1, attack: .006 }, bright: { cutoff: 9200, level: .83, attack: .003 }, crunch: { cutoff: 3600, level: .68, attack: .004, drive: 2.4 } }
  };
  let context, master, room, compressor, ready, assets = {}, voices = new Set(), buses = {};
  let sampleBankPromise, sampleBank;
  function getTimbre(track) { return selectedTimbres[track]; }
  async function ensureSelected(events = []) {
    const id = selectedTimbres.lead;
    if (id !== 'piano' && id !== 'violin') return;
    if (!sampleBankPromise) sampleBankPromise = import('./practice-timbres.js?v=20260908-1').then(module => sampleBank = module.createSampleBank(getContext(), window.scoreAudio)).catch(error => { sampleBankPromise = null; throw error; });
    const bank = await sampleBankPromise;
    await bank.ensure(id, events);
  }
  // Caller pauses transport first. Selection/load never resumes a context or schedules sound.
  async function setTimbre(track, id, events = []) {
    if (!Object.hasOwn(timbres[track] || {}, id)) throw Error('未知音色');
    const generation = (timbreRequests[track] || 0) + 1; timbreRequests[track] = generation;
    selectedTimbres[track] = id;
    if (track === 'lead') {
      try { await ensureSelected(events); }
      catch (error) { if (timbreRequests[track] !== generation) return false; throw error; }
    }
    return timbreRequests[track] === generation;
  }
  const decodedAssets = new Map();
  const organWaves = new Map(), driveCurves = new Map();
  let bassAssets = [], guitarAssets = [];
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
    for (const track of ['drums', 'bass', 'keys', 'rhythm', 'lead']) { buses[track] = context.createGain(); buses[track].gain.value = 1; buses[track].connect(master); }
    buses.keys.connect(room); buses.lead.connect(room);
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
      const manifest = await fetchAsset('assets/audio/blues/manifest.json?v=20260908-guitar', 'json');
      const loaded = await Promise.all(Object.entries(manifest).map(async ([name, entry]) => {
        if (decodedAssets.has(name)) return [name, decodedAssets.get(name)];
        let buffer;
        try { buffer = await ctx.decodeAudioData(await fetchAsset(`assets/audio/blues/${entry.file}`)); }
        catch (error) {
          if (!entry.fallback) throw error;
          buffer = await ctx.decodeAudioData(await fetchAsset(`assets/audio/blues/${entry.fallback}`));
        }
        const asset = { buffer, midi: entry.midi, layer: entry.layer, variant: entry.variant }; decodedAssets.set(name, asset);
        return [name, asset];
      }));
      assets = Object.fromEntries(loaded);
      bassAssets = loaded.filter(([name]) => name.startsWith('bass-')).map(([, asset]) => asset);
      guitarAssets = loaded.filter(([name]) => name.startsWith('guitar-')).map(([, asset]) => asset);
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
  function trackVoice(source, gain, extra = [], choke = null) {
    const item = { source, gain, extra, choke }; voices.add(item);
    source.onended = () => { voices.delete(item); source.disconnect(); gain.disconnect(); extra.forEach(node => node.disconnect()); };
  }
  function sample(asset, at, duration, velocity, track, midi, event = {}) {
    if (!asset) return;
    const source = context.createBufferSource(), gain = context.createGain(); source.buffer = asset.buffer;
    const guitar = (track === 'lead' || track === 'rhythm') && !asset.kind;
    const patch = guitar ? patches.guitar[selectedTimbres[track]] : patches[track]?.[selectedTimbres[track]] || {};
    const rate = (midi === undefined ? 1 : 2 ** ((midi - asset.midi) / 12)) * (patch.rate || 1);
    source.playbackRate.value = rate;
    const length = Math.max(.035, (duration || asset.buffer.duration / rate) * (patch.length || 1));
    const release = asset.kind === 'violin' ? .06 : asset.kind === 'piano' ? .18 : patch.release || (guitar ? .075 : .05);
    const attack = asset.kind === 'violin' ? .008 : patch.attack || .003;
    velocity *= patch.level || 1;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(velocity, at + Math.min(attack, length / 3));
    gain.gain.setTargetAtTime(.0001, at + length, release / 3);
    const extra = []; let chain = source;
    if (patch.drive) {
      const shaper = context.createWaveShaper();
      if (!driveCurves.has(patch.drive)) driveCurves.set(patch.drive, Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 511.5 - 1) * patch.drive) / Math.tanh(patch.drive)));
      shaper.curve = driveCurves.get(patch.drive); shaper.oversample = '2x'; chain.connect(shaper); chain = shaper; extra.push(shaper);
    }
    const filter = context.createBiquadFilter(); filter.type = 'lowpass';
    filter.frequency.value = Math.min(context.sampleRate * .45, asset.lpfCutoffHz || patch.cutoff || (asset.kind === 'violin' ? 10000 : 16000));
    chain.connect(filter); chain = filter; extra.push(filter);
    if (patch.highpass) { const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = patch.highpass; chain.connect(highpass); chain = highpass; extra.push(highpass); }
    chain.connect(gain); gain.connect(buses[track]);
    if (asset.loop) { source.loop = true; source.loopStart = asset.loopStart; source.loopEnd = asset.loopEnd; }
    if (guitar && event.articulation === 'slide') { source.playbackRate.setValueAtTime(rate * 2 ** (-.65 / 12), at); source.playbackRate.linearRampToValueAtTime(rate, at + Math.min(.065, length / 3)); }
    if (guitar && track === 'lead' && event.articulation === 'vibrato' && length > .36) {
      source.playbackRate.setValueAtTime(rate, at + .24);
      for (let t = .29, i = 0; t < length; t += .095, i++) source.playbackRate.linearRampToValueAtTime(rate * 2 ** ((i % 2 ? -9 : 9) / 1200), at + t);
    }
    const choke = event.sample === 'open-hat' ? 'hat' : null;
    if (track === 'drums' && /^hat-/.test(event.sample || '')) for (const voice of voices) if (voice.choke === 'hat') {
      voice.gain.gain.setTargetAtTime(.0001, at, .006); try { voice.source.stop(at + .025); } catch {}
    }
    trackVoice(source, gain, extra, choke);
    source.start(at); source.stop(at + (asset.loop ? length + release * 2 : Math.min(asset.buffer.duration / rate, length + release * 2)));
  }
  function guitarSample(event) {
    const layer = event.velocity >= .68 ? 3 : 2, variant = event.variant % 2 || 0;
    const candidates = guitarAssets.filter(asset => asset.layer === layer && asset.variant === variant);
    return candidates.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
  }
  function organ(event, at, seconds) {
    const id = selectedTimbres.keys;
    const settings = { jazz: { harmonics: [0, 1, .48, .23, .13, 0, .08, 0, .04], cutoff: 2600, attack: .018, level: 1 }, gospel: { harmonics: [0, 1, .74, .53, .38, .24, .18, .13, .08], cutoff: 5500, attack: .01, level: .73 }, soft: { harmonics: [0, 1, .16, .04, .02], cutoff: 1600, attack: .045, level: 1.17 } }[id];
    const gain = context.createGain(), filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = settings.cutoff;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(event.velocity * .16 * settings.level, at + settings.attack);
    gain.gain.setTargetAtTime(event.velocity * .11 * settings.level, at + .05, .15);
    gain.gain.setTargetAtTime(.0001, at + seconds * .9, .04);
    gain.connect(filter).connect(buses.keys);
    if (!organWaves.has(id)) organWaves.set(id, context.createPeriodicWave(new Float32Array(settings.harmonics.length), new Float32Array(settings.harmonics)));
    const oscillator = context.createOscillator(); oscillator.setPeriodicWave(organWaves.get(id));
    oscillator.frequency.value = 440 * 2 ** ((event.midi - 69) / 12);
    oscillator.connect(gain); trackVoice(oscillator, gain, [filter]); oscillator.start(at); oscillator.stop(at + seconds + .18);
  }
  function sound(event, at, beatSeconds) {
    if (event.track === 'drums') sample(assets[event.sample], at, 0, event.velocity * .62, 'drums', undefined, event);
    else if (event.track === 'bass') {
      const closest = bassAssets.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
      sample(closest, at, event.duration * beatSeconds, event.velocity * .66, 'bass', event.midi, event);
    } else if (event.track === 'lead' && ['piano', 'violin'].includes(selectedTimbres.lead)) {
      const asset = sampleBank?.get(selectedTimbres.lead, event);
      sample(asset, at, event.duration * beatSeconds, event.velocity * (selectedTimbres.lead === 'violin' ? 1.8 : .95), 'lead', event.midi, event);
    } else if (event.track === 'lead' || event.track === 'rhythm') sample(guitarSample(event), at, event.duration * beatSeconds, event.velocity * (event.track === 'lead' ? 1.2 : .62), event.track, event.midi, event);
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
        await Promise.all([ensure(), ensureSelected(this.song.events)]);
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
  window.practiceAudio = { arrangement,swingBeat,feels,bassStyles,drumStyles,keyStyles,rhythmStyles,guitarSample, Transport, volume, ensure, preload, silence, getContext, timbres, setTimbre, getTimbre };
})();
