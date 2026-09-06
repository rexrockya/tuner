(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const player = $('sheet-player'), transport = $('sheet-transport');
  if (!player || !transport) return;
  const settings = $('sheet-settings-toggle'), originalToggle = $('sheet-original-toggle');
  const image = $('sheet-original-image'), original = $('sheet-original-view'), canvas = $('sheet-canvas');
  let current = null, originalMode = false;
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
    bind(manifest) {
      current = manifest;
      originalToggle.hidden = !manifest.id.startsWith('violin-upload-');
      image.removeAttribute('src');
      $('sheet-original-error').hidden = true;
      settingsOpen(false);
      mode(false);
      player.querySelector('.sheet-source-details').open = false;
    },
    close() { settingsOpen(false); originalMode = false; original.hidden = true; canvas.hidden = false; }
  };
})();
