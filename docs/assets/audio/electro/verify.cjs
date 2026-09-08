'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
assert.equal(Object.keys(manifest.files).length, 8);
for (const [id, item] of Object.entries(manifest.files)) {
  const bytes = fs.readFileSync(path.join(__dirname, item.file));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt16LE(20), 1); assert.equal(bytes.readUInt16LE(22), 1);
  assert.equal(bytes.readUInt32LE(24), 44100); assert.equal(bytes.readUInt16LE(34), 16);
  assert.equal(bytes.readUInt32LE(40), item.frames * 2); assert.equal(bytes.length, 44 + item.frames * 2);
  assert.equal(bytes.length, item.bytes); assert.equal(item.durationSeconds, item.frames / 44100);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256);
  let peak = 0;
  for (let i = 44; i < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)) / 32768);
  assert.ok(peak <= .8 && peak > .4, `${id}: bounded non-silent peak`); assert.equal(peak, item.peak);
  assert.equal(bytes.readInt16LE(44), 0, `${id}: begins at zero`);
  assert.equal(bytes.readInt16LE(bytes.length - 2), 0, `${id}: ends at zero`);
  // Last 0.5 ms must approach silence rather than ending mid-waveform.
  let lastPeak = 0;
  for (let i = bytes.length - 44; i < bytes.length; i += 2) lastPeak = Math.max(lastPeak, Math.abs(bytes.readInt16LE(i)) / 32768);
  assert.ok(lastPeak < .002, `${id}: smooth non-truncated tail`);
  console.log(`${id}: ${item.durationSeconds.toFixed(3)} s, peak ${peak.toFixed(5)}, SHA-256 OK, zero endpoints, quiet tail`);
}
console.log('PASS: 8 mono 44.1 kHz PCM16 WAV files; duration, bytes, peaks, hashes, and fade boundaries verified.');
