// Practice-only sample bank. It owns buffers, never a context, scheduler or player.
// The piano regions and violin sustain preparation are shared with the score player.
let libraryPromise;
const library = () => libraryPromise ||= import('./assets/audio/smplr-1.0.0.mjs').catch(error => { libraryPromise = null; throw error; });
export function createSampleBank(context, helpers) {
  const buffers = new Map(), pending = new Map();
  let pianoPreset, violinPreset, violinData, violinPromise;
  const eventNotes = events => events.filter(e => e.track === 'lead' && Number.isFinite(e.midi)).map(e => ({ pitch: e.midi, velocity: Math.max(1, Math.round(e.velocity * 127)) }));
  async function fetchBody(url, method = 'arrayBuffer') {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw Error('音色载入失败，请重试'); return await response[method](); }
    finally { clearTimeout(timeout); }
  }
  function cached(key, load) {
    if (buffers.has(key)) return Promise.resolve(buffers.get(key));
    if (!pending.has(key)) pending.set(key, load().then(value => { buffers.set(key, value); return value; }).finally(() => pending.delete(key)));
    return pending.get(key);
  }
  function match(preset, pitch, velocity) {
    for (const group of preset.groups) {
      if (group.velRange && (velocity < group.velRange[0] || velocity > group.velRange[1])) continue;
      const region = group.regions.find(r => pitch >= r.keyRange[0] && pitch <= r.keyRange[1]);
      if (region) return { ...preset.defaults, ...group, ...region };
    }
    return null;
  }
  // Static practice-only trim: preserve note dynamics and never raise the whole mix.
  function violinLevel(buffer) {
    const start = Math.min(buffer.length, Math.round(buffer.sampleRate * .08));
    const end = Math.min(buffer.length, Math.round(buffer.sampleRate * .6));
    let energy = 0, count = 0, peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
        if (i >= start && i < end) { energy += data[i] * data[i]; count++; }
      }
    }
    const rms = Math.sqrt(energy / Math.max(1, count));
    if (!(peak > 0)) return 1;
    const peakLimit = Math.min(8, 10 ** (-6 / 20) / peak);
    return rms > 1e-6 ? Math.min(peakLimit, 10 ** (-24 / 20) / rms) : Math.min(1, peakLimit);
  }
  async function prepareViolin() {
    if (!violinPromise) violinPromise = (async () => {
      const [source, lib] = await Promise.all([fetchBody(new URL('./assets/audio/violin-mp3.js', import.meta.url).href, 'text'), library()]);
      const assignment = source.indexOf('MIDI.Soundfont.violin =');
      if (assignment < 0) throw Error('小提琴音源格式不正确');
      const start = source.indexOf('{', assignment), end = source.lastIndexOf('}');
      violinData = JSON.parse(source.slice(start, end + 1).replace(/,\s*}/g, '}'));
      violinPreset = lib.soundfontToPreset(Object.keys(violinData));
    })().catch(error => { violinPromise = null; throw error; });
    return violinPromise;
  }
  async function ensure(id, events = []) {
    const notes = eventNotes(events); if (!notes.length) return;
    if (id === 'piano') {
      const lib = await library();
      if (!helpers?.pianoPresetForScore) throw Error('钢琴音源尚未就绪，请刷新重试');
      const selected = helpers.pianoPresetForScore(lib, notes, 0, 0);
      // Keep the original complete key/velocity mapping; only fetch selected regions.
      pianoPreset ||= helpers.pianoPresetForScore(lib, []);
      const names = [...new Set(selected.groups.flatMap(g => g.regions.map(r => r.sample)))];
      await Promise.all(names.map(name => cached('piano:' + name, async () => {
        let lastError;
        for (const format of selected.samples.formats) {
          try { return { buffer: await context.decodeAudioData(await fetchBody(selected.samples.baseUrl + '/' + encodeURIComponent(name) + '.' + format)) }; }
          catch (error) { lastError = error; }
        }
        throw lastError || Error('钢琴音色载入失败，请重试');
      })));
    } else if (id === 'violin') {
      await prepareViolin();
      const regions = notes.map(note => match(violinPreset, note.pitch, 80)).filter(Boolean);
      await Promise.all([...new Set(regions.map(r => r.sample))].map(name => cached('violin:' + name, async () => {
        const encoded = violinData[name], raw = atob(encoded.slice(encoded.indexOf(',') + 1));
        const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
        const buffer = await context.decodeAudioData(bytes.buffer);
        if (!helpers?.prepareViolinSustain) throw Error('小提琴音源尚未就绪，请刷新重试');
        return { buffer, level: violinLevel(buffer), ...helpers.prepareViolinSustain(buffer) };
      })));
    }
  }
  function get(id, event) {
    const preset = id === 'piano' ? pianoPreset : violinPreset;
    if (!preset) return null;
    const velocity = helpers.scoreVelocity({ velocity: Math.max(1, Math.round(event.velocity * 127)) });
    const region = match(preset, event.midi, velocity);
    const loaded = region && buffers.get(id + ':' + region.sample);
    return loaded ? { ...region, ...loaded, midi: region.pitch, kind: id } : null;
  }
  return { ensure, get };
}
