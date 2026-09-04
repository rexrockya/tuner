(function () {
  const $ = id => document.getElementById(id);
  const page = $("sheet-page");
  if (!page) return;

  const FAVORITES_KEY = "tuner-score-favorites-v1";
  const INSTRUMENT_KEY = "tuner-score-instrument-v1";
  const IMPORTED_KEY = "tuner-score-imports-v1";
  const ONLINE_CACHE = "tuner-online-scores-v1";
  const FLAT_TOKEN_KEY = "tuner-flat-token-v1";
  const FLAT_API = "https://api.flat.io/v2";
  const SMPLR_URL = "https://unpkg.com/smplr@1.0.0/dist/index.mjs";
  const ONLINE_SOURCES = [
    {
      id: "openscore-lieder",
      label: "艺术歌曲",
      repository: "OpenScore/Lieder",
      index: "https://raw.githubusercontent.com/OpenScore/Lieder/main/data/scores.tsv",
      prefix: "lc"
    },
    {
      id: "openscore-quartets",
      label: "弦乐四重奏",
      repository: "OpenScore/StringQuartets",
      index: "https://raw.githubusercontent.com/OpenScore/StringQuartets/main/data/scores.tsv",
      prefix: "sq"
    }
  ];
  const INSTRUMENTS = {
    "splendid-grand": { label: "Steinway 大钢琴", kind: "grand", volume: 104 },
    "nylon-guitar": { label: "尼龙弦吉他", kind: "soundfont", instrument: "acoustic_guitar_nylon", volume: 112 },
    "steel-guitar": { label: "钢弦原声吉他", kind: "soundfont", instrument: "acoustic_guitar_steel", volume: 108 },
    "wurlitzer": { label: "Wurlitzer 电钢", kind: "electric", instrument: "WurlitzerEP200", volume: 102 },
    "cello": { label: "大提琴", kind: "soundfont", instrument: "cello", volume: 108 },
    "string-ensemble": { label: "弦乐合奏", kind: "soundfont", instrument: "string_ensemble_1", volume: 102 }
  };
  const ui = {
    library: $("score-library"),
    libraryIdentity: $("sheet-library-identity"),
    playerIdentity: $("sheet-player-identity"),
    player: $("sheet-player"),
    searchWrap: $("score-search-wrap"),
    search: $("score-search"),
    flatOpen: $("score-flat-open"),
    flatDialog: $("score-flat-dialog"),
    flatForm: $("score-flat-form"),
    flatToken: $("score-flat-token"),
    flatStatus: $("score-flat-status"),
    flatDisconnect: $("score-flat-disconnect"),
    favoriteSection: $("score-favorites"),
    favoriteGrid: $("score-favorite-grid"),
    favoriteCount: $("score-favorite-count"),
    allGrid: $("score-all-grid"),
    allTitle: $("score-all-title"),
    onlineSection: $("score-online"),
    onlineGrid: $("score-online-grid"),
    onlineStatus: $("score-online-status"),
    empty: $("score-empty"),
    title: $("sheet-title"),
    composer: $("sheet-composer"),
    canvas: $("sheet-canvas"),
    scroll: $("sheet-score-scroll"),
    status: $("sheet-status"),
    play: $("sheet-play"),
    rewind: $("sheet-rewind"),
    progress: $("sheet-progress"),
    time: $("sheet-time"),
    bpm: $("sheet-bpm"),
    loop: $("sheet-loop"),
    instrument: $("sheet-instrument"),
    transpose: $("sheet-transpose"),
    zoom: $("sheet-zoom")
  };

  let catalog = [];
  let onlineIndexPromise = null;
  let flatScoresPromise = null;
  let flatProfile = null;
  let onlineSearchTimer = null;
  let onlineSearchToken = 0;
  let favorites = new Set();
  let currentScore = null;
  let manifest = null;
  let osmd = null;
  let loadPromise = null;
  let audioContext = null;
  let sampleLibraryPromise = null;
  let sampleStorage = null;
  let activeInstrument = null;
  let activeInstrumentId = "";
  let instrumentLoadPromise = null;
  let fallbackSynths = null;
  let timer = null;
  let playing = false;
  let startedAt = 0;
  let startedFrom = 0;
  let position = 0;
  let nextNote = 0;
  let bpm = 60;
  let transpose = 0;
  let zoom = .82;
  let loopMeasure = null;
  let activeMeasure = -1;
  let measureRects = [];
  const savedInstrument = localStorage.getItem(INSTRUMENT_KEY);
  if (INSTRUMENTS[savedInstrument]) ui.instrument.value = savedInstrument;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const formatTime = seconds => {
    const value = Math.max(0, Number(seconds) || 0);
    return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  };
  const readFavorites = () => {
    try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); }
    catch (error) { return new Set(); }
  };
  const saveFavorites = () => localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  const readImportedScores = () => {
    try {
      const items = JSON.parse(localStorage.getItem(IMPORTED_KEY) || "[]");
      return Array.isArray(items) ? items.filter(item => item?.id && (item?.musicXmlUrl || item?.flatScoreId)) : [];
    } catch (error) { return []; }
  };
  const saveImportedScores = () => localStorage.setItem(
    IMPORTED_KEY,
    JSON.stringify(catalog.filter(score => score.online))
  );
  const searchable = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const rawGithubUrl = (repository, path) => `https://raw.githubusercontent.com/${repository}/main/${path.split("/").map(encodeURIComponent).join("/")}`;
  const composerFromPath = path => {
    const value = String(path || "").split("/")[0].replaceAll("_", " ");
    const [family, ...given] = value.split(",");
    return given.length ? `${given.join(",").trim()} ${family.trim()}` : value;
  };
  const parseTsv = text => {
    const [head, ...rows] = text.trim().split(/\r?\n/);
    const keys = head.split("\t");
    return rows.map(row => Object.fromEntries(row.split("\t").map((value, index) => [keys[index], value])));
  };

  async function flatRequest(path, options = {}) {
    const { token: explicitToken, ...requestOptions } = options;
    const token = explicitToken || localStorage.getItem(FLAT_TOKEN_KEY);
    if (!token) throw new Error("请先连接 Flat");
    const url = path.startsWith("https://") ? path : `${FLAT_API}${path}`;
    const response = await fetch(url, {
      ...requestOptions,
      headers: { authorization: `Bearer ${token}`, ...(requestOptions.headers || {}) }
    });
    if (!response.ok) {
      let message = response.status === 401 ? "Flat 授权已失效，请重新连接" : "Flat 暂时无法访问";
      try { message = (await response.json()).message || message; } catch (error) {}
      const failure = new Error(message);
      failure.status = response.status;
      throw failure;
    }
    return response;
  }

  function updateFlatUi() {
    const connected = Boolean(flatProfile);
    ui.flatOpen.classList.toggle("on", connected);
    ui.flatOpen.textContent = connected ? "Flat ✓" : "连接 Flat";
    ui.flatDisconnect.hidden = !connected;
    ui.flatStatus.classList.remove("error");
    ui.flatStatus.textContent = connected
      ? `已连接 ${flatProfile.printableName || flatProfile.username || flatProfile.id}`
      : "连接后，搜索结果会包含你的 Flat 乐谱与收藏。";
  }

  async function connectFlat(token) {
    const value = String(token || "").trim();
    if (!value) throw new Error("请粘贴 Flat Personal Token");
    const response = await flatRequest("/me", { token: value });
    flatProfile = await response.json();
    localStorage.setItem(FLAT_TOKEN_KEY, value);
    flatScoresPromise = null;
    updateFlatUi();
    scheduleSearch();
    return flatProfile;
  }

  function disconnectFlat() {
    localStorage.removeItem(FLAT_TOKEN_KEY);
    flatProfile = null;
    flatScoresPromise = null;
    ui.flatToken.value = "";
    updateFlatUi();
    scheduleSearch();
  }

  async function refreshFlatConnection() {
    if (!localStorage.getItem(FLAT_TOKEN_KEY)) {
      updateFlatUi();
      return null;
    }
    try {
      flatProfile = await (await flatRequest("/me")).json();
    } catch (error) {
      if (error.status === 401) localStorage.removeItem(FLAT_TOKEN_KEY);
      flatProfile = null;
    }
    updateFlatUi();
    return flatProfile;
  }

  function flatScoreFromApi(item) {
    const owner = item.user?.printableName || item.user?.username || "Flat";
    const composer = item.composer || item.subtitle || item.arranger || owner;
    return {
      id: `flat-${item.id}`,
      title: item.title || "Untitled",
      composer,
      genre: "Flat 乐谱",
      level: "已授权",
      duration: 0,
      measures: 0,
      online: true,
      provider: "flat",
      flatScoreId: item.id,
      sourceUrl: item.htmlUrl || `https://flat.io/score/${item.id}`,
      searchText: searchable(`${item.title} ${composer} ${item.subtitle} ${item.arranger} ${owner}`)
    };
  }

  async function readFlatCollection(name) {
    const scores = [];
    let next = `${FLAT_API}/collections/${name}/scores?limit=100&sort=modificationDate&direction=desc`;
    for (let pageIndex = 0; next && pageIndex < 5; pageIndex += 1) {
      const response = await flatRequest(next);
      const data = await response.json();
      const items = Array.isArray(data) ? data : data.data || data.results || [];
      scores.push(...items);
      const match = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/);
      next = match?.[1] || "";
    }
    return scores;
  }

  async function loadFlatScores() {
    if (!flatProfile) return [];
    if (flatScoresPromise) return flatScoresPromise;
    flatScoresPromise = Promise.all([
      readFlatCollection("allScores"),
      readFlatCollection("collaborations"),
      readFlatCollection("likes")
    ]).then(groups => {
      const unique = new Map();
      groups.flat().forEach(item => unique.set(item.id, flatScoreFromApi(item)));
      return [...unique.values()];
    }).catch(error => {
      flatScoresPromise = null;
      throw error;
    });
    return flatScoresPromise;
  }
  const noteIndexAt = seconds => {
    let low = 0, high = manifest?.notes.length || 0;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (manifest.notes[middle].time < seconds) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const measureAt = seconds => {
    const starts = manifest?.measureStarts || [];
    let low = 0, high = starts.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (starts[middle] <= seconds) low = middle + 1;
      else high = middle;
    }
    return clamp(low - 1, 0, Math.max(0, starts.length - 1));
  };
  const rate = () => bpm / (manifest?.sourceBpm || bpm || 60);
  const currentTime = () => playing
    ? clamp(startedFrom + (performance.now() - startedAt) / 1000 * rate(), 0, manifest.duration)
    : position;

  function makeScoreCard(score) {
    const card = document.createElement("article");
    card.className = "score-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `打开 ${score.title}，${score.composer}`);

    const title = document.createElement("h3");
    title.textContent = score.title;
    const composer = document.createElement("p");
    composer.textContent = score.composer;
    const meta = document.createElement("small");
    const details = [score.genre, score.online ? "已加入" : score.level];
    if (score.duration) details.push(formatTime(score.duration));
    if (score.measures) details.push(`${score.measures} 小节`);
    meta.textContent = details.filter(Boolean).join(" · ");
    const favorite = document.createElement("button");
    const selected = favorites.has(score.id);
    favorite.className = `score-favorite${selected ? " on" : ""}`;
    favorite.type = "button";
    favorite.textContent = selected ? "★" : "☆";
    favorite.setAttribute("aria-label", selected ? `取消收藏 ${score.title}` : `收藏 ${score.title}`);
    favorite.setAttribute("aria-pressed", String(selected));
    favorite.addEventListener("click", event => {
      event.stopPropagation();
      if (favorites.has(score.id)) favorites.delete(score.id);
      else favorites.add(score.id);
      saveFavorites();
      renderLibrary();
    });
    const arrow = document.createElement("span");
    arrow.className = "score-card-arrow";
    arrow.textContent = "↗";
    const open = () => void openScore(score.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.target !== card) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    card.append(title, composer, meta, favorite, arrow);
    return card;
  }

  function onlineScoreFromRow(source, row) {
    const scorePath = `scores/${row.path}/${source.prefix}${row.id}.mxl`;
    const composer = composerFromPath(row.path);
    return {
      id: `${source.id}-${row.id}`,
      title: row.name || row.path.split("/").at(-1).replaceAll("_", " "),
      composer,
      genre: source.label,
      level: "在线",
      duration: 0,
      measures: 0,
      online: true,
      musicXmlUrl: rawGithubUrl(source.repository, scorePath),
      sourceUrl: `https://github.com/${source.repository}/tree/main/${scorePath.split("/").slice(0, -1).map(encodeURIComponent).join("/")}`,
      searchText: searchable(`${row.name} ${composer} ${row.path}`)
    };
  }

  async function loadOnlineIndex() {
    if (onlineIndexPromise) return onlineIndexPromise;
    onlineIndexPromise = Promise.all(ONLINE_SOURCES.map(async source => {
      const response = await fetch(source.index);
      if (!response.ok) throw new Error("在线曲库暂时不可用");
      return parseTsv(await response.text()).map(row => onlineScoreFromRow(source, row));
    })).then(groups => groups.flat()).catch(error => {
      onlineIndexPromise = null;
      throw error;
    });
    return onlineIndexPromise;
  }

  function makeOnlineCard(score) {
    const card = document.createElement("article");
    card.className = "score-card";
    const title = document.createElement("h3");
    title.textContent = score.title;
    const composer = document.createElement("p");
    composer.textContent = score.composer;
    const meta = document.createElement("small");
    meta.textContent = score.provider === "flat" ? "Flat · 你的乐谱或收藏" : `${score.genre} · OpenScore · CC0`;
    const button = document.createElement("button");
    const imported = catalog.some(item => item.id === score.id);
    button.type = "button";
    button.className = "score-use";
    button.textContent = imported ? "打开" : "使用";
    button.setAttribute("aria-label", `${imported ? "打开" : "使用"} ${score.title}`);
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "准备中…";
      try {
        let saved = catalog.find(item => item.id === score.id);
        if (!saved) {
          saved = { ...score };
          delete saved.searchText;
          catalog.unshift(saved);
          saveImportedScores();
        }
        ui.search.value = "";
        scheduleSearch();
        await openScore(saved.id);
      } catch (error) {
        button.disabled = false;
        button.textContent = imported ? "重试" : "再试一次";
        ui.onlineStatus.textContent = error.message || "乐谱准备失败";
      }
    });
    card.append(title, composer, meta, button);
    return card;
  }

  async function searchOnline(query) {
    const token = ++onlineSearchToken;
    ui.onlineStatus.textContent = "正在连接 OpenScore…";
    ui.onlineGrid.replaceChildren();
    try {
      let flatError = null;
      const [publicIndex, flatIndex] = await Promise.all([
        loadOnlineIndex(),
        loadFlatScores().catch(error => {
          flatError = error;
          return [];
        })
      ]);
      if (token !== onlineSearchToken || searchable(ui.search.value.trim()) !== query) return;
      const terms = query.split(/\s+/).filter(Boolean);
      const matches = [...flatIndex, ...publicIndex]
        .filter(score => terms.every(term => score.searchText.includes(term)))
        .slice(0, 16);
      ui.onlineGrid.replaceChildren(...matches.map(makeOnlineCard));
      ui.onlineStatus.textContent = flatError
        ? `${matches.length} 个结果 · Flat 读取失败`
        : matches.length ? `${matches.length} 个在线结果${flatProfile ? " · 含 Flat" : ""}` : "在线曲库没有结果";
      const localMatches = ui.favoriteGrid.childElementCount + ui.allGrid.childElementCount;
      ui.empty.hidden = localMatches + matches.length > 0;
      if (!ui.player.hidden) return;
      ui.status.textContent = `${localMatches + matches.length} 个结果`;
    } catch (error) {
      if (token !== onlineSearchToken) return;
      ui.onlineStatus.textContent = "在线搜索失败 · 检查网络后重试";
    }
  }

  function scheduleSearch() {
    renderLibrary();
    window.clearTimeout(onlineSearchTimer);
    const query = searchable(ui.search.value.trim());
    const minimumLength = /[\u3400-\u9fff]/.test(query) ? 1 : 2;
    onlineSearchToken += 1;
    ui.onlineSection.hidden = query.length < minimumLength;
    ui.onlineGrid.replaceChildren();
    if (query.length < minimumLength) return;
    ui.onlineStatus.textContent = "正在搜索…";
    ui.empty.hidden = true;
    onlineSearchTimer = window.setTimeout(() => void searchOnline(query), 260);
  }

  function renderLibrary() {
    const query = searchable(ui.search.value.trim());
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = score => !terms.length || terms.every(term => searchable(`${score.title} ${score.composer} ${score.genre}`).includes(term));
    const favoriteScores = catalog.filter(score => favorites.has(score.id) && matches(score));
    const otherScores = catalog.filter(score => !favorites.has(score.id) && matches(score));
    ui.favoriteGrid.replaceChildren(...favoriteScores.map(makeScoreCard));
    ui.allGrid.replaceChildren(...otherScores.map(makeScoreCard));
    ui.favoriteSection.hidden = favoriteScores.length === 0;
    ui.favoriteCount.textContent = `${favoriteScores.length} 首`;
    ui.allTitle.textContent = favorites.size ? "其他乐谱" : "已加入乐谱";
    ui.empty.hidden = favoriteScores.length + otherScores.length > 0;
    $("sheet-library-count").textContent = `${catalog.length} 首 · 可在线搜索`;
    if (!ui.player.hidden) return;
    ui.status.textContent = query ? `${favoriteScores.length + otherScores.length} 个本机结果` : `${catalog.length} 首已加入 · 可在线搜索`;
  }

  async function ensureCatalog() {
    if (catalog.length) return catalog;
    const response = await fetch("assets/scores/catalog.json");
    if (!response.ok) throw new Error("乐谱目录读取失败");
    const builtIn = await response.json();
    const imported = readImportedScores();
    catalog = [...imported, ...builtIn.filter(score => !imported.some(item => item.id === score.id))];
    favorites = readFavorites();
    renderLibrary();
    return catalog;
  }

  function showLibrary(updateHash = true) {
    pause();
    ui.library.hidden = false;
    ui.libraryIdentity.hidden = false;
    ui.playerIdentity.hidden = true;
    ui.player.hidden = true;
    ui.flatOpen.hidden = false;
    ui.searchWrap.hidden = false;
    ui.status.textContent = `${catalog.length || 10} 首已加入 · 可在线搜索`;
    document.title = "乐谱 Library｜弦音";
    if (updateHash) history.replaceState(null, "", "#scores");
    void ensureCatalog().catch(error => { ui.status.textContent = error.message; });
  }

  function resetPlayer() {
    pause();
    manifest = null;
    osmd = null;
    loadPromise = null;
    currentScore = null;
    position = 0;
    nextNote = 0;
    activeMeasure = -1;
    measureRects = [];
    loopMeasure = null;
    transpose = 0;
    zoom = .82;
    ui.canvas.replaceChildren();
    ui.progress.value = "0";
    ui.progress.max = "1";
    ui.time.textContent = "0:00 / 0:00";
    ui.loop.classList.remove("on");
    ui.loop.textContent = "循环：关";
    ui.loop.setAttribute("aria-pressed", "false");
    ui.transpose.textContent = "0";
    ui.zoom.textContent = "82%";
    ui.play.textContent = "▶";
  }

  async function openScore(id, updateHash = true) {
    await ensureCatalog();
    const score = catalog.find(item => item.id === id) || catalog[0];
    if (!score) return;
    if (currentScore?.id !== score.id) resetPlayer();
    currentScore = score;
    ui.library.hidden = true;
    ui.libraryIdentity.hidden = true;
    ui.playerIdentity.hidden = false;
    ui.player.hidden = false;
    ui.flatOpen.hidden = true;
    ui.searchWrap.hidden = true;
    ui.title.textContent = score.title;
    ui.composer.textContent = score.composer;
    ui.canvas.setAttribute("aria-label", `${score.title} 可交互乐谱`);
    document.title = `${score.title}｜弦音乐谱`;
    if (updateHash) history.replaceState(null, "", `#score/${score.id}`);
    await ensureLoaded();
  }

  function updateClock(seconds = currentTime()) {
    if (!manifest) return;
    position = seconds;
    ui.progress.value = String(seconds);
    ui.time.textContent = `${formatTime(seconds)} / ${formatTime(manifest.duration)}`;
    const measure = measureAt(seconds);
    if (measure !== activeMeasure) setActiveMeasure(measure, playing);
  }

  function setActiveMeasure(index, follow) {
    activeMeasure = index;
    measureRects.forEach((rect, rectIndex) => rect.classList.toggle("is-active", rectIndex === index));
    if (follow && measureRects[index]) {
      const scrollBox = ui.scroll.getBoundingClientRect();
      const measureBox = measureRects[index].getBoundingClientRect();
      const targetTop = ui.scroll.scrollTop + measureBox.top - scrollBox.top - ui.scroll.clientHeight * .42;
      ui.scroll.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
    ui.status.textContent = `第 ${index + 1} 小节`;
  }

  function releaseVoices() {
    try { activeInstrument?.stop(); } catch (error) {}
    fallbackSynths?.forEach(synth => {
      try { synth.releaseAll(); } catch (error) {}
    });
  }

  function setPosition(seconds) {
    if (!manifest) return;
    position = clamp(seconds, 0, manifest.duration);
    startedFrom = position;
    startedAt = performance.now();
    nextNote = noteIndexAt(position - .02);
    releaseVoices();
    updateClock(position);
  }

  function ensureFallbackSynths() {
    if (fallbackSynths || !window.Tone) return;
    const settings = {
      oscillator: { type: "triangle8" },
      envelope: { attack: .004, decay: .22, sustain: .18, release: .65 }
    };
    fallbackSynths = [0, 1].map((_, index) => {
      const synth = new Tone.PolySynth(Tone.Synth, settings);
      synth.maxPolyphony = 48;
      synth.volume.value = index ? -13 : -11;
      return synth.toDestination();
    });
  }

  function renderSourceHint() {
    if (!manifest) return;
    const config = INSTRUMENTS[ui.instrument.value] || INSTRUMENTS["splendid-grand"];
    $("sheet-source").innerHTML = `<a href="${manifest.source.url}" target="_blank" rel="noopener">${manifest.source.label}</a> · 音色：<a href="https://github.com/danigb/smplr" target="_blank" rel="noopener">${config.label} / smplr</a>`;
  }

  async function ensureSampleLibrary() {
    if (!sampleLibraryPromise) {
      sampleLibraryPromise = import(SMPLR_URL).catch(error => {
        sampleLibraryPromise = null;
        throw error;
      });
    }
    return sampleLibraryPromise;
  }

  async function ensureInstrument() {
    const requestedId = ui.instrument.value;
    const config = INSTRUMENTS[requestedId] || INSTRUMENTS["splendid-grand"];
    if (activeInstrument && activeInstrumentId === requestedId) return activeInstrument;
    if (instrumentLoadPromise) return instrumentLoadPromise;

    ui.play.disabled = true;
    ui.instrument.disabled = true;
    ui.play.textContent = "…";
    ui.status.textContent = `加载 ${config.label}…`;
    instrumentLoadPromise = (async () => {
      const library = await ensureSampleLibrary();
      const Context = window.AudioContext || window.webkitAudioContext;
      audioContext ||= new Context();
      await audioContext.resume();
      if (!sampleStorage && window.isSecureContext && "caches" in window) {
        try { sampleStorage = library.CacheStorage(); } catch (error) {}
      }
      const common = {
        volume: config.volume,
        ...(sampleStorage ? { storage: sampleStorage } : {}),
        onLoadProgress: ({ loaded, total }) => {
          if (ui.instrument.value === requestedId) ui.status.textContent = `加载 ${config.label} · ${loaded}/${total}`;
        }
      };
      let nextInstrument;
      if (config.kind === "grand") {
        nextInstrument = library.SplendidGrandPiano(audioContext, { ...common, decayTime: 1.25 });
      } else if (config.kind === "electric") {
        nextInstrument = library.ElectricPiano(audioContext, { ...common, instrument: config.instrument });
      } else {
        nextInstrument = library.Soundfont(audioContext, {
          ...common,
          instrument: config.instrument,
          kit: "MusyngKite",
          loadLoopData: config.instrument === "cello" || config.instrument === "string_ensemble_1"
        });
      }
      await nextInstrument.ready;
      activeInstrument = nextInstrument;
      activeInstrumentId = requestedId;
      ui.status.textContent = `点击小节播放 · ${config.label}`;
      renderSourceHint();
      return nextInstrument;
    })().catch(async error => {
      console.warn("Sample instrument unavailable, using synth fallback", error);
      activeInstrument = null;
      activeInstrumentId = "";
      ensureFallbackSynths();
      await window.Tone?.start();
      ui.status.textContent = "采样音色加载失败 · 已切换轻量备用音色";
      return null;
    }).finally(() => {
      instrumentLoadPromise = null;
      ui.play.disabled = false;
      ui.instrument.disabled = false;
      if (!playing) ui.play.textContent = "▶";
    });
    return instrumentLoadPromise;
  }

  function loopBounds() {
    if (loopMeasure === null || !manifest) return null;
    return [manifest.measureStarts[loopMeasure], manifest.measureStarts[loopMeasure + 1] ?? manifest.duration];
  }

  function tick() {
    if (!playing || !manifest) return;
    let now = currentTime();
    const bounds = loopBounds();
    if (bounds && now >= bounds[1]) {
      setPosition(bounds[0]);
      now = bounds[0];
    } else if (now >= manifest.duration) {
      pause();
      setPosition(manifest.duration);
      return;
    }
    const playbackRate = rate();
    const horizon = now + .14 * playbackRate;
    while (nextNote < manifest.notes.length && manifest.notes[nextNote].time <= horizon) {
      const note = manifest.notes[nextNote++];
      if (note.time < now - .03) continue;
      const delay = Math.max(0, (note.time - now) / playbackRate);
      const duration = Math.max(.025, note.duration / playbackRate);
      const pitch = note.pitch + transpose;
      if (activeInstrument && audioContext) {
        activeInstrument.start({
          note: pitch,
          time: audioContext.currentTime + delay,
          duration,
          velocity: clamp(Math.round(note.velocity * .92), 12, 127)
        });
      } else if (fallbackSynths?.length) {
        const velocity = clamp(note.velocity / 127 * .72, .08, .72);
        fallbackSynths[note.track % fallbackSynths.length].triggerAttackRelease(
          Tone.Frequency(pitch, "midi"), duration, Tone.now() + delay, velocity
        );
      }
    }
    updateClock(now);
  }

  async function play() {
    await ensureLoaded();
    if (playing || !manifest) return;
    await ensureInstrument();
    if (audioContext?.state === "suspended") await audioContext.resume();
    if (position >= manifest.duration) setPosition(0);
    playing = true;
    startedFrom = position;
    startedAt = performance.now();
    nextNote = noteIndexAt(position - .02);
    ui.play.textContent = "Ⅱ";
    ui.play.setAttribute("aria-label", "暂停乐谱");
    timer = window.setInterval(tick, 25);
    tick();
  }

  function pause() {
    if (!playing) return;
    position = currentTime();
    playing = false;
    window.clearInterval(timer);
    timer = null;
    releaseVoices();
    ui.play.textContent = "▶";
    ui.play.setAttribute("aria-label", "播放乐谱");
    updateClock(position);
  }

  function createMeasureTargets() {
    const svg = ui.canvas.querySelector("svg");
    const list = osmd?.GraphicSheet?.MeasureList || osmd?.graphic?.MeasureList;
    if (!svg || !list?.length) return;
    svg.querySelector("#sheet-measure-targets")?.remove();
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.id = "sheet-measure-targets";
    // OSMD layout units map to 10 SVG viewBox units. Zoom is already applied
    // by the SVG viewBox, so multiplying by osmd.Zoom here would scale twice.
    const osmdUnitToSvg = 10;
    measureRects = list.map((staffMeasures, index) => {
      const measures = staffMeasures.filter(Boolean);
      const left = Math.min(...measures.map(item => item.PositionAndShape.AbsolutePosition.x + item.PositionAndShape.BorderLeft)) * osmdUnitToSvg;
      const right = Math.max(...measures.map(item => item.PositionAndShape.AbsolutePosition.x + item.PositionAndShape.BorderRight)) * osmdUnitToSvg;
      const top = Math.min(...measures.map(item => item.PositionAndShape.AbsolutePosition.y + item.PositionAndShape.BorderTop)) * osmdUnitToSvg;
      const bottom = Math.max(...measures.map(item => item.PositionAndShape.AbsolutePosition.y + item.PositionAndShape.BorderBottom)) * osmdUnitToSvg;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(left));
      rect.setAttribute("y", String(top));
      rect.setAttribute("width", String(Math.max(8, right - left)));
      rect.setAttribute("height", String(Math.max(36, bottom - top)));
      rect.setAttribute("class", "sheet-measure-target");
      rect.setAttribute("tabindex", "0");
      rect.setAttribute("role", "button");
      rect.setAttribute("aria-label", `从第 ${index + 1} 小节播放`);
      const activate = event => {
        event.preventDefault();
        loopMeasure = ui.loop.classList.contains("on") ? index : null;
        ui.loop.textContent = loopMeasure === null ? "循环：关" : `循环：${index + 1}`;
        setPosition(manifest.measureStarts[index]);
        void play();
        if (event.type === "click") rect.blur?.();
      };
      rect.addEventListener("click", activate);
      rect.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") activate(event);
      });
      group.appendChild(rect);
      return rect;
    });
    svg.appendChild(group);
    setActiveMeasure(measureAt(position), false);
  }

  const xmlChildren = node => Array.from(node?.children || []);
  const xmlChild = (node, name) => xmlChildren(node).find(child => child.localName === name);
  const xmlNodes = (node, name) => Array.from(node?.getElementsByTagNameNS?.("*", name) || []);
  const xmlText = (node, name) => xmlNodes(node, name)[0]?.textContent?.trim() || "";
  const xmlNumber = (node, name, fallback = 0) => Number(xmlText(node, name)) || fallback;
  const PITCH_STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function unpackMxl(buffer) {
    if (!window.fflate?.unzipSync) throw new Error("在线乐谱解压器加载失败");
    if (buffer.byteLength > 12 * 1024 * 1024) throw new Error("这份在线乐谱过大");
    const files = window.fflate.unzipSync(new Uint8Array(buffer));
    const decoder = new TextDecoder();
    let rootPath = "";
    const containerKey = Object.keys(files).find(name => name.toLocaleLowerCase() === "meta-inf/container.xml");
    if (containerKey) {
      const container = new DOMParser().parseFromString(decoder.decode(files[containerKey]), "application/xml");
      rootPath = xmlNodes(container, "rootfile")[0]?.getAttribute("full-path") || "";
    }
    const scoreKey = Object.keys(files).find(name => name === rootPath)
      || Object.keys(files).find(name => /\.(musicxml|xml)$/i.test(name) && !/^meta-inf\//i.test(name));
    if (!scoreKey || files[scoreKey].byteLength > 30 * 1024 * 1024) throw new Error("没有找到可读取的 MusicXML");
    return decoder.decode(files[scoreKey]);
  }

  async function fetchOnlineMusicXml(score) {
    if (score.provider === "flat") {
      const response = await flatRequest(`/scores/${encodeURIComponent(score.flatScoreId)}/revisions/last/xml`);
      return response.text();
    }
    let response;
    if ("caches" in window) {
      try {
        const storage = await caches.open(ONLINE_CACHE);
        response = await storage.match(score.musicXmlUrl);
        if (!response) {
          response = await fetch(score.musicXmlUrl);
          if (response.ok) await storage.put(score.musicXmlUrl, response.clone());
        }
      } catch (error) {}
    }
    response ||= await fetch(score.musicXmlUrl);
    if (!response.ok) throw new Error("在线乐谱下载失败");
    return unpackMxl(await response.arrayBuffer());
  }

  function parseOnlineManifest(sourceXml, score) {
    const documentXml = new DOMParser().parseFromString(sourceXml, "application/xml");
    if (xmlNodes(documentXml, "parsererror").length) throw new Error("这份 MusicXML 无法解析");
    const parts = xmlNodes(documentXml, "part");
    if (!parts.length) throw new Error("这份乐谱没有可播放的声部");

    const quarterNotes = [];
    const measureStarts = [];
    const tempoEvents = [{ quarter: 0, bpm: 80 }];
    let timeSignature = [4, 4];
    let finalQuarter = 0;

    parts.forEach((part, partIndex) => {
      let divisions = 1;
      let partTime = 0;
      const ties = new Map();
      const measures = xmlChildren(part).filter(child => child.localName === "measure");
      measures.forEach((measure, measureIndex) => {
        const measureStart = partTime;
        if (partIndex === 0) measureStarts.push(measureStart);
        let cursor = measureStart;
        let farthest = measureStart;
        let previousNoteStart = cursor;

        xmlChildren(measure).forEach(node => {
          if (node.localName === "attributes") {
            divisions = xmlNumber(node, "divisions", divisions);
            if (partIndex === 0 && measureIndex === 0) {
              const time = xmlNodes(node, "time")[0];
              if (time) timeSignature = [xmlNumber(time, "beats", 4), xmlNumber(time, "beat-type", 4)];
            }
            return;
          }
          if (node.localName === "backup" || node.localName === "forward") {
            const amount = xmlNumber(node, "duration") / divisions;
            cursor += node.localName === "backup" ? -amount : amount;
            return;
          }
          if (node.localName === "direction" && partIndex === 0) {
            const soundTempo = Number(xmlNodes(node, "sound")[0]?.getAttribute("tempo"));
            const markedTempo = xmlNumber(node, "per-minute");
            const tempo = soundTempo || markedTempo;
            if (tempo > 10 && tempo < 500) tempoEvents.push({ quarter: Math.max(0, cursor), bpm: tempo });
            return;
          }
          if (node.localName !== "note") return;
          const durationQuarter = xmlNumber(node, "duration") / divisions;
          const isChord = Boolean(xmlChild(node, "chord"));
          const noteStart = isChord ? previousNoteStart : cursor;
          if (!isChord) previousNoteStart = noteStart;
          if (!isChord) cursor += durationQuarter;
          farthest = Math.max(farthest, noteStart + durationQuarter, cursor);
          if (xmlChild(node, "rest") || durationQuarter <= 0) return;

          const pitchNode = xmlChild(node, "pitch");
          if (!pitchNode) return;
          const step = xmlText(pitchNode, "step");
          const octave = xmlNumber(pitchNode, "octave", 4);
          const alter = xmlNumber(pitchNode, "alter", 0);
          const pitch = (octave + 1) * 12 + (PITCH_STEPS[step] ?? 0) + alter;
          const voice = xmlText(node, "voice") || "1";
          const staff = xmlNumber(node, "staff", 1);
          const tieTypes = xmlNodes(node, "tie").map(tie => tie.getAttribute("type"));
          const tieKey = `${partIndex}:${staff}:${voice}:${pitch}`;
          const continuing = tieTypes.includes("stop") ? ties.get(tieKey) : null;
          if (continuing) {
            continuing.endQuarter = Math.max(continuing.endQuarter, noteStart + durationQuarter);
            if (!tieTypes.includes("start")) ties.delete(tieKey);
          } else {
            const event = {
              track: partIndex * 8 + staff - 1,
              pitch: clamp(Math.round(pitch), 0, 127),
              velocity: 72,
              startQuarter: noteStart,
              endQuarter: noteStart + durationQuarter
            };
            quarterNotes.push(event);
            if (tieTypes.includes("start")) ties.set(tieKey, event);
          }
        });
        partTime = Math.max(measureStart, farthest);
        finalQuarter = Math.max(finalQuarter, partTime);
      });
    });

    const tempos = [...tempoEvents]
      .sort((a, b) => a.quarter - b.quarter)
      .filter((event, index, items) => !index || event.quarter !== items[index - 1].quarter || event.bpm !== items[index - 1].bpm);
    if (tempos.length > 1 && tempos[1].quarter === 0) tempos.shift();
    const sourceBpm = tempos[0]?.bpm || 80;
    const quarterToSeconds = quarter => {
      let seconds = 0;
      let previousQuarter = 0;
      let currentTempo = sourceBpm;
      for (const event of tempos) {
        if (event.quarter <= previousQuarter) {
          currentTempo = event.bpm;
          continue;
        }
        if (event.quarter >= quarter) break;
        seconds += (event.quarter - previousQuarter) * 60 / currentTempo;
        previousQuarter = event.quarter;
        currentTempo = event.bpm;
      }
      return seconds + Math.max(0, quarter - previousQuarter) * 60 / currentTempo;
    };
    const notes = quarterNotes.map(note => {
      const time = quarterToSeconds(note.startQuarter);
      return {
        track: note.track,
        pitch: note.pitch,
        velocity: note.velocity,
        time,
        duration: Math.max(.025, quarterToSeconds(note.endQuarter) - time)
      };
    }).sort((a, b) => a.time - b.time || a.track - b.track || a.pitch - b.pitch);
    const finalNoteTime = notes.reduce((maximum, note) => Math.max(maximum, note.time + note.duration), 0);
    const duration = Math.max(quarterToSeconds(finalQuarter), finalNoteTime);
    return {
      id: score.id,
      title: score.title,
      composer: score.composer,
      musicXmlText: sourceXml,
      sourceBpm,
      timeSignature,
      duration,
      measureStarts: measureStarts.map(quarterToSeconds),
      notes,
      source: {
        label: score.provider === "flat" ? "Flat · 已授权乐谱" : "OpenScore · CC0",
        url: score.sourceUrl
      }
    };
  }

  async function renderScore() {
    if (!window.opensheetmusicdisplay) throw new Error("乐谱渲染器加载失败");
    const { OpenSheetMusicDisplay } = window.opensheetmusicdisplay;
    osmd = new OpenSheetMusicDisplay(ui.canvas, {
      backend: "svg",
      autoResize: false,
      drawTitle: false,
      drawComposer: false,
      drawPartNames: false,
      drawMeasureNumbers: true,
      pageFormat: "Endless",
      drawingParameters: "compact"
    });
    await osmd.load(manifest.musicXmlText || `assets/scores/${manifest.musicXml}`);
    osmd.Zoom = zoom;
    osmd.render();
    createMeasureTargets();
  }

  async function ensureLoaded() {
    if (manifest && osmd) return;
    if (!currentScore) {
      await openScore(catalog[0]?.id || "original-rags");
      return;
    }
    if (loadPromise) return loadPromise;
    const scoreId = currentScore.id;
    loadPromise = (async () => {
      ui.status.textContent = "正在准备可交互乐谱…";
      if (currentScore.online) {
        const sourceXml = await fetchOnlineMusicXml(currentScore);
        manifest = parseOnlineManifest(sourceXml, currentScore);
        currentScore.duration = manifest.duration;
        currentScore.measures = manifest.measureStarts.length;
        saveImportedScores();
      } else {
        const response = await fetch(`assets/scores/${scoreId}.json`);
        if (!response.ok) throw new Error("乐谱数据读取失败");
        manifest = await response.json();
      }
      if (currentScore?.id !== scoreId) return;
      bpm = manifest.sourceBpm;
      ui.bpm.textContent = `${Math.round(bpm)} BPM`;
      ui.progress.max = String(manifest.duration);
      updateClock(0);
      await renderScore();
      const config = INSTRUMENTS[ui.instrument.value] || INSTRUMENTS["splendid-grand"];
      ui.status.textContent = `点击小节播放 · ${config.label}`;
      renderSourceHint();
    })().catch(error => {
      ui.status.textContent = `${error.message || "乐谱加载失败"}，请刷新后重试`;
      loadPromise = null;
      throw error;
    });
    return loadPromise;
  }

  ui.flatOpen.addEventListener("click", () => {
    ui.flatStatus.classList.remove("error");
    updateFlatUi();
    ui.flatDialog.showModal();
    if (!flatProfile) window.setTimeout(() => ui.flatToken.focus(), 50);
  });
  $("score-flat-close").addEventListener("click", () => ui.flatDialog.close());
  ui.flatDialog.addEventListener("click", event => {
    if (event.target === ui.flatDialog) ui.flatDialog.close();
  });
  ui.flatForm.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = $("score-flat-connect");
    submit.disabled = true;
    submit.textContent = "连接中…";
    ui.flatStatus.classList.remove("error");
    ui.flatStatus.textContent = "正在验证 Flat 账号…";
    try {
      await connectFlat(ui.flatToken.value);
      ui.flatToken.value = "";
      submit.textContent = "已连接";
      window.setTimeout(() => ui.flatDialog.close(), 500);
    } catch (error) {
      ui.flatStatus.classList.add("error");
      ui.flatStatus.textContent = error.message || "Flat 连接失败";
      submit.textContent = "重新连接";
    } finally {
      submit.disabled = false;
    }
  });
  ui.flatDisconnect.addEventListener("click", () => {
    disconnectFlat();
    ui.flatDialog.close();
  });
  ui.search.addEventListener("input", scheduleSearch);
  $("sheet-back").addEventListener("click", () => showLibrary());
  ui.play.addEventListener("click", () => playing ? pause() : void play());
  ui.instrument.addEventListener("change", () => {
    pause();
    localStorage.setItem(INSTRUMENT_KEY, ui.instrument.value);
    const previousInstrument = activeInstrument;
    activeInstrument = null;
    activeInstrumentId = "";
    try { previousInstrument?.dispose(); } catch (error) {}
    renderSourceHint();
    void ensureInstrument();
  });
  ui.rewind.addEventListener("click", () => setPosition(0));
  ui.progress.addEventListener("input", () => setPosition(Number(ui.progress.value)));
  $("sheet-bpm-minus").addEventListener("click", () => {
    const wasPlaying = playing;
    if (wasPlaying) position = currentTime();
    bpm = clamp(bpm - 5, 30, 180);
    ui.bpm.textContent = `${Math.round(bpm)} BPM`;
    if (wasPlaying) { startedFrom = position; startedAt = performance.now(); nextNote = noteIndexAt(position); releaseVoices(); }
  });
  $("sheet-bpm-plus").addEventListener("click", () => {
    const wasPlaying = playing;
    if (wasPlaying) position = currentTime();
    bpm = clamp(bpm + 5, 30, 180);
    ui.bpm.textContent = `${Math.round(bpm)} BPM`;
    if (wasPlaying) { startedFrom = position; startedAt = performance.now(); nextNote = noteIndexAt(position); releaseVoices(); }
  });
  ui.loop.addEventListener("click", () => {
    if (ui.loop.classList.toggle("on")) {
      loopMeasure = activeMeasure < 0 ? 0 : activeMeasure;
      ui.loop.textContent = `循环：${loopMeasure + 1}`;
      ui.loop.setAttribute("aria-pressed", "true");
    } else {
      loopMeasure = null;
      ui.loop.textContent = "循环：关";
      ui.loop.setAttribute("aria-pressed", "false");
    }
  });
  $("sheet-transpose-minus").addEventListener("click", () => {
    transpose = clamp(transpose - 1, -12, 12);
    ui.transpose.textContent = `${transpose > 0 ? "+" : ""}${transpose}`;
  });
  $("sheet-transpose-plus").addEventListener("click", () => {
    transpose = clamp(transpose + 1, -12, 12);
    ui.transpose.textContent = `${transpose > 0 ? "+" : ""}${transpose}`;
  });
  $("sheet-zoom-minus").addEventListener("click", () => {
    if (!osmd) return;
    zoom = clamp(zoom - .1, .5, 1.5);
    osmd.Zoom = zoom;
    osmd.render();
    createMeasureTargets();
    ui.zoom.textContent = `${Math.round(zoom * 100)}%`;
  });
  $("sheet-zoom-plus").addEventListener("click", () => {
    if (!osmd) return;
    zoom = clamp(zoom + .1, .5, 1.5);
    osmd.Zoom = zoom;
    osmd.render();
    createMeasureTargets();
    ui.zoom.textContent = `${Math.round(zoom * 100)}%`;
  });
  $("sheet-fullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) ui.scroll.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  window.addEventListener("resize", () => {
    if (!osmd || ui.player.hidden) return;
    window.clearTimeout(window.__sheetResizeTimer);
    window.__sheetResizeTimer = window.setTimeout(() => {
      osmd.render();
      createMeasureTargets();
    }, 180);
  });

  window.scorePlayer = {
    ensureCatalog,
    loadOnlineIndex,
    loadFlatScores,
    connectFlat,
    disconnectFlat,
    ensureLoaded,
    showLibrary,
    open: openScore,
    play,
    pause,
    stop: pause,
    getAudioState() {
      return {
        instrumentId: activeInstrumentId,
        sampleBased: Boolean(activeInstrument),
        fallback: !activeInstrument && Boolean(fallbackSynths),
        contextState: audioContext?.state || "none"
      };
    },
    seekMeasure(index) {
      if (!manifest) return;
      setPosition(manifest.measureStarts[clamp(index, 0, manifest.measureStarts.length - 1)]);
    }
  };

  void Promise.all([ensureCatalog(), refreshFlatConnection()]).catch(error => { ui.status.textContent = error.message; });
})();
