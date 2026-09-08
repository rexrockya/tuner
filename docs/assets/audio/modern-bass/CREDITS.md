# Modern electric bass samples

Source: Karoryfer Samples / D. Smolken, Swagbass.
Official source: https://shop.karoryfer.com/pages/free-swagbass
Repository: https://github.com/sfzinstruments/karoryfer.swagbass
Pinned source commit: 9d10fcae71af1975988ddecd5af1c95d372c7355
License: CC0 1.0 Universal; full text in LICENSE.txt.

The source author identifies the recorded instrument as an Ibanez BTB-400QM, recorded direct with the neck pickup, flat onboard EQ, and old d'Addario Chrome flatwound strings. These are not Fender Precision Bass recordings. The app's P-style description describes the intended voicing.

Web subset: 8 recorded pitches (MIDI 27, 30, 33, 36, 39, 42, 48, 54), the source's f velocity layer, and 2 independently recorded round robins per pitch. The original library offers 3 layers and 4 round robins; the web subset does not claim the full original coverage.

Processing: retained the first 4 seconds, added a 120 ms tail fade, converted 24-bit mono WAV to 44.1 kHz mono 16-bit PCM WAV, then losslessly compressed it as FLAC. A shared gain for each pitch's two round robins sets the louder recording's peak to -3 dBFS, retaining the relative level of the two takes. Onset starts within 0.3 ms in the originals, so no leading audio was removed. No pitch shifting, synthetic replacement, EQ or compression was baked into these files.

Each FLAC has a PCM WAV fallback. The source and generated checksums and exact gains are recorded in provenance.json.
