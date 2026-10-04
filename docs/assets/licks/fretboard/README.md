# Source-preserving fretboard lesson catalog

This catalog covers **all 2,545 existing phrase-library IDs**. It provides exact note data only where an auditable source exists: **one manually checked BopLand guitar TAB (lesson1297 / Xbv40aTf), plus all 20 existing GuitarSet annotation-derived excerpts**. The remaining 2,524 BopLand lessons explicitly report `source-note-data-unavailable`; their original scores and demonstration audio remain linked. Their original per-bar chord tokens support clearly labeled harmony-only maps: **和弦地图，尚未核对原谱逐音路线**. Coverage must never be presented as 2,545 completed note-by-note transcriptions.

No generated compositions, transposed substitutions, treble-clef OMR, inferred fingering or guessed note timing are used. Original source media files are not modified.

## Reproduce and verify

From the repository root, with Node.js and no added dependencies:

```sh
node scripts/build-fretboard-catalog.mjs
node scripts/build-fretboard-catalog.mjs --check
node scripts/build-fretboard-catalog.test.mjs
```

The build reads the existing official BopLand index, existing GuitarSet index and annotation files, and the manually verified source seed in `source/lesson1297.json`. It verifies every GuitarSet audio, score and annotation SHA-256 against the existing source provenance manifest. MP3 and SVG assets match byte-for-byte; annotation JSON differs only because Git checks out LF while the original generator recorded CRLF. The build verifies that exact reversible line-ending difference and records both hashes; no other difference is accepted. It does not access the network. `manifest.json` records coverage, source-input hashes, per-lesson hashes and note counts. `source/research.json` records the official-source availability review and its limits.

## Runtime-neutral contract

- `catalog.json`: `schemaVersion`, `total`, `supportedCount` (alias `preciseNavigationCount`), `unsupportedCount`, `harmonicProgressionCount`, `defaultLessonId`, source attribution, human-readable unsupported reasons, and `lessons`
- Each catalog lesson keeps the existing exact `id`, library title/category/key/meter/bars/progression, original `score` and `audio` paths, and `supported`
- Supported entries have `data: assets/licks/fretboard/ID.json`; unsupported entries have `data: null` and an explicit reason, with no synthetic fallback
- Every entry preserves `barChords`, the exact original chord tokens grouped by bar. `navigationMode` distinguishes `source-notes` from `harmony-only`; harmony-only `harmonyTiming: bar-membership-only` conveys that intra-bar durations are unverified. A schematic chord map must not be presented as an exact synchronized original melody
- Each lesson JSON provides `notes`, `chords`, source/verification/timing metadata, and original media paths
- `timeUnit: quarter-note-beats`: all note/chord `start` and `duration` fields are quarter-note beats from the excerpt's start; `bar` and `beat` are 1-based; `string` is 1 = high E through 6 = low E
- MIDI pitches are **sounding** pitches; standard tuning is E2 A2 D3 G3 B3 E4. String/fret positions are the original source positions
- GuitarSet notes are not quantized. Each retains exact existing `timeSeconds`, `durationSeconds`, source onset/duration, fractional `sourceMidi`, carry-in status and all original fields in `annotation`. Overlapping notes must remain overlapping
- GuitarSet `durationSeconds` is the exact crop boundary difference, which may be slightly under the nominal four bars. It is not rounded or padded. `audioSync: annotation-relative` refers to annotation timing against the existing clip, not independent audio-onset verification
- GuitarSet chord `start`/`duration` are **navigation regions for a per-bar sample**, not exact harmonic change boundaries. `sampledAtBeat` is a zero-based quarter-note offset (beat 2 of the indicated bar); `precision: per-bar-sample` and `exactChangeTiming: false` must remain visible in interpretation
- BopLand lesson1297 has verified notation beats but no verified original audio tempo or alignment. `originalBpm: null` and `audioSync: unverified` must not be silently replaced by a claim of synchronized original playback. An explicitly labeled optional synthesized note demonstration is different from original audio

## Attribution

**BopLand.org** guitar TAB and original demonstration audio: [original lesson](https://bopland.org/lick#Xbv40aTf/guitar-licks/), [project](https://bopland.org/home), **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**. The note-event seed is an adaptation of the original guitar score; retain this attribution and share-alike terms.

**GuitarSet v1.1.0**, Qingyang Xi, Rachel M. Bittner, Johan Pauwels, Xuzhou Ye and Juan P. Bello: [source dataset](https://zenodo.org/records/3371780), **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**. Citation: “GuitarSet: A Dataset for Guitar Transcription,” ISMIR, 2018. Existing audio crops, source measures and annotation-derived TAB changes are documented in `../guitarset/README.md` and its manifest. This catalog adds navigation fields without changing those existing assets.
