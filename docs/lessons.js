(function () {
const LICKS = [
  { id: "eLDBSVZa", bars: 3 },
  { id: "yKz58nSf", bars: 3 },
  { id: "fzJaVIxn", bars: 3 },
  { id: "QOSPR0a1", bars: 4 },
  { id: "UfowT5v3", bars: 4 },
  { id: "t8TkFr4v", bars: 4 }
].map((lick, index) => ({
  ...lick,
  name: `A Blues Lick ${index + 1}`,
  chord: lick.bars === 3 ? "A7 → D7 → A7" : "A7 → D7 → A7 → A7",
  degree: lick.bars === 3 ? "I7 → IV7 → I7" : "I7 → IV7 → I7 → I7",
  score: `https://bopland.org/data/${lick.id}.png`,
  audio: `https://bopland.org/data/${lick.id}.mp3`
}));

const $ = id => document.getElementById(id);
const audio = document.createElement("audio");
audio.preload = "metadata";
let current = 0;
let slow = false;
let looping = true;

function completed() {
  try {
    return new Set(JSON.parse(localStorage.getItem("lick-done-v2") || "[]"));
  } catch (_) {
    return new Set();
  }
}

function saveCompleted(items) {
  localStorage.setItem("lick-done-v2", JSON.stringify([...items]));
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

function render() {
  const finished = completed();
  const lick = LICKS[current];
  const percent = Math.round((finished.size / LICKS.length) * 100);

  $("course-progress").style.width = `${percent}%`;
  $("progress-label").textContent = `${finished.size}/${LICKS.length}`;
  $("course-map").innerHTML = LICKS.map((item, index) => `
    <a class="level ${finished.has(item.id) ? "done" : ""} ${index === current ? "current" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <small>Lick ${index + 1}</small><strong>A Blues</strong>
    </a>`).join("");
  $("harmony-map").innerHTML = LICKS.map((item, index) => `
    <a class="bar ${index === current ? "active" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <span class="num">#${index + 1}</span><strong>${item.chord}</strong><small>${item.degree}</small>
    </a>`).join("");
  bindLickLinks($("course-map"));
  bindLickLinks($("harmony-map"));

  $("lesson-title").textContent = lick.name;
  $("lesson-meta").textContent = `公开授权 · ${lick.bars} 小节`;
  $("lesson-track").textContent = lick.chord;
  $("lesson-harmony").innerHTML = `<strong>${lick.degree}</strong>`;
  $("bar-detail").innerHTML = '<strong>怎么练</strong><span class="scale-line">听一句，模仿一句。</span>';
  $("lesson-analysis").innerHTML = "<li>A Blues。</li><li>跟着和弦换句。</li>";
  $("lesson-practice").innerHTML = "<li>慢速循环。</li><li>移到其他调。</li>";
  $("lick-staff").innerHTML = `<img src="${lick.score}" alt="${lick.name} 五线谱" draggable="false">`;
  $("preview-status").innerHTML = '谱面与音频：<a href="https://bopland.org/database#guitar-licks" target="_blank" rel="noopener">BopLand</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hans" target="_blank" rel="noopener">CC BY-SA 4.0</a>';

  $("master-lick").textContent = finished.has(lick.id) ? "✓ 已掌握" : "标记已掌握";
  $("prev-lesson").href = lickHref(Math.max(0, current - 1));
  $("prev-lesson").classList.toggle("disabled", current === 0);
  $("prev-lesson").setAttribute("aria-disabled", String(current === 0));
  $("complete-lesson").href = lickHref((current + 1) % LICKS.length);
  $("complete-lesson").textContent = current === LICKS.length - 1 ? "回到第一条 ↻" : "下一条 →";

  audio.src = lick.audio;
  audio.loop = looping;
  audio.playbackRate = slow ? 0.7 : 1;
  $("lick-progress").value = 0;
  $("lick-progress").max = 1;
  $("lick-time").textContent = "0:00";
  $("play-lick").textContent = "▶";
}

function selectLick(index) {
  const next = Math.max(0, Math.min(LICKS.length - 1, Number(index)));
  if (next === current && audio.src) return;
  stopLick(true);
  current = next;
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
  audio.loop = looping;
  $("toggle-loop").textContent = `循环：${looping ? "开" : "关"}`;
});
$("master-lick").addEventListener("click", () => {
  const items = completed();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveCompleted(items);
  render();
});
$("prev-lesson").addEventListener("click", event => {
  event.preventDefault();
  if (current > 0) goToLick(current - 1);
});
$("complete-lesson").addEventListener("click", event => {
  event.preventDefault();
  goToLick((current + 1) % LICKS.length);
});
window.addEventListener("hashchange", () => {
  const index = indexFromHash();
  if (index >= 0) selectLick(index);
});

const initialFromHash = indexFromHash();
const savedIndex = Math.max(0, Math.min(LICKS.length - 1, Number(localStorage.getItem("lick-current-v2") || 0)));
current = initialFromHash >= 0 ? initialFromHash : savedIndex;
window.lessonPlayer = { stop: () => stopLick(true), select: selectLick };
render();
})();
