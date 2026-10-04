# Fretboard high-register validation — 2026-10-04

## Scope and cause

Image-only maps used an arbitrary focused viewport of frets 2–11. Their lesson model also stopped at fret 12 because its extent was derived only from source melody notes (which are intentionally absent for harmony-only maps). Merely adding fret lines would therefore still omit higher CAGED instances.

The model now covers at least 0–24, expanding further when an exact source requires it. Harmony maps start at 0–15 with direct 12–24 and full-board controls. Exact-note lessons retain source-focus mode. Fixed intrinsic SVG dimensions preserve note-label and click-target scale; long views scroll horizontally. Shape options identify their fret span and bring the complete selected shape into view without rewriting source selection.

Cmaj7 includes C-shape x–15–14–12–12–12 (C4 E4 G4 B4 E5), plus octave-repeated A/G/E/D forms. Low-string root anchors include 5/15 and 6/20 (C4). E5 unisons at 1/12, 2/17, 3/21 and the octave-down bridge at 4/14 (E4) are checked. Model-scoped octave buttons do not offer an unrenderable fret26 on a 24-fret map.

## Regression coverage

- `tests/fretboard-range.cjs`: minimum range for empty/low-note lessons; complete high Cmaj7 shapes and roots; source above24 expands; fret-range labels and shape auto-reveal; boundary-straddling 10–12 form; high note clicks/Enter; high octave/unison highlights; 0–15→12–24→full→0–15 with fixed SVG scale; high-register accompaniment chord follow; transposition/restore; original source selection, note sequence and media untouched
- A clearly synthetic high-note media-clock fixture exercises source follow at fret17. No checked-in source annotation was changed or claimed newly transcribed
- Independent review identified a fret26 octave target beyond the model; UI equivalent generation now consistently caps to model extent and a regression guards it
- All original catalog source hashes and 623 exact source events remain unchanged

## Checks and publication

Final `npm test` passed in full (exit 0), including fretboard/range/catalog/navigation/playback, shared backing, site/lesson, practice/audio, scores, QA/performance and sound/loudness-standard suites. `node --check` for changed JavaScript and `git diff --check` passed. Independent read-only review found no remaining blocking issue. Source assets and shared audio/player implementation are unchanged. Published visual/commit verification is recorded separately after deployment; no pending deploy is claimed here.

## Verification boundaries

DOM/controlled audio-clock regression is not physical-device or subjective audio validation. No audio engine, source recording, TAB data, melody synthesis behavior, hosting destination or access setting was redesigned. Only the existing main/docs GitHub Pages site is to be published.
