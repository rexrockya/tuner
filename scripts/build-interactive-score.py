"""Build browser-ready score data from a quantized MIDI file.

The generated MusicXML is the visual source used by OpenSheetMusicDisplay. The
JSON manifest is the playback source used by the site. Keeping both artifacts
on the same MIDI tick grid gives every rendered measure a deterministic seek
time without relying on PDF coordinates.

Usage:
    python scripts/build-interactive-score.py input.mid output.musicxml output.json \
        --id original-rags --title "Original Rags" --composer "Scott Joplin"
"""

from __future__ import annotations

import json
import math
import argparse
from collections import defaultdict
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, indent, tostring

from mido import MidiFile, merge_tracks, tempo2bpm, tick2second


PITCHES = (
    ("C", 0), ("C", 1), ("D", 0), ("D", 1), ("E", 0), ("F", 0),
    ("F", 1), ("G", 0), ("G", 1), ("A", 0), ("A", 1), ("B", 0),
)


def add_text(parent: Element, tag: str, value: object, **attributes: str) -> Element:
    node = SubElement(parent, tag, attributes)
    node.text = str(value)
    return node


def note_pitch(parent: Element, midi_note: int) -> None:
    pitch = SubElement(parent, "pitch")
    step, alter = PITCHES[midi_note % 12]
    add_text(pitch, "step", step)
    if alter:
        add_text(pitch, "alter", alter)
    add_text(pitch, "octave", midi_note // 12 - 1)


def read_midi(path: Path) -> dict:
    midi = MidiFile(path)
    ticks_per_beat = midi.ticks_per_beat
    tempo = 500_000
    numerator, denominator = 4, 4
    key = "C"

    for message in merge_tracks(midi.tracks):
        if message.type == "set_tempo":
            tempo = message.tempo
            break
    for track in midi.tracks:
        for message in track:
            if message.type == "time_signature":
                numerator, denominator = message.numerator, message.denominator
            elif message.type == "key_signature":
                key = message.key

    notes = []
    for track_index, track in enumerate(midi.tracks):
        if track_index == 0:
            continue
        absolute_tick = 0
        active: dict[tuple[int, int], list[tuple[int, int]]] = defaultdict(list)
        for message in track:
            absolute_tick += message.time
            if message.type == "note_on" and message.velocity > 0:
                active[(message.channel, message.note)].append((absolute_tick, message.velocity))
            elif message.type in {"note_off", "note_on"}:
                stack = active.get((message.channel, message.note))
                if not stack:
                    continue
                start_tick, velocity = stack.pop(0)
                if absolute_tick > start_tick:
                    notes.append({
                        "track": track_index - 1,
                        "pitch": message.note,
                        "velocity": velocity,
                        "startTick": start_tick,
                        "endTick": absolute_tick,
                    })

    quarter_factor = 4 / denominator
    measure_ticks = round(ticks_per_beat * numerator * quarter_factor)
    final_tick = max((item["endTick"] for item in notes), default=measure_ticks)
    measure_count = math.ceil(final_tick / measure_ticks)
    seconds_per_tick = tick2second(1, ticks_per_beat, tempo)

    for item in notes:
        item["time"] = round(item["startTick"] * seconds_per_tick, 6)
        item["duration"] = round((item["endTick"] - item["startTick"]) * seconds_per_tick, 6)

    return {
        "midi": midi,
        "ticksPerBeat": ticks_per_beat,
        "tempo": tempo,
        "bpm": round(tempo2bpm(tempo), 4),
        "numerator": numerator,
        "denominator": denominator,
        "key": key,
        "measureTicks": measure_ticks,
        "measureCount": measure_count,
        "finalTick": final_tick,
        "secondsPerTick": seconds_per_tick,
        "notes": notes,
    }


def key_fifths(key: str) -> int:
    major = {"Cb": -7, "Gb": -6, "Db": -5, "Ab": -4, "Eb": -3, "Bb": -2, "F": -1,
             "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7}
    minor = {"Ab": -7, "Eb": -6, "Bb": -5, "F": -4, "C": -3, "G": -2, "D": -1,
             "A": 0, "E": 1, "B": 2, "F#": 3, "C#": 4, "G#": 5, "D#": 6, "A#": 7}
    if key.endswith("m"):
        return minor.get(key[:-1], 0)
    return major.get(key, 0)


def append_staff_measure(
    measure: Element,
    notes: list[dict],
    staff: int,
    start_tick: int,
    end_tick: int,
) -> None:
    relevant = [item for item in notes if item["track"] == staff - 1 and item["startTick"] < end_tick and item["endTick"] > start_tick]
    boundaries = {start_tick, end_tick}
    for item in relevant:
        boundaries.add(max(start_tick, item["startTick"]))
        boundaries.add(min(end_tick, item["endTick"]))
    points = sorted(boundaries)

    for left, right in zip(points, points[1:]):
        duration = right - left
        sounding = sorted(
            (item for item in relevant if item["startTick"] <= left and item["endTick"] >= right),
            key=lambda item: item["pitch"],
        )
        if not sounding:
            node = SubElement(measure, "note")
            SubElement(node, "rest")
            add_text(node, "duration", duration)
            add_text(node, "voice", 1)
            add_text(node, "staff", staff)
            continue

        for chord_index, item in enumerate(sounding):
            node = SubElement(measure, "note")
            if chord_index:
                SubElement(node, "chord")
            note_pitch(node, item["pitch"])
            add_text(node, "duration", duration)
            add_text(node, "voice", 1)
            add_text(node, "staff", staff)
            tie_types = []
            if item["startTick"] < left:
                tie_types.append("stop")
            if item["endTick"] > right:
                tie_types.append("start")
            for tie_type in tie_types:
                SubElement(node, "tie", {"type": tie_type})
            if tie_types:
                notations = SubElement(node, "notations")
                for tie_type in tie_types:
                    SubElement(notations, "tied", {"type": tie_type})


def build_musicxml(data: dict, title: str, composer: str) -> bytes:
    root = Element("score-partwise", {"version": "4.0"})
    work = SubElement(root, "work")
    add_text(work, "work-title", title)
    identification = SubElement(root, "identification")
    add_text(identification, "creator", composer, type="composer")
    encoding = SubElement(identification, "encoding")
    add_text(encoding, "software", "Xianyin interactive score pipeline")

    part_list = SubElement(root, "part-list")
    score_part = SubElement(part_list, "score-part", {"id": "P1"})
    add_text(score_part, "part-name", "Piano")
    part = SubElement(root, "part", {"id": "P1"})

    for measure_index in range(data["measureCount"]):
        start_tick = measure_index * data["measureTicks"]
        end_tick = min((measure_index + 1) * data["measureTicks"], data["finalTick"])
        if end_tick <= start_tick:
            continue
        measure = SubElement(part, "measure", {"number": str(measure_index + 1)})
        if measure_index == 0:
            attributes = SubElement(measure, "attributes")
            add_text(attributes, "divisions", data["ticksPerBeat"])
            key = SubElement(attributes, "key")
            add_text(key, "fifths", key_fifths(data["key"]))
            time = SubElement(attributes, "time")
            add_text(time, "beats", data["numerator"])
            add_text(time, "beat-type", data["denominator"])
            add_text(attributes, "staves", 2)
            clef1 = SubElement(attributes, "clef", {"number": "1"})
            add_text(clef1, "sign", "G")
            add_text(clef1, "line", 2)
            clef2 = SubElement(attributes, "clef", {"number": "2"})
            add_text(clef2, "sign", "F")
            add_text(clef2, "line", 4)
            direction = SubElement(measure, "direction", {"placement": "above"})
            direction_type = SubElement(direction, "direction-type")
            metronome = SubElement(direction_type, "metronome")
            add_text(metronome, "beat-unit", "quarter")
            add_text(metronome, "per-minute", int(round(data["bpm"])))
            SubElement(direction, "sound", {"tempo": str(data["bpm"])})

        append_staff_measure(measure, data["notes"], 1, start_tick, end_tick)
        backup = SubElement(measure, "backup")
        add_text(backup, "duration", end_tick - start_tick)
        append_staff_measure(measure, data["notes"], 2, start_tick, end_tick)

    indent(root, space="  ")
    declaration = b'<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
    doctype = b'<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n'
    return declaration + doctype + tostring(root, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("xml_output", type=Path)
    parser.add_argument("json_output", type=Path)
    parser.add_argument("--id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--composer", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--source-label", default="Mutopia Project · Public Domain")
    args = parser.parse_args()
    source, xml_output, json_output = args.source, args.xml_output, args.json_output
    data = read_midi(source)
    xml_output.parent.mkdir(parents=True, exist_ok=True)
    xml_output.write_bytes(build_musicxml(data, args.title, args.composer))

    manifest = {
        "id": args.id,
        "title": args.title,
        "composer": args.composer,
        "musicXml": xml_output.name,
        "sourceBpm": data["bpm"],
        "timeSignature": [data["numerator"], data["denominator"]],
        "duration": round(data["finalTick"] * data["secondsPerTick"], 6),
        "measureStarts": [
            round(index * data["measureTicks"] * data["secondsPerTick"], 6)
            for index in range(data["measureCount"])
        ],
        "notes": [
            {key: item[key] for key in ("track", "pitch", "velocity", "time", "duration")}
            for item in sorted(data["notes"], key=lambda item: (item["startTick"], item["track"], item["pitch"]))
        ],
        "source": {
            "label": args.source_label,
            "url": args.source_url,
        },
    }
    json_output.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {xml_output} ({data['measureCount']} measures)")
    print(f"wrote {json_output} ({len(data['notes'])} notes, {manifest['duration']} seconds)")


if __name__ == "__main__":
    main()
