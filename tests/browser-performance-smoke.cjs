const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const { JSDOM } = createRequire(path.join(process.cwd(), 'package.json'))('jsdom');
const html = fs.readFileSync(path.join(__dirname, 'browser-performance.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://127.0.0.1:8765/tests/browser-performance.html', runScripts: 'outside-only' });
const w = dom.window, frame = w.document.querySelector('iframe'), fw = frame.contentWindow;
if (!fw.document.documentElement) fw.document.appendChild(fw.document.createElement('html'));
if (!fw.document.body) fw.document.documentElement.appendChild(fw.document.createElement('body'));
fw.document.body.innerHTML = '<button id="qa-target">Not recorded private label</button><input id="qa-input" value="not-recorded-secret"><button id="practice-play" aria-label="播放">▶</button><button id="sheet-play" aria-label="播放乐谱">▶</button><button data-page="tuner">调音</button>';
const callbacks = [], raf = []; let now = 100;
const navigation = { type: 'navigate', requestStart: 2, responseStart: 42, responseEnd: 54, domInteractive: 95, domContentLoadedEventEnd: 103, loadEventEnd: 120, transferSize: 5000, encodedBodySize: 4700, decodedBodySize: 15000 };
Object.defineProperty(fw, 'performance', { value: { now: () => now, getEntriesByType: type => type === 'navigation' ? [navigation] : [] } });
fw.PerformanceObserver = class {
  static supportedEntryTypes = ['resource', 'largest-contentful-paint', 'paint', 'event', 'longtask'];
  constructor(callback) { this.callback = callback; }
  observe(options) { this.options = options; callbacks.push(this); }
  disconnect() { this.disconnected = true; }
};
fw.requestAnimationFrame = callback => { raf.push(callback); return raf.length; };
w.setInterval = () => 1;
w.eval(html.match(/<script>([\s\S]*)<\/script>/)[1]);
frame.dispatchEvent(new w.Event('load'));
function emit(type, entries) { const observer = callbacks.filter(item => item.options.type === type && !item.disconnected).at(-1); assert.ok(observer); observer.callback({ getEntries: () => entries }); }
function report() { w.document.querySelector('#refresh-report').click(); return JSON.parse(w.document.querySelector('#json-report').textContent); }
(async () => { try {
  assert.equal(callbacks.find(item => item.options.type === 'event').options.durationThreshold, 16);
  emit('paint', [{ name: 'first-contentful-paint', startTime: 65 }]);
  emit('largest-contentful-paint', [{ startTime: 92, size: 1234 }]);
  emit('resource', [{ name: 'http://127.0.0.1:8765/docs/app.js?token=never-display', startTime: 3, duration: 80, responseStart: 60, initiatorType: 'script', transferSize: 900, encodedBodySize: 700, decodedBodySize: 2300 }]);
  emit('resource', [{ name: 'https://example.invalid/sample.wav?secret=do-not-record', startTime: 4, duration: 90, responseStart: 0, initiatorType: 'fetch', transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 }]);
  emit('resource', [{ name: 'https://hidden-auth.example/api/auth/me?access=never-display', startTime: 5, duration: 20, responseStart: 0, initiatorType: 'fetch', transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 }]);
  const target = fw.document.querySelector('button');
  emit('event', [{ name: 'click', interactionId: 10, startTime: 25, duration: 64, processingStart: 30, processingEnd: 44, target }]);
  emit('longtask', [{ startTime: 26, duration: 77 }]);
  target.dispatchEvent(new fw.MouseEvent('click', { bubbles: true }));
  now = 132; raf.shift()();
  let data = report();
  assert.equal(data.navigation.ttfbMs, 42); assert.equal(data.navigation.requestWaitMs, 40); assert.equal(data.fcpMs, 65); assert.equal(data.observedLcp.timeMs, 92);
  assert.equal(data.stats.resources, 3); assert.equal(data.stats.unexposedResources, 2);
  assert.equal(data.stats.maxObservedInteractionMs, 64); assert.equal(data.stats.maxFeedbackMs, 32);
  assert.equal(data.stats.maxLongTaskMs, 77); assert.equal(data.recentFeedback[0].element, 'button#qa-target');
  assert.equal(data.recentResources[1].transferBytes, null, 'unexposed cross-origin zero is unknown');
  assert.equal(data.recentResources[2].path, '[account service]/api/auth/me');
  assert.doesNotMatch(JSON.stringify(data), /never-display|do-not-record|not-recorded-secret|Not recorded private label/);
  now = 200; w.document.querySelector('#reset-session').click();
  emit('resource', [{ name: 'http://127.0.0.1:8765/docs/old.js', startTime: 3, duration: 80, responseStart: 60, initiatorType: 'script', transferSize: 900, encodedBodySize: 700, decodedBodySize: 2300 }]);
  data = report(); assert.equal(data.stats.resources, 0); assert.equal(data.stats.clicks, 0); assert.equal(data.navigation.ttfbMs, 42);
  const practice = fw.document.querySelector('#practice-play'), sheet = fw.document.querySelector('#sheet-play');
  now = 300; practice.dispatchEvent(new fw.MouseEvent('click', { bubbles: true }));
  practice.setAttribute('aria-label', '取消载入'); await Promise.resolve();
  now = 650; practice.setAttribute('aria-label', '暂停'); await Promise.resolve();
  data = report(); assert.equal(data.recentUiReady[0].clickToUiReadyMs, 350); assert.equal(data.recentUiReady[0].control, '#practice-play');
  practice.dispatchEvent(new fw.MouseEvent('click', { bubbles: true })); practice.setAttribute('aria-label', '播放'); await Promise.resolve();
  now = 700; practice.dispatchEvent(new fw.MouseEvent('click', { bubbles: true })); practice.setAttribute('aria-label', '取消载入'); await Promise.resolve();
  practice.dispatchEvent(new fw.MouseEvent('click', { bubbles: true })); practice.setAttribute('aria-label', '暂停'); await Promise.resolve();
  assert.equal(report().recentUiReady.length, 1, 'cancel click removes the pending measurement');
  now = 800; sheet.dispatchEvent(new fw.MouseEvent('click', { bubbles: true })); sheet.disabled = true; await Promise.resolve();
  sheet.disabled = false; await Promise.resolve(); // realistic finally gap before the play continuation
  now = 900; sheet.setAttribute('aria-label', '暂停乐谱'); await Promise.resolve();
  data = report(); assert.equal(data.recentUiReady[1].clickToUiReadyMs, 100, 'intermediate re-enable does not lose a valid ready transition');
  sheet.setAttribute('aria-label', '播放乐谱'); await Promise.resolve();
  now = 1000; sheet.dispatchEvent(new fw.MouseEvent('click', { bubbles: true })); sheet.disabled = true; await Promise.resolve();
  fw.document.querySelector('[data-page]').dispatchEvent(new fw.MouseEvent('click', { bubbles: true }));
  sheet.disabled = false; sheet.setAttribute('aria-label', '暂停乐谱'); await Promise.resolve();
  assert.equal(report().recentUiReady.length, 2, 'navigation removes the pending measurement');
  console.log('browser diagnostic smoke passed: timing/privacy/TAO, reset, account masking, UI-ready transitions, loading-finally gap, cancel/navigation invalidation; no first-sound claim');
} finally { dom.window.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
