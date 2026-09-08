# Lesson library and source tempo validation — 2026-09-08

## Result

Added **20 actual acoustic-guitar recording + performance TAB pairs**, bringing the unique library entry count from 2,525 to **2,545**. The added examples are from GuitarSet v1.1.0, licensed CC BY 4.0, and cover Rock, Singer-songwriter, Funk, Jazz and Bossa interpretations of a 12-bar Blues. They preserve source performer and bar-window identity; the product explicitly distinguishes them from BopLand and identifies their notation as annotation-derived performance TAB. The additions are not new coverage of 6-4-1-5.

BopLand's live guitar index was checked at https://bopland.org/data/guitar-licks.js?t=1335 and still contained 2,525 unique IDs, with **zero new IDs** relative to the existing snapshot. Its 2,458 treble-clef IDs have different identifiers but the checked first phrase has identical musical notes to the corresponding guitar/TAB phrase, in a different octave/notation, so the treble index was not bulk-added as supposedly new musical content. The database CC BY-SA 4.0 source remains https://bopland.org/terms-of-use .

## New source evidence

Official dataset: https://zenodo.org/records/3371780 ; recording/annotation description: https://guitarset.weebly.com/ . The live record metadata explicitly identifies cc-by-4.0. Ten microphone WAVs and their exact corresponding JAMS files were extracted from the official public archives with HTTP range requests; all 20 extracted source files passed archive CRC32 and length checks. Source file bytes total 32,424,166; these full inputs are not deployed. Full authors, licensing, changes, source filenames, and SHA-256 provenance are documented in docs/assets/licks/guitarset/README.md, source-files.json, and manifest.json.

The 20 deployed MP3s total **2,899,816 bytes** (about 2.77 MiB). The index is lazy-loaded only after entering the library; individual score/audio files load on selection. Source measures 5–8 and 9–12 do not overlap within a source recording. This collection consists of two distinct performers across five styles, not twenty different underlying chord progressions.

## Validation

- Updated lesson-smoke: new lick selection resets BPM to its original; same selection and favorite/rerender retain the current practice tempo. Invalid noninteger selection is ignored.
- New lesson-supplemental: 20 unique IDs/audio paths, 2,545 final entries, supplemental-before-main ordering, repeated registration without duplicate growth, source filter, deep link, exact 129 BPM (no nearest-5 rounding), native playbackRate = 1, source/notation credit, all file hashes, and each note's original string/pitch/time derivation.
- Actual ffmpeg decoding of all 20 MP3 files produced the same number of sample frames as their original microphone crop. All source-crop versus decoded-audio correlations exceeded **0.999347** with no timeline shift; measurements are saved in guitarset-audio-qa-2026-09-08.json. This verifies crop/encoding alignment, not perfect upstream transcription accuracy.
- Three representative TAB SVGs (gs00rock5, gs01rock9, gs00bn5) rendered and visually inspected: clear string/beat labels, source bar numbers and chord labels, aligned fret numbers and sustain marks.

## Original-speed behavior

Initial library load begins at source speed rather than adopting a previously shared metronome BPM. Actual selection resets to source originalBpm (BopLand defaults 120); clicking the same selected phrase, favoriting, and asynchronous metadata rerenders do not reset a user's slowed practice tempo. Changing to a recording with a nonmultiple-of-five tempo uses the exact source tempo (e.g. 129), and minus/plus controls change it by 5. Source tempo also controls the library backing audio clock.

## Boundaries

The new material is genuine acoustic guitar, not newly licensed electric Blues recordings. TAB derives from dataset annotations; timing/notes/articulations have not all been manually transcribed again. Known upstream faulty tracks are excluded. Live phone playback, subjective speaker/headphone tone, and iOS audio decoder behavior still need device validation. Existing BopLand score/MP3 assets still depend on its external server.
