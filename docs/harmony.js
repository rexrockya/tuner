(function () {
  'use strict';
  const mod = n => ((n % 12) + 12) % 12;
  const pitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const major = [0, 2, 4, 5, 7, 9, 11], minor = [0, 2, 3, 5, 7, 8, 10];
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function tonic(value = 'C') {
    const m = String(value).trim().match(/^([A-Ga-g])([#b♯♭]?)(.*)$/);
    if (!m) return { root: 0, minor: false };
    return { root: mod(pitches[m[1].toUpperCase()] + (/[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0)), minor: /^(m(?!aj)|minor|小调)/i.test(m[3].trim()) };
  }
  function quality(raw, implied = 'major') {
    let text = raw.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/Δ/g, 'maj').replace(/−|–/g, '-');
    const minorMajor = /^m(?:\+|[mM]aj|M)7/.test(text);
    text = text.replace(/^m(?:\+|[mM]aj|M)7/, 'm7').replace(/7-5/g, '7b5').replace(/^M(?=\d|$)/, 'maj').replace(/^min/i, 'm').replace(/^maj/i, 'maj').replace(/^-(?=\d|$)/, 'm').replace(/^ø7?/, 'm7b5').replace(/^[o°](?=7|$)/, 'dim');
    if (!/^(?:maj|m|dim|aug|\+|sus[24]?)?(?:6\/9|13|11|9|7|6|5)?(?:sus[24]?)?(?:add(?:2|4|9|11|13))?(?:(?:b|#)(?:5|9|11|13))*$/i.test(text)) throw Error(`暂不支持和弦后缀「${raw}」`);
    let type = /^maj/.test(text) ? 'major' : /^m/.test(text) ? 'minor' : /^dim/i.test(text) ? 'dim' : /^(aug|\+)/i.test(text) ? 'aug' : /sus/i.test(text) ? 'sus' : implied;
    if (/m7b5/.test(text)) type = 'half-dim';
    const extension = text.replace(/^(maj|m|dim|aug|\+|sus[24]?)/i, '').replace(/add\d+/g, '');
    const seventh = /^(7|9|11|13)/.test(extension);
    const family = minorMajor ? 'minor-major' : type === 'major' && seventh && !/^maj/.test(text) ? 'dominant' : type;
    let intervals = type === 'minor' ? [0, 3, 7] : type === 'dim' || type === 'half-dim' ? [0, 3, 6] : type === 'aug' ? [0, 4, 8] : type === 'sus' ? [0, /sus2/.test(text) ? 2 : 5, 7] : [0, 4, 7];
    if (seventh) intervals.push(minorMajor || /^maj/.test(text) ? 11 : type === 'dim' ? 9 : 10);
    else if (/6/.test(text)) intervals.push(9);
    if (/b5/.test(text)) intervals[2] = 6;
    if (/#5/.test(text)) intervals[2] = 8;
    return { suffix: minorMajor ? 'mMaj7' : text, family, intervals, seventh, explicit: Boolean(raw), type };
  }
  function chord(token, key = 'C', forceDegree = false, legacy = false) {
    const original = token;
    token = token.replace(/[()]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#');
    const degreeFirst = forceDegree || /^[♭♯]/.test(original) || /^b[ivIV]/.test(token);
    const note = degreeFirst ? null : token.match(/^([A-Ga-g])([#b]?)(.*)$/);
    const degree = note ? null : token.match(/^([#b]?)(VII|VI|IV|V|III|II|I|[1-7])(.*)$/i);
    if (!note && !degree) throw Error(`无法识别「${original}」`);
    let suffix = note ? note[3] : degree[3], bass = null;
    const slash = suffix.match(/\/([A-Ga-g][#b]?)$/);
    if (slash) { bass = tonic(slash[1]).root; suffix = suffix.slice(0, -slash[0].length); }
    const keyInfo = tonic(key);
    let root, degreeIndex, implied = 'major';
    const numeric = degree && /^[1-7]$/.test(degree[2]);
    if (note) root = tonic(note[1] + note[2]).root;
    else {
      degreeIndex = numeric ? Number(degree[2]) - 1 : romans.indexOf(degree[2].toUpperCase());
      root = mod(keyInfo.root + major[degreeIndex] + (degree[1] === '#' ? 1 : degree[1] === 'b' ? -1 : 0));
      implied = numeric ? (keyInfo.minor ? ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'] : ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'])[degreeIndex] : degree[2] === degree[2].toLowerCase() ? 'minor' : 'major';
      if (numeric && degree[1]) implied = 'major';
      // Bare numbers are diatonic; explicit suffixes name the quality (37 = E7, 3m7 = Em7).
      if (numeric && suffix && !legacy) implied = 'major';
    }
    const q = quality(suffix, implied);
    // Explicit 7 on V is dominant in minor too; a bare number remains diatonic.
    if (numeric && degreeIndex === 4 && suffix === '7') Object.assign(q, quality('7'));
    const displaySuffix = (q.type === 'minor' && !/^m/.test(q.suffix) ? 'm' : q.type === 'dim' && !/^dim/.test(q.suffix) ? 'dim' : '') + q.suffix;
    return { root, bass, ...q, token: original, degree: degreeIndex, numeric: Boolean(numeric), notation: note ? 'chord' : 'degree', name: (note ? note[1].toUpperCase() + note[2] : names[root]) + displaySuffix + (bass === null ? '' : '/' + slash[1][0].toUpperCase() + slash[1].slice(1)) };
  }
  function parse(value, key = 'C', options = {}) {
    if (!String(value || '').trim()) return { chords: [], bars: [], notation: null, error: '' };
    try {
      if (value.length > (options.legacy ? 256 : 512)) throw Error('和声最多 ' + (options.legacy ? 256 : 512) + ' 个字符');
      let clean = value.trim().replace(/♯/g, '#').replace(/♭/g, 'b').replace(/\|\|/g, '|').replace(/[→➜⇒,，;；\n]+/g, '|');
      if (options.legacy ? /^[1-7]{2,8}$/.test(clean) : /^[1-7]{2,}$/.test(clean) && !/^[1-7](?:5|6|7|11|13)$/.test(clean)) clean = clean.split('').join('|');
      clean = clean.replace(/(^|[\s|])([b#]?[1-7](?:\s*[-–—]\s*[b#]?[1-7])+)(?=$|[\s|])/g, (_, lead, run) => lead + run.replace(/\s*[-–—]\s*/g, '|')).replace(/\s+[-–—]\s+/g, '|').replace(/[-–—](?=[#b]?(?:[A-G]|[ivIV]))/g, '|');
      clean = clean.replace(/([A-Ga-g][#b]?(?:m7|maj7|7|m)?)\s*[×x]\s*(\d+)/g, (_, c, n) => {
        if (+n > 32) throw Error('最多 32 个和弦');
        return Array(+n).fill(c).join('|');
      });
      const explicitBars = clean.includes('|');
      const groups = explicitBars ? clean.split('|').map(x => x.trim()).filter(Boolean) : clean.split(/\s+/);
      const numericInput = !options.legacy && (/(^|[\s|])[#]?[1-7]/.test(clean) || /(^|[\s|])b[1-7]/.test(clean) && !/(^|[\s|])[A-Gac-g]/.test(clean));
      const forceDegree = numericInput || /(^|[\s|])(?:[1-7](?=$|[\s|])|[#b]?[ivIV]+(?=\d|maj|m|ø|$|[\s|]))/.test(clean) || /^[♭♯]/.test(value.trim());
      const bars = groups.map((group, index) => {
        const tokens = group.split(/\s+/).filter(Boolean);
        if (![1, 2, 4].includes(tokens.length)) throw Error('每小节请写 1、2 或 4 个和弦，用逗号分小节');
        return tokens.map((token, i) => ({ ...chord(token, key, forceDegree, options.legacy), beat: index * 4 + i * 4 / tokens.length, beats: 4 / tokens.length, bar: index }));
      });
      const chords = bars.flat();
      if (chords.length > 32) throw Error('最多 32 个和弦');
      if (new Set(chords.map(c => c.notation)).size > 1) throw Error('请统一使用和弦名或级数');
      return { chords, bars, tonic: tonic(key).root, notation: chords[0]?.notation, error: '' };
    } catch (error) { return { chords: [], bars: [], notation: null, error: error.message }; }
  }
  // Only migrate inputs whose meaning changed; keep saved music and its reference key.
  function upgradeInput(value, key = 'C') {
    const old = parse(value, key, { legacy: true }), current = parse(value, key);
    const signature = parsed => JSON.stringify(parsed.chords.map(c => [c.root, c.bass, c.intervals, c.family, c.beat, c.beats]));
    if (old.error || signature(old) === signature(current)) return value;
    return old.bars.map(bar => bar.map(c => {
      if (c.notation === 'chord') return c.token.replace(/[()]/g, '').replace(/^[a-g]/, letter => letter.toUpperCase());
      const accidental = c.token.replace(/[()]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#').match(/^[b#]/)?.[0] || '';
      const numeral = c.type === 'minor' ? romans[c.degree].toLowerCase() : romans[c.degree];
      // Retain implied minor qualities; a diminished triad already includes its flat fifth.
      const suffix = c.type === 'dim' && !/^dim/i.test(c.suffix) ? 'dim' + c.suffix.replace(/b5/g, '') : c.suffix;
      const bass = c.name.match(/\/[A-G][#b]?$/)?.[0] || '';
      return accidental + numeral + suffix + bass;
    }).join(' ')).join(', ');
  }
  function collapse(chords) {
    return chords.filter((c, i) => !i || c.root !== chords[i - 1].root || c.family !== chords[i - 1].family || c.seventh !== chords[i - 1].seventh || c.bass !== chords[i - 1].bass);
  }
  const matchCache = new Map();
  function matches(query, progression, key, transpose = false) {
    if (!query.chords.length) return !query.error;
    const cacheKey = progression + ':' + (key || 'C');
    if (!matchCache.has(cacheKey)) { if (matchCache.size > 4096) matchCache.clear(); matchCache.set(cacheKey, parse(progression.replace(/\b([A-Ga-g][#b]?)maj\b/g, '$1maj7'), key || 'C', { legacy: true })); }
    const candidate = matchCache.get(cacheKey);
    if (candidate.error) return false;
    const target = collapse(query.chords), source = collapse(candidate.chords);
    // A progression can occur inside a longer lick; timing/repeated bars do not change the changes.
    for (let start = 0; start <= source.length - target.length; start++) {
      const shift = query.notation === 'degree' ? (key ? mod(tonic(key).root - query.tonic) : mod(source[start].root - target[0].root)) : transpose ? mod(source[start].root - target[0].root) : 0;
      if (target.every((t, i) => {
        const s = source[start + i];
        const qualityFits = t.numeric && !t.explicit || t.family === s.family && (!t.seventh || s.seventh) || t.family === 'major' && !t.seventh && s.family === 'dominant';
        return mod(t.root + shift) === s.root && qualityFits && (t.bass === null || mod(t.bass + shift) === (s.bass ?? s.root));
      })) return true;
    }
    return false;
  }
  function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function nearest(pc, previous, low = 55, high = 79) {
    return Array.from({ length: high - low + 1 }, (_, i) => low + i).filter(n => mod(n) === mod(pc)).sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous))[0];
  }
  function fingering(midi, previous = { fret: 7, string: 2 }) {
    return [64, 59, 55, 50, 45, 40].map((open, string) => ({ string, fret: midi - open })).filter(p => p.fret >= 0 && p.fret <= 17).sort((a, b) => Math.abs(a.fret - previous.fret) + Math.abs(a.string - previous.string) * 1.6 - Math.abs(b.fret - previous.fret) - Math.abs(b.string - previous.string) * 1.6)[0];
  }
  function generateLegacy(parsed, seed, feel = 'blues') {
    if (parsed.error || !parsed.chords.length) throw Error(parsed.error || '先写一组和声');
    const random = rng(seed), notes = [];
    let previous = 64, hand = { fret: 7, string: 2 };
    parsed.chords.forEach((c, index) => {
      const next = parsed.chords[index + 1];
      const last = index === parsed.chords.length - 1;
      const patterns = c.beats >= 4 ? [[0, .5, 1.5, 2, 2.5, 3], [.5, 1, 1.5, 2.5, 3, 3.5], [0, 1, 1.5, 2, 3]] : c.beats >= 2 ? [[0, .5, 1, 1.5], [.5, 1, 1.5]] : [[0, .5]];
      const pattern = patterns[Math.floor(random() * patterns.length)];
      pattern.forEach((offset, n) => {
        let interval = c.intervals[(n + index % 3) % c.intervals.length];
        if (n === 0) interval = c.intervals[1];
        if (feel === 'blues' && c.family === 'dominant' && n === 1) interval = 3;
        if (feel === 'blues' && c.family === 'dominant' && n === 2) interval = 4;
        let midi = nearest(c.root + interval, previous + (n % 3 === 0 ? 2 : -1));
        let role = n === 0 ? '三音落点' : '和弦音';
        if (n === pattern.length - 1 && next && offset >= c.beats - 1) { midi = nearest(next.root + next.intervals[1], previous) - 1; role = '半音趋近下一和弦三音'; }
        if (feel === 'blues' && c.family === 'dominant' && n === 1) role = '蓝调小三度';
        if (last && n === pattern.length - 1) { midi = nearest(c.root, previous); role = '根音收束'; }
        const duration = last && n === pattern.length - 1 ? c.beats - offset : Math.min(.9, (pattern[n + 1] ?? c.beats) - offset) * .87;
        hand = fingering(midi, hand);
        notes.push({ beat: c.beat + offset, duration, midi, velocity: n === 0 ? .78 : .5 + random() * .18, bar: c.bar, ...hand, role });
        previous = midi;
      });
    });
    return { seed, feel, notes, bars: parsed.bars.length, chords: parsed.chords };
  }

  const phraseStyles = { mixed: '多样变化', call: '问答呼应', motif: '动机发展', blues: '蓝调回转', arpeggio: '和弦分解', syncopated: '切分律动', space: '留白慢句' };
  // These short interval/rhythm cells are original compositional rules, not song transcriptions.
  const rhythmCells = {
    call: [[0, .5, 1.5, 2.5], [.5, 1, 2, 3], [0, 1, 1.5, 3]],
    motif: [[.5, 1, 1.5, 2.5, 3], [0, .5, 1.5, 2, 3], [0, 1, 1.5, 2.5]],
    blues: [[0, .5, 1, 2, 2.5, 3.5], [.5, 1, 1.5, 2.5, 3], [0, 1.5, 2, 2.5, 3.5]],
    arpeggio: [[0, .5, 1, 1.5, 2.5, 3.5], [.5, 1, 1.5, 2, 3], [0, 1, 1.5, 2, 2.5, 3]],
    syncopated: [[.5, 1.5, 2.25, 2.75, 3.5], [.75, 1.5, 2.5, 3.25], [0, .75, 1.5, 2.75, 3.5], [.25, 1.5, 2.5, 3.25], [.5, 1.25, 2.75, 3.5]],
    space: [[0, 2.5], [.5, 1.5, 3], [1, 2.5], [0, 1.5]]
  };
  const phraseIntensities = {
    easy: { label: '轻松', description: '少音、整拍、小跨度；固定把位拨弦' },
    standard: { label: '标准', description: '原有音符密度与演奏技法' },
    advanced: { label: '进阶', description: '更多八分与少量十六分；加入滑音、揉弦' },
    challenge: { label: '挑战', description: '更密十六分、切分与跨弦；保留乐句呼吸' }
  };
  function generateIntensity(parsed, seed, feel, options) {
    // Derive from the unchanged composition so intensity retains its style and seed.
    const phrase = generate(parsed, seed, feel, { ...options, intensity: 'standard' });
    const level = options.intensity, easy = level === 'easy', challenge = level === 'challenge';
    const random = rng((seed >>> 0) ^ 0x49ad736b), notes = [];
    const totalBeats = parsed.bars.length * 4, opens = [64, 59, 55, 50, 45, 40];
    let previous = 64, hand = { fret: 5, string: 1 };
    parsed.chords.forEach((c, index) => {
      const source = phrase.notes.filter(note => note.beat >= c.beat && note.beat < c.beat + c.beats);
      const style = phrase.structure[index].style, last = index === parsed.chords.length - 1;
      const budget = Math.max(1, Math.floor(256 * c.beats / totalBeats));
      let pattern;
      if (easy) {
        pattern = c.beats >= 4 ? (style === 'space' ? [0] : random() < .5 ? [0, 2] : [0, 3]) : [0];
      } else {
        pattern = [...new Set(source.map(note => Math.round((note.beat - c.beat) * 4) / 4))].filter(offset => offset < c.beats);
        const target = Math.min(budget, c.beats * 4, style === 'space' ? Math.ceil(c.beats * (challenge ? 1.5 : 1)) : pattern.length + Math.ceil(c.beats * (challenge ? 1.25 : .5)));
        // Keep the largest original gap as a breathing point, even in dense phrases.
        const gaps = pattern.slice(1).map((end, i) => ({ start: pattern[i], end })).sort((a, b) => (b.end - b.start) - (a.end - a.start));
        const gap = c.beats >= 2 && gaps.find(item => item.end - item.start >= .75);
        const candidates = Array.from({ length: c.beats * 4 }, (_, i) => i / 4).filter(offset => !pattern.includes(offset) && (!gap || offset <= gap.start || offset >= gap.start + .5));
        const ranked = candidates.map(offset => ({ offset, rank: random() + (!challenge && offset % .5 === 0 ? 2 : 0) + (style === 'syncopated' && offset % 1 !== 0 ? .6 : 0) }));
        ranked.sort((a, b) => b.rank - a.rank);
        pattern.push(...ranked.slice(0, Math.max(0, target - pattern.length)).map(item => item.offset));
        pattern.sort((a, b) => a - b);
        if (pattern.length > budget) pattern = pattern.filter((_, i) => Math.floor(i * budget / pattern.length) !== Math.floor((i - 1) * budget / pattern.length));
      }
      pattern.forEach((offset, n) => {
        const original = source.reduce((best, note) => Math.abs(note.beat - c.beat - offset) < Math.abs(best.beat - c.beat - offset) ? note : best, source[0]);
        const added = !source.some(note => Math.abs(note.beat - c.beat - offset) < .02);
        let pc = mod(original.midi), role = original.role;
        if (added && !easy) {
          const colors = style === 'blues' && ['dominant', 'minor'].includes(c.family) ? [0, 3, 5, 6, 7, 10] : style === 'arpeggio' ? c.intervals : [...c.intervals, 2, 5, 9];
          const candidates = colors.map(interval => nearest(c.root + interval, previous + (n % 3 === 0 && challenge ? 5 : n % 2 ? 2 : -2), 55, challenge ? 81 : 79));
          const ordered = candidates.sort((a, b) => Math.abs(a - previous) - Math.abs(b - previous));
          pc = mod(ordered[Math.min(ordered.length - 1, Math.floor(random() * (challenge ? 3 : 2)))]);
          role = style === 'arpeggio' ? '和弦分解' : style === 'blues' ? '蓝调经过音' : '动机连接';
        }
        if (last && n === pattern.length - 1) { pc = c.root; role = '根音收束'; }
        let midi;
        if (easy) {
          // Every pitch class is available in this box; choose a close chord tone when a leap would be awkward.
          let positions = opens.flatMap((open, string) => [4, 5, 6, 7, 8].map(fret => ({ midi: open + fret, string, fret }))).filter(pos => pos.midi >= (last && n === pattern.length - 1 ? 54 : 58) && pos.midi <= (last && n === pattern.length - 1 ? 72 : 69));
          const desired = positions.filter(pos => mod(pos.midi) === pc && Math.abs(pos.midi - previous) <= 7);
          const alternatives = positions.filter(pos => c.intervals.some(interval => mod(c.root + interval) === mod(pos.midi)) && Math.abs(pos.midi - previous) <= 7);
          positions = desired.length ? desired : alternatives.length ? alternatives : positions.filter(pos => mod(pos.midi) === pc);
          positions.sort((a, b) => Math.abs(a.midi - previous) * 2 + Math.abs(a.string - hand.string) + Math.abs(a.fret - hand.fret) * .4 - (Math.abs(b.midi - previous) * 2 + Math.abs(b.string - hand.string) + Math.abs(b.fret - hand.fret) * .4));
          const chosen = positions[0]; midi = chosen.midi; hand = { string: chosen.string, fret: chosen.fret };
          if (mod(midi) !== pc) role = '就近和弦音';
        } else {
          midi = nearest(pc, added ? previous + (challenge && n % 5 === 0 ? 5 : 0) : original.midi, 55, challenge ? 81 : 79);
          // Avoid a large jump on a sixteenth note; complexity comes from phrasing, not arbitrary octave flips.
          if (Math.abs(midi - previous) > (challenge ? 12 : 9) || n && offset - pattern[n - 1] <= .25 && Math.abs(midi - previous) > (challenge ? 9 : 7)) midi = nearest(pc, previous, 55, challenge ? 81 : 79);
          const oldHand = hand; hand = fingering(midi, hand);
          if (challenge && n % 5 === 0) {
            const alternate = opens.map((open, string) => ({ string, fret: midi - open })).filter(pos => pos.fret >= 3 && pos.fret <= 14 && Math.abs(pos.string - oldHand.string) <= 2).sort((a, b) => Math.abs(a.fret - oldHand.fret) - Math.abs(b.fret - oldHand.fret))[0];
            if (alternate) hand = alternate;
          }
        }
        const available = (pattern[n + 1] ?? c.beats) - offset;
        const breath = n === pattern.length - 1 && !last && available >= 1 ? (style === 'space' || easy ? .5 : .25) : 0;
        const notationDuration = available - breath;
        const duration = notationDuration * (easy || style === 'space' || last && n === pattern.length - 1 ? .92 : style === 'syncopated' ? .7 : .84);
        const previousNote = notes[notes.length - 1], closeSlide = previousNote && previousNote.string === hand.string && Math.abs(midi - previous) > 0 && Math.abs(midi - previous) <= 2;
        const articulation = easy ? 'picked' : duration > .9 ? 'vibrato' : closeSlide && duration >= .18 && random() < (challenge ? .72 : .45) ? 'slide' : 'picked';
        notes.push({ beat: c.beat + offset, duration, notationDuration, midi, velocity: Math.min(.88, (offset % 1 === 0 ? .68 : .49) + random() * .16), bar: c.bar, ...hand, role, articulation, variant: Math.floor(random() * 2) });
        previous = midi;
      });
    });
    return { ...phrase, intensity: level, notes };
  }
  function generate(parsed, seed, feel = 'blues', options = {}) {
    if (options.legacy) return generateLegacy(parsed, seed, feel);
    if (phraseIntensities[options.intensity] && options.intensity !== 'standard') return generateIntensity(parsed, seed, feel, options);
    if (parsed.error || !parsed.chords.length) throw Error(parsed.error || '先写一组和声');
    const random = rng(seed), pick = items => items[Math.floor(random() * items.length)];
    const requested = phraseStyles[options.style] ? options.style : 'mixed';
    const vocabulary = Object.keys(rhythmCells), notes = [], structure = [];
    const home = pick([60, 64, 67]), direction = pick([-1, 1]);
    let previous = home, hand = { fret: 7, string: 2 }, cell, activeStyle, motif;
    parsed.chords.forEach((c, index) => {
      const pairStart = index === 0 || c.bar % 2 === 0 && parsed.chords[index - 1].bar !== c.bar;
      if (pairStart || !cell) {
        activeStyle = requested === 'mixed' ? pick(vocabulary.filter(style => style !== activeStyle)) : requested;
        cell = pick(rhythmCells[activeStyle]);
        motif = pick([[0, 2, 1, 3, 2, 0], [2, 1, 0, 2, 3, 1], [0, 0, 2, 1, 3, 2], [3, 1, 2, 0, 1, 0]]);
      }
      const answer = c.bar % 2 === 1, next = parsed.chords[index + 1], last = index === parsed.chords.length - 1;
      // Compress a cell for quick harmonic rhythm; never add notes across the next chord boundary.
      let pattern = cell.map(offset => offset * c.beats / 4).filter((offset, i, all) => !i || offset - all[i - 1] >= .24);
      if (answer && activeStyle === 'call') pattern = pattern.slice(0, Math.max(2, pattern.length - 1));
      if (last && pattern.length > 1) pattern = pattern.filter(offset => offset <= c.beats - .5);
      const bluesChord = c.family === 'dominant' || c.family === 'minor';
      const pool = activeStyle === 'blues' && bluesChord ? [0, 3, 5, 6, 7, 10] : [...c.intervals, 2, c.family === 'minor' ? 5 : 9];
      structure.push({ bar: c.bar, style: activeStyle, response: answer });
      pattern.forEach((offset, n) => {
        let interval, role;
        if (activeStyle === 'arpeggio') { interval = c.intervals[(motif[n % motif.length] + index) % c.intervals.length]; role = '和弦分解'; }
        else if (activeStyle === 'blues' && bluesChord) { interval = pool[(motif[n % motif.length] + (answer ? 1 : 0)) % pool.length]; role = interval === 6 ? '蓝调经过音' : '蓝调回转'; }
        else { interval = pool[motif[(n + (answer ? 1 : 0)) % motif.length] % pool.length]; role = phraseStyles[activeStyle]; }
        const target = activeStyle === 'arpeggio' ? home + direction * n * 2 : previous + direction * (answer ? -1 : 1) * (n % 3 === 0 ? 3 : -1);
        let midi = nearest(c.root + interval, target, 55, 79);
        if (n === 0 && offset < .6 && activeStyle !== 'blues') { midi = nearest(c.root + c.intervals[1], previous, 55, 79); role = '三音落点'; }
        if (next && n === pattern.length - 1 && offset >= c.beats - 1 && ['arpeggio', 'syncopated'].includes(activeStyle)) {
          midi = Math.max(55, nearest(next.root + next.intervals[1], previous, 55, 79) - 1); role = '半音趋近下一和弦三音';
        }
        if (last && n === pattern.length - 1) { midi = nearest(c.root, previous, 55, 79); role = '根音收束'; }
        const available = (pattern[n + 1] ?? c.beats) - offset;
        const duration = Math.min(c.beats - offset, available * (activeStyle === 'space' || last && n === pattern.length - 1 ? .94 : activeStyle === 'syncopated' ? .66 : .84));
        const articulation = duration > .9 ? 'vibrato' : n && Math.abs(midi - previous) <= 2 && random() > .58 ? 'slide' : 'picked';
        hand = fingering(midi, hand);
        notes.push({ beat: c.beat + offset, duration, notationDuration: available, midi, velocity: Math.min(.86, (n === 0 ? .7 : .48) + random() * .16), bar: c.bar, ...hand, role, articulation, variant: Math.floor(random() * 2) });
        previous = midi;
      });
    });
    return { version: 2, seed, feel, style: requested, notes, structure, bars: parsed.bars.length, chords: parsed.chords };
  }
  window.tunerHarmony = { parse, chord, upgradeInput, tonic, matches, collapse, generate, generateLegacy, phraseStyles, phraseIntensities, rng, nearest, names, mod };
})();
