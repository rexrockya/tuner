# Natural jazz drum kit

**Virtuosity Drums**, Versilian Studios and Karoryfer Samples. Drums performed by **Austin McMahon**, recorded at Virtuosity Musical Instruments, Boston. Source: https://github.com/sfzinstruments/virtuosity_drums . Licensed **CC0 1.0 Universal**, complete legal text supplied in `LICENSE`.

This browser bank uses the kick close microphone and overhead microphone for the remaining kit, with real multi-velocity recordings. Kick and closed hi-hat retain four original round robins per velocity. Other cymbals retain two real round robins per selected layer. Snare, cross-stick, rimshot and toms use distinct original velocity takes, **not round robins**. Twelve snare center layers are selected from the original 36.

Changes: stereo/mono layouts retained; converted to 44.1 kHz 16-bit PCM with lossless FLAC and WAV alternatives. No attack trimming and no per-sample normalization. Each articulation has one shared linear playback gain to bring its loudest original peak to -3 dBFS (maximum +24 dB); original layer/take level differences remain. Longer kit tails have bounded durations and a 0.2-second maximum end fade. Individual operations and hashes are in `provenance.json`.

This is a live jazz kit with room and snare resonance, not an isolated modern studio multi-microphone mix. The reduced bank does not include every source layer or microphone.

Fixed source commit: `9f04cf9a734527edfbb0a4eee1f674e45bbf71bc`.

Every source file is verified against the Git blob SHA-1 from the fixed source tree. Source and distributed-file SHA-256 hashes are in `provenance.json`.


Original SFZ velocity response is retained separately from audio gain: snare/toms have zero additional velocity tracking, while kick and cymbals combine original master and per-region curve points. For 50% tracking the original response is `0.5 + 0.5 * curve`, precomputed into the browser curve; it is not a second velocity multiplier. The source mapping files and hashes are supplied. Selected layers have broader browser velocity zones than the full original kit; source zones remain in `sourceVelocityRange`.
