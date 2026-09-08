// Optional independent audit. Deliberately not part of npm test: requires ffmpeg.
// Uses the same locally synthesized samples for JavaScript and FFmpeg ebur128.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), { spawnSync } = require('node:child_process');
const ROOT = process.env.TUNER_QA_ROOT || path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'docs/loudness-dsp.js'), 'utf8'));
const output = [];
for (const rate of [44100, 48000]) for (const config of [
  { label: 'mono-63Hz', channels: 1, frequency: 63, segments: [[6, -23]] },
  { label: 'stereo-1kHz', channels: 2, frequency: 1000, segments: [[6, -23]] },
  { label: 'antiphase-6kHz', channels: 2, inverted: true, frequency: 6000, segments: [[6, -18]] },
  { label: 'step-lra-gated', channels: 2, frequency: 1000, segments: [[20, -50], [20, -30], [20, -20], [20, -30], [20, -50]] }
]) {
  const meter = new ProgrammeLoudness.ProgrammeMeter(rate, config.channels);
  const pieces = []; let latest;
  for (const [seconds, db] of config.segments) {
    const frames = Math.round(seconds * rate), pcm = Buffer.alloc(frames * config.channels * 4), left = new Float32Array(frames), right = config.channels === 2 ? new Float32Array(frames) : null;
    const amplitude = 10 ** (db / 20);
    for (let i = 0; i < frames; i++) {
      left[i] = amplitude * Math.sin(2 * Math.PI * config.frequency * i / rate); pcm.writeFloatLE(left[i], i * config.channels * 4);
      if (right) { right[i] = config.inverted ? -left[i] : left[i]; pcm.writeFloatLE(right[i], (i * 2 + 1) * 4); }
    }
    latest = meter.process(right ? [left, right] : [left]); pieces.push(pcm);
  }
  const result = spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', ['-hide_banner', '-nostats', '-f', 'f32le', '-ar', String(rate), '-ac', String(config.channels), '-i', 'pipe:0', '-filter:a', 'ebur128=peak=true', '-f', 'null', '-'], { input: Buffer.concat(pieces), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw Error(result.error?.message || result.stderr);
  const summary = result.stderr.slice(result.stderr.lastIndexOf('Summary:'));
  const ffmpeg = { I: Number(summary.match(/I:\s*([-\d.]+) LUFS/)[1]), LRA: Number(summary.match(/LRA:\s*([-\d.]+) LU/)[1]), TP: Number(summary.match(/Peak:\s*([-\d.]+) dBFS/)[1]) };
  const js = { I: latest.integrated, LRA: latest.lra, TP: latest.truePeak };
  const errors = { I: js.I - ffmpeg.I, LRA: js.LRA - ffmpeg.LRA, TP: js.TP - ffmpeg.TP };
  const passed = Math.abs(errors.I) <= .15 && Math.abs(errors.LRA) <= 1 && Math.abs(errors.TP) <= .5;
  const row = { rate, signal: config.label, js, ffmpeg, errors, passed }; output.push(row); console.log(JSON.stringify(row));
}
if (process.env.LOUDNESS_FFMPEG_RESULTS) fs.writeFileSync(process.env.LOUDNESS_FFMPEG_RESULTS, JSON.stringify(output, null, 2));
if (output.some(row => !row.passed)) process.exitCode = 1;
