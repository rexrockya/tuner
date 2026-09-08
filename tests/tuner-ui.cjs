const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.env.TUNER_QA_ROOT || path.resolve(__dirname, '..');
const CANDIDATE = process.env.TUNER_CANDIDATE_DIR || path.join(ROOT, 'docs');
const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
const source = fs.readFileSync(path.join(CANDIDATE, 'tuner-ui.js'), 'utf8');
const markup = fs.existsSync(path.join(CANDIDATE, 'tuner-main.html')) ? fs.readFileSync(path.join(CANDIDATE, 'tuner-main.html'), 'utf8') : fs.readFileSync(path.join(CANDIDATE, 'index.html'), 'utf8').match(/<main id="top"[\s\S]*?<\/main>/)[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(options = {}) {
  const dom = new JSDOM(markup, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://rexrockya.github.io/tuner/#tuner' });
  const w = dom.window, d = w.document, contexts = [], oscillators = [], store = new Map(); let stopped = 0, draws = 0;
  w.siteStorage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  const ctx = new Proxy({}, { get(_, name) { return name === 'clearRect' ? () => draws++ : () => {}; }, set() { return true; } });
  w.HTMLCanvasElement.prototype.getContext = () => ctx;
  w.requestAnimationFrame = () => { throw Error('Unexpected animation loop'); };
  class AC {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.closed = 0; contexts.push(this); }
    resume() { return options.resume ? options.resume(this) : Promise.resolve(); }
    close() { this.state = 'closed'; this.closed++; return Promise.resolve(); }
    createOscillator() { const o = { frequency: { value: 0, setTargetAtTime(value) { this.value = value; } }, starts: 0, stops: 0, connect() {}, disconnect() {}, start() { this.starts++; }, stop() { this.stops++; this.onended?.(); } }; oscillators.push(o); return o; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  w.AudioContext = AC; w.eval(source);
  const q = selector => d.querySelector(selector);
  const ui = { main: q('main'), note: q('#note'), octave: q('#octave'), frequency: q('#frequency'), needle: q('#needle'), state: q('#tune-state'), toggle: q('#toggle'), error: q('#error') };
  let panel; panel = w.tunerUI.mount(ui, { stopInput() { stopped++; panel?.inputState('idle'); } });
  return { w, d, q, panel, ui, contexts, oscillators, stopped: () => stopped, draws: () => draws, click: selector => q(selector).click(), close() { panel.dispose(); dom.window.close(); } };
}
(async () => {
  const h = setup();
  assert.equal(h.contexts.length, 0, 'mount must not create audio');
  assert.equal(h.q('#tuner-timeline').hidden, true);
  assert.equal(h.ui.note.textContent, '', 'no oversized dash in empty state');
  assert.equal(h.draws(), 0, 'hidden timeline must do no canvas work');
  assert.equal(h.w.tunerUI.pitchInfo(440).name, 'A');
  assert.equal(h.w.tunerUI.pitchInfo(441, 441).cents, 0);
  assert.equal(h.w.tunerUI.pitchInfo(-1), null);
  assert.equal(h.w.tunerUI.pitchInfo(NaN), null);
  assert.ok(Math.abs(h.w.tunerUI.pitchInfo(440, 441).cents + 3.93015844) < .001);
  h.panel.inputState('running'); h.panel.render(440, 100);
  assert.equal(h.ui.note.textContent, 'A'); assert.equal(h.ui.octave.textContent, '4');
  assert.ok(h.ui.main.classList.contains('tuned'));
  h.panel.render(-1, 500); assert.equal(h.ui.note.textContent, 'A', 'short unvoiced gaps retain readable value');
  h.panel.render(-1, 800); assert.equal(h.ui.note.textContent, '', 'sustained silence clears stale note');
  assert.equal(h.draws(), 0);
  h.click('#tuner-history-open'); assert.equal(h.q('#tuner-timeline').hidden, false); assert.equal(h.q('#tuner-dial').hidden, true);
  assert.equal(h.panel.getState().activeInput, 'idle', 'opening subview must not capture');
  assert.equal(h.contexts.length, 0);
  h.panel.inputState('running');
  for (let i = 0; i < 800; i++) h.panel.render(i % 4 ? 220 : -1, i * 50);
  assert.equal(h.panel.getState().points, 640, 'bounded history');
  const before = h.panel.getState().points, draws = h.draws(); h.click('#tuner-history-pause'); h.panel.render(440, 41000);
  assert.equal(h.panel.getState().points, before); assert.equal(h.draws(), draws, 'paused canvas must not redraw');
  h.click('#tuner-history-clear'); assert.equal(h.panel.getState().points, 0);
  h.click('#tuner-history-back'); assert.equal(h.q('#tuner-timeline').hidden, true);
  const hiddenDraws = h.draws(); h.panel.render(330, 42000); assert.equal(h.draws(), hiddenDraws);
  h.q('#tuner-reference').value = '441'; h.q('#tuner-reference').dispatchEvent(new h.w.Event('change'));
  assert.equal(h.panel.getReference(), 441); assert.match(h.q('#tuner-tone').getAttribute('aria-label'), /441/);
  h.click('#tuner-tone'); await tick(); assert.equal(h.contexts.length, 1); assert.equal(h.oscillators[0].frequency.value, 441); assert.equal(h.oscillators[0].starts, 1);
  h.panel.beforeInput(); assert.equal(h.contexts[0].state, 'closed'); assert.equal(h.panel.getState().tone, false);
  h.click('#tuner-tone'); await tick(); h.panel.onPage('lesson'); assert.equal(h.contexts[1].state, 'closed');
  h.click('#tuner-tone'); await tick(); h.w.dispatchEvent(new h.w.Event('pagehide')); assert.equal(h.contexts[2].state, 'closed');
  h.close();
  const ring = setup(); const history = ring.w.tunerUI.createHistory(3); history.add(1, 40); history.add(2, null); history.add(3, 42); history.add(4, 43); const output = []; history.each((time, midi) => output.push([time, midi]));
  assert.equal(output.length, 3); assert.equal(output[0][0], 2); assert.ok(Number.isNaN(output[0][1])); assert.deepEqual(output.slice(1), [[3, 42], [4, 43]]); ring.close();
  let resume; const pending = setup({ resume: () => new Promise(resolve => { resume = resolve; }) });
  pending.click('#tuner-tone'); assert.equal(pending.panel.getState().tone, true); pending.panel.onPage('tools');
  resume(); await tick(); assert.equal(pending.oscillators.length, 0, 'late resume cannot start a cancelled tone'); assert.equal(pending.contexts[0].state, 'closed'); pending.close();
  console.log('PASS tuner UI: empty state, 440/441 mapping, silence expiry, bounded/gapped trace, pause/clear, no hidden canvas loop, tone/mic exclusivity, navigation/pagehide cleanup, late resume cancellation');
})().catch(error => { console.error(error); process.exitCode = 1; });

