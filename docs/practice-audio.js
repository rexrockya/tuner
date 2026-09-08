(function () {
  'use strict';
  const H = window.tunerHarmony;
  const swingBeat = (beat, swing) => Math.floor(beat) + (beat % 1 <= .5 ? beat % 1 * swing * 2 : swing + (beat % 1 - .5) * (1 - swing) * 2);
  const feels = {
    shuffle: { label: 'Shuffle 摇摆', swing: 2 / 3, bpm: 96 },
    slow: { label: 'Slow 12/8 慢蓝调', swing: 2 / 3, bpm: 62 },
    straight: { label: 'Straight 八分', swing: .5, bpm: 110 },
    boogie: { label: 'Boogie 推进', swing: 2 / 3, bpm: 124 },
    soul: { label: 'Soul 松弛', swing: .57, bpm: 82 },
    funk: { label: 'Funk 十六分', swing: .5, bpm: 102 },
    halftime: { label: 'Half-time 半拍', swing: .5, bpm: 78 },
    latin: { label: 'Latin 切分', swing: .5, bpm: 108 }
  };
  const bassStyles = { auto: '随机经典型', walking: 'Walking 行进', boogie: 'Boogie 走句', fifths: '根音 · 五度', riff: 'Riff 蓝调重复', octave: 'Octave 八度切分', pedal: 'Pedal 根音脉冲' };
  const bassCells = {
    walking: [[0, 0, .8], [1, 1, .8], [2, 2, .8], [3, 3, .78]],
    boogie: [[0, 0, .38], [.5, 0, .3], [1, 1, .38], [1.5, 2, .3], [2, 3, .38], [2.5, 2, .3], [3, 1, .38], [3.5, 2, .3]],
    fifths: [[0, 0, 1.55], [2, 2, 1.2], [3.5, 0, .32]],
    riff: [[0, 0, .7], [1, 0, .35], [1.5, 2, .35], [2.5, 3, .35], [3, 2, .65]],
    octave: [[0, 0, .4], [.75, 4, .23], [1.5, 2, .35], [2, 0, .4], [2.75, 4, .23], [3.5, 2, .35]],
    pedal: [[0, 0, .7], [1, 0, .36], [1.5, 0, .25], [2, 0, .72], [3, 0, .36]]
  };
  function arrangement(parsed, feel = 'shuffle', seed = 1, choruses = 4, options = {}) {
    const { swing } = feels[feel] || feels.shuffle, random = H.rng(seed), events = [];
    const chartBeats = parsed.bars.length * 4, selectedBass = [];
    const add = (track, beat, data) => events.push({ track, beat, ...data });
    let previousVoicing = [60, 64, 67], priorBass;
    for (let chorus = 0; chorus < choruses; chorus++) {
      const base = chorus * chartBeats;
      const choices = feel === 'slow' || feel === 'halftime' ? ['fifths', 'pedal', 'walking'] : feel === 'funk' || feel === 'latin' ? ['octave', 'riff', 'pedal'] : ['walking', 'boogie', 'fifths', 'riff', 'octave'];
      const available = choices.filter(style => style !== priorBass);
      const bassStyle = bassCells[options.bassStyle] ? options.bassStyle : available[Math.floor(random() * available.length)];
      selectedBass.push(bassStyle); priorBass = bassStyle;
      parsed.bars.forEach((bar, barIndex) => {
        const b = base + barIndex * 4, turnaround = barIndex === parsed.bars.length - 1;
        const hatStep = feel === 'funk' ? .25 : feel === 'slow' ? 1 / 3 : .5;
        for (let offset = 0, step = 0; offset < 3.999; offset += hatStep, step++) {
          const swung = feel === 'slow' ? offset : swingBeat(offset, swing);
          add('drums', b + swung + .006, { sample: feel === 'slow' && step % 3 === 0 ? 'ride' : `hat-${1 + (step + chorus) % 2}`, velocity: (step % (feel === 'funk' ? 4 : 2) === 0 ? .38 : .17) + random() * .065 });
        }
        const kicks = { funk: [0, .75, 2, 2.5], latin: [0, 1.5, 2.5], halftime: [0, 1.5], soul: [0, 2.5], boogie: [0, 1, 2, 3] }[feel] || [0, 2];
        const snares = { halftime: [2], latin: [1, 2.5] }[feel] || [1, 3];
        kicks.forEach((beat, i) => add('drums', b + swingBeat(beat, swing), { sample: `kick-${1 + (barIndex + i + chorus) % 2}`, velocity: beat === 0 ? .69 : .49 }));
        snares.forEach((beat, i) => add('drums', b + swingBeat(beat, swing) + (feel === 'latin' ? 0 : .018), { sample: `snare-${1 + (barIndex + chorus + i) % 2}`, velocity: (feel === 'latin' ? .35 : .64) + random() * .09 }));
        if (feel === 'funk' || feel === 'soul') add('drums', b + swingBeat(2.75, swing), { sample: 'snare-2', velocity: .12 });
        if (barIndex % 4 === 3 && chorus % 2 === 1) add('drums', b + 3 + swing, { sample: 'open-hat', velocity: .25 });
        if (turnaround && chorus % 2 === 1) [2.5, 3.25, 3.5].forEach((offset, i) => add('drums', b + swingBeat(offset, swing), { sample: `snare-${1 + i % 2}`, velocity: .2 + i * .04 }));
        bar.forEach(c => {
          const chordIndex = parsed.chords.indexOf(c), next = parsed.chords[(chordIndex + 1) % parsed.chords.length];
          const root = 28 + H.mod((c.bass ?? c.root) - 4), chordRoot = 28 + H.mod(c.root - 4);
          const path = [0, c.intervals[1], c.intervals[2], c.family === 'minor' || c.family === 'half-dim' ? 10 : c.family === 'dim' ? 9 : 9, 12];
          const cell = bassCells[bassStyle].filter(([beat]) => beat < c.beats);
          cell.forEach(([offset, degree, duration], i) => {
            let midi = i === 0 ? root : chordRoot + path[degree];
            if (bassStyle === 'walking' && i === cell.length - 1 && c.beats >= 2 && next.root !== c.root) midi = Math.max(28, H.nearest(next.bass ?? next.root, midi, 28, 51) - 1);
            const beat = swingBeat(offset, swing), length = Math.min(c.beats - beat, swingBeat(Math.min(c.beats, offset + duration), swing) - beat);
            add('bass', base + c.beat + beat, { midi, duration: length, velocity: i === 0 ? .74 : .55 + random() * .13, bassStyle });
          });
          const colors = [c.intervals[1], c.intervals[3] ?? c.intervals[2], c.intervals[2] + 12];
          const voicing = colors.map((n, i) => H.nearest(c.root + n, previousVoicing[i], 53, 77)); previousVoicing = voicing;
          const placements = c.beats >= 4 ? chorus % 2 ? [swing, 2 + swing] : [0, 2 + swing] : [0];
          placements.forEach((offset, i) => voicing.forEach(midi => add('keys', base + c.beat + offset, { midi, duration: Math.min(feel === 'slow' ? 1.9 : .9, c.beats - offset), velocity: i ? .17 : .22 })));
          if (options.rhythm !== false) {
            const strokes = { slow: [0, 1 + 2 / 3, 3], funk: [.5, 1.25, 2.5, 3.25], latin: [0, 1.5, 2.5], halftime: [0, 2.5], soul: [.5, 2.5] }[feel] || [0, .5, 1, 1.5, 2, 2.5, 3, 3.5];
            strokes.filter(offset => offset < c.beats).forEach((offset, stroke) => {
              const isBoogie = ['shuffle', 'boogie', 'straight'].includes(feel), up = stroke % 2;
              const intervals = isBoogie ? [0, c.intervals[2] + (Math.floor(offset) % 2 && c.family === 'dominant' ? 2 : 0)] : [c.intervals[1], c.intervals[3] ?? c.intervals[2], 12];
              const chordBase = 45 + H.mod(c.root - 9), beat = feel === 'slow' ? offset : swingBeat(offset, swing);
              const pitches = intervals.map(interval => chordBase + interval); if (up) pitches.reverse();
              pitches.forEach((midi, string) => {
                const strumBeat = beat + string * .012;
                if (strumBeat < c.beats) add('rhythm', base + c.beat + strumBeat, { midi, duration: Math.min(c.beats - strumBeat, isBoogie ? .28 : .45), velocity: (up ? .43 : .58) + random() * .07, variant: (stroke + chorus) % 2, articulation: 'muted' });
              });
            });
          }
        });
      });
    }
    return { events: events.sort((a, b) => a.beat - b.beat), beats: chartBeats * choruses, chartBeats, bassStyles: selectedBass };
  }
  let context, master, room, compressor, ready, assets = {}, voices = new Set(), buses = {};
  const decodedAssets = new Map();
  let organWave, bassAssets = [], guitarAssets = [];
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
    const rate = midi === undefined ? 1 : 2 ** ((midi - asset.midi) / 12);
    source.playbackRate.value = rate;
    const length = Math.max(.035, duration || asset.buffer.duration / rate);
    const guitar = track === 'lead' || track === 'rhythm';
    gain.gain.setValueAtTime(guitar ? .0001 : velocity, at);
    if (guitar) gain.gain.linearRampToValueAtTime(velocity, at + .006);
    gain.gain.setTargetAtTime(.0001, at + Math.max(.01, length - .055), guitar ? .025 : .02);
    const extra = [];
    if (guitar || track === 'bass') {
      const filter = context.createBiquadFilter(); filter.type = 'lowpass';
      filter.frequency.value = track === 'bass' ? 1300 + event.velocity * 1600 : track === 'rhythm' ? 1800 : 2200 + event.velocity * 1300;
      source.connect(filter).connect(gain); extra.push(filter);
    } else source.connect(gain);
    gain.connect(buses[track]);
    if (guitar && event.articulation === 'slide') { source.playbackRate.setValueAtTime(rate * 2 ** (-.65 / 12), at); source.playbackRate.linearRampToValueAtTime(rate, at + Math.min(.065, length / 3)); }
    if (track === 'lead' && event.articulation === 'vibrato' && length > .36) {
      source.playbackRate.setValueAtTime(rate, at + .24);
      for (let t = .29, i = 0; t < length; t += .095, i++) source.playbackRate.linearRampToValueAtTime(rate * 2 ** ((i % 2 ? -9 : 9) / 1200), at + t);
    }
    const choke = event.sample === 'open-hat' ? 'hat' : null;
    if (track === 'drums' && /^hat-/.test(event.sample || '')) for (const voice of voices) if (voice.choke === 'hat') {
      voice.gain.gain.setTargetAtTime(.0001, at, .006); try { voice.source.stop(at + .025); } catch {}
    }
    trackVoice(source, gain, extra, choke);
    source.start(at); source.stop(at + Math.min(asset.buffer.duration / rate, length + .12));
  }
  function guitarSample(event) {
    const layer = event.velocity >= .68 ? 3 : 2, variant = event.variant % 2 || 0;
    const candidates = guitarAssets.filter(asset => asset.layer === layer && asset.variant === variant);
    return candidates.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
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
    if (event.track === 'drums') sample(assets[event.sample], at, 0, event.velocity * .62, 'drums', undefined, event);
    else if (event.track === 'bass') {
      const closest = bassAssets.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
      sample(closest, at, event.duration * beatSeconds, event.velocity * .66, 'bass', event.midi, event);
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
  window.practiceAudio = { arrangement, swingBeat, feels, bassStyles, guitarSample, Transport, volume, ensure, preload, silence, getContext };
})();
