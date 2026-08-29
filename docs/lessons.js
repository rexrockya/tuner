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
const LICKS = SOURCE.map(([id, group, chord, degree, bars, kind]) => {
  groupNumbers[group] = (groupNumbers[group] || 0) + 1;
  return {
    id, group, chord, degree, bars, kind,
    name: `${group} Lick ${groupNumbers[group]}`,
    score: `https://bopland.org/data/${id}.png`,
    audio: `https://bopland.org/data/${id}.mp3`
  };
});

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

const $ = id => document.getElementById(id);
const audio = document.createElement("audio");
audio.preload = "metadata";
let current = 0;
let looping = true;
let loopA = 0;
let loopB = 1;
let scoreZoom = 1;
let practiceBpm = Math.max(40, Math.min(180, Number(localStorage.getItem("tuner-bpm-v1") || 80)));
const SOURCE_BPM = 120;

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

function completed() {
  return readSet("lick-done-v2");
}

function favorites() {
  return readSet("lick-favorites-v1");
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function mediaDuration() {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number($("lick-progress").max) || 1;
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
    $("lick-progress").value = 0;
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

function updateScoreZoom() {
  const image = $("lick-staff").querySelector("img");
  if (image) image.style.width = `${scoreZoom * 100}%`;
  $("score-zoom").textContent = `${Math.round(scoreZoom * 100)}%`;
}

function renderList() {
  const saved = favorites();
  const visible = LICKS.map((lick, index) => ({ lick, index })).filter(item => saved.has(item.lick.id));
  $("favorite-count").textContent = `★ ${saved.size}`;
  $("harmony-map").innerHTML = visible.length ? visible.map(({ lick, index }) => `
    <a class="bar ${index === current ? "active" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <span class="num">★${index + 1}</span>
      <strong>${lick.chord}</strong><small>${lick.degree}</small>
    </a>`).join("") : '<p class="empty-list">还没有收藏</p>';
  bindLickLinks($("harmony-map"));
}

function updatePracticeBpm(next, syncMetronome = true) {
  practiceBpm = Math.max(40, Math.min(180, Math.round(Number(next) / 5) * 5));
  localStorage.setItem("tuner-bpm-v1", String(practiceBpm));
  audio.playbackRate = practiceBpm / SOURCE_BPM;
  audio.preservesPitch = true;
  audio.webkitPreservesPitch = true;
  $("lesson-bpm").textContent = `${practiceBpm} BPM`;
  if (syncMetronome) window.metronome?.setBpm(practiceBpm);
}

function updateMetronomeButton(running) {
  $("lesson-metro").classList.toggle("on", Boolean(running));
  $("lesson-metro").textContent = `节拍：${running ? "开" : "关"}`;
}

function render() {
  const finished = completed();
  const saved = favorites();
  const lick = LICKS[current];
  const percent = Math.round((finished.size / LICKS.length) * 100);

  $("course-progress").style.width = `${percent}%`;
  $("progress-label").textContent = `${finished.size}/${LICKS.length}`;
  $("course-map").innerHTML = LICKS.map((item, index) => `
    <a class="level ${finished.has(item.id) ? "done" : ""} ${index === current ? "current" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <small>Lick ${index + 1}</small><strong>${item.group}</strong>
    </a>`).join("");
  bindLickLinks($("course-map"));
  renderList();

  $("lesson-title").textContent = lick.name;
  $("lesson-meta").textContent = `公开授权 · ${lick.bars} 小节`;
  $("lesson-track").textContent = lick.chord;
  $("lesson-harmony").innerHTML = `<strong>${lick.degree}</strong>`;
  const theory = THEORY_OVERRIDES[lick.id] || THEORY[lick.kind];
  $("bar-detail").innerHTML = `<strong>这条 Lick</strong><div class="theory-tags">${theory.tags.map(item => `<span>${item}</span>`).join("")}</div><small class="theory-context">${theory.context}</small>`;
  $("lick-staff").innerHTML = `<img src="${lick.score}" alt="${lick.name} 五线谱" draggable="false">`;
  $("preview-status").innerHTML = '谱面与音频：<a href="https://bopland.org/database#guitar-licks" target="_blank" rel="noopener">BopLand</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hans" target="_blank" rel="noopener">CC BY-SA 4.0</a>';
  $("master-lick").textContent = finished.has(lick.id) ? "✓ 已掌握" : "标记已掌握";
  $("favorite-lick").textContent = saved.has(lick.id) ? "★ 已收藏" : "☆ 收藏这条 Lick";

  const nextSource = new URL(lick.audio, location.href).href;
  if (audio.src !== nextSource) {
    audio.src = lick.audio;
    $("lick-progress").value = 0;
    $("lick-progress").max = 1;
    $("lick-time").textContent = "0:00";
    $("play-lick").textContent = "▶";
    loopA = 0;
    loopB = 1;
    renderLoopPoints();
  }
  audio.loop = false;
  updatePracticeBpm(practiceBpm, false);
  $("toggle-loop").textContent = `A/B 循环：${looping ? "开" : "关"}`;
  updateMetronomeButton(window.metronome?.isRunning?.() || false);
  updateScoreZoom();
  $("lick-staff").scrollTo({ left: 0, top: 0 });
}

function selectLick(index) {
  const next = Math.max(0, Math.min(LICKS.length - 1, Number(index)));
  if (next === current && audio.src) return;
  stopLick(true);
  current = next;
  scoreZoom = 1;
  localStorage.setItem("lick-current-v2", String(current));
  render();
}

audio.addEventListener("loadedmetadata", () => {
  $("lick-progress").max = audio.duration || 1;
  $("lick-time").textContent = formatTime(audio.duration);
  loadLoopPoints();
});
audio.addEventListener("timeupdate", () => {
  if (looping && !audio.paused && audio.currentTime >= loopB) audio.currentTime = loopA;
  $("lick-progress").value = audio.currentTime;
});
audio.addEventListener("play", () => { $("play-lick").textContent = "■"; });
audio.addEventListener("pause", () => { $("play-lick").textContent = "▶"; });
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
$("lick-progress").addEventListener("input", event => {
  audio.currentTime = Number(event.target.value);
});
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
$("lesson-metro").addEventListener("click", () => {
  if (!window.metronome) return;
  window.metronome.toggle();
  updateMetronomeButton(window.metronome.isRunning());
});
$("toggle-loop").addEventListener("click", () => {
  looping = !looping;
  $("toggle-loop").classList.toggle("on", looping);
  $("toggle-loop").textContent = `A/B 循环：${looping ? "开" : "关"}`;
});
$("master-lick").addEventListener("click", () => {
  const items = completed();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveSet("lick-done-v2", items);
  render();
});
$("favorite-lick").addEventListener("click", () => {
  const items = favorites();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveSet("lick-favorites-v1", items);
  render();
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
});
window.addEventListener("hashchange", () => {
  const index = indexFromHash();
  if (index >= 0) selectLick(index);
});
window.addEventListener("tuner:metro-change", event => {
  if (event.detail?.bpm) updatePracticeBpm(event.detail.bpm, false);
  updateMetronomeButton(event.detail?.running);
});

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
  if (getComputedStyle($("lesson-page")).display === "none") return;
  event.preventDefault();
  togglePlayback();
});

enableDrag($("course-map"), "x");
enableDrag($("harmony-map"), "x");
enableDrag($("lick-staff"), "both");
bindLoopMarker("loop-a-marker", "a");
bindLoopMarker("loop-b-marker", "b");
const initialFromHash = indexFromHash();
const savedIndex = Math.max(0, Math.min(LICKS.length - 1, Number(localStorage.getItem("lick-current-v2") || 0)));
current = initialFromHash >= 0 ? initialFromHash : savedIndex;
window.lessonPlayer = { stop: () => stopLick(true), select: selectLick, setBpm: updatePracticeBpm, setLoopPoint, getLoopPoints: () => [loopA, loopB] };
render();
})();
