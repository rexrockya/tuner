# Blues practice samples

All bundled audio in this directory is CC0 1.0 Universal; see LICENSE-CC0.txt.

- Drums: Virtuosity Drums by Versilian Studios and Karoryfer Samples, performed by Austin McMahon at Virtuosity Musical Instruments, Boston. Source: https://github.com/sfzinstruments/virtuosity_drums/tree/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc
- Bass: Fashionbass by Karoryfer Samples. Source: https://github.com/sfzinstruments/karoryfer.fashionbass/tree/0703973b300a6bacb837602be9b588ab64732a72
- The author also confirms the CC0 status of its free libraries at https://shop.karoryfer.com/pages/free-samples .
- Verified/downloaded 2026-09-08. This credit does not imply endorsement.

These are individual instrument recordings, not existing songs or backing tracks. TUner's arrangements are generated locally in the browser.

## Source and processing manifest

| Local file | Original file | Start trim / length / gain |
| --- | --- | --- |
| kick-1.wav | [Samples/kickmic/kick/kickmic_kick_snon_vl3_rr1.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/kickmic/kick/kickmic_kick_snon_vl3_rr1.flac) | 0.002 s / 1.2 s / +5 dB |
| kick-2.wav | [Samples/kickmic/kick/kickmic_kick_snon_vl3_rr2.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/kickmic/kick/kickmic_kick_snon_vl3_rr2.flac) | 0.002 s / 1.2 s / +5 dB |
| snare-1.wav | [Samples/oh/snare/oh_snare_center_vl24.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/oh/snare/oh_snare_center_vl24.flac) | 0.006 s / 1.4 s / +7 dB |
| snare-2.wav | [Samples/oh/snare/oh_snare_center_vl25.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/oh/snare/oh_snare_center_vl25.flac) | 0.006 s / 1.4 s / +7 dB |
| hat-1.wav | [Samples/oh/hh/oh_hh_closed_vl3_rr1.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/oh/hh/oh_hh_closed_vl3_rr1.flac) | 0.003 s / 0.45 s / +13 dB |
| hat-2.wav | [Samples/oh/hh/oh_hh_closed_vl3_rr2.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/oh/hh/oh_hh_closed_vl3_rr2.flac) | 0.003 s / 0.45 s / +13 dB |
| open-hat.wav | [Samples/oh/hh/oh_hh_open_vl2_rr1.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/oh/hh/oh_hh_open_vl2_rr1.flac) | 0.003 s / 2.5 s / +16 dB |
| ride.wav | [Samples/oh/ride/oh_ride_ride_vl2_rr1.flac](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/Samples/oh/ride/oh_ride_ride_vl2_rr1.flac) | 0.002 s / 3.6 s / +13 dB |
| bass-29.wav | [notes/f1_mf_rr1.wav](https://raw.githubusercontent.com/sfzinstruments/karoryfer.fashionbass/0703973b300a6bacb837602be9b588ab64732a72/notes/f1_mf_rr1.wav) | 0 s / 3.2 s / +3 dB |
| bass-35.wav | [notes/b1_mf_rr1.wav](https://raw.githubusercontent.com/sfzinstruments/karoryfer.fashionbass/0703973b300a6bacb837602be9b588ab64732a72/notes/b1_mf_rr1.wav) | 0 s / 3.2 s / +3 dB |
| bass-41.wav | [notes/f2_mf_rr1.wav](https://raw.githubusercontent.com/sfzinstruments/karoryfer.fashionbass/0703973b300a6bacb837602be9b588ab64732a72/notes/f2_mf_rr1.wav) | 0 s / 3.2 s / +3 dB |
| bass-47.wav | [notes/b2_mf_rr1.wav](https://raw.githubusercontent.com/sfzinstruments/karoryfer.fashionbass/0703973b300a6bacb837602be9b588ab64732a72/notes/b2_mf_rr1.wav) | 0 s / 3.2 s / +3 dB |

Every file is resampled to 44.1 kHz PCM 16-bit WAV. The kick and bass files are mono; the remaining drum files preserve overhead stereo. Each tail has a 120 ms fade-out. The two kicks/closed hats are round-robin takes; the two snares are neighboring recorded velocity layers. No synthesized drums are substituted for these recordings.

## Bass mapping

| File | MIDI root | Pitch |
| --- | ---: | --- |
| bass-29.wav | 29 | F1 |
| bass-35.wav | 35 | B1 |
| bass-41.wav | 41 | F2 |
| bass-47.wav | 47 | B2 |

MIDI roots come from the original fashionbass_clean.sfz pitch_keycenter values. Play the closest sample with playbackRate = 2 ** ((midi - root) / 12). All four samples use the mf dynamic and first round-robin take. Preserve the plucked onset and use a short release envelope when cutting a note.

## Lossless delivery (2026-09-08)

The manifest now prefers FLAC encodings of these exact 16-bit PCM samples, with the original WAV files as decode/network fallbacks. All 12 decoded PCM checksums match: WAV 3,070,296 bytes → FLAC 1,031,145 bytes (66.42% smaller). No additional equalization, resampling or lossy compression was applied.


## Mellow archtop guitar (2026-09-08)

Shinyguitar by Karoryfer Samples, archtop played and mapped by D. Smolken. The official instrument page (https://shop.karoryfer.com/pages/free-shinyguitar) links this GitHub source. The official free-samples page (https://shop.karoryfer.com/pages/free-samples) confirms CC0 for these libraries, including older downloads formerly carrying another license. The pinned repository LICENSE is retained in SHINYGUITAR-LICENSE.txt. Source revision: 57243cca85277dbcc120ce17c6178032f93c80f3.

24 electric pickup samples: MIDI 45, 51, 57, 63, 69, 75; source velocity layers 2 and 3; two independently recorded round-robin takes per layer/root. MIDI roots were checked against Programs/electric_one.sfz. The local manifest preserves roots, layers and variant IDs. Each original recording is converted to mono 44.1 kHz 16-bit, limited to 3 seconds with a 120 ms tail fade, then losslessly compressed to FLAC with WAV fallback. No normalization or EQ is baked into the assets. Per-file original URLs, SHA-256 hashes and processing facts are in shinyguitar-provenance.json.

The browser selects the nearest root (maximum four semitones over the generated lead range), recorded dynamic and take; a soft low-pass tone and restrained room send provide the mellow presentation. Lead and rhythm use separate volume buses. These are instrument recordings, not excerpts from existing songs. No artist endorsement is implied.
