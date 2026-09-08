(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src), pending = new Map();
  const libraries = {
    arrangement: ['practice-arrangement.js?v=20260908-tone-1',()=>window.practiceArrangements],
    notation: ['practice-notation.js?v=20260908-ensemble-1',()=>window.practiceNotation],
    practiceAudio: ['practice-audio.js?v=20260908-tone-1', () => window.practiceAudio],
    practice: ['practice.js?v=20260908-live-1', () => window.practiceStudio],
    sound: ['sound-meter.js?v=20260908-3', () => window.soundMeter],
    score: ['assets/vendor/opensheetmusicdisplay-2.1.2.min.js', () => window.opensheetmusicdisplay],
    tone: ['assets/vendor/tone-14.9.17.js', () => window.Tone],
    zip: ['assets/vendor/fflate-0.8.2.min.js', () => window.fflate]
  };
  function load(name) {
    if(name==='studio')return load('arrangement').then(()=>load('practiceAudio')).then(()=>load('practice'));
    const entry = libraries[name];
    if (!entry) return Promise.reject(new Error('未知资源'));
    if (entry[1]()) return Promise.resolve(entry[1]());
    if (!pending.has(name)) {
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = new URL(entry[0], base).href; script.async = true;
        const timeout = setTimeout(() => finish(new Error('资源载入超时，请重试')), 15000);
        function finish(error) {
          clearTimeout(timeout); script.onload = script.onerror = null;
          if (error || !entry[1]()) { script.remove(); reject(error || new Error('资源载入失败，请重试')); }
          else resolve(entry[1]());
        }
        script.onload = () => finish(); script.onerror = () => finish(new Error('资源载入失败，请重试'));
        document.head.appendChild(script);
      }).catch(error => { pending.delete(name); throw error; });
      pending.set(name, promise);
    }
    return pending.get(name);
  }
  function warm(name) {
    if (navigator.connection?.saveData) return;
    const task = () => { void load(name).catch(() => {}); };
    if (window.requestIdleCallback) window.requestIdleCallback(task, { timeout: 1000 });
    else setTimeout(task, 50);
  }
  window.siteAssets = { load, warm };
})();
