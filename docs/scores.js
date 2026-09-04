(function () {
  const $ = id => document.getElementById(id);
  const page = $("sheet-page");
  if (!page) return;

  const FAVORITES_KEY = "tuner-score-favorites-v1";
  const INSTRUMENT_KEY = "tuner-score-instrument-v1";
  const SMPLR_URL = "https://unpkg.com/smplr@1.0.0/dist/index.mjs";
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
    favoriteSection: $("score-favorites"),
    favoriteGrid: $("score-favorite-grid"),
    favoriteCount: $("score-favorite-count"),
    allGrid: $("score-all-grid"),
    allTitle: $("score-all-title"),
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
    meta.textContent = `${score.genre} · ${score.level} · ${formatTime(score.duration)} · ${score.measures} 小节`;
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

  function renderLibrary() {
    const query = ui.search.value.trim().toLocaleLowerCase();
    const matches = score => !query || `${score.title} ${score.composer} ${score.genre}`.toLocaleLowerCase().includes(query);
    const favoriteScores = catalog.filter(score => favorites.has(score.id) && matches(score));
    const otherScores = catalog.filter(score => !favorites.has(score.id) && matches(score));
    ui.favoriteGrid.replaceChildren(...favoriteScores.map(makeScoreCard));
    ui.allGrid.replaceChildren(...otherScores.map(makeScoreCard));
    ui.favoriteSection.hidden = favoriteScores.length === 0;
    ui.favoriteCount.textContent = `${favoriteScores.length} 首`;
    ui.allTitle.textContent = favorites.size ? "其他乐谱" : "全部乐谱";
    ui.empty.hidden = favoriteScores.length + otherScores.length > 0;
    $("sheet-library-count").textContent = `${catalog.length} 首`;
    if (!ui.player.hidden) return;
    ui.status.textContent = query ? `${favoriteScores.length + otherScores.length} 个结果` : `${catalog.length} 首经典钢琴曲`;
  }

  async function ensureCatalog() {
    if (catalog.length) return catalog;
    const response = await fetch("assets/scores/catalog.json");
    if (!response.ok) throw new Error("乐谱目录读取失败");
    catalog = await response.json();
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
    ui.searchWrap.hidden = false;
    ui.status.textContent = `${catalog.length || 10} 首经典钢琴曲`;
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
      const box = measureRects[index].getBBox();
      ui.scroll.scrollTo({ top: Math.max(0, box.y - ui.scroll.clientHeight * .42), behavior: "smooth" });
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
    const scale = 10 * osmd.Zoom;
    measureRects = list.map((staffMeasures, index) => {
      const measures = staffMeasures.filter(Boolean);
      const left = Math.min(...measures.map(item => item.PositionAndShape.AbsolutePosition.x + item.PositionAndShape.BorderLeft)) * scale;
      const right = Math.max(...measures.map(item => item.PositionAndShape.AbsolutePosition.x + item.PositionAndShape.BorderRight)) * scale;
      const top = Math.min(...measures.map(item => item.PositionAndShape.AbsolutePosition.y + item.PositionAndShape.BorderTop)) * scale;
      const bottom = Math.max(...measures.map(item => item.PositionAndShape.AbsolutePosition.y + item.PositionAndShape.BorderBottom)) * scale;
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
    await osmd.load(`assets/scores/${manifest.musicXml}`);
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
      const response = await fetch(`assets/scores/${scoreId}.json`);
      if (!response.ok) throw new Error("乐谱数据读取失败");
      manifest = await response.json();
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

  ui.search.addEventListener("input", renderLibrary);
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

  void ensureCatalog().catch(error => { ui.status.textContent = error.message; });
})();
