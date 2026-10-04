// Independent DOM regressions for interrupted navigation. Real browser layout
// and MP3 playback still require browser QA; JSDOM cannot certify those.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const flush = () => new Promise(resolve => setImmediate(resolve));
async function settle() { for (let i = 0; i < 4; i++) await flush(); }

(async () => {
  const dom = new JSDOM(fs.readFileSync('docs/fretboard.html', 'utf8'), {
    url: 'https://rexrockya.github.io/tuner/fretboard.html?lesson=Xbv40aTf',
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window, d = w.document, errors = [], frames = [];
  const $ = id => d.getElementById(id);
  w.addEventListener('error', event => errors.push(event.error));
  w.requestAnimationFrame = callback => frames.push(callback);
  w.HTMLMediaElement.prototype.pause = function () {
    Object.defineProperty(this, 'paused', {configurable: true, value: true});
  };
  w.HTMLMediaElement.prototype.load = function () {};
  w.fetch = async url => ({ok: true, json: async () =>
    JSON.parse(fs.readFileSync(path.join('docs', String(url).split('?')[0]), 'utf8'))});
  const fetchSource = w.fetch;
  function choose(id) {
    $('lesson-select').value = id;
    $('lesson-select').dispatchEvent(new w.Event('change'));
  }
  function drainFrames() { while (frames.length) frames.shift()(0); }
  function checkLesson(id) {
    assert.equal(new URL(w.location.href).searchParams.get('lesson'), id);
    assert.equal($('lesson-select').value, id);
    assert.match($('lesson-eyebrow').textContent, new RegExp(id));
    for (const link of d.querySelectorAll('.original-link'))
      assert.equal(link.getAttribute('href'), './#lick/' + id);
    assert.equal($('coach').hidden, false);
  }
  async function traverse(direction) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('No history event: ' + direction)), 1000);
      w.addEventListener('popstate', () => { clearTimeout(timeout); resolve(); }, {once: true});
      w.history[direction]();
    });
    await settle();
  }
  try {
    w.eval(fs.readFileSync('docs/fretboard-core.js', 'utf8'));
    w.eval(fs.readFileSync('docs/fretboard.js', 'utf8'));
    await settle();
    choose('gs00bn5'); await settle();
    choose('gs00bn9'); await settle();
    await traverse('back'); checkLesson('gs00bn5');
    await traverse('forward'); checkLesson('gs00bn9');

    // A stale reveal callback must survive the next lesson's pending state.
    let rejectOld;
    w.fetch = url => String(url).endsWith('/gs00bn5.json')
      ? new Promise((resolve, reject) => { rejectOld = reject; }) : fetchSource(url);
    Object.defineProperty($('original-audio'), 'paused', {configurable: true, value: false});
    choose('gs00bn5');
    assert.equal($('original-audio').paused, true, 'lesson change stops original audio');
    assert.doesNotThrow(drainFrames, 'queued reveal callback after M was cleared');
    choose('gs00bn9'); await settle();
    rejectOld(Error('older request failed')); await settle();
    checkLesson('gs00bn9');
    assert.equal($('unavailable').hidden, true, 'late rejection cannot replace newer success');
    w.fetch = fetchSource;

    // This 2ms source gap crosses the sampled bar boundary without an attack.
    const audio = $('original-audio');
    Object.defineProperty(audio, 'paused', {configurable: true, value: false});
    audio.currentTime = 0.3; audio.dispatchEvent(new w.Event('timeupdate'));
    assert.equal($('board-title').textContent, 'A#');
    audio.currentTime = 1.861; audio.dispatchEvent(new w.Event('timeupdate'));
    assert.equal($('board-title').textContent, 'G#');
    assert.match($('position-label').textContent, /第 2 小节/);
    assert.equal($('current-note').textContent, '休止');

    choose('gs01funk9'); await settle();
    $('range-toggle').click();
    const svg = d.querySelector('#fretboard svg');
    const drawingWidth = +svg.getAttribute('viewBox').split(' ')[2];
    assert.equal(drawingWidth, 1750);
    assert.equal(parseFloat(svg.style.width), drawingWidth, 'wide board retains readable scale');
    assert.equal(parseFloat(svg.style.minWidth), drawingWidth, 'mobile CSS cannot shrink labels');

    w.history.pushState(null, '', '?lesson=not-a-real-id');
    w.dispatchEvent(new w.PopStateEvent('popstate')); await settle();
    assert.doesNotThrow(drainFrames, 'queued reveal callback after invalid ID');
    assert.match($('load-status').textContent, /不在资料库/);
    assert.equal($('coach').hidden, true);
    assert.equal(d.querySelector('.source-panel').hidden, true);
    assert.equal($('lesson-select').value, '');
    assert.equal($('original-audio').hasAttribute('src'), false);
    assert.equal($('score-link').hasAttribute('href'), false);
    assert.match($('lesson-eyebrow').textContent, /未知 ID/);
    for (const link of d.querySelectorAll('.original-link')) assert.equal(link.getAttribute('href'), './');
    choose('Xbv40aTf'); await settle(); checkLesson('Xbv40aTf');
    assert.equal(d.querySelector('.source-panel').hidden, false);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
  console.log('PASS fretboard navigation: Back/Forward exact IDs, original audio stop, stale RAF, late rejection, source gap boundary, intrinsic wide-board scale, invalid ID and recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });
