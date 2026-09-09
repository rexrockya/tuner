(function () {
  'use strict';
  // Loaded only with the studio. Sample files are selected from the actual playback plan.
  const catalog = { guitar: 'natural-guitar', bass: 'natural-bass', drums: 'natural-drums', percussion: 'natural-percussion', strings: 'natural-strings', ensemble: 'natural-ensemble', keys: 'natural-keys' };
  const electricKeys = ['wurli', 'wurli-soft', 'wurli-bright'];
  function route(event, selection) {
    const id = selection[event.track];
    if (event.track === 'drums') return id === 'electro' ? null : 'drums';
    if (event.track === 'percussion') return id === 'electro' ? null : 'percussion';
    if (event.track === 'bass') return ['synth', 'acid'].includes(id) ? null : 'bass';
    if (event.track === 'keys') return electricKeys.includes(id) ? 'keys' : null;
    if (event.track === 'strings') return 'ensemble';
    if (event.track === 'lead' && id === 'violin') return 'strings';
    if (event.track === 'rhythm' || event.track === 'lead' && id !== 'piano') return 'guitar';
    return null;
  }
  function articulation(bank, event) {
    if (bank === 'percussion') { const style = event.percussionStyle || (/snare/.test(event.sample) ? 'clap' : /open/.test(event.sample) ? 'tambourine' : 'shaker'); return style === 'tambourine' ? 'tambourine-hit' : style; }
    if (bank === 'drums') {
      const sample = event.sample || '';
      if (/^kick/.test(sample)) return 'kick';
      if (/^snare/.test(sample)) return 'snare';
      if (/open-hat/.test(sample)) return 'hat-open';
      if (/hat/.test(sample)) return 'hat-closed';
      if (/tom-high|htom/.test(sample)) return 'tom-high';
      if (/tom-low|ltom/.test(sample)) return 'tom-low';
      return 'ride';
    }
    if (bank === 'keys') return 'wurli';
    if (bank === 'strings') return event.articulation === 'short' || event.duration < .65 ? 'short' : 'sustain';
    return 'sustain';
  }
  // Historical accompaniment velocities also encoded mix balance. Recover playing intensity separately.
  function velocity(event) { return Math.max(1 / 127, Math.min(1, (event.velocity ?? .6) * (event.track === 'keys' || event.track === 'strings' ? 3 : event.track === 'percussion' ? 2 : 1))); }
  function select(manifest, bank, event) {
    const wanted = articulation(bank, event), playedVelocity = Math.round(velocity(event) * 127);
    let candidates = manifest.samples.filter(sample => sample.articulation === wanted);
    if (!candidates.length) candidates = manifest.samples.filter(sample => sample.articulation === 'sustain');
    if (!candidates.length) throw Error('缺少对应演奏采样，请重试');
    if (Number.isFinite(event.midi)) {
      const distance = sample => sample.keyRange ? Math.max(sample.keyRange[0] - event.midi, 0, event.midi - sample.keyRange[1]) : Math.abs(sample.midi - event.midi);
      const closest = Math.min(...candidates.map(distance));
      candidates = candidates.filter(sample => distance(sample) === closest);
    }
    const distance = sample => { const range = sample.velocityRange || [0, 127]; return Math.max(range[0] - playedVelocity, 0, playedVelocity - range[1]); };
    const closest = Math.min(...candidates.map(distance));
    candidates = candidates.filter(sample => distance(sample) === closest).sort((a, b) => (a.variant || 0) - (b.variant || 0) || a.file.localeCompare(b.file));
    // The take is part of the authored event, so preload, live edits and playback agree.
    const take = Math.abs(Math.floor((event.beat || 0) * 997) + (event.midi || 0) * 17 + (event.variant || 0) * 7);
    return candidates[take % candidates.length];
  }
  function amplitude(asset, velocity) {
    const value = Math.max(1, Math.min(127, Math.round(velocity * 127)));
    if (Array.isArray(asset.velocityCurve)) {
      const points = asset.velocityCurve;
      for (let i = 1; i < points.length; i++) if (value <= points[i][0]) {
        const a = points[i - 1], b = points[i]; return a[1] + (b[1] - a[1]) * (value - a[0]) / (b[0] - a[0]);
      }
      return points[points.length - 1][1];
    }
    return (value / 127) ** (asset.amplitudeExponent ?? 1);
  }
  function createBank(context) {
    const manifests = new Map(), manifestJobs = new Map(), buffers = new Map(), bufferJobs = new Map();
    const base = 'assets/audio/';
    async function body(url, method) {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
      try { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw Error('录音音源载入失败，请重试'); return await response[method](); }
      finally { clearTimeout(timer); }
    }
    async function manifest(bank) {
      if (manifests.has(bank)) return manifests.get(bank);
      if (!manifestJobs.has(bank)) manifestJobs.set(bank, body(base + catalog[bank] + '/manifest.json', 'json').then(value => {
        if (value.version !== 1 || !Array.isArray(value.samples) || !value.samples.length) throw Error('录音音源目录不完整');
        for (const sample of value.samples) if (typeof sample.file !== 'string' || /^(?:https?:|\/)|\.\./.test(sample.file) || !sample.velocityRange || sample.velocityRange.length !== 2) throw Error('录音音源目录格式不正确');
        manifests.set(bank, value); return value;
      }).finally(() => manifestJobs.delete(bank)));
      return manifestJobs.get(bank);
    }
    const keyOf = (bank, sample) => bank + ':' + sample.file;
    async function decode(bank, sample) {
      const key = keyOf(bank, sample);
      if (buffers.has(key)) return buffers.get(key);
      if (!bufferJobs.has(key)) bufferJobs.set(key, (async () => {
        let buffer;
        try { buffer = await context.decodeAudioData(await body(base + catalog[bank] + '/' + sample.file, 'arrayBuffer')); }
        catch (error) { if (!sample.fallback) throw error; buffer = await context.decodeAudioData(await body(base + catalog[bank] + '/' + sample.fallback, 'arrayBuffer')); }
        const asset = { buffer }; // Regions sharing a file may have different root/tune/loop/level values.
        buffers.set(key, asset); return asset;
      })().finally(() => bufferJobs.delete(key)));
      return bufferJobs.get(key);
    }
    async function ensure(selection, events = []) {
      const needed = [...new Set(events.map(event => route(event, selection)).filter(Boolean))];
      await Promise.all(needed.map(manifest));
      const files = new Map();
      for (const event of events) { const bank = route(event, selection); if (bank) { const sample = select(manifests.get(bank), bank, event); files.set(keyOf(bank, sample), {bank, sample}); } }
      // Limit simultaneous decode/download work on phones; successful files survive retries.
      const queue = [...files.values()]; let index = 0;
      await Promise.all(Array.from({length: Math.min(4, queue.length)}, async () => { while (index < queue.length) { const item = queue[index++]; await decode(item.bank, item.sample); } }));
    }
    function get(event, selection) {
      const bank = route(event, selection); if (!bank) return null;
      const definition = manifests.get(bank); if (!definition) return null;
      const sample = select(definition, bank, event), decoded = buffers.get(keyOf(bank, sample));
      return decoded ? { amplitudeExponent: definition.amplitudeExponent ?? definition.velocityTracking?.amplitudeExponent, ...sample, ...decoded, natural: true, bank, loop: Number.isFinite(sample.loopStart) && sample.loopEnd > sample.loopStart } : null;
    }
    // Called only after a playback plan commits. Playing source nodes retain their own buffers.
    function retain(selection, events) {
      const required = new Set();
      for (const event of events) { const bank = route(event, selection); if (bank && manifests.has(bank)) required.add(keyOf(bank, select(manifests.get(bank), bank, event))); }
      let bytes = [...buffers.values()].reduce((sum, asset) => sum + asset.buffer.length * asset.buffer.numberOfChannels * 4, 0);
      for (const [key, asset] of buffers) if (bytes > 192 * 1024 * 1024 && !required.has(key)) { bytes -= asset.buffer.length * asset.buffer.numberOfChannels * 4; buffers.delete(key); }
    }
    return { ensure, get, retain };
  }
  window.practiceSamples = { createBank, route, select, amplitude, velocity, catalog, electricKeys };
})();
