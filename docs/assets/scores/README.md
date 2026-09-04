# Interactive score contract

The existing guitarlicks lesson player remains a separate PNG + MP3 experience.
Do not migrate or rewrite it as part of the full-score player.

Every new full score must use structured notation. A PDF or page image may be
offered as a download, but it must not be the interactive playback surface.

Required assets:

- MusicXML (`.musicxml` or `.mxl`) or an authored MuseScore (`.mscz`) source.
- A playback manifest with note events and `measureStarts` on the same musical
  time grid as the notation.
- Clear composer, arranger, source, and license metadata.

Required behavior:

- Clicking any rendered measure seeks to that measure and starts playback.
- The current measure is highlighted and followed while playback advances.
- Measure hit areas and highlights must union every staff in the matching OSMD
  `MeasureList` entry. Convert OSMD layout units to SVG viewBox units with the
  fixed 10:1 ratio; never multiply those coordinates by `osmd.Zoom`, because
  the SVG viewBox has already applied that zoom.
- Playback supports tempo changes, transposition, seeking, and a one-measure
  practice loop.
- Keyboard access and mobile scrolling must remain usable.

Playback uses the pinned `smplr` sample engine. The default grand piano is the
four-velocity-layer Splendid Grand Piano; additional General MIDI voices use
the heavier MusyngKite kit. Keep the lightweight Tone synth only as a network
failure fallback, not as the normal listening experience.

`catalog.json` is the Library index. Favorites are kept in browser storage and
the UI pins those pieces above the rest of the catalog.

Library search also queries the CC0 OpenScore Lieder and String Quartets TSV
indexes. Choosing an online result downloads its MXL from the official GitHub
repository, extracts MusicXML in the browser, derives playback timing, and saves
the item in browser storage. Keep this path client-side: users should never need
a code or catalogue deployment just to start using another OpenScore score.

Users can also connect a Flat Personal Access Token with the
`account.public_profile` and `scores` scopes. The token stays in that browser;
search reads the account's `allScores`, `collaborations`, and `likes` virtual
collections, and selected scores are exported from Flat as MusicXML through the
official API before entering the same local parsing and playback pipeline.

`scripts/build-interactive-score.py` creates each MusicXML and manifest pair:

```text
python scripts/build-interactive-score.py input.mid output.musicxml output.json \
  --id piece-id --title "Piece title" --composer "Composer" \
  --source-url "https://source.example/piece"
```

For production additions, prefer notation authored in MuseScore, Dorico,
Sibelius, or another MusicXML-capable editor. MIDI conversion is suitable for a
prototype only because MIDI does not preserve engraving, fingering, articulations,
or repeat layout as reliably as an authored notation file.
