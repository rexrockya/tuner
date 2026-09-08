(function () {
  'use strict';
  const H = window.tunerHarmony;
  const swingBeat = (beat, swing) => Math.floor(beat) + (beat % 1 <= .5 ? beat % 1 * swing * 2 : swing + (beat % 1 - .5) * (1 - swing) * 2);
  const feels = {
    shuffle: { label: 'Shuffle 摇摆', swing: 2 / 3, bpm: 96 }, slow: { label: 'Slow 12/8 慢蓝调', swing: 2 / 3, bpm: 62 },
    straight: { label: 'Straight 八分', swing: .5, bpm: 110 }, boogie: { label: 'Boogie 推进', swing: 2 / 3, bpm: 124 },
    soul: { label: 'Soul 松弛', swing: .57, bpm: 82 }, funk: { label: 'Funk 十六分', swing: .5, bpm: 102 },
    halftime: { label: 'Half-time 半拍', swing: .5, bpm: 78 }, latin: { label: 'Latin 切分', swing: .5, bpm: 108 }
  };
  const bassStyles = { auto: '随机经典型', walking: 'Walking 行进', boogie: 'Boogie 走句', fifths: '根音 · 五度', riff: 'Riff 蓝调重复', octave: 'Octave 八度切分', pedal: 'Pedal 根音脉冲' };
  const drumStyles = { auto: '随机经典型', shuffle: 'Shuffle 摇摆', backbeat: 'Backbeat 稳拍', ride: 'Ride 爵士', funk: 'Funk 切分', halftime: 'Half-time 半拍', latin: 'Latin 拉丁', boogie: 'Boogie 推进' };
  const keyStyles = { none: 'None · 关闭', auto: '随机经典型', pad: '长音铺底', offbeat: '反拍和弦', soul: 'Soul 应答', arpeggio: '流动分解', gospel: 'Gospel 推进' };
  const rhythmStyles = { none: 'None · 关闭', auto: '随机经典型', boogie: 'Boogie 双音', chop: '短切和弦', offbeat: '反拍扫弦', arpeggio: '分解伴奏', clave: 'Latin 切分' };
  const percussionStyles = { none: 'None · 关闭', auto: '随演奏取向变化', shaker: 'Shaker · 八分推动', tambourine: 'Tambourine · 反拍', clap: 'Clap · 二四拍' };
  const stringsStyles = { none: 'None · 关闭', auto: '随演奏取向变化', pad: '弦乐长音 · 铺底', pulse: '弦乐脉冲 · 推进', response: '弦乐回应 · 留白' };
  const leadGrooves = {
    follow: { label: '跟随整体律动', swing: null, subdivision: 2, delayMs: 4, jitterMs: 3 },
    straight: { label: 'Straight · 直八', swing: .5, subdivision: 2, delayMs: 3, jitterMs: 3 },
    swing: { label: 'Swing · 轻摇摆', swing: .6, subdivision: 2, delayMs: 7, jitterMs: 4 },
    shuffle: { label: 'Shuffle · 三连摆动', swing: 2 / 3, subdivision: 2, delayMs: 6, jitterMs: 4 },
    pocket: { label: 'Pocket · 十六分律动', swing: .58, subdivision: 4, delayMs: 8, jitterMs: 5 },
    laidback: { label: 'Laid-back · 靠后', swing: .57, subdivision: 2, delayMs: 20, jitterMs: 5 }
  };
  const leadTextures = { single: '单音旋律', double: '双音点缀', voicing: '和声 Voicing' };
  const phraseCycleModes = { repeat: '固定重复', random: '每轮随机切换', sequence: '指定顺序' };
  const densityCycleModes = { fixed: '保持所选密度', random: '每轮随机密度' };
  const performerProfiles = {
    balanced: { label: '均衡会话', description: '保留自然的问答、力度与时值，适合作为中性起点。', timingBiasMs: 0, jitterScale: 1, detune: 2.2, stackMs: 7, gate: 1, velocityScale: 1, affinity: {} },
    storyteller: { label: '问答叙事', description: '前后句用更宽的动态和呼吸形成对话。', timingBiasMs: 6, jitterScale: 1.15, detune: 2.6, stackMs: 8, gate: .88, velocityScale: 1, affinity: { bass: ['walking', 'fifths'], drums: ['backbeat', 'ride'], keys: ['soul', 'pad'], rhythm: ['offbeat', 'arpeggio'], percussion: ['shaker'], strings: ['response'] } },
    navigator: { label: '和声导航', description: '强调三音、七音与和弦边界，连接更清楚。', timingBiasMs: -2, jitterScale: .65, detune: 1.4, stackMs: 5, gate: .74, velocityScale: 1, affinity: { bass: ['walking'], drums: ['ride', 'backbeat'], keys: ['offbeat'], rhythm: ['chop', 'arpeggio'], percussion: ['shaker'], strings: ['response'] } },
    pocket: { label: '切分口袋', description: '短奏、反拍重音与靠后的微时值更贴近节奏组。', timingBiasMs: 3, jitterScale: .7, detune: 1.2, stackMs: 4, gate: .52, velocityScale: 1, affinity: { bass: ['octave', 'riff'], drums: ['funk', 'backbeat'], keys: ['offbeat', 'soul'], rhythm: ['chop', 'offbeat'], percussion: ['clap', 'tambourine', 'shaker'], strings: ['pulse'] } },
    colorist: { label: '色彩和声', description: '更多七音、九音与复音空间，和声色彩更浓。', timingBiasMs: 7, jitterScale: .9, detune: 1.9, stackMs: 10, gate: .88, velocityScale: .94, affinity: { bass: ['pedal', 'fifths'], drums: ['halftime', 'ride'], keys: ['soul', 'pad'], rhythm: ['arpeggio', 'offbeat'], percussion: ['shaker'], strings: ['pad', 'response'] } },
    atmospheric: { label: '延音空间', description: '减少弱拍音符、延长落点，让留白和层次更明显。', timingBiasMs: 12, jitterScale: 1.35, detune: 3.4, stackMs: 12, gate: .97, velocityScale: .82, affinity: { bass: ['fifths', 'pedal'], drums: ['halftime', 'ride'], keys: ['pad'], rhythm: ['arpeggio'], percussion: ['none', 'shaker'], strings: ['pad'] } }
  };
  // Auto players follow the chosen feel; explicit player styles can intentionally contrast it.
  const drumPools = {
    shuffle: ['shuffle', 'ride', 'backbeat'], slow: ['ride', 'halftime', 'shuffle'], straight: ['backbeat', 'boogie', 'funk'],
    boogie: ['boogie', 'shuffle', 'backbeat'], soul: ['backbeat', 'halftime', 'ride'], funk: ['funk', 'backbeat', 'halftime'],
    halftime: ['halftime', 'backbeat', 'ride'], latin: ['latin', 'funk', 'ride']
  };
  const bassCells = {
    walking: [[0, 0, .8], [1, 1, .8], [2, 2, .8], [3, 3, .78]],
    boogie: [[0, 0, .38], [.5, 0, .3], [1, 1, .38], [1.5, 2, .3], [2, 3, .38], [2.5, 2, .3], [3, 1, .38], [3.5, 2, .3]],
    fifths: [[0, 0, 1.55], [2, 2, 1.2], [3.5, 0, .32]], riff: [[0, 0, .7], [1, 0, .35], [1.5, 2, .35], [2.5, 3, .35], [3, 2, .65]],
    octave: [[0, 0, .4], [.75, 4, .23], [1.5, 2, .35], [2, 0, .4], [2.75, 4, .23], [3.5, 2, .35]],
    pedal: [[0, 0, .7], [1, 0, .36], [1.5, 0, .25], [2, 0, .72], [3, 0, .36]]
  };
  // Independent seeded choices keep a drum/style edit from rewriting the other players.
  function styleSequence(catalog, requested, pool, count, seed) {
    if (requested && requested !== 'auto' && Object.hasOwn(catalog, requested)) return Array(count).fill(requested);
    pool = pool.filter(style => Object.hasOwn(catalog, style) && style !== 'auto');
    if (pool.length <= 1) return Array(count).fill(pool[0] || 'none');
    const random = H.rng(seed), result = [];
    for (let i = 0; i < count; i++) {
      let available = pool.filter(style => style !== result[i - 1] && (i !== count - 1 || count < 3 || style !== result[0]));
      if (!available.length) available = pool.filter(style => style !== result[i - 1]);
      result.push(available[Math.floor(random() * available.length)]);
    }
    return result;
  }
  const guitarOpens = [64, 59, 55, 50, 45, 40];
  const clonePhrase = phrase => ({ ...phrase, notes: phrase.notes.map(note => ({ ...note, ...(note.companions ? { companions: note.companions.map(voice => ({ ...voice })) } : {}) })), structure: phrase.structure?.map(item => ({ ...item })), densityPlan: phrase.densityPlan?.map(item => ({ ...item })) });
  function refinger(midi, previous = { fret: 7, string: 2 }) {
    return guitarOpens.map((open, string) => ({ string, fret: midi - open })).filter(position => position.fret >= 0 && position.fret <= 24)
      .sort((a, b) => Math.abs(a.fret - previous.fret) + Math.abs(a.string - previous.string) * 1.5 - Math.abs(b.fret - previous.fret) - Math.abs(b.string - previous.string) * 1.5)[0];
  }
  function shapeLeadPhrase(phrase, parsed, profileId = 'balanced', seed = 1, context = {}) {
    const id = Object.hasOwn(performerProfiles, profileId) ? profileId : 'balanced', result = clonePhrase(phrase);
    if (id === 'balanced' || !result.notes.length) return result;
    const random = H.rng((seed >>> 0) ^ Math.imul(Object.keys(performerProfiles).indexOf(id) + 17, 0x45d9f3b));
    const chordFor = note => parsed.chords.find(chord => note.beat >= chord.beat - 1e-8 && note.beat < chord.beat + chord.beats - 1e-8);
    if (id === 'atmospheric') {
      const firstByChord = new Set();
      result.notes = result.notes.filter((note, index) => {
        const chord = chordFor(note), key = chord?.beat;
        if (key !== undefined && !firstByChord.has(key)) { firstByChord.add(key); return true; }
        return index === result.notes.length - 1 || Math.abs(note.beat % 1) < 1e-8 || random() < .58;
      });
    }
    let hand = { fret: result.notes[0]?.fret ?? 7, string: result.notes[0]?.string ?? 2 };
    result.notes.forEach((note, index) => {
      const chord = chordFor(note); if (!chord) return;
      const boundary = Math.abs(note.beat - chord.beat) < 1e-8, answer = note.bar % 2 === 1;
      if (id === 'storyteller') {
        note.velocity = Math.max(.18, Math.min(.94, note.velocity * (answer ? .9 : 1.08)));
        note.duration = Math.min(chord.beat + chord.beats - note.beat, note.duration * (answer ? .82 : 1.06));
        note.role = answer ? '回答 · 收束' : '提问 · 展开';
        if (note.duration > .72) note.articulation = 'vibrato';
      } else if (id === 'navigator') {
        if (boundary || index && result.notes[index - 1].bar !== note.bar) {
          const target = chord.intervals[index % 2 ? 3 : 1] ?? chord.intervals[1] ?? 0;
          note.midi = H.nearest(chord.root + target, note.midi, 55, 79); note.role = index % 2 ? '七音连接' : '三音连接';
        }
        note.duration = Math.min(note.duration, Math.max(.08, (note.notationDuration || note.duration) * .74)); note.articulation = 'picked';
      } else if (id === 'pocket') {
        note.duration = Math.min(note.duration, Math.max(.055, (note.notationDuration || note.duration) * .52));
        note.velocity = Math.max(.16, Math.min(.94, note.velocity * (note.beat % 1 ? 1.12 : .9)));
        note.articulation = 'muted'; note.role = note.beat % 1 ? '反拍重音' : '口袋短奏';
      } else if (id === 'colorist' && index !== result.notes.length - 1 && (boundary || note.beat % 1 === 0) && random() < .68) {
        const colors = [...(chord.colorIntervals || chord.intervals)].filter(interval => interval === 10 || interval === 11 || interval >= 14);
        const target = colors[index % Math.max(1, colors.length)] ?? chord.intervals[3] ?? chord.intervals[1] ?? 0;
        note.midi = H.nearest(chord.root + target, note.midi, 55, 79); note.velocity = Math.max(.18, note.velocity * .94); note.role = target >= 14 ? '延伸音色彩' : '七音色彩';
      } else if (id === 'atmospheric') {
        note.duration = Math.min(chord.beat + chord.beats - note.beat, Math.max(note.duration, (note.notationDuration || note.duration) * .94));
        note.velocity = Math.max(.16, note.velocity * .82); note.articulation = note.duration > .7 ? 'vibrato' : 'picked'; note.role = boundary ? '共同音落点' : '空间留白';
      }
      hand = refinger(note.midi, hand) || hand; note.string = hand.string; note.fret = hand.fret;
      note.duration = Math.max(.02, Math.min(note.duration, chord.beat + chord.beats - note.beat));
    });
    if (result.densityPlan) result.densityPlan.forEach(plan => { plan.count = result.notes.filter(note => note.bar === plan.bar).length; });
    return result;
  }
  function companionVoices(chord, note, wanted) {
    const chordPitches = new Set(chord.intervals.map(interval => H.mod(chord.root + interval))), preferred = wanted === 1 ? [3, 4, 8, 9, 7, 5] : [3, 4, 7, 10, 11, 5, 8, 9];
    const positions = [];
    for (let string = 0; string < guitarOpens.length; string++) for (let fret = 0; fret <= 24; fret++) {
      const midi = guitarOpens[string] + fret, distance = Math.abs(midi - note.midi);
      if (string === note.string || midi === note.midi || distance < 2 || distance > 16 || !chordPitches.has(H.mod(midi))) continue;
      const intervalRank = Math.min(...preferred.map((interval, i) => Math.abs(distance - interval) + i * .08));
      positions.push({ midi, string, fret, score: Math.abs(fret - note.fret) * 1.6 + Math.abs(string - note.string) * .55 + intervalRank * 1.8 + (midi > note.midi ? 1.6 : 0) });
    }
    positions.sort((a, b) => a.score - b.score || a.midi - b.midi);
    const voices = [], usedStrings = new Set([note.string]), usedPitches = new Set([note.midi]), usedClasses = new Set([H.mod(note.midi)]);
    for (const position of positions) {
      if (usedStrings.has(position.string) || usedPitches.has(position.midi)) continue;
      if (wanted > 1 && usedClasses.has(H.mod(position.midi)) && positions.some(other => !usedStrings.has(other.string) && !usedClasses.has(H.mod(other.midi)))) continue;
      const frets = [note.fret, ...voices.map(voice => voice.fret), position.fret];
      if (Math.max(...frets) - Math.min(...frets) > 6) continue;
      voices.push(position); usedStrings.add(position.string); usedPitches.add(position.midi); usedClasses.add(H.mod(position.midi));
      if (voices.length === wanted) break;
    }
    return voices;
  }
  function decorateLeadTexture(phrase, parsed, texture = 'single', seed = 1) {
    texture = leadTextures[texture] ? texture : 'single';
    const result = clonePhrase(phrase);
    result.notes.forEach(note => delete note.companions);
    if (texture === 'single') return result;
    result.texture = texture;
    const random = H.rng((seed >>> 0) ^ (texture === 'double' ? 0x5deece66 : 0x72f05ac3)), wanted = texture === 'double' ? 1 : 2;
    let voiced = 0, firstEligible = null, fallback = null;
    for (const note of result.notes) {
      const chord = parsed.chords.find(item => note.beat >= item.beat && note.beat < item.beat + item.beats), written = note.notationDuration || note.duration;
      if (chord && note.articulation !== 'slide') fallback ||= { note, chord };
      if (!chord || note.articulation === 'slide' || written < .48 || note.beat % .5 !== 0) continue;
      firstEligible ||= { note, chord };
      const strong = note.beat % 1 === 0, cadence = note === result.notes.at(-1), chance = texture === 'double' ? (strong ? .5 : .2) : (strong ? .34 : .1);
      if (!cadence && random() > chance) continue;
      const positions = companionVoices(chord, note, wanted);
      if (positions.length < wanted) continue;
      note.companions = positions.map((position, index) => ({ ...position, velocity: Math.max(.18, note.velocity * (texture === 'double' ? .78 : .64 - index * .06)), role: texture === 'double' ? '双音和声' : '和声 Voicing', articulation: 'picked', variant: ((note.variant || 0) + index + 1) % 2 }));
      voiced++;
    }
    const guaranteed = firstEligible || fallback;
    if (!voiced && guaranteed) {
      const positions = companionVoices(guaranteed.chord, guaranteed.note, wanted);
      if (positions.length === wanted) guaranteed.note.companions = positions.map((position, index) => ({ ...position, velocity: Math.max(.18, guaranteed.note.velocity * (texture === 'double' ? .78 : .64 - index * .06)), role: texture === 'double' ? '双音和声' : '和声 Voicing', articulation: 'picked', variant: ((guaranteed.note.variant || 0) + index + 1) % 2 }));
    }
    return result;
  }
  function leadSequence(catalog, mode, requested, sequence, count, seed) {
    if (mode === 'repeat') return Array(count).fill(requested);
    if (mode === 'sequence') {
      const valid = (sequence || []).filter(value => Object.hasOwn(catalog, value));
      const source = valid.length ? valid : ['call', 'motif', 'space'];
      return Array.from({ length: count }, (_, index) => source[index % source.length]);
    }
    const pool = Object.keys(catalog).filter(value => value !== 'mixed'), random = H.rng(seed), result = [];
    for (let index = 0; index < count; index++) {
      let available = pool.filter(value => value !== result[index - 1] && (index !== count - 1 || count < 3 || value !== result[0]));
      if (!available.length) available = pool;
      result.push(available[Math.floor(random() * available.length)]);
    }
    return result;
  }
  function densitySequence(mode, requested, count, seed) {
    if (mode !== 'random') return Array(count).fill(requested);
    const pools = { easy: ['easy', 'standard'], standard: ['easy', 'standard', 'advanced'], advanced: ['standard', 'advanced', 'challenge'], challenge: ['advanced', 'challenge'], auto: ['easy', 'standard', 'advanced', 'challenge'] };
    const pool = pools[requested] || pools.standard, random = H.rng(seed), result = [];
    for (let index = 0; index < count; index++) {
      let available = pool.filter(value => value !== result[index - 1] && (index !== count - 1 || count < 3 || value !== result[0]));
      if (!available.length) available = pool;
      result.push(available[Math.floor(random() * available.length)]);
    }
    return result;
  }
  function planLeadCycle(parsed, seed, feel = 'blues', options = {}, choruses = 4) {
    choruses = Math.max(1, Math.min(32, Math.floor(Number(choruses) || 1)));
    const mode = phraseCycleModes[options.phraseCycleMode] ? options.phraseCycleMode : 'repeat';
    const densityMode = densityCycleModes[options.densityCycleMode] ? options.densityCycleMode : 'fixed';
    const texture = leadTextures[options.leadTexture] ? options.leadTexture : 'single';
    const groove = leadGrooves[options.leadGroove] ? options.leadGroove : 'follow';
    const performerProfile = Object.hasOwn(performerProfiles, options.performerProfile) ? options.performerProfile : 'balanced';
    if (options.leadCycle?.rounds?.length === choruses) return { ...options.leadCycle, mode, densityMode, texture, groove, performerProfile: Object.hasOwn(performerProfiles, options.leadCycle.performerProfile) ? options.leadCycle.performerProfile : 'balanced', rounds: options.leadCycle.rounds.map(round => ({ ...round, phrase: clonePhrase(round.phrase) })) };
    const requestedStyle = Object.hasOwn(H.phraseStyles, options.style) ? options.style : 'mixed';
    const requestedDensity = Object.hasOwn(H.phraseIntensities, options.intensity) ? options.intensity : 'standard';
    const styles = leadSequence(H.phraseStyles, mode, requestedStyle, options.phraseStyleSequence, choruses, (seed >>> 0) ^ 0x41c64e6d);
    const densities = densitySequence(densityMode, requestedDensity, choruses, (seed >>> 0) ^ 0x9e3779b9);
    let shared;
    const rounds = Array.from({ length: choruses }, (_, index) => {
      const roundSeed = index ? ((seed >>> 0) ^ Math.imul(index + 1, 0x6d2b79f5)) >>> 0 : seed >>> 0;
      if (mode === 'repeat' && densityMode === 'fixed') {
        if (!shared) {
          const generated = options.phrase || H.generate(parsed, seed, feel, { genre: options.genre, style: styles[0], intensity: densities[0], legacy: options.legacy });
          const source = options.phrase || (options.legacy ? generated : shapeLeadPhrase(generated, parsed, performerProfile, seed, { feel, style: styles[0], intensity: densities[0] }));
          shared = decorateLeadTexture(source, parsed, texture, seed);
        }
        return { seed: seed >>> 0, style: styles[0], intensity: densities[0], phrase: clonePhrase(shared) };
      }
      const phrase = H.generate(parsed, roundSeed, feel, { genre: options.genre, style: styles[index], intensity: densities[index] });
      return { seed: roundSeed, style: styles[index], intensity: densities[index], phrase: decorateLeadTexture(shapeLeadPhrase(phrase, parsed, performerProfile, roundSeed, { feel, style: styles[index], intensity: densities[index] }), parsed, texture, roundSeed) };
    });
    return { mode, densityMode, texture, groove, performerProfile, rounds };
  }
  function expandLeadNote(note) {
    const companions = note.companions || [], stackSize = companions.length + 1;
    return [{ ...note, companions: undefined, stackIndex: 0, stackSize }, ...companions.map((voice, index) => ({ ...note, ...voice, companions: undefined, stackIndex: index + 1, stackSize }))];
  }
  function warpLeadBeat(beat, groove = 'follow', backingFeel = 'shuffle') {
    const profile = leadGrooves[groove] || leadGrooves.follow, ratio = profile.swing ?? feels[backingFeel]?.swing ?? .5;
    if (profile.subdivision !== 4) return swingBeat(beat, ratio);
    const pair = .5, base = Math.floor((beat + 1e-8) / pair) * pair, phase = (beat - base) / pair;
    return base + (phase <= .5 ? phase * ratio * 2 : ratio + (phase - .5) * (1 - ratio) * 2) * pair;
  }
  function leadCycleEvents(cycle, chartBeats, backingFeel = 'shuffle') {
    const events = [];
    cycle.rounds.forEach((round, chorus) => {
      const grooveProfile = leadGrooves[cycle.groove] || leadGrooves.follow, player = performerProfiles[cycle.performerProfile] || performerProfiles.balanced, random = H.rng((round.seed >>> 0) ^ 0xa511e9b3);
      for (const onset of round.phrase.notes) {
        const start = warpLeadBeat(onset.beat, cycle.groove, backingFeel), end = warpLeadBeat(onset.beat + onset.duration, cycle.groove, backingFeel);
        const jitter = (random() * 2 - 1) * grooveProfile.jitterMs * player.jitterScale, dynamic = .96 + random() * .08, detune = (random() * 2 - 1) * player.detune;
        const accent = cycle.performerProfile === 'storyteller' ? (onset.bar % 2 ? .9 : 1.08) : cycle.performerProfile === 'pocket' ? (onset.beat % 1 ? 1.12 : .9) : 1;
        for (const note of expandLeadNote(onset)) events.push({ ...note, beat: chorus * chartBeats + start, duration: Math.max(.02, (end - start) * player.gate), velocity: Math.min(.96, note.velocity * dynamic * player.velocityScale * accent), track: 'lead', chorus, leadStyle: round.style, leadIntensity: round.intensity, leadGroove: cycle.groove, performerProfile: cycle.performerProfile || 'balanced', timingOffset: Math.max(0, grooveProfile.delayMs + player.timingBiasMs + jitter + note.stackIndex * player.stackMs) / 1000, detuneCents: detune + note.stackIndex * .7 });
      }
    });
    return events.sort((a, b) => a.beat - b.beat || a.stackIndex - b.stackIndex);
  }
  function humanizeArrangement(events, seed, performerProfile = 'balanced') {
    const profiles = { drums: [3, 4, 0], bass: [6, 4, 1.1], keys: [11, 6, 1.8], rhythm: [8, 5, 1.6], percussion: [5, 5, 0], strings: [13, 7, 2.5] }, player = performerProfiles[performerProfile] || performerProfiles.balanced;
    for (const [track, [delay, jitter, detune]] of Object.entries(profiles)) {
      const random = H.rng((seed >>> 0) ^ Math.imul(Object.keys(profiles).indexOf(track) + 11, 0x45d9f3b));
      for (const event of events.filter(item => item.track === track)) {
        const behind = track === 'drums' && /^snare-/.test(event.sample || '') ? 7 : 0;
        const profileDelay = performerProfile === 'balanced' ? 0 : player.timingBiasMs * (track === 'drums' || track === 'percussion' ? .28 : .48);
        event.timingOffset = Math.max(0, delay + behind + profileDelay + (random() * 2 - 1) * jitter * player.jitterScale + (track === 'strings' ? (event.stackIndex || 0) * player.stackMs : 0)) / 1000;
        event.velocity = Math.max(.04, Math.min(.96, event.velocity * (.955 + random() * .09) * (performerProfile === 'balanced' ? 1 : player.velocityScale)));
        if (event.midi !== undefined) event.detuneCents = (random() * 2 - 1) * detune;
        if (performerProfile !== 'balanced' && event.midi !== undefined && track !== 'bass') event.duration = Math.max(.02, event.duration * Math.max(.58, player.gate));
      }
    }
  }
  function arrangement(parsed, feel = 'shuffle', seed = 1, choruses = 4, options = {}) {
    if (parsed.error || !parsed.chords?.length || !parsed.bars?.length) throw Error(parsed.error || '先写一组和声');
    choruses = Math.max(1, Math.min(32, Math.floor(Number(choruses) || 1)));
    if (!feels[feel]) feel = 'shuffle';
    const { swing } = feels[feel], chartBeats = parsed.bars.length * 4, events = [], chorusStyles = [];
    const randoms = Object.fromEntries(['bass', 'drums', 'keys', 'rhythm', 'percussion', 'strings'].map((track, i) => [track, H.rng((seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b9))]));
    const mellow = feel === 'slow' || feel === 'halftime', syncopated = feel === 'funk' || feel === 'latin';
    const player = performerProfiles[options.performerProfile] || performerProfiles.balanced;
    const preferred = (track, fallback) => player.affinity[track]?.filter(style => Object.hasOwn({ bass: bassStyles, drums: drumStyles, keys: keyStyles, rhythm: rhythmStyles, percussion: percussionStyles, strings: stringsStyles }[track], style)) || fallback;
    const selected = {
      bass: styleSequence(bassStyles, options.bassStyle, preferred('bass', mellow ? ['fifths', 'pedal', 'walking'] : syncopated ? ['octave', 'riff', 'pedal'] : ['walking', 'boogie', 'fifths', 'riff', 'octave']), choruses, seed),
      drums: styleSequence(drumStyles, options.drumStyle, preferred('drums', drumPools[feel]), choruses, seed ^ 0x354a),
      keys: styleSequence(keyStyles, options.keyStyle, preferred('keys', mellow ? ['pad', 'soul', 'arpeggio'] : syncopated ? ['offbeat', 'soul', 'arpeggio'] : ['pad', 'offbeat', 'soul', 'gospel', 'arpeggio']), choruses, seed ^ 0x78b1),
      rhythm: styleSequence(rhythmStyles, options.rhythm === false ? 'none' : options.rhythmStyle, preferred('rhythm', mellow ? ['arpeggio', 'offbeat', 'chop'] : syncopated ? ['clave', 'chop', 'offbeat'] : ['boogie', 'chop', 'offbeat', 'arpeggio']), choruses, seed ^ 0xe09c),
      percussion: styleSequence(percussionStyles, options.percussionStyle ?? 'none', preferred('percussion', mellow ? ['none', 'shaker'] : syncopated ? ['clap', 'tambourine', 'shaker'] : ['shaker', 'tambourine', 'none']), choruses, seed ^ 0x6c8e),
      strings: styleSequence(stringsStyles, options.stringsStyle ?? 'none', preferred('strings', mellow ? ['pad', 'response', 'none'] : syncopated ? ['pulse', 'response', 'none'] : ['response', 'pad', 'none']), choruses, seed ^ 0xb529)
    };
    const add = (track, beat, data) => events.push({ track, beat, ...data });
    const swung = beat => swingBeat(beat, swing);
    let previousVoicing = [60, 64, 67], previousStrings = [55, 60, 64];
    for (let chorus = 0; chorus < choruses; chorus++) {
      const base = chorus * chartBeats, end = base + chartBeats;
      const styles = Object.fromEntries(Object.entries(selected).map(([track, values]) => [track, values[chorus]]));
      chorusStyles.push({ ...styles });
      // A one-bar progression gets a one-beat pickup; longer charts have room for two.
      const fillStart = end - (chartBeats === 4 ? 1 : 2);
      const drumSwing = options.drumStyle && options.drumStyle !== 'auto' && ['shuffle', 'ride', 'boogie'].includes(styles.drums) ? Math.max(swing, 2 / 3) : swing;
      const drumBeat = beat => swingBeat(beat, drumSwing);
      const hit = (sample, beat, velocity, fill = false) => {
        if (beat >= end - 1e-6 || (!fill && beat >= fillStart)) return;
        add('drums', beat, { sample, velocity: Math.min(.9, velocity + randoms.drums() * .045), duration: Math.min(.12, end - beat), drumStyle: styles.drums, ...(fill ? { fill: true } : {}) });
      };
      const snare = (offset, i) => `snare-${1 + (i + chorus) % 2}`;
      parsed.bars.forEach((bar, barIndex) => {
        const b = base + barIndex * 4, d = styles.drums;
        const hatCell = d === 'ride' ? [[0, 'ride', .36], [1, 'ride', .38], [1.5, 'ride', .23], [2, 'ride', .34], [3, 'ride', .39], [3.5, 'ride', .22]]
          : d === 'latin' ? [[0, 'ride', .28], [1, 'hat-1', .2], [1.5, 'ride', .28], [2.5, 'ride', .3], [3, 'hat-2', .18]]
          : Array.from({ length: d === 'funk' ? 16 : 8 }, (_, i) => [i / (d === 'funk' ? 4 : 2), `hat-${1 + (i + chorus) % 2}`, i % (d === 'funk' ? 4 : 2) === 0 ? .35 : .16]);
        hatCell.forEach(([offset, sample, velocity]) => hit(sample, b + drumBeat(offset) + .006, velocity));
        const kicks = { shuffle: [0, 2], backbeat: [0, 2, 2.5], ride: [0, 2], funk: [0, .75, 2, 2.5], halftime: [0, 1.5], latin: [0, 1.5, 2.5], boogie: [0, 1, 2, 3] }[d];
        const snares = { halftime: [2], latin: [1, 2.5], ride: [1, 3] }[d] || [1, 3];
        kicks.forEach((offset, i) => hit(`kick-${1 + (barIndex + i + chorus) % 2}`, b + drumBeat(offset), d === 'ride' ? .34 : offset === 0 ? .67 : .48));
        snares.forEach((offset, i) => hit(snare(offset, i + barIndex), b + drumBeat(offset) + .014, d === 'ride' ? .26 : d === 'latin' ? .34 : .62));
        if (d === 'funk') [.25, 2.75].forEach((offset, i) => hit(snare(offset, i), b + drumBeat(offset), .11));
        if (d === 'ride') [1, 3].forEach(offset => hit('hat-2', b + offset + .006, .17));
      });
      if (styles.percussion !== 'none') parsed.bars.forEach((bar, barIndex) => {
        const b = base + barIndex * 4, cells = styles.percussion === 'shaker'
          ? Array.from({ length: 8 }, (_, i) => [i / 2, `hat-${1 + (i + chorus) % 2}`, i % 2 ? .13 : .2, 1.55 + i % 2 * .12])
          : styles.percussion === 'tambourine' ? [[1, 'open-hat', .28, 1.42], [3, 'open-hat', .31, 1.5], [3.5, 'hat-2', .14, 1.65]]
            : [[1, 'snare-1', .31, 1.08], [3, 'snare-2', .34, 1.12]];
        cells.forEach(([offset, sample, velocity, playbackRate], index) => add('percussion', b + swung(offset), { sample, duration: .075, velocity: Math.min(.55, velocity + randoms.percussion() * .035), playbackRate, percussionStyle: styles.percussion, variant: (barIndex + index + chorus) % 2 }));
      });
      // Style-specific drum pickups replace the ending groove, so backbeats are never doubled.
      const drumFills = {
        shuffle: [[[0, 'snare-1', .3], [.5, 'snare-2', .42], [1, 'kick-1', .51], [1.5, 'open-hat', .31]], [[0, 'kick-2', .48], [.5, 'snare-1', .27], [1, 'snare-2', .5], [1.5, 'snare-1', .35]]],
        backbeat: [[[0, 'snare-1', .4], [.5, 'snare-2', .35], [1, 'snare-1', .56], [1.5, 'open-hat', .37]], [[0, 'kick-1', .55], [.75, 'snare-1', .3], [1, 'snare-2', .56], [1.5, 'snare-1', .4]]],
        ride: [[[0, 'ride', .29], [.5, 'snare-1', .23], [1, 'snare-2', .36], [1.5, 'ride', .31]], [[0, 'snare-2', .21], [.5, 'kick-2', .33], [1, 'ride', .35], [1.5, 'snare-1', .29]]],
        funk: [[[0, 'snare-1', .36], [.25, 'snare-2', .16], [.75, 'kick-1', .53], [1.25, 'snare-1', .47], [1.75, 'open-hat', .31]], [[0, 'kick-2', .51], [.25, 'snare-1', .16], [.5, 'snare-2', .28], [1, 'snare-1', .54], [1.75, 'snare-2', .27]]],
        halftime: [[[0, 'snare-1', .55], [1, 'kick-1', .44], [1.5, 'snare-2', .27]], [[0, 'snare-2', .54], [.5, 'snare-1', .18], [1.5, 'open-hat', .3]]],
        latin: [[[0, 'ride', .3], [.5, 'snare-1', .27], [1.25, 'kick-2', .44], [1.5, 'ride', .31]], [[0, 'kick-1', .48], [.75, 'snare-2', .28], [1.5, 'snare-1', .35]]],
        boogie: [[[0, 'kick-1', .52], [.5, 'snare-1', .34], [1, 'kick-2', .49], [1.5, 'snare-2', .48]], [[0, 'snare-2', .42], [.5, 'snare-1', .29], [1, 'kick-1', .54], [1.5, 'open-hat', .36]]]
      };
      const fillLength = end - fillStart, drumVariation = (chorus + (seed >>> 0)) % 2;
      drumFills[styles.drums][drumVariation].forEach(([offset, sample, velocity]) => hit(sample, fillStart + drumBeat(offset * fillLength / 2), velocity, true));
      parsed.chords.forEach((c, chordIndex) => {
        const next = parsed.chords[(chordIndex + 1) % parsed.chords.length], start = base + c.beat, chordEnd = start + c.beats;
        const root = 28 + H.mod((c.bass ?? c.root) - 4), chordRoot = 28 + H.mod(c.root - 4);
        const path = [0, c.intervals[1], c.intervals[2], ['minor', 'half-dim', 'minor-major'].includes(c.family) ? 10 : 9, 12];
        const cell = bassCells[styles.bass].filter(([beat]) => beat < c.beats);
        cell.forEach(([offset, degree, duration], i) => {
          let midi = i === 0 ? root : chordRoot + path[degree];
          if (styles.bass === 'walking' && i === cell.length - 1 && c.beats >= 2 && next.root !== c.root) midi = Math.max(28, H.nearest(next.bass ?? next.root, midi, 28, 51) - 1);
          const beat = swung(offset), length = Math.min(c.beats - beat, swung(Math.min(c.beats, offset + duration)) - beat);
          add('bass', start + beat, { midi, duration: length, velocity: i === 0 ? .74 : .55 + randoms.bass() * .13, bassStyle: styles.bass, variant: (i + chordIndex + chorus) % 2 });
        });
        const colors = [c.intervals[1], c.intervals[3] ?? c.intervals[2], 12];
        const voicing = [...new Set(colors.map((n, i) => H.nearest(c.root + n, previousVoicing[i], 53, 77)))];
        previousVoicing = voicing;
        const normalEnd = Math.min(chordEnd, fillStart);
        const tone = (track, midi, beat, duration, velocity, extra = {}) => {
          const limit = extra.fill ? chordEnd : normalEnd;
          if (beat < start || beat >= limit - .006) return;
          add(track, beat, { midi, duration: Math.max(.006, Math.min(duration, limit - beat)), velocity, ...(track === 'keys' ? { keyStyle: styles.keys } : { rhythmStyle: styles.rhythm, variant: (chordIndex + chorus) % 2 }), ...extra });
        };
        const keysChord = (offset, duration, velocity, spread = 0) => voicing.forEach((midi, i) => tone('keys', midi, start + swung(offset) + i * spread, duration, velocity));
        if (styles.keys === 'pad') keysChord(0, c.beats * .94, .19);
        else if (styles.keys === 'offbeat') [.5, 1.5, 2.5, 3.5].filter(offset => offset < c.beats).forEach(offset => keysChord(offset, .36, .21));
        else if (styles.keys === 'soul') [0, 1.5, 2.75].filter(offset => offset < c.beats).forEach((offset, i) => keysChord(offset, i ? .48 : .82, i ? .21 : .17, .009));
        else if (styles.keys === 'gospel') [0, .75, 2, 3.25].filter(offset => offset < c.beats).forEach((offset, i) => {
          keysChord(offset, i % 2 ? .32 : .63, i % 2 ? .2 : .25, .012);
          if (offset + .5 < c.beats) tone('keys', voicing[voicing.length - 1] + (i % 2 ? 0 : 12), start + swung(offset + .5), .23, .15);
        });
        else if (styles.keys === 'arpeggio') for (let i = 0; i / 2 < c.beats; i++) tone('keys', voicing[(i + chorus) % voicing.length], start + swung(i / 2), .43, .2 + randoms.keys() * .035);
        const chordBase = 45 + H.mod(c.root - 9);
        const rhythmVoicing = [c.intervals[1], c.intervals[3] ?? c.intervals[2], 12].map(interval => chordBase + interval);
        const strum = (offset, duration, velocity, intervals, stroke = 0) => {
          const pitches = intervals.map(interval => chordBase + interval); if (stroke % 2) pitches.reverse();
          pitches.forEach((midi, i) => tone('rhythm', midi, start + swung(offset) + i * .012, duration, velocity + randoms.rhythm() * .035, { articulation: duration > .5 ? 'picked' : 'muted' }));
        };
        if (styles.rhythm === 'boogie') for (let i = 0; i / 2 < c.beats; i++) strum(i / 2, .27, i % 2 ? .43 : .55, [0, c.intervals[2] + (Math.floor(i / 2) % 2 && c.family === 'dominant' ? 2 : 0)], i);
        else if (styles.rhythm === 'chop') [0, 1, 2, 3].filter(offset => offset < c.beats).forEach((offset, i) => strum(offset, .18, i % 2 ? .53 : .44, c.intervals.slice(0, 3), i));
        else if (styles.rhythm === 'offbeat') [.5, 1.5, 2.5, 3.5].filter(offset => offset < c.beats).forEach((offset, i) => strum(offset, .24, .5, [c.intervals[1], c.intervals[3] ?? c.intervals[2], 12], i));
        else if (styles.rhythm === 'clave') [0, 1.5, 3].filter(offset => offset < c.beats).forEach((offset, i) => strum(offset, .35, .49, c.intervals.slice(0, 3), i));
        else if (styles.rhythm === 'arpeggio') for (let i = 0; i / 2 < c.beats; i++) tone('rhythm', rhythmVoicing[[0, 2, 1, 2][i % 4]], start + swung(i / 2), .56, .45 + randoms.rhythm() * .04, { articulation: 'picked' });
        const stringIntervals = [0, c.intervals[1] ?? 3, c.intervals[2] ?? 7], stringVoicing = [...new Set(stringIntervals.map((interval, i) => H.nearest(c.root + interval, previousStrings[i], 52, 79)))];
        previousStrings = stringVoicing;
        if (styles.strings !== 'none') {
          const offsets = styles.strings === 'pad' ? [0] : styles.strings === 'pulse' ? [0, 2].filter(offset => offset < c.beats) : [Math.min(Math.max(1, c.beats * .55), Math.max(0, c.beats - .55))];
          offsets.forEach((offset, pulse) => stringVoicing.forEach((midi, stackIndex) => {
            const beat = start + swung(offset), available = chordEnd - beat;
            if (available <= .006) return;
            const duration = styles.strings === 'pad' ? available * .92 : styles.strings === 'pulse' ? Math.min(.82, available * .82) : Math.min(.72, available * .84);
            add('strings', beat, { midi, duration: Math.max(.04, duration), velocity: (styles.strings === 'pad' ? .18 : styles.strings === 'pulse' ? .23 : .2) + randoms.strings() * .025, stringsStyle: styles.strings, articulation: styles.strings === 'pulse' ? 'short' : 'sustain', stackIndex, stackSize: stringVoicing.length, variant: (pulse + stackIndex + chordIndex + chorus) % 2 });
          }));
        }
        // Ending responses stay in the current chord and leave air before the next downbeat.
        if (chordEnd <= fillStart) return;
        const responseStart = Math.max(fillStart, start), responseLength = chordEnd - responseStart;
        const answering = (chorus + (seed >>> 0)) % 2;
        const keyCell = (answering
          ? { pad: [.1, .6], offbeat: [.3, .75], soul: [.15, .5, .75], arpeggio: [0, .2, .5, .7], gospel: [0, .375, .7] }
          : { pad: [0, .65], offbeat: [.25, .7], soul: [0, .35, .7], arpeggio: [0, .25, .5, .75], gospel: [0, .25, .625] })[styles.keys];
        if (keyCell) keyCell.forEach((phase, i) => {
          const beat = responseStart + phase * responseLength, length = Math.min(.35, responseLength * .2);
          const pitches = styles.keys === 'arpeggio' ? [voicing[(i + chorus) % voicing.length]] : styles.keys === 'pad' ? [voicing[(i + chorus) % voicing.length]] : voicing;
          pitches.forEach(midi => tone('keys', midi, beat, length, .18 + i * .013, { fill: true }));
        });
        const rhythmCell = (answering
          ? { boogie: [0, .3, .5, .8], chop: [.15, .65], offbeat: [.3, .7], arpeggio: [.1, .4, .7], clave: [0, .45, .8] }
          : { boogie: [0, .25, .5, .75], chop: [0, .6], offbeat: [.25, .625], arpeggio: [0, .3, .6], clave: [0, .375, .75] })[styles.rhythm];
        if (rhythmCell) rhythmCell.forEach((phase, i) => {
          const beat = responseStart + phase * responseLength;
          const pitches = styles.rhythm === 'boogie' ? [chordBase, chordBase + (i % 2 ? c.intervals[1] : c.intervals[2])]
            : styles.rhythm === 'arpeggio' ? [rhythmVoicing[(rhythmVoicing.length - 1 + i + chorus) % rhythmVoicing.length]] : rhythmVoicing;
          pitches.forEach((midi, string) => tone('rhythm', midi, beat + string * .012, Math.min(.24, responseLength * .19), .46 - i * .025, { fill: true, articulation: 'muted' }));
        });
      });
    }
    humanizeArrangement(events, seed, options.performerProfile);
    events.sort((a, b) => a.beat - b.beat);
    // Trim repeated pitches at the next attack; deliberately voiced chords remain polyphonic.
    const latest = new Map();
    for (const event of events) if (event.midi !== undefined) {
      const key = `${event.track}:${event.midi}`, previous = latest.get(key);
      if (previous && previous.beat + previous.duration > event.beat) previous.duration = Math.max(.001, event.beat - previous.beat);
      latest.set(key, event);
    }
    return { events, beats: chartBeats * choruses, chartBeats, bassStyles: selected.bass, drumStyles: selected.drums, keyStyles: selected.keys, rhythmStyles: selected.rhythm, percussionStyles: selected.percussion, stringsStyles: selected.strings, performerProfile: Object.hasOwn(performerProfiles, options.performerProfile) ? options.performerProfile : 'balanced', chorusStyles };
  }
  window.practiceArrangements = { arrangement, swingBeat, feels, bassStyles, drumStyles, keyStyles, rhythmStyles, percussionStyles, stringsStyles, performerProfiles, leadGrooves, leadTextures, phraseCycleModes, densityCycleModes, shapeLeadPhrase, decorateLeadTexture, planLeadCycle, expandLeadNote, warpLeadBeat, leadCycleEvents, humanizeArrangement };
})();
