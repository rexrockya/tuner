const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync("docs/score-audio.js", "utf8"), context);
const { prepareViolinSustain, createViolinLoader } = context.window.scoreAudio;

function makeBuffer(rate, duration) {
  const channels = [0, 1].map(channel => Float32Array.from({ length: Math.round(rate * duration) },
    (_, index) => Math.sin(2 * Math.PI * 443.3 * index / rate + channel * .2) * .4));
  return { sampleRate: rate, length: channels[0].length, numberOfChannels: 2,
    getChannelData: channel => channels[channel] };
}

(async () => {
  for (const rate of [44100, 48000]) {
    const buffer = makeBuffer(rate, 3.135);
    const original = [buffer.getChannelData(0).slice(), buffer.getChannelData(1).slice()];
    const loop = prepareViolinSustain(buffer);
    assert.equal(loop.loop, true);
    assert.ok(loop.loopStart >= .8, "loop must exclude the bow attack");
    assert.ok(loop.loopEnd - loop.loopStart > 1.5, "no rapid attack-sized loop");
    const start = Math.round(loop.loopStart * rate), end = Math.round(loop.loopEnd * rate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      assert.deepEqual(samples.slice(0, Math.floor(2.7 * rate)), original[channel].slice(0, Math.floor(2.7 * rate)),
        "short notes and their attack stay intact");
      assert.equal(samples[end - 1], original[channel][start - 1], "loop join follows consecutive source samples");
      assert.equal(samples[start], original[channel][start]);
      assert.ok(samples.every(value => Number.isFinite(value) && Math.abs(value) <= .4 + 1e-6));
    }
  }
  assert.equal(prepareViolinSustain(makeBuffer(44100, .9)).loop, false, "do not loop a too-short recording");
  const buffer = makeBuffer(44100, 3.135);
  const preset = { groups: [{ regions: [{sample:"A4"}, {sample:"A4"}] }] };
  const buffers = new Map([["A4", buffer]]);
  const loader = createViolinLoader({load:async () => buffers});
  assert.equal(await loader.load(preset, {}), buffers);
  const regions = preset.groups[0].regions;
  assert.deepEqual(regions[0], regions[1], "shared buffers are prepared once");
  assert.equal(regions[0].ampRelease, .06);
  console.log("violin sustain regression tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
