(function () {
  'use strict';
  // YIN's cumulative mean normalized difference, with a bounded reusable window.
  // Averaging pairs limits work without changing the 55–1200 Hz tuning range.
  let data = new Float32Array(2048), difference = new Float64Array(1024);
  function detect(buffer, sampleRate) {
    const stride = sampleRate >= 32000 ? 2 : 1, rate = sampleRate / stride;
    const length = Math.min(2048, Math.floor(buffer.length / stride));
    if (length < 256) return -1;
    let energy = 0;
    for (let i = 0; i < length; i++) {
      const value = stride === 2 ? (buffer[i * 2] + buffer[i * 2 + 1]) * .5 : buffer[i];
      data[i] = value; energy += value * value;
    }
    if (Math.sqrt(energy / length) < .012) return -1;
    const minimum = Math.max(2, Math.floor(rate / 1200)), maximum = Math.min(difference.length - 2, Math.ceil(rate / 55) + 2, Math.floor(length / 2));
    const windowSize = length - maximum - 1;
    let sum = 0, best = -1;
    difference[0] = 1;
    for (let lag = 1; lag <= maximum; lag++) {
      let deltaSum = 0;
      for (let i = 0; i < windowSize; i++) { const delta = data[i] - data[i + lag]; deltaSum += delta * delta; }
      sum += deltaSum;
      difference[lag] = sum > 0 ? deltaSum * lag / sum : 1;
      if (lag >= minimum && difference[lag] < .13 && (best < 0 || difference[lag] < difference[best])) best = lag;
      // Follow the entire first valley: noise can create a shallow local dip before the true period.
      if (best > 0 && lag > best && difference[lag] >= .13) break;
    }
    if (best < 0) return -1;
    const a = difference[best - 1], b = difference[best], c = difference[best + 1];
    const correction = (a - c) / (2 * (a - 2 * b + c));
    const pitch = rate / (best + (Number.isFinite(correction) ? Math.max(-1, Math.min(1, correction)) : 0));
    return pitch >= 54.5 && pitch <= 1205 ? pitch : -1;
  }
  window.tunerPitch = { detect };
})();
