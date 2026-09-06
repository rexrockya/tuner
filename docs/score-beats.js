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

  function buildBeats(measures, manifest) {
    const tempos = manifest.tempoMap?.length ? manifest.tempoMap : [{ quarter: 0, bpm: manifest.sourceBpm }];
    const tempoAt = quarter => {
      let bpm = manifest.sourceBpm;
      for (const tempo of tempos) { if (tempo.quarter > quarter + 1e-8) break; bpm = tempo.bpm; }
      return bpm;
    };
    const secondsAt = quarter => {
      let seconds = 0, previous = 0, bpm = manifest.sourceBpm;
      for (const tempo of tempos) {
        if (tempo.quarter > quarter) break;
        seconds += (tempo.quarter - previous) * 60 / bpm;
        previous = tempo.quarter;
        bpm = tempo.bpm;
      }
      return seconds + (quarter - previous) * 60 / bpm;
    };
    let quarter = 0;
    const beats = [], bars = [];
    for (let index = 0; index < manifest.measureStarts.length; index++) {
      const measure = measures[index] || {signature: manifest.timeSignature || [4, 4]};
      const signature = measure.signature;
      const unit = 4 / signature[1], nominal = signature[0] * unit;
      const quarters = measure.quarters || nominal;
      const start = manifest.measureStarts[index], end = manifest.measureStarts[index + 1] ?? manifest.duration;
      const pickup = (index === 0 || measure.implicit) && quarters < nominal - 1e-6;
      const phase = pickup ? nominal - quarters : 0;
      bars.push({time: start, signature, bpm: tempoAt(quarter)});
      for (let offset = 0; offset < quarters - 1e-6; offset += unit) {
        const time = start + secondsAt(quarter + offset) - secondsAt(quarter);
        if (time >= end - 1e-6) break;
        const beat = Math.floor((phase + offset) / unit + 1e-6) % signature[0];
        beats.push({time, measure: index, beat, signature, bpm: tempoAt(quarter + offset),
          accent: offset === 0 && !pickup ? "strong" : (beat === 0 ? "weak" : accent(beat, signature))});
      }
      quarter += quarters;
    }
    return {beats, bars};
  }

  function lowerBound(events, time) {
    let lo = 0, hi = events.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (events[mid].time < time - 1e-6) lo = mid + 1; else hi = mid; }
    return lo;
  }

  window.scoreBeats = { accent, readMeasures, buildBeats, lowerBound,
    fromManifest: manifest => buildBeats(readMeasures(manifest.musicXmlText, manifest.timeSignature), manifest) };
})();
