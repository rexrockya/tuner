# VSCO · 真实小提琴组

Recorded violin section vibrato sustains, two recorded velocity layers with one recording per pitch and layer. Actual ensemble recordings, not layered copies of the solo violin. No recorded legato transitions.

CC0 licensed source samples; see LICENSE.txt and UPSTREAM-README.txt. Source SFZ maps are retained. MIDI roots, key/velocity ranges, tuning and per-region levels come from those maps. Independent takes retain the original variant identity.

Lossless FLAC encoding of 44.1 kHz 16-bit derivatives, retaining original channels. Original recordings up to 8 seconds are kept complete. Longer recordings fade from 7.5 to 8 seconds. No per-sample loudness normalization, copied takes, invented legato or fabricated round robins. No loop is fabricated; sustain samples play their natural recorded body.

Every converted file has an original URL and original/converted SHA-256 in provenance.json. The complete sample pack is optional: select only the required pitch region, velocity layer and real take when preparing playback.

WAV compatibility files decode the same PCM as their FLAC counterpart. Three representative full decoded PCM hashes per bank were compared after conversion. File hashes/sizes are recorded in manifest.json and provenance.json.

The upstream SFZ maps do not override amp_veltrack or amp_velcurve_N. Each region retains SFZ default amp_veltrack=100, represented here by amplitudeExponent: 2: gain = (MIDI velocity / 127)^2, applied once after the original per-region level. No extra layer-normalized velocity curve or per-sample normalization is applied. Reference: https://sfzformat.com/opcodes/amp_veltrack/
