(function () {
const SOURCE = [
  ["eLDBSVZa", "A Blues", "A7 → D7 → A7", "I7 → IV7 → I7", 3, "blues"],
  ["yKz58nSf", "A Blues", "A7 → D7 → A7", "I7 → IV7 → I7", 3, "blues"],
  ["fzJaVIxn", "A Blues", "A7 → D7 → A7", "I7 → IV7 → I7", 3, "blues"],
  ["QOSPR0a1", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["UfowT5v3", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["t8TkFr4v", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["Szj35Uoa", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["PIgYRhbv", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["vI0IswBl", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["04jp5dZE", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["TYt5eFDM", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["mpaDfNQ2", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["fmixbFZm", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["R7oKcEug", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["ybBt5IbQ", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["f6C7FvbB", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["fkZzs2c5", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["CKE9kGwg", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["zqpkxP6Z", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["Dhxnpii8", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"]
];

const groupNumbers = {};
let LICKS = SOURCE.map(([id, group, chord, degree, bars, kind]) => {
  groupNumbers[group] = (groupNumbers[group] || 0) + 1;
  return {
    id, group, chord, degree, bars, kind,
    name: `${group} Lick ${groupNumbers[group]}`,
    score: `https://bopland.org/data/${id}.png`,
    audio: `https://bopland.org/data/${id}.mp3`
  };
});

const BOPLAND_DATABASE_URL = "assets/licks/guitar-index.js?v=20260908-1";
const BOPLAND_CATEGORIES = [
  "Major 2-5-1", "Minor 2-5-1", "Turnaround", "All The Things You Are", "Autumn Leaves", "Blues",
  "The Days Of Wine And Roses", "How High The Moon / Ornithology", "Invitation", "It Don't Mean A Thing",
  "Lullaby Of Birdland", "My Funny Valentine", "On The Sunny Side Of The Street", "Rhythm Changes",
  "Satin Doll", "Someday My Prince Will Come", "Stella By Starlight", "Take Five", "Take The A Train",
  "Andalusian Cadence", "Major 2-5-1-6", "Major 3-6-2-5-1", "Circle of Dominant 7th Chords",
  "Giant Steps", "Nardis", "Major 5-1", "Minor 5-1"
];
const libraryState = { harmony: "", transpose: false, query: "", category: "all", key: "all", meter: "all", favoritesOnly: false, limit: 6, loaded: false };

const THEORY = {
  blues: {
    tags: ["蓝调音：C / C♯（♭3→3）", "落点：G（A7 的 ♭7）", "律动：弱拍起，八分音符推进"],
    context: "衍生：把结尾移到 D7 · 语境：《Now’s the Time》类 blues（非原句出处）"
  },
  minor: {
    tags: ["骨架音：C（♭3）、G（♭7）", "色彩：留意 F / F♯ 的小调差异", "律动：vamp 上保持连续句型"],
    context: "衍生：结尾落 A / C / E / G · 语境：《So What》类 vamp（非原句出处）"
  },
  major: {
    tags: ["声部：A→G♯（ii7→V7）", "解决：D→C♯（V7→Imaj7）", "律动：换和弦处落三音或七音"],
    context: "衍生：移调练 12 个 ii–V–I · 语境：《Tune Up》类进行（非原句出处）"
  }
};

const THEORY_OVERRIDES = {
  fzJaVIxn: {
    tags: ["特征音：G♮（A7 的 ♭7）", "经过音：G♯→A 半音导向", "换和弦：F♯ 是 D7 的三音", "律动：弱拍起，连续八分音符"],
    context: "衍生：末两拍顺移到 D7 · 语境：《Now’s the Time》类 blues（非原句出处）"
  }
};

const CHORD_GUIDES = {
  A7: { tones: "A（根音）· C♯（3）· E（5）· G（♭7）", scale: "A Mixolydian：A B C♯ D E F♯ G", color: "C 是蓝调 ♭3；E♭ 是 ♭5；B♭/G♯ 多半应按趋向解决理解。" },
  D7: { tones: "D（根音）· F♯（3）· A（5）· C（♭7）", scale: "D Mixolydian：D E F♯ G A B C", color: "F 可作 ♯9/蓝调色彩，E♭ 是 ♭9，通常半音解决到 D。" },
  Am7: { tones: "A（根音）· C（♭3）· E（5）· G（♭7）", scale: "先比较 A Dorian（F♯）与 A Aeolian（F）", color: "F♯ 是明亮的 6；F 是小调 ♭6。不要把两者混成同一种功能。" },
  Bm7: { tones: "B（根音）· D（♭3）· F♯（5）· A（♭7）", scale: "B Dorian：B C♯ D E F♯ G♯ A", color: "D、A 定义 ii7；它们常分别半音解决到 E7 的 C♯/G♯ 或 Amaj 的 C♯/G♯。" },
  E7: { tones: "E（根音）· G♯（3）· B（5）· D（♭7）", scale: "E Mixolydian；出现 F/G/C 时再考虑 altered 或半音趋近", color: "G♯ 与 D 是导向 Amaj 的核心：G♯ 留作大七度，D 下行到 C♯。" },
  Amaj: { tones: "A（根音）· C♯（3）· E（5）· G♯（大7）", scale: "A Ionian：A B C♯ D E F♯ G♯", color: "C♯、G♯ 是落地感最强的音；D（11）通常经过到 C♯。" }
};

const DETAILED_ANALYSIS = {
  yKz58nSf: [
    {
      chord: "第 1 小节 · A7",
      scale: "骨架是 A7；不是一条音阶从头跑到底，而是和弦音加趋近音。",
      why: "G、C♯、E 是 A7 的 ♭7、3、5；G♯ 从下方半音导向根音 A。B♭ 是短暂的 ♭9 张力，不要把它误认成稳定音。",
      notes: [["G","♭7","chord"],["B♭","♭9","color"],["G","♭7","chord"],["G♯","→A","chromatic"],["A","1","chord"],["C♯","3","chord"],["E","5","chord"],["G","♭7","chord"]]
    },
    {
      chord: "第 2 小节 · D7",
      scale: "以 D Mixolydian 为底，但中间故意加入 ♯9/♭9 的属和弦摩擦。",
      why: "F♯、A 是 3、5；F♮ 夹在 F♯ 与 E 之间，既可听成 ♯9，也承担半音经过；结尾 E♭ 是 ♭9，强烈趋向下一小节的 D。",
      notes: [["F♯","3","chord"],["A","5","chord"],["F♯","3","chord"],["F","♯9/经过","chromatic"],["E","9","color"],["G","11","color"],["E","9","color"],["E♭","♭9→D","chromatic"]]
    },
    {
      chord: "第 3 小节 · A7",
      scale: "A blues 与 A Mixolydian 的结合。",
      why: "D 是 11；C→C♯ 是最典型的蓝调 ♭3 推向大三度；随后 E、G、A 用 5、♭7、根音收束。",
      notes: [["D","11","color"],["C","♭3 蓝调","color"],["C♯","3","chord"],["E","5","chord"],["G","♭7","chord"],["A","1","chord"]]
    }
  ]
};

const $ = id => document.getElementById(id);
const audio = document.createElement("audio");
audio.preload = "metadata";
let current = 0;
let looping = true;
let loopA = 0;
let loopB = 1;
let backingEnabled = false;
let backingContext = null;
let backingFrame = null;
let lastBackingBeat = -1;
let scoreZoom = 1;
let waveformDuration = 1;
let waveformLoadToken = 0;
const waveformCache = new Map();
const fallbackWaveform = Array.from({ length: 560 }, (_, index) => {
  const position = index / 559;
  const envelope = .16 + .72 * Math.sin(Math.PI * position) ** .65;
  const texture = .24 + .36 * Math.abs(Math.sin(index * .37)) + .4 * Math.abs(Math.sin(index * .071 + .8));
  const peak = Math.min(1, envelope * texture);
  return [-peak, peak];
});
let waveformPeaks = fallbackWaveform;
let practiceBpm = Math.max(40, Math.min(180, Number(localStorage.getItem("tuner-bpm-v1") || 80)));
const SOURCE_BPM = 120;

function chordProgression(lick = LICKS[current]) {
  if (lick.chord.includes("×")) {
    const [name, count] = lick.chord.split("×").map(item => item.trim());
    return Array.from({ length: Number(count) || lick.bars }, () => name);
  }
  return lick.chord.split("→").map(item => item.trim());
}

function chordShape(name) {
  try { const chord = window.tunerHarmony.chord(name.trim().split(/\s+/)[0]); return { root: 36 + chord.root, intervals: chord.intervals }; }
  catch { return { root: 45, intervals: [0, 4, 7, 10] }; }
}

function midiFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function playBackingTone(frequency, duration, volume, type = "triangle") {
  if (!backingContext) return;
  const now = backingContext.currentTime;
  const oscillator = backingContext.createOscillator();
  const gain = backingContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(backingContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

async function ensureBackingContext() {
  backingContext ??= new AudioContext();
  if (backingContext.state === "suspended") await backingContext.resume();
}

function triggerBackingBeat(beat) {
  const progression = chordProgression();
  const bar = Math.floor(beat / 4) % progression.length;
  const beatInBar = ((beat % 4) + 4) % 4;
  const shape = chordShape(progression[bar]);
  const beatSeconds = 60 / practiceBpm;
  playBackingTone(midiFrequency(shape.root - 12), beatSeconds * 0.72, 0.055, "triangle");
  playBackingTone(beatInBar % 2 ? 1320 : 1760, 0.035, 0.012, "square");
  if (beatInBar === 0 || beatInBar === 2) {
    shape.intervals.forEach(interval => playBackingTone(midiFrequency(shape.root + 12 + interval), beatSeconds * 1.45, 0.012, "sine"));
  }
}

function stopBackingClock() {
  if (backingFrame) cancelAnimationFrame(backingFrame);
  backingFrame = null;
  lastBackingBeat = -1;
}

async function startBackingClock() {
  if (!backingEnabled) return;
  await ensureBackingContext();
  stopBackingClock();
  const tick = () => {
    if (audio.paused || !backingEnabled) return stopBackingClock();
    const beat = Math.floor(audio.currentTime * SOURCE_BPM / 60 + 0.06);
    if (beat !== lastBackingBeat) {
      lastBackingBeat = beat;
      triggerBackingBeat(beat);
    }
    backingFrame = requestAnimationFrame(tick);
  };
  tick();
}

function normalizedProgression(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function progressionKind(category) {
  if (/blues/i.test(category)) return "blues";
  if (/minor|nardis|invitation|funny valentine|andalusian/i.test(category)) return "minor";
  return "major";
}

function buildBoplandLibrary(database) {
  const patterns = [];
  database.index.forEach((category, categoryIndex) => {
    category.keys.forEach(([keyCode, keyName, chords]) => patterns.push({
      category: BOPLAND_CATEGORIES[categoryIndex] || "其他进行",
      keyCode,
      keyName,
      meter: category.time,
      progression: normalizedProgression(chords)
    }));
  });
  const items = new Map();
  const counters = {};
  Object.entries(database.data.chords).forEach(([meter, progressions]) => {
    Object.entries(progressions).forEach(([rawProgression, ids]) => {
      const progression = normalizedProgression(rawProgression);
      const candidates = patterns
        .filter(pattern => (!pattern.meter || pattern.meter === meter) && progression.includes(pattern.progression))
        .sort((left, right) => right.progression.length - left.progression.length);
      const match = candidates[0];
      const category = match?.category || (meter === "3/4" ? "Waltz / 3/4" : meter === "5/4" ? "Take Five / 5/4" : "其他进行");
      const keyName = match?.keyName || "其他调性";
      const bars = rawProgression.split("|").map(item => item.trim()).filter(Boolean);
      ids.forEach(id => {
        if (items.has(id) || !/^[A-Za-z0-9]+$/.test(id)) return;
        counters[category] = (counters[category] || 0) + 1;
        const chord = bars.join(" → ");
        items.set(id, {
          id,
          group: category,
          chord,
          degree: category,
          bars: Math.max(1, bars.length),
          kind: progressionKind(category),
          key: keyName,
          keyCode: match?.keyCode || "other",
          meter,
          name: `${category} · ${keyName} · ${counters[category]}`,
          score: `https://bopland.org/data/${id}.png`,
          audio: `https://bopland.org/data/${id}.mp3`,
          searchText: `${category} ${keyName} ${meter} ${chord} ${id}`.toLowerCase()
        });
      });
    });
  });
  return [...items.values()];
}

function populateLibraryFilters() {
  const categoryOrder = [...BOPLAND_CATEGORIES, "Waltz / 3/4", "Take Five / 5/4", "其他进行"];
  const categories = new Set(LICKS.map(lick => lick.group));
  $("lick-category").innerHTML = '<option value="all">全部分类</option>' + categoryOrder.filter(category => categories.has(category)).map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  const keys = [...new Set(LICKS.map(lick => lick.key).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en"));
  $("lick-key").innerHTML = '<option value="all">全部调性</option>' + keys.map(key => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`).join("");
  const meters = [...new Set(LICKS.map(lick => lick.meter).filter(Boolean))].sort();
  $("lick-meter").innerHTML = '<option value="all">全部拍号</option>' + meters.map(meter => `<option value="${escapeHtml(meter)}">${escapeHtml(meter)}</option>`).join("");
  $("lick-category").value = categories.has(libraryState.category) ? libraryState.category : "all";
  $("lick-key").value = keys.includes(libraryState.key) ? libraryState.key : "all";
  $("lick-meter").value = meters.includes(libraryState.meter) ? libraryState.meter : "all";
}

function ingestBoplandLibrary(database) {
  if (database?.name !== "guitar-licks") return;
  const selectedId = location.hash.match(/^#lick\/([A-Za-z0-9]+)$/)?.[1] || localStorage.getItem("lick-current-id-v1") || LICKS[current]?.id;
  const expanded = buildBoplandLibrary(database);
  if (expanded.length < 2000) return;
  LICKS = expanded;
  current = Math.max(0, LICKS.findIndex(lick => lick.id === selectedId));
  libraryState.loaded = true;
  populateLibraryFilters();
  render();
}

function loadBoplandLibrary() {
  window.bopland = { db: { register: ingestBoplandLibrary } };
  const script = document.createElement("script");
  script.src = BOPLAND_DATABASE_URL;
  script.async = true;
  script.onerror = () => {
    $("library-count").textContent = `${LICKS.length} 条 · BopLand 暂时无法连接`;
  };
  document.head.appendChild(script);
}

function readSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch (_) {
    return new Set();
  }
}

function saveSet(key, items) {
  localStorage.setItem(key, JSON.stringify([...items]));
}

const localCompleted = readSet("lick-done-v2");
const localFavorites = readSet("lick-favorites-v1");
let progressAccountId = "";
let cloudCompleted = new Set();
let cloudFavorites = new Set();
let progressSyncVersion = 0;
let progressWriteChain = Promise.resolve();

function completed() {
  return progressAccountId ? cloudCompleted : localCompleted;
}

function favorites() {
  return progressAccountId ? cloudFavorites : localFavorites;
}

function showProgressSyncError() {
  $("preview-status").textContent = "云端同步失败，请检查网络后重试";
}

async function loadAccountProgress(user) {
  const version = ++progressSyncVersion;
  progressAccountId = user?.id || "";
  cloudCompleted = new Set();
  cloudFavorites = new Set();
  render();
  if (!user) return;
  try {
    const items = await window.accountCloud.getLickProgress();
    if (version !== progressSyncVersion || progressAccountId !== user.id) return;
    cloudCompleted = new Set(items.filter(item => item.mastered).map(item => item.lickId));
    cloudFavorites = new Set(items.filter(item => item.favorite).map(item => item.lickId));
    render();
  } catch (_) {
    if (version === progressSyncVersion) showProgressSyncError();
  }
}

function saveActiveProgress(lickId) {
  if (!progressAccountId) {
    saveSet("lick-done-v2", localCompleted);
    saveSet("lick-favorites-v1", localFavorites);
    return;
  }
  const accountId = progressAccountId;
  const item = { lickId, favorite: cloudFavorites.has(lickId), mastered: cloudCompleted.has(lickId) };
  progressWriteChain = progressWriteChain.then(async () => {
    if (progressAccountId !== accountId) return;
    await window.accountCloud.saveLickProgress(item);
  }).catch(() => {
    if (progressAccountId === accountId) showProgressSyncError();
  });
}

window.addEventListener("tuner:account-change", event => loadAccountProgress(event.detail.user));

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function mediaDuration() {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : waveformDuration || 1;
}

function updateWaveformAria() {
  const duration = mediaDuration();
  const currentTime = Math.max(0, Math.min(duration, Number(audio.currentTime) || 0));
  const waveform = $("lick-waveform");
  waveform.setAttribute("aria-valuemax", duration.toFixed(2));
  waveform.setAttribute("aria-valuenow", currentTime.toFixed(2));
  waveform.setAttribute("aria-valuetext", `${formatTime(currentTime)} / ${formatTime(duration)}`);
  $("waveform-playhead").style.left = `${duration ? currentTime / duration * 100 : 0}%`;
}

function drawWaveform() {
  updateWaveformAria();
  if (/jsdom/i.test(navigator.userAgent)) return;
  const canvas = $("lick-waveform-canvas");
  const waveform = $("lick-waveform");
  const width = Math.max(1, Math.round(waveform.clientWidth));
  const height = Math.max(1, Math.round(waveform.clientHeight));
  if (width <= 1 || height <= 1) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#283026";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, height / 2 + .5);
  context.lineTo(width, height / 2 + .5);
  context.stroke();
  const columns = Math.max(1, Math.min(waveformPeaks.length, Math.floor(width / 2)));
  const duration = mediaDuration();
  const progress = duration ? Math.max(0, Math.min(1, (Number(audio.currentTime) || 0) / duration)) : 0;
  context.lineWidth = Math.max(1, width / columns * .72);
  context.lineCap = "round";
  for (let column = 0; column < columns; column++) {
    const peak = waveformPeaks[Math.floor(column / columns * waveformPeaks.length)] || [-.1, .1];
    const x = (column + .5) / columns * width;
    context.strokeStyle = x / width <= progress ? "#f2ff83" : "#626b5e";
    context.beginPath();
    context.moveTo(x, height / 2 + peak[0] * height * .46);
    context.lineTo(x, height / 2 + peak[1] * height * .46);
    context.stroke();
  }
}

async function decodeWaveform(source) {
  if (waveformCache.has(source)) return waveformCache.get(source);
  if (typeof fetch !== "function" || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) throw new Error("waveform decoding unavailable");
  const response = await fetch(source, { mode: "cors" });
  if (!response.ok) throw new Error(`waveform fetch ${response.status}`);
  const bytes = await response.arrayBuffer();
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const decoder = new OfflineContext(1, 1, 44100);
  const buffer = await decoder.decodeAudioData(bytes.slice(0));
  const bins = 720;
  const peaks = [];
  let absoluteMax = .0001;
  for (let bin = 0; bin < bins; bin++) {
    const start = Math.floor(bin / bins * buffer.length);
    const end = Math.max(start + 1, Math.floor((bin + 1) / bins * buffer.length));
    const stride = Math.max(1, Math.floor((end - start) / 90));
    let minimum = 0;
    let maximum = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let index = start; index < end; index += stride) {
        minimum = Math.min(minimum, samples[index]);
        maximum = Math.max(maximum, samples[index]);
      }
    }
    absoluteMax = Math.max(absoluteMax, -minimum, maximum);
    peaks.push([minimum, maximum]);
  }
  const result = { duration: buffer.duration, peaks: peaks.map(([minimum, maximum]) => [minimum / absoluteMax, maximum / absoluteMax]) };
  waveformCache.set(source, result);
  return result;
}

async function loadWaveform(source) {
  const token = ++waveformLoadToken;
  waveformPeaks = fallbackWaveform;
  $("lick-waveform").dataset.state = "loading";
  drawWaveform();
  try {
    const decoded = await decodeWaveform(source);
    if (token !== waveformLoadToken) return;
    waveformPeaks = decoded.peaks;
    waveformDuration = decoded.duration || waveformDuration;
    $("lick-waveform").dataset.state = "ready";
  } catch (_) {
    if (token !== waveformLoadToken) return;
    $("lick-waveform").dataset.state = "fallback";
  }
  drawWaveform();
  renderLoopPoints();
}

function storedLoopPoints() {
  try {
    return JSON.parse(localStorage.getItem("lick-loops-v1") || "{}");
  } catch (_) {
    return {};
  }
}

function saveLoopPoints() {
  const points = storedLoopPoints();
  points[LICKS[current].id] = [Number(loopA.toFixed(2)), Number(loopB.toFixed(2))];
  localStorage.setItem("lick-loops-v1", JSON.stringify(points));
}

function renderLoopPoints() {
  const duration = mediaDuration();
  const aPercent = Math.max(0, Math.min(100, loopA / duration * 100));
  const bPercent = Math.max(0, Math.min(100, loopB / duration * 100));
  const aMarker = $("loop-a-marker");
  const bMarker = $("loop-b-marker");
  aMarker.style.left = `${aPercent}%`;
  bMarker.style.left = `${bPercent}%`;
  aMarker.classList.toggle("marker-edge-start", aPercent < 2);
  aMarker.classList.toggle("marker-edge-end", aPercent > 98);
  bMarker.classList.toggle("marker-edge-start", bPercent < 2);
  bMarker.classList.toggle("marker-edge-end", bPercent > 98);
  $("loop-region").style.left = `${aPercent}%`;
  $("loop-region").style.width = `${Math.max(0, bPercent - aPercent)}%`;
  $("loop-a-time").max = Math.max(0, loopB - 0.02).toFixed(2);
  $("loop-b-time").max = duration.toFixed(2);
  $("loop-a-time").value = loopA.toFixed(2);
  $("loop-b-time").value = loopB.toFixed(2);
  $("loop-a-marker").setAttribute("aria-valuetext", `A 点 ${loopA.toFixed(2)} 秒`);
  $("loop-b-marker").setAttribute("aria-valuetext", `B 点 ${loopB.toFixed(2)} 秒`);
}

function setLoopPoint(point, next, options = {}) {
  const duration = mediaDuration();
  if (next === "") return;
  const value = Number(next);
  if (!Number.isFinite(value)) return;
  if (point === "a") loopA = Math.max(0, Math.min(value, loopB - 0.02));
  else loopB = Math.max(loopA + 0.02, Math.min(value, duration));
  renderLoopPoints();
  if (options.seek) audio.currentTime = point === "a" ? loopA : loopB;
  if (options.persist !== false) saveLoopPoints();
}

function loadLoopPoints() {
  const duration = mediaDuration();
  const saved = storedLoopPoints()[LICKS[current].id];
  const savedA = Number(saved?.[0]);
  const savedB = Number(saved?.[1]);
  loopA = Number.isFinite(savedA) ? Math.max(0, Math.min(savedA, duration - 0.02)) : 0;
  loopB = Number.isFinite(savedB) ? Math.max(loopA + 0.02, Math.min(savedB, duration)) : duration;
  renderLoopPoints();
}

function lickHref(index) {
  return `#lick/${LICKS[index].id}`;
}

function indexFromHash() {
  const match = location.hash.match(/^#lick\/([A-Za-z0-9]+)$/);
  if (!match) return -1;
  return LICKS.findIndex(lick => lick.id === match[1]);
}

function stopLick(reset = false) {
  audio.pause();
  $("play-lick").textContent = "▶";
  if (reset) {
    audio.currentTime = 0;
    drawWaveform();
  }
}

function bindLickLinks(container) {
  container.querySelectorAll("a[data-lick-index]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      goToLick(Number(link.dataset.lickIndex));
    });
  });
}

function goToLick(index) {
  const next = Math.max(0, Math.min(LICKS.length - 1, Number(index)));
  selectLick(next);
  const hash = lickHref(next);
  if (location.hash !== hash) location.hash = hash;
}

function enableDrag(container, axis = "x") {
  if (container.dataset.dragReady) return;
  container.dataset.dragReady = "true";
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let suppressClick = false;

  container.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = container.scrollLeft;
    startTop = container.scrollTop;
    moved = false;
    suppressClick = false;
  });
  container.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 6) {
      moved = true;
      suppressClick = true;
      container.setPointerCapture(pointerId);
      container.classList.add("dragging");
    }
    if (moved) event.preventDefault();
    if (axis === "x" || axis === "both") container.scrollLeft = startLeft - dx;
    if (axis === "both") container.scrollTop = startTop - dy;
  });
  const end = event => {
    if (event.pointerId !== pointerId) return;
    if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
    pointerId = null;
    container.classList.remove("dragging");
    moved = false;
  };
  container.addEventListener("pointerup", end);
  container.addEventListener("pointercancel", end);
  container.addEventListener("click", event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);
  container.addEventListener("dragstart", event => event.preventDefault());
}

function fitScoreHeight() {
  const stage = $("score-stage");
  const staff = $("lick-staff");
  const image = staff.querySelector("img");
  if (document.fullscreenElement === stage || stage.classList.contains("expanded")) {
    staff.style.removeProperty("height");
    return;
  }
  if (!image?.naturalWidth || !staff.clientWidth) {
    staff.style.height = "140px";
    return;
  }
  const renderedWidth = staff.clientWidth * scoreZoom;
  const renderedHeight = image.naturalHeight * renderedWidth / image.naturalWidth;
  staff.style.height = `${Math.max(110, Math.min(window.innerHeight * 0.55, Math.ceil(renderedHeight)))}px`;
}

function updateScoreZoom() {
  const image = $("lick-staff").querySelector("img");
  if (image) image.style.width = `${scoreZoom * 100}%`;
  $("score-zoom").textContent = `${Math.round(scoreZoom * 100)}%`;
  requestAnimationFrame(fitScoreHeight);
}

function filteredLibrary() {
  const saved = favorites();
  const query = libraryState.query.trim().toLowerCase();
  const harmony = window.tunerHarmony?.parse(libraryState.harmony);
  if (harmony?.error) return [];
  return LICKS.map((lick, index) => ({ lick, index })).filter(({ lick }) => {
    if (libraryState.category !== "all" && lick.group !== libraryState.category) return false;
    if (libraryState.key !== "all" && lick.key !== libraryState.key) return false;
    if (libraryState.meter !== "all" && lick.meter !== libraryState.meter) return false;
    if (libraryState.favoritesOnly && !saved.has(lick.id)) return false;
    if (harmony?.chords.length && !window.tunerHarmony.matches(harmony, lick.chord, lick.key || lick.group.match(/^[A-G][#b]?/)?.[0], libraryState.transpose)) return false;
    const searchable = lick.searchText || `${lick.name} ${lick.group} ${lick.chord} ${lick.id}`.toLowerCase();
    return !query || searchable.includes(query);
  });
}

function renderLibrary() {
  const visible = filteredLibrary();
  const harmony = window.tunerHarmony?.parse(libraryState.harmony);
  if ($("harmony-error")) { $("harmony-error").textContent = harmony?.error || ""; $("harmony-error").hidden = !harmony?.error; $("lick-harmony").setAttribute("aria-invalid", String(Boolean(harmony?.error))); }
  const degreeSearch = harmony?.notation === "degree";
  $("harmony-transpose").disabled = degreeSearch;
  $("harmony-transpose").classList.toggle("on", degreeSearch || libraryState.transpose);
  $("harmony-transpose").setAttribute("aria-pressed", String(degreeSearch || libraryState.transpose));
  $("harmony-transpose").title = degreeSearch ? "级数已匹配所有调；可在更多筛选中选调性" : "按相同和声关系匹配其他调";
  const shown = visible.slice(0, libraryState.limit);
  const finished = completed();
  const saved = favorites();
  const percent = LICKS.length ? Math.round(finished.size / LICKS.length * 100) : 0;
  $("course-progress").style.width = `${percent}%`;
  $("progress-label").textContent = `${finished.size}/${LICKS.length}`;
  $("library-count").textContent = `${visible.length} / ${LICKS.length} 条${libraryState.loaded ? "" : " · 正在载入完整库"}`;
  $("favorites-filter").classList.toggle("on", libraryState.favoritesOnly);
  $("favorites-filter").setAttribute("aria-pressed", String(libraryState.favoritesOnly));
  $("favorites-filter").textContent = `${libraryState.favoritesOnly ? "★" : "☆"} 收藏 ${saved.size}`;
  $("course-map").innerHTML = shown.length ? shown.map(({ lick, index }) => `
    <a class="level ${finished.has(lick.id) ? "done" : ""} ${index === current ? "current" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}" title="${escapeHtml(lick.chord)}">
      <span><small>${escapeHtml(lick.group)} · ${escapeHtml(lick.key || lick.meter || "")}</small><strong>${escapeHtml(lick.chord)}</strong></span><em>${index === current ? "已选" : "▶"}</em>
    </a>`).join("") : '<p class="empty-results">没有符合条件的 Lick</p>';
  bindLickLinks($("course-map"));
  $("load-more").hidden = shown.length >= visible.length;
  $("load-more").textContent = `显示更多（剩余 ${Math.max(0, visible.length - shown.length)}）`;
}

function renderFavoritesDialog() {
  const saved = favorites();
  const entries = LICKS.map((lick, index) => ({ lick, index })).filter(({ lick }) => saved.has(lick.id));
  $("favorites-open-count").textContent = String(saved.size);
  $("favorites-summary").textContent = `${saved.size} 条 Lick`;
  $("favorites-list").innerHTML = entries.length ? entries.map(({ lick, index }) => `
    <div class="favorite-row" data-favorite-id="${escapeHtml(lick.id)}">
      <a href="${lickHref(index)}" data-favorite-open="${index}">
        <strong>${escapeHtml(lick.name || lick.chord)}</strong>
        <small>${escapeHtml(lick.group)} · ${escapeHtml(lick.key || lick.meter || "")} · ${escapeHtml(lick.chord)}</small>
      </a>
      <button type="button" data-favorite-remove="${escapeHtml(lick.id)}" aria-label="取消收藏 ${escapeHtml(lick.name || lick.chord)}">移除</button>
    </div>`).join("") : '<div class="favorite-empty"><strong>还没有收藏</strong>遇到想反复练习的 Lick，就把它留在这里。</div>';
}

function updatePracticeBpm(next, syncMetronome = true) {
  practiceBpm = Math.max(40, Math.min(180, Math.round(Number(next) / 5) * 5));
  localStorage.setItem("tuner-bpm-v1", String(practiceBpm));
  audio.playbackRate = practiceBpm / SOURCE_BPM;
  audio.preservesPitch = true;
  audio.webkitPreservesPitch = true;
  $("lesson-bpm").textContent = `${practiceBpm} BPM`;
  $("lesson-original-speed").classList.toggle("on", practiceBpm === SOURCE_BPM);
  if (syncMetronome) window.metronome?.setBpm(practiceBpm);
}

function updateMetronomeButton(running) {
  $("lesson-metro").classList.toggle("on", Boolean(running));
  $("lesson-metro").textContent = "节拍";
  $("lesson-metro").setAttribute("aria-pressed", String(Boolean(running)));
}

function genericBarAnalysis(lick) {
  return chordProgression(lick).map((chord, index) => {
    const guide = CHORD_GUIDES[chord] || { tones: "先找根音、3、5、7", scale: "先用和弦音判断，再选择音阶", color: "非和弦音要看它如何解决到前后音。" };
    return {
      chord: `第 ${index + 1} 小节 · ${chord}`,
      scale: guide.scale,
      why: `${guide.tones}。${guide.color}`,
      notes: []
    };
  });
}

function renderAnalysis(lick, theory) {
  const bars = DETAILED_ANALYSIS[lick.id] || genericBarAnalysis(lick);
  $("bar-detail").innerHTML = `
    <div class="analysis-title"><strong>为什么这样走</strong><small>${DETAILED_ANALYSIS[lick.id] ? "按谱面逐音分析" : "按当前和弦分析"}</small></div>
    <div class="theory-tags">${theory.tags.map(item => `<span>${item}</span>`).join("")}</div>
    <small class="theory-context">${theory.context}</small>
    <div class="bar-analysis">${bars.map(bar => `
      <article class="analysis-bar">
        <h4>${bar.chord}</h4>
        ${bar.notes.length ? `<div class="note-flow">${bar.notes.map(([note, role, type]) => `<span class="note-chip ${type}">${note}<small>${role}</small></span>`).join("<b>›</b>")}</div>` : ""}
        <p class="scale-choice"><strong>音阶视角：</strong>${bar.scale}</p>
        <p>${bar.why}</p>
      </article>`).join("")}</div>
    <details class="theory-help"><summary>怎么看“半减七音阶”和经过音？</summary>
      <p><strong>先和弦、后音阶：</strong>先圈出每个和弦的 1、3、5、7；稳定停留的非和弦音才当张力。夹在两个目标音之间并立刻解决的音，优先理解为经过音或趋近音，不必硬塞进同一条音阶。</p>
      <p><strong>m7♭5（半减七）：</strong>和弦骨架是 1–♭3–♭5–♭7。大调语境常用 Locrian；小调 ii–V–i 中常用 Locrian ♮2（旋律小调第六模式）。是否真是“半减七音阶”，要由当时的和弦和解决方向决定。</p>
      <div class="legend"><span class="chord-key">和弦音</span><span class="color-key">音阶色彩/张力</span><span class="chromatic-key">半音经过/趋近</span></div>
    </details>`;
}

function render() {
  const finished = completed();
  const saved = favorites();
  const lick = LICKS[current];
  renderLibrary();

  $("lesson-title").textContent = lick.name;
  $("lesson-meta").textContent = `${lick.group} · ${lick.bars} 小节 · ${lick.meter || "4/4"}`;
  $("lesson-track").textContent = lick.key || lick.group;
  $("lesson-harmony").textContent = lick.chord;
  $("lick-staff").innerHTML = `<img src="${lick.score}" alt="${lick.name} 五线谱" draggable="false">`;
  const scoreImage = $("lick-staff").querySelector("img");
  scoreImage.addEventListener("load", fitScoreHeight, { once: true });
  requestAnimationFrame(fitScoreHeight);
  $("preview-status").innerHTML = '2,525 条吉他 Lick 来源：<a href="https://bopland.org/database#guitar-licks" target="_blank" rel="noopener">BopLand.org</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hans" target="_blank" rel="noopener">CC BY-SA 4.0</a>';
  $("master-lick").textContent = "掌握";
  $("master-lick").classList.toggle("on", finished.has(lick.id));
  $("master-lick").setAttribute("aria-pressed", String(finished.has(lick.id)));
  $("favorite-lick").textContent = saved.has(lick.id) ? "★ 收藏" : "☆ 收藏";
  $("favorite-lick").classList.toggle("on", saved.has(lick.id));
  $("favorite-lick").setAttribute("aria-pressed", String(saved.has(lick.id)));
  $("current-lick-label").textContent = `${current + 1}. ${lick.name}`;
  $("previous-lick").disabled = current <= 0;
  $("next-lick").disabled = current >= LICKS.length - 1;
  renderFavoritesDialog();

  const nextSource = new URL(lick.audio, location.href).href;
  if (audio.src !== nextSource) {
    audio.src = lick.audio;
    waveformDuration = 1;
    waveformPeaks = fallbackWaveform;
    $("lick-time").textContent = "0:00";
    $("play-lick").textContent = "▶";
    loopA = 0;
    loopB = 1;
    renderLoopPoints();
    loadWaveform(nextSource);
  }
  audio.loop = false;
  updatePracticeBpm(practiceBpm, false);
  $("toggle-loop").textContent = "A/B";
  $("toggle-loop").classList.toggle("on", looping);
  $("toggle-loop").setAttribute("aria-pressed", String(looping));
  updateMetronomeButton(window.metronome?.isRunning?.() || false);
  updateScoreZoom();
  drawWaveform();
  $("lick-staff").scrollTo({ left: 0, top: 0 });
}

function selectLick(index) {
  const next = Math.max(0, Math.min(LICKS.length - 1, Number(index)));
  if (next === current && audio.src) return;
  stopLick(true);
  current = next;
  scoreZoom = 1;
  localStorage.setItem("lick-current-v2", String(current));
  localStorage.setItem("lick-current-id-v1", LICKS[current].id);
  render();
}

audio.addEventListener("loadedmetadata", () => {
  waveformDuration = audio.duration || waveformDuration;
  $("lick-time").textContent = formatTime(audio.duration);
  loadLoopPoints();
  drawWaveform();
});
audio.addEventListener("timeupdate", () => {
  if (looping && !audio.paused && audio.currentTime >= loopB) audio.currentTime = loopA;
  drawWaveform();
});
audio.addEventListener("play", () => { $("play-lick").textContent = "■"; startBackingClock(); });
audio.addEventListener("pause", () => { $("play-lick").textContent = "▶"; stopBackingClock(); });
audio.addEventListener("ended", async () => {
  if (!looping) {
    $("play-lick").textContent = "▶";
    return;
  }
  audio.currentTime = loopA;
  try {
    await audio.play();
  } catch (_) {
    $("preview-status").textContent = "循环播放被浏览器阻止，请再点一次播放。";
  }
});
audio.addEventListener("error", () => {
  $("preview-status").textContent = "音频加载失败，请检查网络后重试。";
});

async function togglePlayback() {
  window.dispatchEvent(new CustomEvent("tuner:lesson-play"));
  if (!audio.paused) {
    audio.pause();
    return;
  }
  if (looping && audio.currentTime >= loopB) audio.currentTime = loopA;
  try {
    await audio.play();
  } catch (_) {
    $("preview-status").textContent = "浏览器阻止了播放，请再点一次。";
  }
}

$("play-lick").addEventListener("click", togglePlayback);
$("loop-a-time").addEventListener("input", event => setLoopPoint("a", event.target.value, { seek: true }));
$("loop-b-time").addEventListener("input", event => setLoopPoint("b", event.target.value, { seek: true }));
$("set-loop-a").addEventListener("click", () => setLoopPoint("a", audio.currentTime));
$("set-loop-b").addEventListener("click", () => setLoopPoint("b", audio.currentTime));
$("reset-loop-points").addEventListener("click", () => {
  loopA = 0;
  loopB = mediaDuration();
  renderLoopPoints();
  saveLoopPoints();
});
$("lesson-bpm-minus").addEventListener("click", () => updatePracticeBpm(practiceBpm - 5));
$("lesson-bpm-plus").addEventListener("click", () => updatePracticeBpm(practiceBpm + 5));
$("lesson-original-speed").addEventListener("click", () => updatePracticeBpm(SOURCE_BPM));
$("toggle-backing").addEventListener("click", async () => {
  backingEnabled = !backingEnabled;
  $("toggle-backing").classList.toggle("on", backingEnabled);
  $("toggle-backing").setAttribute("aria-pressed", String(backingEnabled));
  $("toggle-backing").textContent = "伴奏";
  if (backingEnabled) {
    await ensureBackingContext();
    if (!audio.paused) startBackingClock();
  } else stopBackingClock();
});
$("toggle-demo").addEventListener("click", () => {
  audio.muted = !audio.muted;
  const enabled = !audio.muted;
  $("toggle-demo").classList.toggle("on", enabled);
  $("toggle-demo").setAttribute("aria-pressed", String(enabled));
  $("toggle-demo").textContent = "示范";
});
$("lesson-metro").addEventListener("click", () => {
  if (!window.metronome) return;
  window.metronome.toggle();
  updateMetronomeButton(window.metronome.isRunning());
});
$("toggle-loop").addEventListener("click", () => {
  looping = !looping;
  $("toggle-loop").classList.toggle("on", looping);
  $("toggle-loop").textContent = "A/B";
  $("toggle-loop").classList.toggle("on", looping);
  $("toggle-loop").setAttribute("aria-pressed", String(looping));
});
$("master-lick").addEventListener("click", () => {
  const items = completed();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveActiveProgress(id);
  render();
});
$("favorite-lick").addEventListener("click", () => {
  const items = favorites();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveActiveProgress(id);
  render();
});
$("favorites-open").addEventListener("click", () => {
  renderFavoritesDialog();
  $("favorites-dialog").showModal();
});
$("favorites-close").addEventListener("click", () => $("favorites-dialog").close());
$("favorites-list").addEventListener("click", event => {
  const open = event.target.closest("[data-favorite-open]");
  const remove = event.target.closest("[data-favorite-remove]");
  if (open) {
    event.preventDefault();
    $("favorites-dialog").close();
    goToLick(Number(open.dataset.favoriteOpen));
    return;
  }
  if (remove) {
    const id = remove.dataset.favoriteRemove;
    const items = favorites();
    items.delete(id);
    saveActiveProgress(id);
    render();
  }
});
$("lick-harmony").addEventListener("input", event => { libraryState.harmony = event.target.value; libraryState.limit = 6; renderLibrary(); });
$("harmony-transpose").addEventListener("click", () => { libraryState.transpose = !libraryState.transpose; $("harmony-transpose").classList.toggle("on", libraryState.transpose); $("harmony-transpose").setAttribute("aria-pressed", String(libraryState.transpose)); renderLibrary(); });
$("lick-search").addEventListener("input", event => {
  libraryState.query = event.target.value;
  libraryState.limit = 6;
  renderLibrary();
});
[["lick-category", "category"], ["lick-key", "key"], ["lick-meter", "meter"]].forEach(([id, field]) => {
  $(id).addEventListener("change", event => {
    libraryState[field] = event.target.value;
    libraryState.limit = 6;
    renderLibrary();
  });
});
$("favorites-filter").addEventListener("click", () => {
  libraryState.favoritesOnly = !libraryState.favoritesOnly;
  libraryState.limit = 6;
  renderLibrary();
});
$("clear-filters").addEventListener("click", () => {
  $("lick-harmony").value = "";
  $("harmony-transpose").classList.remove("on");
  $("harmony-transpose").setAttribute("aria-pressed", "false");
  Object.assign(libraryState, { harmony: "", transpose: false, query: "", category: "all", key: "all", meter: "all", favoritesOnly: false, limit: 6 });
  $("lick-search").value = "";
  $("lick-category").value = "all";
  $("lick-key").value = "all";
  $("lick-meter").value = "all";
  renderLibrary();
});
$("load-more").addEventListener("click", () => {
  libraryState.limit += 12;
  renderLibrary();
});
$("random-lick").addEventListener("click", () => {
  const available = filteredLibrary();
  if (!available.length) return;
  goToLick(available[Math.floor(Math.random() * available.length)].index);
});
$("previous-lick").addEventListener("click", () => goToLick(current - 1));
$("next-lick").addEventListener("click", () => goToLick(current + 1));
$("browse-licks").addEventListener("click", () => {
  $("lick-library").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("lick-search").focus({ preventScroll: true }), 350);
});
$("score-minus").addEventListener("click", () => {
  scoreZoom = Math.max(1, scoreZoom - 0.25);
  updateScoreZoom();
});
$("score-plus").addEventListener("click", () => {
  scoreZoom = Math.min(3, scoreZoom + 0.25);
  updateScoreZoom();
});
$("score-zoom").addEventListener("click", () => {
  scoreZoom = 1;
  updateScoreZoom();
  $("lick-staff").scrollTo({ left: 0, top: 0 });
});
$("score-expand").addEventListener("click", async () => {
  const stage = $("score-stage");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (stage.requestFullscreen) {
    await stage.requestFullscreen();
  } else {
    stage.classList.toggle("expanded");
  }
  requestAnimationFrame(fitScoreHeight);
});
document.addEventListener("fullscreenchange", () => requestAnimationFrame(fitScoreHeight));
window.addEventListener("resize", fitScoreHeight);
window.addEventListener("hashchange", () => {
  const index = indexFromHash();
  if (index >= 0) { window.practiceStudio?.setMode("library"); selectLick(index); }
});
window.addEventListener("tuner:metro-change", event => {
  if (event.detail?.bpm) updatePracticeBpm(event.detail.bpm, false);
  updateMetronomeButton(event.detail?.running);
});

function bindWaveformScrub() {
  const waveform = $("lick-waveform");
  let activePointer = null;
  const seek = event => {
    const bounds = waveform.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
    audio.currentTime = ratio * mediaDuration();
    drawWaveform();
  };
  waveform.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    activePointer = event.pointerId;
    waveform.setPointerCapture(activePointer);
    seek(event);
  });
  waveform.addEventListener("pointermove", event => {
    if (event.pointerId === activePointer) seek(event);
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    seek(event);
    activePointer = null;
  };
  waveform.addEventListener("pointerup", finish);
  waveform.addEventListener("pointercancel", event => {
    if (event.pointerId === activePointer) activePointer = null;
  });
  waveform.addEventListener("keydown", event => {
    const duration = mediaDuration();
    let next = Number(audio.currentTime) || 0;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const amount = event.shiftKey ? .01 : .05;
      next += event.key === "ArrowRight" ? amount : -amount;
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      next += event.key === "PageUp" ? 1 : -1;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    else return;
    event.preventDefault();
    audio.currentTime = Math.max(0, Math.min(duration, next));
    drawWaveform();
  });
  if (window.ResizeObserver) new ResizeObserver(drawWaveform).observe(waveform);
  else window.addEventListener("resize", drawWaveform);
}

function bindLoopMarker(id, point) {
  const marker = $(id);
  let activePointer = null;
  const updateFromPointer = (event, persist) => {
    const bounds = $("lick-timeline").getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setLoopPoint(point, ratio * mediaDuration(), { seek: true, persist });
  };
  marker.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    activePointer = event.pointerId;
    marker.setPointerCapture(activePointer);
    updateFromPointer(event, false);
  });
  marker.addEventListener("pointermove", event => {
    if (event.pointerId === activePointer) updateFromPointer(event, false);
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    updateFromPointer(event, true);
    activePointer = null;
  };
  marker.addEventListener("pointerup", finish);
  marker.addEventListener("pointercancel", finish);
  marker.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const amount = event.shiftKey ? 0.01 : 0.05;
    const currentPoint = point === "a" ? loopA : loopB;
    setLoopPoint(point, currentPoint + (event.key === "ArrowRight" ? amount : -amount), { seek: true });
  });
}

document.addEventListener("keydown", event => {
  if (event.code !== "Space" || event.repeat) return;
  const target = event.target;
  if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName || "")) return;
  if (getComputedStyle($("lesson-page")).display === "none" || $("lesson-page").dataset.lessonMode && $("lesson-page").dataset.lessonMode !== "library") return;
  event.preventDefault();
  togglePlayback();
});

enableDrag($("lick-staff"), "both");
bindWaveformScrub();
bindLoopMarker("loop-a-marker", "a");
bindLoopMarker("loop-b-marker", "b");

populateLibraryFilters();
const initialFromHash = indexFromHash();
const savedIndex = Math.max(0, Math.min(LICKS.length - 1, Number(localStorage.getItem("lick-current-v2") || 0)));
current = initialFromHash >= 0 ? initialFromHash : savedIndex;
window.lessonPlayer = { stop: () => { stopLick(true); }, select: selectLick, setBpm: updatePracticeBpm, setLoopPoint, getLoopPoints: () => [loopA, loopB] };
render();
loadBoplandLibrary();
})();
