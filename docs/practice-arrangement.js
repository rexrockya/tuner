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
    const random = H.rng(seed), result = [];
    for (let i = 0; i < count; i++) {
      let available = pool.filter(style => style !== result[i - 1] && (i !== count - 1 || count < 3 || style !== result[0]));
      if (!available.length) available = pool.filter(style => style !== result[i - 1]);
      result.push(available[Math.floor(random() * available.length)]);
    }
    return result;
  }
  function arrangement(parsed, feel = 'shuffle', seed = 1, choruses = 4, options = {}) {
    if (parsed.error || !parsed.chords?.length || !parsed.bars?.length) throw Error(parsed.error || '先写一组和声');
    choruses = Math.max(1, Math.min(32, Math.floor(Number(choruses) || 1)));
    if (!feels[feel]) feel = 'shuffle';
    const { swing } = feels[feel], chartBeats = parsed.bars.length * 4, events = [], chorusStyles = [];
    const randoms = Object.fromEntries(['bass', 'drums', 'keys', 'rhythm'].map((track, i) => [track, H.rng((seed >>> 0) ^ Math.imul(i + 1, 0x9e3779b9))]));
    const mellow = feel === 'slow' || feel === 'halftime', syncopated = feel === 'funk' || feel === 'latin';
    const selected = {
      bass: styleSequence(bassStyles, options.bassStyle, mellow ? ['fifths', 'pedal', 'walking'] : syncopated ? ['octave', 'riff', 'pedal'] : ['walking', 'boogie', 'fifths', 'riff', 'octave'], choruses, seed),
      drums: styleSequence(drumStyles, options.drumStyle, drumPools[feel], choruses, seed ^ 0x354a),
      keys: styleSequence(keyStyles, options.keyStyle, mellow ? ['pad', 'soul', 'arpeggio'] : syncopated ? ['offbeat', 'soul', 'arpeggio'] : ['pad', 'offbeat', 'soul', 'gospel', 'arpeggio'], choruses, seed ^ 0x78b1),
      rhythm: styleSequence(rhythmStyles, options.rhythm === false ? 'none' : options.rhythmStyle, mellow ? ['arpeggio', 'offbeat', 'chop'] : syncopated ? ['clave', 'chop', 'offbeat'] : ['boogie', 'chop', 'offbeat', 'arpeggio'], choruses, seed ^ 0xe09c)
    };
    const add = (track, beat, data) => events.push({ track, beat, ...data });
    const swung = beat => swingBeat(beat, swing);
    let previousVoicing = [60, 64, 67];
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
    events.sort((a, b) => a.beat - b.beat);
    // Trim repeated pitches at the next attack; deliberately voiced chords remain polyphonic.
    const latest = new Map();
    for (const event of events) if (event.track !== 'drums') {
      const key = `${event.track}:${event.midi}`, previous = latest.get(key);
      if (previous && previous.beat + previous.duration > event.beat) previous.duration = Math.max(.001, event.beat - previous.beat);
      latest.set(key, event);
    }
    return { events, beats: chartBeats * choruses, chartBeats, bassStyles: selected.bass, drumStyles: selected.drums, keyStyles: selected.keys, rhythmStyles: selected.rhythm, chorusStyles };
  }
  window.practiceArrangements = { arrangement, swingBeat, feels, bassStyles, drumStyles, keyStyles, rhythmStyles };
})();
