/* Rectangular FFT energy weighting. A/C are spectral approximations, not IEC certified. */
(() => {
  const db = power => power > 0 ? 10 * Math.log10(power) : -Infinity;
  function weight(f, kind) {
    if (kind === 'Z') return 1;
    if (!f) return 0;
    const s = f * f, hi = 12194 ** 2;
    const r = kind === 'A'
      ? hi * s * s / ((s + 20.6 ** 2) * Math.sqrt((s + 107.7 ** 2) * (s + 737.9 ** 2)) * (s + hi))
      : hi * s / ((s + 20.6 ** 2) * (s + hi));
    return r * r * 10 ** ((kind === 'A' ? 2 : .06) / 10);
  }
  const centers = [31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000];
  class Meter {
    constructor(rate, size = 4096) {
      this.rate = rate; this.size = size;
      this.re = new Float64Array(size); this.im = new Float64Array(size);
      this.weights = ['A', 'C'].map(k => Float64Array.from({length:size / 2 + 1}, (_, i) => weight(i * rate / size, k)));
      this.reset();
    }
    reset() {
      this.samples = 0; this.energy = [0, 0, 0]; this.fast = [0, 0, 0]; this.slow = [0, 0, 0];
      this.maxFast = [0, 0, 0]; this.maxSlow = [0, 0, 0]; this.peak = 0; this.clipped = 0;
    }
    analyze(input) {
      const n = this.size, re = this.re, im = this.im;
      let sum = 0, peak = 0, clipped = 0;
      for (let i = 0; i < n; i++) { const x = input[i]; re[i] = x; im[i] = 0; sum += x*x; peak = Math.max(peak, Math.abs(x)); if (Math.abs(x) >= .999) clipped++; }
      for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
        if (i < j) { const x = re[i]; re[i] = re[j]; re[j] = x; }
      }
      for (let len = 2; len <= n; len <<= 1) {
        const angle = -2 * Math.PI / len, wr = Math.cos(angle), wi = Math.sin(angle);
        for (let start = 0; start < n; start += len) {
          let ur = 1, ui = 0;
          for (let j = 0; j < len / 2; j++) {
            const a = start+j, b = a+len/2, vr = re[b]*ur-im[b]*ui, vi = re[b]*ui+im[b]*ur;
            re[b]=re[a]-vr; im[b]=im[a]-vi; re[a]+=vr; im[a]+=vi;
            const next=ur*wr-ui*wi; ui=ur*wi+ui*wr; ur=next;
          }
        }
      }
      const powers = [0, 0, sum/n], bands = centers.map(() => 0), bins = centers.map(() => 0);
      for (let i = 0; i <= n/2; i++) {
        const p = (re[i]**2+im[i]**2)/(n*n)*(i===0||i===n/2?1:2), f = i*this.rate/n;
        powers[0] += p*this.weights[0][i]; powers[1] += p*this.weights[1][i];
        for (let b = 0; b < centers.length; b++) if (f >= centers[b]/2**(1/6) && f < centers[b]*2**(1/6)) { bands[b]+=p; bins[b]++; break; }
      }
      const dt = n/this.rate;
      for (let k = 0; k < 3; k++) {
        this.energy[k] += powers[k]*n;
        this.fast[k] += (powers[k]-this.fast[k]) * -Math.expm1(-dt/.125);
        this.slow[k] += (powers[k]-this.slow[k]) * -Math.expm1(-dt);
        this.maxFast[k] = Math.max(this.maxFast[k],this.fast[k]); this.maxSlow[k] = Math.max(this.maxSlow[k],this.slow[k]);
      }
      this.samples += n; this.peak=Math.max(this.peak,peak); this.clipped+=clipped;
      return {seconds:this.samples/this.rate, powers, fast:this.fast.slice(), slow:this.slow.slice(), maxFast:this.maxFast.slice(), maxSlow:this.maxSlow.slice(), leq:this.energy.map(e=>e/this.samples), sel:this.energy.map(e=>e/this.rate), peak:this.peak**2, clipped:this.clipped, bands:bands.map((p,i)=>bins[i]?db(p):null)};
    }
  }
  globalThis.SoundDSP = {Meter, db, weight, centers};
})();
