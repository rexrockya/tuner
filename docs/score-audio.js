(function () {
  "use strict";

  function prepareViolinSustain(buffer) {
    const rate = buffer.sampleRate;
    // Soundfont loop offsets describe raw SF2 samples, not these rendered recordings.
    // Preserve the bow attack. Only crossfade the end of a long, settled sustain.
    const start = Math.round(rate * .8);
    const end = Math.min(Math.round(rate * 2.8), buffer.length - Math.round(rate * .15));
    const fade = Math.round(rate * .06);
    if (end - start < rate * .6 || fade < 2) return { loop: false };
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let i = 0; i < fade; i++) {
        const blend = i / (fade - 1);
        samples[end - fade + i] = samples[end - fade + i] * (1 - blend)
          + samples[start - fade + i] * blend;
      }
    }
    return { loop: true, loopStart: start / rate, loopEnd: end / rate, ampRelease: .06 };
  }

  function createViolinLoader(baseLoader) {
    return {
      async load(preset, options) {
        const buffers = await baseLoader.load(preset, options);
        const prepared = new Map();
        for (const group of preset.groups) {
          for (const region of group.regions) {
            const buffer = buffers.get(region.sample);
            if (!buffer) continue;
            if (!prepared.has(buffer)) prepared.set(buffer, prepareViolinSustain(buffer));
            Object.assign(region, prepared.get(buffer));
          }
        }
        return buffers;
      }
    };
  }

  window.scoreAudio = { prepareViolinSustain, createViolinLoader };
})();
