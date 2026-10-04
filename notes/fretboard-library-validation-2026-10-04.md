# Source-first fretboard library validation — 2026-10-04

## Delivered scope

- All 2,545 existing phrase-library IDs route to their own original score/audio and harmonic map. Every one of the 12,170 source chord occurrences is parsed (128 distinct BopLand tokens; 138 across both sources).
- Exact-note navigation: 21 lessons, 623 source note events. One visually checked BopLand guitar TAB (lesson1297 / Xbv40aTf) and all 20 existing GuitarSet excerpts. All 17 crop carry-ins and 190 overlapping events are retained.
- The remaining 2,524 image-only BopLand entries provide clearly labeled harmony-only maps, without generated notes, guessed fingerings, or claims of exact in-bar chord timing.
- Original media is unchanged. BopLand original-audio alignment is unverified and does not drive fabricated note synchronization. GuitarSet cursors use original annotation times, which can themselves contain annotation error. Optional triangle-wave playback is labeled pitch/timing checking, not a replacement performance.

## Source and musical checks

`npm run test:fretboard` passes, including reproducible source hashes/catalog, all source-note pitch/string/fret/onset/duration comparisons, original1297 pitch/degree/explanations, 12 roots × 31 qualities, 2,056 chord-tone/ergonomic CAGED landmarks, enharmonics, slash and unknown harmonies, exact source crop duration, rests/gaps/polyphony, carry-in and retained tie metadata, no fabricated fingering, and 2,524 note-empty schematic maps.

The timing adapter preserves symbolic tie metadata; the included source corpus is direct event annotations/manual TAB, not an advertised generic MusicXML/OMR ingestion service. No image-only BopLand melody is claimed to have been automatically parsed.

## UI and interruption checks

Passed JSDOM and controlled WebAudio/media tests for all 21 exact routes, exact-ID deep links and returns, filtering, previous/next lessons, Back/Forward, stale queued animation callback, delayed rejected loads, original-audio ownership, play/stop while resume is pending, exact synthesized source starts/durations, loops, navigation/tempo cancellation, silent-gap harmony changes and invalid-ID recovery. Long fretboards retain intrinsic width and scroll; they no longer scale note labels down with 24-fret ranges.

All 20 local GuitarSet MP3s decode with ffmpeg/ffprobe: mono 44.1kHz, expected excerpt lengths. This is a structural media check, not subjective human-performance evaluation.

## Regression status

- `npm run test:fretboard`: passed after final core/UI fixes
- `npm run test:qa`: passed
- `npm run test:score`: passed
- `npm run test:sound`: passed, including 46/46 loudness-standard checks
- Existing practice tests before and after `practice-natural-banks.cjs`: passed
- Initial-page resource budget: 116,854 / 120,000 gzip bytes, 20 resources. The larger fretboard catalog is loaded only by the separate coach page, not the initial tuner page
- `git diff --check` and changed-JavaScript syntax checks: passed

`npm test` is not recorded as an unqualified pass. It stops on an existing cross-platform source-document hash assertion in `practice-natural-banks.cjs`: three unchanged tracked drum SFZ reference text files are LF in Git while the recorded source hashes use CRLF. Their bytes exactly match the baseline commit; converting only those three files to CRLF reproduces the expected hashes. Running that unchanged test against a temporary fixture restoring those three source-document line endings passes all its checks. No production sample, mapping, provenance, or existing test was altered to mask the baseline failure. Remaining suites were run separately and passed.

## Browser boundary

Pre-publication real-browser visual QA was blocked: cloud browser cannot reach the execution workspace's localhost, and local Chromium launch fails sandbox socket permissions. DOM assertions are not represented as real desktop/mobile rendering or physical-device listening. Published-site browser checks and exact deployment/commit verification must be reported separately after publishing.

## Maintenance

Run `npm run build:fretboard` to rebuild and `node scripts/build-fretboard-catalog.mjs --check` to verify reproducibility. Dataset provenance, unsupported-source research and the manually verified source seed are under `docs/assets/licks/fretboard/`. Publish only the existing GitHub Pages `main/docs` site. Do not run the optional Worker build over `docs`.

## Published-browser follow-up

The initial release tree (GitHub commit `74fdb7bc43af91fa3b8f2c407ec96d3c22a23a1d`) passed Pages build/deploy, and all 32 changed public assets matched local bytes. Cloud Chrome rendered the new source-first interface and usable scrolling fretboard, played a GuitarSet MP3 through its exact 7.441859-second endpoint, followed its annotated final bar, and rendered an image-only BopLand map with the correct Dm7/G7/Cmaj7 sequence and no fabricated route. Physical-phone rendering and subjective listening remain unverified.

Live round-trip testing revealed a pre-existing lazy-source-index race in the original lesson library: while the requested ID was unresolved, its fallback lesson briefly exposed the wrong coach link. The follow-up now shows a loading state and disables the fallback player/progress buttons until the requested source ID resolves. `tests/lesson-fretboard-routing.cjs` verifies both index load orders for BopLand and GuitarSet, including exact score/coach targets; affected lesson, supplemental, audio-stop and genre-control suites pass. Final publication verification is reported separately after this follow-up deploy.
