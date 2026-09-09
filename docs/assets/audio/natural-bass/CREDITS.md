# Natural bass recordings

Karoryfer Swagbass by D. Smolken, pinned at [9d10fcae71af1975988ddecd5af1c95d372c7355](https://github.com/sfzinstruments/karoryfer.swagbass/tree/9d10fcae71af1975988ddecd5af1c95d372c7355). CC0 1.0; original LICENSE, README and clean SFZ are retained beside this document. Source author does not endorse this app.

The recorded instrument is an Ibanez BTB-400QM with neck pickup and old DAddario Chrome flatwound strings, recorded DI without effects and with EQ flat. It is not a Fender Precision recording.

144 individual notes: 12 original pitch centers (MIDI 27..60 in steps of 3), three recorded dynamics (p/f/fff), four independent recordings per pitch and dynamic. Source SFZ velocity ranges 0-50, 51-110, 111-127 and sequence order are preserved. The source omits pitch_keycenter for its C5-named recording groups; the SFZ default is MIDI60, matching the local root mapping.

Preserve each original recording up to 8 seconds, including onset and natural decay; only final 20ms safety fade; mono 44.1kHz PCM16, lossless FLAC plus bit-identical decoded WAV fallback. No per-note or per-velocity normalization, pitch shift, EQ, compression or added effects. Shared gain 0dB.

The manifest contains 0-based variant IDs, original MIDI key/velocity ranges and sustain articulation. The fallback is an exact PCM-equivalent WAV for browsers unable to decode FLAC. Individual source Git-blob hashes, SHA256 hashes, PCM equivalence, durations and sizes are in provenance.json. Dynamics have not been levelled independently; a quiet pluck remains a quiet recorded pluck.

The manifest also preserves the original SFZ amplitude velocity curves: p uses [[0,0],[50,1],[127,1]], f uses [[0,0],[110,1],[127,1]], and fff uses the standard exponent 2. The player should apply this response once, without another global velocity multiplier. These curves do not normalize or alter the recorded samples.
