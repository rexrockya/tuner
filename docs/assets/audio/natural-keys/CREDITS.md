# Wurlitzer electric piano

Original recordings: **Greg Sullivan**, his Wurlitzer EP203W (the approved SFZ edition is named EP200). SFZ mapping and fixes: **kinwie**.

Source: https://github.com/sfzinstruments/GregSullivan.E-Pianos

Author: https://www.sullivang.net/wurlitzer-ep203w-electric-piano-for-gigasampler-gigastudio

Licensed **Creative Commons Attribution 3.0 Unported**: https://creativecommons.org/licenses/by/3.0/ . The complete source license is supplied in `LICENSE`. Attribution is required when redistributing these recordings. No endorsement is implied.

Changes: a Web Audio manifest converts all 48 SFZ regions, key/velocity boundaries, pitch correction and region gains; 42 source FLAC files are unchanged and WAV fallbacks are decoded losslessly. The first velocity range is extended from MIDI 1 to 0 for normalized browser events. Original smpl forward loops are retained with exclusive end boundaries. No invented round robins, no new looping, no independent normalization.

The source is a compact vintage recording (1999), not a modern deeply sampled instrument: mostly four recorded velocities, some high-register layers share recordings, and original loop/tuning limitations remain. The real source key span is MIDI 33–96.

Fixed source commit: `8c3e581acda3594b553948ff0222d4f84a698376`.

Every source file is verified against the Git blob SHA-1 from the fixed source tree. Source and distributed-file SHA-256 hashes are in `provenance.json`.
