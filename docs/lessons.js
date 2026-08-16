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

const $ = id => document.getElementById(id);
const audio = document.createElement("audio");
audio.preload = "metadata";
let current = 0;
let slow = false;
let looping = true;
let listFilter = "all";
let scoreZoom = 1;

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

  container.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = container.scrollLeft;
    startTop = container.scrollTop;
    moved = false;
    container.setPointerCapture(pointerId);
    container.classList.add("dragging");
  });
  container.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    if (axis === "x" || axis === "both") container.scrollLeft = startLeft - dx;
    if (axis === "both") container.scrollTop = startTop - dy;
  });
  const end = event => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    container.classList.remove("dragging");
    setTimeout(() => { moved = false; }, 0);
  };
  container.addEventListener("pointerup", end);
  container.addEventListener("pointercancel", end);
  container.addEventListener("click", event => {
    if (!moved) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

function updateScoreZoom() {
  const image = $("lick-staff").querySelector("img");
  if (image) image.style.width = `${scoreZoom * 100}%`;
  $("score-zoom").textContent = `${Math.round(scoreZoom * 100)}%`;
}

function renderList() {
  const saved = favorites();
  const visible = listFilter === "favorites"
    ? LICKS.map((lick, index) => ({ lick, index })).filter(item => saved.has(item.lick.id))
    : LICKS.map((lick, index) => ({ lick, index }));

  $("show-all").classList.toggle("active", listFilter === "all");
  $("show-favorites").classList.toggle("active", listFilter === "favorites");
  $("show-all").textContent = `全部 ${LICKS.length}`;
  $("show-favorites").textContent = `★ ${saved.size}`;
  $("harmony-map").innerHTML = visible.length ? visible.map(({ lick, index }) => `
    <a class="bar ${index === current ? "active" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <span class="num">${saved.has(lick.id) ? "★" : "#"}${index + 1}</span>
      <strong>${lick.chord}</strong><small>${lick.degree}</small>
    </a>`).join("") : '<p class="empty-list">还没有收藏</p>';
  bindLickLinks($("harmony-map"));
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
  $("bar-detail").innerHTML = '<strong>怎么练</strong><span class="scale-line">听一句，模仿一句。</span>';
  if (lick.kind === "blues") {
    $("lesson-analysis").innerHTML = "<li>A Blues。</li><li>I7 / IV7。</li>";
  } else if (lick.kind === "minor") {
    $("lesson-analysis").innerHTML = "<li>Am7 vamp。</li><li>听清落点。</li>";
  } else {
    $("lesson-analysis").innerHTML = "<li>A 大调。</li><li>跟随 ii–V–I。</li>";
  }
  $("lesson-practice").innerHTML = "<li>慢速循环。</li><li>移到其他调。</li>";
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
  }
  audio.loop = false;
  audio.playbackRate = slow ? 0.7 : 1;
  $("toggle-loop").textContent = `循环：${looping ? "开" : "关"}`;
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
});
audio.addEventListener("timeupdate", () => {
  $("lick-progress").value = audio.currentTime;
});
audio.addEventListener("play", () => { $("play-lick").textContent = "■"; });
audio.addEventListener("pause", () => { $("play-lick").textContent = "▶"; });
audio.addEventListener("ended", async () => {
  if (!looping) {
    $("play-lick").textContent = "▶";
    return;
  }
  audio.currentTime = 0;
  try {
    await audio.play();
  } catch (_) {
    $("preview-status").textContent = "循环播放被浏览器阻止，请再点一次播放。";
  }
});
audio.addEventListener("error", () => {
  $("preview-status").textContent = "音频加载失败，请检查网络后重试。";
});

$("play-lick").addEventListener("click", async () => {
  if (!audio.paused) {
    audio.pause();
    return;
  }
  try {
    await audio.play();
  } catch (_) {
    $("preview-status").textContent = "浏览器阻止了播放，请再点一次。";
  }
});
$("lick-progress").addEventListener("input", event => {
  audio.currentTime = Number(event.target.value);
});
$("slow").addEventListener("click", () => {
  slow = !slow;
  audio.playbackRate = slow ? 0.7 : 1;
  $("slow").classList.toggle("on", slow);
  $("slow").textContent = slow ? "原速" : "慢速 70%";
});
$("toggle-loop").addEventListener("click", () => {
  looping = !looping;
  $("toggle-loop").classList.toggle("on", looping);
  $("toggle-loop").textContent = `循环：${looping ? "开" : "关"}`;
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
$("show-all").addEventListener("click", () => {
  listFilter = "all";
  renderList();
});
$("show-favorites").addEventListener("click", () => {
  listFilter = "favorites";
  renderList();
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

enableDrag($("course-map"), "x");
enableDrag($("harmony-map"), "x");
enableDrag($("lick-staff"), "both");
const initialFromHash = indexFromHash();
const savedIndex = Math.max(0, Math.min(LICKS.length - 1, Number(localStorage.getItem("lick-current-v2") || 0)));
current = initialFromHash >= 0 ? initialFromHash : savedIndex;
window.lessonPlayer = { stop: () => stopLick(true), select: selectLick };
render();
})();
