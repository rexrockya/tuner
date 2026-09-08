# TUner electronic percussion source assets

These eight short WAV files are original deterministic program synthesis created for TUner. They contain no downloaded samples, third-party recordings, speech, melodies, or excerpts of songs. The source is the included `generate.cjs`, which uses only Node.js standard-library modules and standard digital signal-processing operations.

All files are mono, 44,100 Hz, 16-bit PCM. Kick 1/2 are 0.45 seconds each, snare 1/2 are 0.22 seconds each, closed hat 1/2 are 0.08 seconds each, open hat is 0.40 seconds, and the metallic ride-like sound is 0.60 seconds. These are electronic percussion patches, not claims of acoustic instrument recordings. Numbered pairs are synthesized timbral/noise variants, not recorded round-robin takes.

- Kick: phase-continuous sine sweep, restrained harmonic saturation, and a short filtered-noise click.
- Snare: two decaying body modes and independently seeded, band-limited noise.
- Hats and ride: filtered noise with inharmonic sine partials. No oscillator partial is intentionally above Nyquist.
- Output: 18 Hz DC cleanup, a 0.35 ms raised-cosine attack, and a raised-cosine tail fade. Each file begins and ends at zero. Peak amplitude is below 0.8 full scale; exact quantized peak and SHA-256 are recorded in `manifest.json`.

Reproduce from this directory:

```powershell
node .\generate.cjs
node .\verify.cjs
```

Generation overwrites only the named WAV files and manifest in the same directory as the generator. There are no network calls or third-party dependencies. Repeated generation on the same Node.js runtime produces byte-identical files and manifests. Very small cross-platform floating-point differences are possible; use the supplied hashes for the delivered files.

For open-hat choking, the player should apply a brief release when a closed hat arrives. Instrument/style selection, note scheduling, and velocity remain the player's responsibilities. This folder has not been installed into the website checkout.
