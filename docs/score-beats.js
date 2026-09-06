(function () {
  "use strict";
  const children = (node, name) => Array.from(node.children || []).filter(item => item.localName === name);
  const text = (node, name) => node.getElementsByTagName(name)[0]?.textContent || "";
  const number = (node, name, fallback = 0) => Number(text(node, name)) || fallback;

  function accent(beat, signature) {
    if (beat === 0) return "strong";
    const [count, unit] = signature;
    if ((unit === 8 && count >= 6 && count % 3 === 0 && beat % 3 === 0)
      || (count === 4 && beat === 2)) return "secondary";
    return "weak";
  }

  function readMeasures(xml, initialSignature) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("无法读取乐谱拍号");
    const part = doc.getElementsByTagName("part")[0];
    if (!part) throw new Error("乐谱没有声部");
    let divisions = 1, signature = initialSignature || [4, 4];
    return children(part, "measure").map(measure => {
      let cursor = 0, length = 0;
      for (const node of Array.from(measure.children)) {
        if (node.localName === "attributes") {
          divisions = number(node, "divisions", divisions);
          const time = node.getElementsByTagName("time")[0];
          if (time) {
            const count = text(time, "beats").split("+").reduce((sum, value) => sum + Number(value), 0);
            if (count > 0) signature = [count, number(time, "beat-type", signature[1])];
          }
        } else if (node.localName === "backup") {
          cursor -= number(node, "duration") / divisions;
        } else if (node.localName === "forward") {
          cursor += number(node, "duration") / divisions;
          length = Math.max(length, cursor);
        } else if (node.localName === "note" && !children(node, "chord").length) {
          cursor += number(node, "duration") / divisions;
          length = Math.max(length, cursor);
        }
      }
      return { signature: [...signature], quarters: length || signature[0] * 4 / signature[1],
        implicit: measure.getAttribute("implicit") === "yes" };
    });
  }

  // Imported playback seconds can contain tempo changes. Convert BOTH notes and
  // bar positions back to musical time before applying the user's fixed BPM.
  // Never squeeze a malformed measure into its nominal length: that would alter
  // the written note values and conceal a transcription error.
  function fixedTempoManifest(manifest) {
    if (!manifest.tempoMap?.length) return manifest;
    const tempos = [...manifest.tempoMap].sort((a, b) => a.quarter - b.quarter);
    const fixedTime = time => {
      let seconds = 0, quarter = 0, bpm = manifest.sourceBpm;
      for (const tempo of tempos) {
        const end = seconds + (tempo.quarter - quarter) * 60 / bpm;
        if (time < end) break;
        seconds = end; quarter = tempo.quarter; bpm = tempo.bpm;
      }
      return (quarter + (time - seconds) * bpm / 60) * 60 / manifest.sourceBpm;
    };
    return {...manifest, tempoMap: undefined,
      duration: fixedTime(manifest.duration),
      measureStarts: manifest.measureStarts.map(fixedTime),
      notes: manifest.notes?.map(note => ({...note, time: fixedTime(note.time),
        duration: fixedTime(note.time + note.duration) - fixedTime(note.time)}))};
  }

  function buildBeats(measures, source) {
    const manifest = fixedTempoManifest(source);
    const bpm = manifest.sourceBpm, secondsPerQuarter = 60 / bpm;
    const bars = manifest.measureStarts.map((time, index) => ({time, bpm,
      signature: measures[index]?.signature || manifest.timeSignature || [4, 4]}));
    const issues = [], beats = [];
    if (!bars.length) return {beats, bars, issues};
    const lengthAt = index => ((bars[index + 1]?.time ?? manifest.duration) - bars[index].time) / secondsPerQuarter;
    // Only an explicitly marked first pickup may shift the initial phase.
    const first = bars[0].signature, firstNominal = first[0] * 4 / first[1];
    const pickup = measures[0]?.implicit && lengthAt(0) < firstNominal - .002;
    let signature = first, unit = 4 / first[1], origin = bars[0].time;
    let phase = pickup ? firstNominal - lengthAt(0) : 0;
    let tick = Math.ceil(phase / unit - .0001) - phase / unit, barIndex = 0;
    for (let index = 0; index < bars.length; index++) {
      const nominal = bars[index].signature[0] * 4 / bars[index].signature[1];
      const length = lengthAt(index);
      if (Math.abs(length - nominal) > .002 && !(index === 0 && pickup)
        && !(index === bars.length - 1 && length < nominal) && !measures[index]?.implicit) {
        issues.push({measure: index, quarters: length, expected: nominal});
      }
    }
    // Continuous integer-indexed grid. Bar lines annotate it; they NEVER restart
    // its clock or accents. Only an actual time-signature change starts a segment.
    while (true) {
      const time = origin + tick * unit * secondsPerQuarter;
      if (time >= manifest.duration - .0001) break;
      while (barIndex + 1 < bars.length && bars[barIndex + 1].time <= time + .0001) {
        barIndex++;
        const next = bars[barIndex].signature;
        if (next.join('/') !== signature.join('/')) {
          signature = next; unit = 4 / next[1]; origin = time; tick = 0; phase = 0;
        }
      }
      const beat = Math.floor((phase / unit + tick) + .0001) % signature[0];
      beats.push({time, measure: barIndex, beat, signature, bpm, accent: accent(beat, signature)});
      tick++;
    }
    return {beats, bars, issues};
  }

  function lowerBound(events, time) {
    let lo = 0, hi = events.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (events[mid].time < time - 1e-6) lo = mid + 1; else hi = mid; }
    return lo;
  }

  window.scoreBeats = { accent, readMeasures, buildBeats, lowerBound, fixedTempoManifest,
    fromManifest: manifest => buildBeats(readMeasures(manifest.musicXmlText, manifest.timeSignature), manifest) };
})();
