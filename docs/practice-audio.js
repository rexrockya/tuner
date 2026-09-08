(function () {
  'use strict';
  const H=window.tunerHarmony;
  const {arrangement,swingBeat,feels,bassStyles,drumStyles,keyStyles,rhythmStyles,leadGrooves,leadTextures,phraseCycleModes,densityCycleModes,planLeadCycle,expandLeadNote,warpLeadBeat,leadCycleEvents}=window.practiceArrangements;
  const timbres = {
    drums: { natural: '原声 Studio', vintage: '复古暖鼓', crisp: '明亮紧致', electro: 'Electro · 合成鼓' },
    bass: { precision: 'P 风格 · 厚实指弹', round: '圆润指弹', bright: '明亮指弹', muted: '闷音短奏', synth: 'Synth Bass · 深低音', acid: 'Synth Bass · 弹性短奏' },
    keys: { jazz: 'Jazz 风琴', gospel: 'Gospel 风琴', soft: '柔和风琴', synth: 'Synth Keys · 柔和电键', pad: 'Synth Pad · 空间铺底' },
    rhythm: { warm: '暖净音 · Studio', bright: '亮净音 · Studio', crunch: '厚过载 · Studio', dry: '干净短奏 · 电吉他', ambient: '空间延音 · 电吉他' },
    lead: { warm: '暖净音 · Studio', bright: '亮净音 · Studio', crunch: '厚过载 · Studio', jazz: '爵士琴颈 · 圆润', blues: 'Blues · 边缘破音', singing: '歌唱延音 · 压缩', dry: '干净短奏 · 电吉他', ambient: '空间延音 · 电吉他', piano: '大钢琴 · 乐谱音色', violin: '小提琴' }
  };
  const selectedTimbres = { drums: 'natural', bass: 'round', keys: 'jazz', rhythm: 'warm', lead: 'warm' }, timbreRequests = {};
  const patches = {
    drums: { natural: { cutoff: 18000, level: 1 }, vintage: { cutoff: 6400, level: 1.07, rate: .96 }, crisp: { cutoff: 18000, level: .98, rate: 1.04, highpass: 48 } },
    bass: {
      precision: { cutoff: 4300, highpass: 32, level: .8, release: .1, drive: 1.5, eq: [['lowshelf', 140, 2.6], ['peaking', 650, 1.8, .7]], compress: [-23, 12, 3, .014, .14] },
      round: { cutoff: 3400, highpass: 30, level: 1.32, release: .09, eq: [['lowshelf', 150, 2], ['peaking', 700, 1, .7]] },
      bright: { cutoff: 6800, highpass: 32, level: 1.05, release: .07, eq: [['lowshelf', 160, 2]] },
      muted: { cutoff: 1100, level: 1.12, release: .025, length: .58 }
    },
    rhythm: {
      warm: { cutoff: 6100, highpass: 70, level: .58, attack: .004, release: .12, drive: 1.2, eq: [['lowshelf', 180, 2.6], ['peaking', 900, 1.4, .65], ['peaking', 3200, -1.2, .8]], compress: [-24, 12, 2.4, .012, .14] },
      bright: { cutoff: 7600, highpass: 75, level: .58, attack: .003, release: .1, drive: 1.12, eq: [['lowshelf', 190, 2.2], ['peaking', 1100, 1.2, .7]], compress: [-23, 12, 2.2, .009, .12] },
      crunch: { cutoff: 5600, highpass: 80, level: .44, attack: .004, release: .14, drive: 3, eq: [['lowshelf', 180, 2.8], ['peaking', 950, 2, .7], ['peaking', 3100, -2, 1]], compress: [-22, 12, 2.6, .01, .14] },
      dry: { cutoff:7400,highpass:100,level:.55,attack:.002,release:.045,drive:1.1,compress:[-24,10,2.5,.006,.09] },
      ambient: { cutoff:4700,highpass:95,level:.43,attack:.065,release:.32,drive:1.8,space:true,compress:[-25,14,2.6,.018,.22] }
    },
    lead: {
      warm: { cutoff: 6500, highpass: 72, level: .58, attack: .004, release: .14, drive: 1.25, eq: [['lowshelf', 180, 2.2], ['peaking', 950, 1.7, .65], ['peaking', 3300, -1.1, .8]], compress: [-25, 14, 2.5, .012, .16] },
      bright: { cutoff: 7900, highpass: 78, level: .56, attack: .003, release: .12, drive: 1.15, eq: [['lowshelf', 190, 1.8], ['peaking', 1450, 1.5, .7]], compress: [-24, 12, 2.3, .009, .14] },
      crunch: { cutoff: 5700, highpass: 82, level: .42, attack: .004, release: .17, drive: 3.1, eq: [['lowshelf', 180, 2.4], ['peaking', 1050, 2.2, .7], ['peaking', 3200, -2.1, 1]], compress: [-23, 12, 2.8, .01, .17] },
      jazz: { cutoff: 4300, highpass: 68, level: .63, attack: .006, release: .18, drive: 1.12, eq: [['lowshelf', 190, 2.5], ['peaking', 720, 2.1, .72], ['peaking', 2800, -2.4, .9]], compress: [-27, 16, 2.7, .018, .2] },
      blues: { cutoff: 5900, highpass: 76, level: .47, attack: .004, release: .2, drive: 2.25, eq: [['lowshelf', 175, 2.1], ['peaking', 880, 2.8, .65], ['peaking', 2700, -.8, .9]], compress: [-25, 14, 3, .012, .2] },
      singing: { cutoff: 5400, highpass: 82, level: .43, attack: .009, release: .26, drive: 2.6, eq: [['lowshelf', 180, 1.8], ['peaking', 1250, 3, .62], ['peaking', 3600, -2.2, .85]], compress: [-29, 18, 3.8, .02, .26] },
      dry: { cutoff:7400,highpass:100,level:.55,attack:.002,release:.045,drive:1.1,compress:[-24,10,2.5,.006,.09] },
      ambient: { cutoff:4700,highpass:95,level:.43,attack:.065,release:.32,drive:1.8,space:true,compress:[-25,14,2.6,.018,.22] }
    }
  };
  let context, master, room, compressor, ready, assets = {}, voices = new Set(), buses = {};
  let sampleBankPromise, sampleBank, electroPromise, electroAssets = {}, ambientImpulse;
  function getTimbre(track) { return selectedTimbres[track]; }
  async function ensureSelection(selection, events = []) {
    const jobs = [];
    if (selection.drums === 'electro' && events.some(event => event.track === 'drums')) jobs.push(prepareElectro());
    if (selection.bass === 'precision' && events.some(event => event.track === 'bass')) jobs.push(prepareModernBass());
    const id = selection.lead;
    if (id === 'piano' || id === 'violin') {
      if (!sampleBankPromise) sampleBankPromise = import('./practice-timbres.js?v=20260908-tone-1').then(module => sampleBank = module.createSampleBank(getContext(), window.scoreAudio)).catch(error => { sampleBankPromise = null; throw error; });
      jobs.push(sampleBankPromise.then(bank => bank.ensure(id, events)));
    }
    await Promise.all(jobs);
  }
  function ensureSelected(events = []) { return ensureSelection(selectedTimbres, events); }
  function timbreSnapshot(selection = {}) {
    const snapshot = { ...selectedTimbres, ...selection };
    for (const [track, id] of Object.entries(snapshot)) if (!Object.hasOwn(timbres[track] || {}, id)) throw Error('未知音色');
    return Object.freeze(snapshot);
  }
  // Preparing a live edit only fills caches. Neither the active sound nor the clock changes.
  async function prepareTimbres(selection = {}, events = []) {
    const snapshot = timbreSnapshot(selection);
    await Promise.all([preload(), ensureSelection(snapshot, events)]);
    return snapshot;
  }
  function commitTimbres(selection) {
    const snapshot = timbreSnapshot(selection);
    for (const track of Object.keys(timbres)) { selectedTimbres[track] = snapshot[track]; timbreRequests[track] = (timbreRequests[track] || 0) + 1; }
    return snapshot;
  }
  // Kept for stopped playback and older callers. Live edits use prepare/commit above.
  async function setTimbre(track, id, events = []) {
    if (!Object.hasOwn(timbres[track] || {}, id)) throw Error('未知音色');
    const generation = (timbreRequests[track] || 0) + 1; timbreRequests[track] = generation;
    const previous = selectedTimbres[track]; selectedTimbres[track] = id;
    if (track === 'lead' || track === 'bass' || track === 'drums') {
      try { await ensureSelection({ ...selectedTimbres }, events); }
      catch (error) { if (timbreRequests[track] !== generation) return false; selectedTimbres[track] = previous; throw error; }
    }
    return timbreRequests[track] === generation;
  }
  const decodedAssets = new Map();
  const organWaves = new Map(), driveCurves = new Map();
  function prepareElectro() {
    if(!electroPromise)electroPromise=(async()=>{
      const manifest=await fetchAsset('assets/audio/electro/manifest.json','json');
      for(const [name,entry] of Object.entries(manifest.files))if(!electroAssets[name])electroAssets[name]={buffer:await getContext().decodeAudioData(await fetchAsset('assets/audio/electro/'+entry.file))};
    })().catch(error=>{electroPromise=null;throw error;});
    return electroPromise;
  }
  function spatialBuffer() {
    if(ambientImpulse)return ambientImpulse;
    ambientImpulse=context.createBuffer(2,Math.floor(context.sampleRate*1.4),context.sampleRate);
    const random=H.rng(9102026);
    for(let channel=0;channel<2;channel++){const data=ambientImpulse.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=(random()*2-1)*Math.exp(-i/context.sampleRate*4)*.09;}
    return ambientImpulse;
  }
  let bassAssets = [], guitarAssets = [], modernBassAssets = [], modernBassPromise;
  function getContext() {
    if (context) return context;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('这个浏览器暂不支持音频播放');
    context = new Context({ latencyHint: 'interactive' });
    master = context.createGain(); master.gain.value = .65;
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -14; compressor.knee.value = 18; compressor.ratio.value = 3; compressor.attack.value = .008; compressor.release.value = .18;
    const output = context.createGain(); output.gain.value = .84; // Fixed mix headroom after compression; track balance stays intact.
    master.connect(compressor).connect(output).connect(context.destination);
    room = context.createConvolver();
    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * .42), context.sampleRate), random = H.rng(12);
    for (let ch = 0; ch < 2; ch++) {
      const samples = impulse.getChannelData(ch);
      for (let i = 0; i < samples.length; i++) samples[i] = (random() * 2 - 1) * Math.exp(-i / context.sampleRate * 17) * .14;
    }
    room.buffer = impulse; room.connect(master);
    const pans = { drums: -.03, bass: 0, keys: .2, rhythm: -.2, lead: .06 }, sends = { drums: .08, bass: 0, keys: .18, rhythm: .1, lead: .17 };
    for (const track of ['drums', 'bass', 'keys', 'rhythm', 'lead']) {
      buses[track] = context.createGain(); buses[track].gain.value = 1;
      let stage = buses[track];
      if (context.createStereoPanner) { const panner = context.createStereoPanner(); panner.pan.value = pans[track]; stage.connect(panner); stage = panner; }
      stage.connect(master);
      if (sends[track]) { const send = context.createGain(); send.gain.value = sends[track]; stage.connect(send); send.connect(room); }
    }
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
  function prepareModernBass() {
    if (!modernBassPromise) modernBassPromise = (async () => {
      const ctx = getContext(), base = 'assets/audio/modern-bass/';
      const manifest = await fetchAsset(base + 'manifest.json?v=20260908-tone-1', 'json');
      modernBassAssets = await Promise.all(Object.entries(manifest).map(async ([name, entry]) => {
        const key = 'modern:' + name;
        if (decodedAssets.has(key)) return decodedAssets.get(key);
        let buffer;
        try { buffer = await ctx.decodeAudioData(await fetchAsset(base + entry.file)); }
        catch (error) { if (!entry.fallback) throw error; buffer = await ctx.decodeAudioData(await fetchAsset(base + entry.fallback)); }
        const asset = { buffer, midi: entry.midi, variant: entry.variant };
        decodedAssets.set(key, asset); return asset;
      }));
    })().catch(error => { modernBassPromise = null; throw error; });
    return modernBassPromise;
  }
  async function ensure() {
    const ctx = getContext();
    // Resume inside the user gesture; preloading never starts playback.
    const unlocked = ctx.resume();
    await Promise.all([unlocked, preload()]);
    return ctx;
  }
  function trackVoice(source, gain, extra = [], choke = null, owner = null, at = 0, tailSeconds = 0, silencers = []) {
    const item = { source, gain, extra, choke, owner, at, tailSeconds, silencers, ended:false }; voices.add(item);
    item.cleanup=()=>{clearTimeout(item.tailTimer);voices.delete(item);source.disconnect();gain.disconnect();extra.forEach(node=>node.disconnect());};
    source.onended = () => {item.ended=true;source.disconnect();if(item.tailSeconds)item.tailTimer=setTimeout(item.cleanup,item.tailSeconds*1000);else item.cleanup();};
  }
  function sample(asset, at, duration, velocity, track, midi, event = {}, selection = selectedTimbres, owner = null) {
    if (!asset) return;
    const source = context.createBufferSource(), gain = context.createGain(); source.buffer = asset.buffer;
    const guitar = (track === 'lead' || track === 'rhythm') && !asset.kind;
    const basePatch = patches[track]?.[selection[track]] || {};
    const patch = guitar ? (event.articulation==='dead'?{...(patches[track]?.dry||basePatch),cutoff:1800,highpass:650,length:.06,attack:.001,release:.012,level:.38}:event.articulation==='muted'?{...basePatch,cutoff:4300,length:.62,release:.025,space:false}:basePatch) : basePatch;
    const rate = (midi === undefined ? 1 : 2 ** ((midi - asset.midi + (event.detuneCents || 0) / 100) / 12)) * (patch.rate || 1);
    source.playbackRate.value = rate;
    const length = Math.max(.035, (duration || asset.buffer.duration / rate) * (patch.length || 1));
    const release = asset.ampRelease ?? (asset.kind === 'violin' ? .06 : asset.kind === 'piano' ? .18 : patch.release || (guitar ? .075 : .05));
    const attack = asset.kind === 'violin' ? .008 : patch.attack || .003;
    velocity *= (patch.level || 1) * (asset.level ?? 1);
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(velocity, at + Math.min(attack, length / 3));
    gain.gain.setTargetAtTime(.0001, at + length, release / 3);
    const extra = []; let chain = source;
    if (patch.highpass && track !== 'drums') { const node = context.createBiquadFilter(); node.type = 'highpass'; node.frequency.value = patch.highpass; chain.connect(node); chain = node; extra.push(node); }
    for (const [type, frequency, db, q = .707] of patch.eq || []) {
      const node = context.createBiquadFilter(); node.type = type; node.frequency.value = frequency; node.gain.value = db;
      if (node.Q) node.Q.value = q;
      chain.connect(node); chain = node; extra.push(node);
    }
    if (patch.drive) {
      const shaper = context.createWaveShaper();
      if (!driveCurves.has(patch.drive)) driveCurves.set(patch.drive, Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 511.5 - 1) * patch.drive) / Math.tanh(patch.drive)));
      shaper.curve = driveCurves.get(patch.drive); shaper.oversample = '2x'; chain.connect(shaper); chain = shaper; extra.push(shaper);
    }
    const filter = context.createBiquadFilter(); filter.type = 'lowpass';
    filter.frequency.value = Math.min(context.sampleRate * .45, asset.lpfCutoffHz || patch.cutoff || (asset.kind === 'violin' ? 10000 : 16000));
    chain.connect(filter); chain = filter; extra.push(filter);
    if (patch.highpass && track === 'drums') { const node = context.createBiquadFilter(); node.type = 'highpass'; node.frequency.value = patch.highpass; chain.connect(node); chain = node; extra.push(node); }
    if (patch.compress) {
      const node = context.createDynamicsCompressor();
      ['threshold', 'knee', 'ratio', 'attack', 'release'].forEach((key, i) => node[key].value = patch.compress[i]);
      chain.connect(node); chain = node; extra.push(node);
    }
    chain.connect(gain); gain.connect(buses[track]);
    const silencers=[];
    if(patch.space){const reverb=context.createConvolver(),wet=context.createGain();reverb.buffer=spatialBuffer();wet.gain.value=.3;gain.connect(reverb).connect(wet).connect(buses[track]);extra.push(reverb,wet);silencers.push(wet);}
    if (asset.loop) { source.loop = true; source.loopStart = asset.loopStart; source.loopEnd = asset.loopEnd; }
    if (guitar && event.articulation === 'slide') { source.playbackRate.setValueAtTime(rate * 2 ** (-.65 / 12), at); source.playbackRate.linearRampToValueAtTime(rate, at + Math.min(.065, length / 3)); }
    if (guitar && track === 'lead' && event.articulation === 'vibrato' && length > .36) {
      source.playbackRate.setValueAtTime(rate, at + .24);
      for (let t = .29, i = 0; t < length; t += .095, i++) source.playbackRate.linearRampToValueAtTime(rate * 2 ** ((i % 2 ? -9 : 9) / 1200), at + t);
    }
    const choke = event.sample === 'open-hat' ? 'hat' : null;
    if (track === 'drums' && /^hat-/.test(event.sample || '')) for (const voice of voices) if (voice.choke === 'hat' && voice.owner === owner) {
      voice.gain.gain.setTargetAtTime(.0001, at, .006); try { voice.source.stop(at + .025); } catch {}
    }
    trackVoice(source, gain, extra, choke, owner, at, patch.space?1.4:0, silencers);
    source.start(at); source.stop(at + (asset.loop ? length + release * 2 : Math.min(asset.buffer.duration / rate, length + release * 2)));
  }
  function guitarSample(event) {
    const layer = event.velocity >= .68 ? 3 : 2, variant = event.variant % 2 || 0;
    const candidates = guitarAssets.filter(asset => asset.layer === layer && asset.variant === variant);
    return candidates.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
  }
  function organ(event, at, seconds, selection = selectedTimbres, owner = null) {
    const id = selection.keys;
    const settings = { jazz: { harmonics: [0, 1, .48, .23, .13, 0, .08, 0, .04], cutoff: 2600, attack: .018, level: 1 }, gospel: { harmonics: [0, 1, .74, .53, .38, .24, .18, .13, .08], cutoff: 5500, attack: .01, level: .73 }, soft: { harmonics: [0, 1, .16, .04, .02], cutoff: 1600, attack: .045, level: 1.17 } }[id];
    const gain = context.createGain(), filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = settings.cutoff;
    gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(event.velocity * .16 * settings.level, at + settings.attack);
    gain.gain.setTargetAtTime(event.velocity * .11 * settings.level, at + .05, .15);
    gain.gain.setTargetAtTime(.0001, at + seconds * .9, .04);
    gain.connect(filter).connect(buses.keys);
    if (!organWaves.has(id)) organWaves.set(id, context.createPeriodicWave(new Float32Array(settings.harmonics.length), new Float32Array(settings.harmonics)));
    const oscillator = context.createOscillator(); oscillator.setPeriodicWave(organWaves.get(id));
    oscillator.frequency.value = 440 * 2 ** ((event.midi - 69 + (event.detuneCents || 0) / 100) / 12);
    oscillator.connect(gain); trackVoice(oscillator, gain, [filter], null, owner, at); oscillator.start(at); oscillator.stop(at + seconds + .18);
  }
  function synth(event,at,seconds,selection,owner) {
    const bass=event.track==='bass',id=selection[event.track],pad=id==='pad',acid=id==='acid';
    const duration=Math.max(.035,seconds),frequency=440*2**((event.midi-69+(event.detuneCents||0)/100)/12);
    const layers=bass?[[acid?'sawtooth':'sine',1,.7],['triangle',.5,.3]]:[['triangle',1,.7],['sine',pad?1.003:2,.3]];
    layers.forEach(([type,multiple,level])=>{
      const oscillator=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=frequency*multiple;
      filter.type='lowpass';filter.frequency.setValueAtTime(bass?(acid?1700:850):(pad?2200:4400),at);filter.frequency.exponentialRampToValueAtTime(bass?(acid?230:420):(pad?1300:1400),at+Math.min(duration,.28));
      const attack=Math.min(pad?.07:.008,duration/3),peak=event.velocity*level*(bass?.25:.13),release=pad?.16:.055;
      gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(peak,at+attack);gain.gain.setTargetAtTime(peak*(pad?.8:.5),at+attack+.008,.11);gain.gain.setTargetAtTime(.0001,at+duration,release/3);
      oscillator.connect(filter).connect(gain).connect(buses[event.track]);trackVoice(oscillator,gain,[filter],null,owner,at);oscillator.start(at);oscillator.stop(at+duration+release);
    });
  }
  function sound(event, at, beatSeconds, selection = selectedTimbres, owner = null) {
    if(event.track==='bass'&&['synth','acid'].includes(selection.bass)||event.track==='keys'&&['synth','pad'].includes(selection.keys)){synth(event,at,event.duration*beatSeconds,selection,owner);return;}
    if (event.track === 'drums') sample((selection.drums==='electro'?electroAssets:assets)[event.sample], at, 0, event.velocity * .62, 'drums', undefined, event, selection, owner);
    else if (event.track === 'bass') {
      const variant = (event.variant ?? Math.floor(event.beat * 3)) % 2;
      const bank = selection.bass === 'precision' ? modernBassAssets.filter(asset => asset.variant === variant) : bassAssets;
      const closest = bank.reduce((best, asset) => !best || Math.abs(asset.midi - event.midi) < Math.abs(best.midi - event.midi) ? asset : best, null);
      sample(closest, at, event.duration * beatSeconds, event.velocity * .66, 'bass', event.midi, event, selection, owner);
    } else if (event.track === 'lead' && ['piano', 'violin'].includes(selection.lead)) {
      const asset = sampleBank?.get(selection.lead, event);
      const stackGain = event.stackSize > 1 ? 1 / Math.sqrt(event.stackSize) : 1;
      sample(asset, at, event.duration * beatSeconds, event.velocity * stackGain * (selection.lead === 'violin' ? 1.65 : .95), 'lead', event.midi, event, selection, owner);
    } else if (event.track === 'lead' || event.track === 'rhythm') {
      const stackGain = event.track === 'lead' && event.stackSize > 1 ? 1 / Math.sqrt(event.stackSize) : 1;
      sample(guitarSample(event), at, event.duration * beatSeconds, event.velocity * stackGain * (event.track === 'lead' ? 1.2 : .62), event.track, event.midi, event, selection, owner);
    }
    else organ(event, at, event.duration * beatSeconds, selection, owner);
  }
  function cancelVoices(owner) {
    if (!context) return;
    for (const voice of [...voices]) if (voice.owner === owner) {
      // Only this candidate's future sources are removed. The current bar and
      // already sounding tails retain their original envelopes.
      try { voice.source.stop(context.currentTime); } catch {}
      voice.tailSeconds=0;voice.cleanup();
    }
  }
  function silence() {
    if (!context) return;
    for (const voice of [...voices]) {
      const {source,gain}=voice;voice.tailSeconds=0;
      gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setTargetAtTime(.0001, context.currentTime, .006);
      for(const output of voice.silencers){output.gain.cancelScheduledValues(context.currentTime);output.gain.setTargetAtTime(.0001,context.currentTime,.006);}
      try { source.stop(context.currentTime + .03); } catch {}
      if(voice.ended){clearTimeout(voice.tailTimer);voice.tailTimer=setTimeout(voice.cleanup,35);}
    }
  }
  function volume(track, value) { getContext(); buses[track].gain.setTargetAtTime(Math.max(0, Math.min(1, value)) ** 2, context.currentTime, .015); }
  class Transport {
    constructor(update = () => {}) { this.update = update; this.bpm = 96; this.position = 0; this.playing = false; this.loading = false; this.loop = true; this.loopBar = null; this.song = { events: [], beats: 0, chartBeats: 0 }; this.generation = 0; this.pendingUpdate = null; }
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
        this.activeTimbres = timbreSnapshot(); this.voiceScope = {}; this.lastScheduledAt = 0;
        this.next = this.song.events.findIndex(e => e.beat >= this.position - 1e-8);
        if (this.next < 0) this.next = this.song.events.length;
        this.playing = true;
        this.timer = window.setInterval(() => this.tick(), 25); this.tick(); this.update();
      } catch (error) { if (generation !== this.generation) return; this.loading = false; this.update(); throw error; }
    }
    queueUpdate(song, options = {}) {
      if (!song?.beats || !Array.isArray(song.events)) throw Error('乐句尚未准备好');
      this.cancelUpdate('replaced');
      if (!this.playing) return null;
      const seconds = 60 / this.bpm, [start, end] = this.bounds(), length = end - start;
      // Never replace notes the old lookahead has already scheduled.
      const safeTime = Math.max(context.currentTime + .14, this.lastScheduledAt || 0) + 1e-7;
      const safeBeat = this.startBeat + (safeTime - this.started) / seconds;
      const absoluteBeat = (Math.floor(safeBeat / 4) + 1) * 4;
      if (!this.loop && absoluteBeat >= end - 1e-8) { options.onCancel?.('ended'); return null; }
      const oldBeat = this.loop ? start + ((absoluteBeat - start) % length + length) % length : absoluteBeat;
      const oldChart = this.song.chartBeats || this.song.beats, newChart = song.chartBeats || song.beats;
      const chartBar = Math.floor(oldBeat % oldChart / 4), chorus = Math.floor(oldBeat / oldChart);
      const loopBar = this.loopBar === null ? null : this.loopBar % Math.max(1, newChart / 4);
      const position = loopBar === null
        ? (chorus % Math.max(1, song.beats / newChart)) * newChart + (chartBar % Math.max(1, newChart / 4)) * 4
        : loopBar * 4;
      const stopStart = Math.floor(position / newChart) * newChart, stopBounds = [stopStart, Math.min(song.beats, stopStart + newChart)];
      const limits = loopBar === null ? (this.loop ? [0, song.beats] : stopBounds) : [loopBar * 4, loopBar * 4 + 4];
      const at = this.started + (absoluteBeat - this.startBeat) * seconds;
      const pending = {
        song, timbres: timbreSnapshot(options.timbres), bpm: options.bpm === undefined ? this.bpm : Math.max(40, Math.min(180, Number(options.bpm) || 96)),
        at, beat: position, bar: Math.floor(position % newChart / 4), startBeat: position, started: at,
        position, next: song.events.findIndex(e => e.beat >= position - 1e-8), cycle: 0,
        loop: this.loop, loopBar, stopBounds, limits, voiceScope: {}, lastScheduledAt: 0,
        onCommit: options.onCommit, onCancel: options.onCancel
      };
      if (pending.next < 0) pending.next = song.events.length;
      this.pendingUpdate = pending;
      this.tick();
      return { at, beat: position, bar: pending.bar };
    }
    cancelUpdate(reason = 'cancelled') {
      this.commitUpdateIfDue();
      const pending = this.pendingUpdate;
      if (!pending) return false;
      this.pendingUpdate = null;
      cancelVoices(pending.voiceScope);
      // A cancellation can happen just before the boundary, between timer ticks.
      // Refill the old plan immediately so that downbeat cannot disappear.
      if (this.playing && reason !== 'stopped') this.schedule(this, context.currentTime, context.currentTime + .14);
      pending.onCancel?.(reason);
      return true;
    }
    commitUpdateIfDue() {
      const pending = this.pendingUpdate;
      if (!pending || !this.playing || context.currentTime < pending.at) return false;
      this.pendingUpdate = null;
      for (const key of ['song', 'bpm', 'startBeat', 'started', 'position', 'next', 'cycle', 'loopBar', 'stopBounds', 'voiceScope', 'lastScheduledAt']) this[key] = pending[key];
      this.activeTimbres = commitTimbres(pending.timbres);
      // Fill the audio horizon before a notation/DOM callback can use main-thread time.
      this.schedule(this, context.currentTime, context.currentTime + .14);
      pending.onCommit?.({ at: pending.at, beat: pending.beat, bar: pending.bar, song: pending.song, timbres: pending.timbres, bpm: pending.bpm });
      return true;
    }
    schedule(plan, now, horizon, cutoff = Infinity) {
      const [start, end] = plan.limits || this.bounds(), length = end - start, seconds = 60 / plan.bpm;
      const elapsed = plan.startBeat + Math.max(0, now - plan.started) / seconds;
      // Recover from a background stall without a burst of stale notes or drift.
      if (plan.loop && elapsed > end + plan.cycle * length + length) {
        plan.cycle = Math.floor((elapsed - start) / length);
        plan.next = plan.song.events.findIndex(e => e.beat >= start);
      }
      let guard = 0;
      while (guard++ < 1000) {
        let event = plan.song.events[plan.next];
        if (!event || event.beat >= end) {
          if (!plan.loop) break;
          plan.cycle++; plan.next = plan.song.events.findIndex(e => e.beat >= start); event = plan.song.events[plan.next];
          if (!event || event.beat >= end) break;
        }
        const at = plan.started + (event.beat + plan.cycle * length - plan.startBeat) * seconds;
        if (at > horizon || at >= cutoff - 1e-8) break;
        if (at >= now - .012) {
          const soundingAt = Math.max(now, at + Math.max(0, Number(event.timingOffset) || 0));
          sound(event, soundingAt, seconds, plan.timbres || plan.activeTimbres, plan.voiceScope);
          plan.lastScheduledAt = soundingAt;
        }
        plan.next++;
      }
    }
    tick() {
      if (!this.playing) return;
      this.commitUpdateIfDue();
      if (!this.playing) return;
      const [, end] = this.bounds(), now = context.currentTime, horizon = now + .14;
      const pending = this.pendingUpdate;
      this.schedule(this, now, horizon, pending?.at);
      if (pending && horizon >= pending.at) this.schedule(pending, now, horizon);
      if (!this.loop && this.current() >= end) { this.pause(); this.position = end; }
      this.update();
    }
    pause() { this.cancelUpdate('stopped'); this.generation++; this.loading = false; this.position = this.current(); this.playing = false; window.clearInterval(this.timer); this.timer = null; silence(); this.update(); }
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
  window.practiceAudio = { arrangement,swingBeat,feels,bassStyles,drumStyles,keyStyles,rhythmStyles,leadGrooves,leadTextures,phraseCycleModes,densityCycleModes,planLeadCycle,expandLeadNote,warpLeadBeat,leadCycleEvents,guitarSample, Transport, volume, ensure, preload, silence, getContext, timbres, setTimbre, getTimbre, prepareTimbres, commitTimbres };
})();
