const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const { JSDOM } = require(path.join(root, 'node_modules/jsdom'));
const html = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: 'https://rexrockya.github.io/tuner/', runScripts: 'outside-only' });
const w = dom.window, d = w.document, nodes = [], frames = new Map();
let now = 0, paused = true, sequence = 0;
class Param {
  value = 0; setValueAtTime(value) { this.value = value; } exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; } cancelScheduledValues() { this.cancelled = true; }
}
w.AudioContext = class {
  state = 'running'; destination = {}; get currentTime() { return now; } async resume() {}
  createGain() { return { gain: new Param(), connect(node) { return node; }, disconnect() { this.disconnected = true; } }; }
  createOscillator() { return { frequency: new Param(), connect(gain) { this.gainNode = gain; return gain; }, disconnect() { this.disconnected = true; }, start() { nodes.push(this); }, stop(at) { this.stopAt = at ?? now; } }; }
};
w.requestAnimationFrame = fn => { const id = ++sequence; frames.set(id, fn); return id; }; w.cancelAnimationFrame = id => frames.delete(id);
w.HTMLElement.prototype.scrollTo = () => {};
Object.defineProperty(w.HTMLMediaElement.prototype, 'paused', { get: () => paused });
w.HTMLMediaElement.prototype.play = function () { paused = false; this.dispatchEvent(new w.Event('play')); return Promise.resolve(); };
w.HTMLMediaElement.prototype.pause = function () { if (!paused) { paused = true; this.dispatchEvent(new w.Event('pause')); } };
for (const file of ['harmony.js', 'lessons.js']) w.eval(fs.readFileSync(path.join(root, 'docs', file), 'utf8'));
const click = id => d.getElementById(id).click(), flush = () => new Promise(resolve => setImmediate(resolve));
function releaseEnded() { for (const node of nodes) if (!node.ended && node.stopAt <= now) { node.ended = true; node.onended?.(); } }
(async () => {
  w.lessonPlayer.setBpm(40); click('toggle-backing'); await flush(); click('play-lick'); await flush();
  assert.ok(nodes.length >= 4, 'first beat contains bass and chord voices');
  assert.ok(Math.max(...nodes.map(node => node.stopAt - now)) > 2, 'fixture exercises a long backing tail at 40 BPM');
  click('toggle-backing');
  for (const node of nodes) { assert.ok(node.stopAt <= now + .030001, 'Off stops all live backing oscillators within 30 ms'); assert.equal(node.gainNode.gain.cancelled, true, 'cancel the old envelope before the short fade'); }
  now += .04; releaseEnded();
  for (const node of nodes) assert.ok(node.disconnected && node.gainNode.disconnected, 'ended backing nodes must disconnect');
  const prior = nodes.length; click('toggle-backing'); await flush(); assert.ok(nodes.length > prior, 'backing restarts after Off'); w.lessonPlayer.stop();
  for (const node of nodes.slice(prior)) assert.ok(node.stopAt <= now + .030001, 'playback Stop also stops every backing voice within 30 ms');
  now += .04; releaseEnded();
  for (const node of nodes) assert.ok(node.disconnected && node.gainNode.disconnected);
  assert.ok(![...frames.values()].some(fn => String(fn).includes('triggerBackingBeat')), 'no backing animation callback survives Stop');
  console.log('PASS: library backing Off and playback Stop fade all live voices within 30 ms; onended disconnects nodes; restarting remains functional');
  dom.window.close();
})().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
