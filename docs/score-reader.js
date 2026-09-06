(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const player = $('sheet-player'), transport = $('sheet-transport');
  if (!player || !transport) return;
  const settings = $('sheet-settings-toggle'), originalToggle = $('sheet-original-toggle');
  const image = $('sheet-original-image'), original = $('sheet-original-view'), canvas = $('sheet-canvas');
  let current = null, originalMode = false;
  const scroll = $('sheet-score-scroll');
  const pointers = new Map();
  let gesture = null, suppressClickUntil = 0, followAfter = 0, resumeTimer;
  function holdFollow() {
    followAfter = Date.now() + 1800;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      if (!pointers.size && !player.hidden) window.scorePlayer.followCurrent?.();
    }, 1850);
  }
  function geometry() {
    const points = [...pointers.values()].slice(0, 2);
    const a = points[0], b = points[1] || a;
    return {x:(a.x+b.x)/2, y:(a.y+b.y)/2, distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || (event.button !== undefined && event.button !== 0)) return;
    if (pointers.size >= 2) return;
    pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    gesture = geometry();
    holdFollow();
    if (pointers.size > 1) suppressClickUntil = Date.now() + 700;
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = gesture;
    pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    const next = geometry();
    if (pointers.size === 1 && Math.hypot(next.x-previous.x,next.y-previous.y) < 4) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    holdFollow();
    suppressClickUntil = Date.now() + 700;
    if (pointers.size > 1 && previous.distance > 0) {
      window.scorePlayer.setZoom(window.scorePlayer.getZoom() * next.distance / previous.distance, previous);
    }
    scroll.scrollLeft += previous.x - next.x;
    scroll.scrollTop += previous.y - next.y;
    gesture = next;
  });
  function endPointer(event) {
    // Touch starts with implicit capture on the note/measure. Moving capture
    // to the canvas is not the end of that finger's gesture.
    if (event.type === 'lostpointercapture' && event.target !== canvas) return;
    if (!pointers.delete(event.pointerId)) return;
    if (suppressClickUntil > Date.now()) suppressClickUntil = Date.now() + 700;
    gesture = pointers.size ? geometry() : null;
    holdFollow();
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture']) window.addEventListener(name,endPointer);
  canvas.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  $('sheet-fit-width').addEventListener('click', () => window.scorePlayer.fitWidth());
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) {
      settingsOpen(false);
      lastWidth = window.innerWidth;
    }
  });
  const syncStatus = () => { $('sheet-reader-status').textContent = $('sheet-status').textContent; };
  new MutationObserver(syncStatus).observe($('sheet-status'), {childList:true,subtree:true,characterData:true});
  syncStatus();
  // Retain the existing controls and listeners: there is only one audio player
  // and one copy of each volume/tempo control on desktop and phone.
  transport.append(player.querySelector('.sheet-mixer'));
  for (const child of transport.children) {
    if (!['sheet-play','sheet-settings-toggle'].includes(child.id) && !child.classList.contains('sheet-progress-wrap')) {
      child.classList.add('sheet-advanced');
    }
  }
  function settingsOpen(open) {
    player.classList.toggle('sheet-settings-open', open);
    settings.setAttribute('aria-expanded', String(open));
    settings.textContent = open ? '收起' : '设置';
    if (!open) transport.scrollTop = 0;
  }
  function label() {
    $('sheet-reader-label').textContent = originalMode ? '完整原图 · 对照'
      : current ? `可播放 ${current.measureStarts.length} 小节${current.reviewNotice ? ' · 待校对' : ''}` : '可播放谱';
  }
  function mode(showOriginal) {
    originalMode = showOriginal;
    if (showOriginal) window.scorePlayer.pause();
    original.hidden = !showOriginal;
    canvas.hidden = showOriginal;
    originalToggle.textContent = showOriginal ? '可播放谱' : '完整原图';
    originalToggle.setAttribute('aria-pressed', String(showOriginal));
    $('sheet-score-scroll').scrollTop = 0;
    if (showOriginal && !image.getAttribute('src')) image.src = new URL(current.source.url, document.baseURI).href;
    if (!showOriginal) window.dispatchEvent(new Event('resize'));
    label();
  }
  settings.addEventListener('click', () => settingsOpen(!player.classList.contains('sheet-settings-open')));
  originalToggle.addEventListener('click', () => mode(!originalMode));
  $('sheet-reader-back').addEventListener('click', () => window.scorePlayer.showLibrary());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && player.classList.contains('sheet-settings-open')) {
      settingsOpen(false);settings.focus();
    }
  });
  image.addEventListener('error', () => { $('sheet-original-error').hidden = false; });
  image.addEventListener('load', () => { $('sheet-original-error').hidden = true; });
  window.scoreReader = {
    isInteracting: () => pointers.size > 0 || Date.now() < followAfter,
    bind(manifest) {
      current = manifest;
      original.querySelector('p').textContent = manifest.coverage === 'full-page-playable-review'
        ? '完整原图，仅供对照；本谱已有整页可播放校对版。原图不会跟随播放逐音定位。'
        : '完整原图，仅供对照；试听仍为已转录部分，不会跟随原图逐音定位。';
      originalToggle.hidden = !manifest.id.startsWith('violin-upload-');
      image.removeAttribute('src');
      $('sheet-original-error').hidden = true;
      settingsOpen(false);
      mode(false);
      player.querySelector('.sheet-source-details').open = false;
    },
    close() {
      clearTimeout(resumeTimer); pointers.clear(); gesture = null; followAfter = 0; suppressClickUntil = 0;
      settingsOpen(false); originalMode = false; original.hidden = true; canvas.hidden = false; label();
    }
  };
})();
