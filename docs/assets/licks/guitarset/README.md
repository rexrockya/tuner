# GuitarSet live guitar excerpts

20 four-bar excerpts from 10 genuine microphone recordings in **GuitarSet v1.1.0**. These are acoustic-guitar performances, not synthesizer renditions, famous-artist transcriptions, or alternate-clef copies of existing BopLand phrases.

- Source dataset: https://zenodo.org/records/3371780
- Project: https://guitarset.weebly.com/
- Authors: Qingyang Xi, Rachel M. Bittner, Johan Pauwels, Xuzhou Ye, Juan P. Bello.
- License: **Creative Commons Attribution 4.0 International** — https://creativecommons.org/licenses/by/4.0/ . The source record's metadata explicitly reports cc-by-4.0; do not confuse the repository code's MIT license with the dataset license.
- Citation: Q. Xi, R. M. Bittner, J. Pauwels, X. Ye, J. P. Bello, “GuitarSet: A Dataset for Guitar Transcription”, ISMIR, 2018.

## Changes and attribution

The source audio was cropped to source measures 5–8 and 9–12, given 2 ms boundary fades, and encoded as 128 kbps mono MP3. No synthesized notes, pitch shifting, tempo changes, or accompaniment were added.

The SVG **performance TAB** is newly typeset from the matching source JAMS note_midi annotations. It preserves source string assignment, rounded MIDI semitone, note start time, and clipped sustain duration. Horizontal spacing shows performance time, not quantized conventional rhythmic notation; a green line shows sustain. Notes already sounding at a crop boundary are retained as carry-in notes. The chord labels come from the source instructed chord/lead-sheet annotation, not a new inferred harmony. This is annotation-derived tablature, not an independently hand-verified published score; bends and timbral articulations remain audible but are not separately engraved. The original recording must be the reference when notation differs.

Styles: Rock Blues, Singer-songwriter Blues, Funk Blues, Jazz Blues, Bossa Blues. Two source performers and two nonoverlapping four-bar windows per performance = 20 assets. Source original tempi are 90, 100, 97, 130, and 129 BPM; the player must preserve these exact values at normal playback speed.

## Provenance and reproduction

manifest.json records every excerpt's source track, measures, source/cropped asset SHA-256, audio size, and note count. Each adjacent JSON retains the precise source onset/duration, string, fret, crop sample boundaries and sample rate. source-files.json records the ten original WAV/JAMS pairs with exact bytes and source-archive membership.

Download the selected source filenames listed in source-files.json from the dataset's annotation.zip and audio_mono-mic.zip. They can be extracted into one local directory without shipping the complete dataset. With Python 3 and ffmpeg installed, from the repository root run:

```
python scripts/build-guitarset-licks.py --source-dir PATH_TO_SELECTED_ORIGINAL_FILES
```

The script builds this directory and the lazy ../guitarset-index.js. Only the generated 20 excerpts, compact subset annotations, source notes, and manifest are shipped. The large original recordings/annotations are not required at runtime. Files are loaded only when selected; no extra sound download occurs on the initial tuner page.

Known upstream timing/duplicate-note issues were checked: https://github.com/marl/GuitarSet/issues/5 and https://github.com/marl/GuitarSet/issues/4 . The three named source tracks (04_BN3-154-E_comp, 04_Jazz1-200-B_comp, 02_Funk2-119-G_comp) are excluded. This does not assert that all remaining upstream annotations are error-free.
