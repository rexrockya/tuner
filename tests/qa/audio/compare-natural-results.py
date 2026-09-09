#!/usr/bin/env python3
"""Measure existing practice renders and make a constant-gain listening pair.

No audio rendering or system-audio playback occurs. Requires Python 3.9+ and
FFmpeg with ebur128/ametadata filters. Report-adjacent WAVs are preferred so an
entire render directory can move between machines without editing stored paths.

Example:
  python compare-natural-results.py --workdir ./audio-renders --root .
  python compare-natural-results.py --workdir ./audio-renders --cases mix-warm,mix-violin --out-dir ./check
"""
import argparse
import concurrent.futures
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess


def sha256(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def write_json(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_report(file):
    return json.loads(file.read_text(encoding="utf-8-sig"))


def relative(file, directory):
    return Path(os.path.relpath(file, directory)).as_posix()


def wav_path(report_file, result):
    adjacent = report_file.parent / (result["name"] + ".wav")
    if adjacent.is_file():
        return adjacent
    stored = Path(result["wav"])
    if stored.is_file():
        return stored.resolve()
    raise FileNotFoundError(f"Missing render for {result['name']}: {adjacent}")


def measure(ffmpeg, file):
    command = [ffmpeg, "-hide_banner", "-nostats", "-i", str(file), "-af",
               "ebur128=metadata=1:peak=true,ametadata=print:key=lavfi.r128.I",
               "-f", "null", "-"]
    process = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", check=True)
    metadata = re.findall(r"lavfi\.r128\.I=([^\r\n]+)", process.stderr)
    peak = re.search(r"Peak:\s*([-\d.]+) dBFS", process.stderr.split("Summary:")[-1])
    if not metadata or not peak:
        raise RuntimeError(f"Missing EBU metadata or true-peak summary: {file}")
    integrated, true_peak = float(metadata[-1]), float(peak[1])
    if not math.isfinite(integrated) or not math.isfinite(true_peak):
        raise ValueError(f"Cannot match a silent/non-finite recording: {file}")
    return {"integratedLUFS": integrated, "truePeakDbTP": true_peak}


def verify_sources(reports, root):
    sources, mismatch = {}, []
    for file, report in reports:
        for name, expected in report["sourceHashes"].items():
            if name in sources and sources[name] != expected:
                mismatch.append({"reason": "Different render snapshots", "label": report["label"], "file": name})
            sources[name] = expected
            current = root / "docs" / name
            actual = sha256(current) if current.is_file() else None
            if actual != expected:
                mismatch.append({"reason": "Current source differs", "label": report["label"], "file": name,
                                 "renderSHA256": expected, "currentSHA256": actual})
    return {"allSnapshotsMatchCurrentDocs": not mismatch, "checkedReportCount": len(reports),
            "sourceSHA256": sources, "mismatch": mismatch}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--workdir", type=Path, required=True, help="Render collection containing baseline/report.json and final-*/report.json")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Repository root for source hash verification (default: current directory)")
    parser.add_argument("--out-dir", type=Path, help="Output directory (default: workdir)")
    parser.add_argument("--baseline", default="baseline", help="Baseline render subdirectory")
    parser.add_argument("--glob", default="final-*", help="Final render subdirectory glob")
    parser.add_argument("--cases", help="Optional comma-separated case names, e.g. mix-warm,mix-violin")
    parser.add_argument("--listening-case", default="mix-warm", help="Baseline/final case to export as a matched pair")
    parser.add_argument("--skip-listening", action="store_true", help="Only write measurements/source verification")
    parser.add_argument("--target-lufs", type=float, default=-24.0, help="Listening pair target integrated loudness")
    parser.add_argument("--true-peak-ceiling", type=float, default=-1.0, help="Fail if a matched WAV exceeds this summary true peak")
    parser.add_argument("--ffmpeg", default="ffmpeg", help="FFmpeg executable")
    parser.add_argument("--jobs", type=int, default=4, help="Maximum concurrent analysis processes")
    args = parser.parse_args()
    if not math.isfinite(args.target_lufs) or not math.isfinite(args.true_peak_ceiling):
        parser.error("Loudness and peak values must be finite")
    work, root = args.workdir.resolve(), args.root.resolve()
    output = args.out_dir.resolve() if args.out_dir else work
    output.mkdir(parents=True, exist_ok=True)
    baseline_file = work / args.baseline / "report.json"
    baseline_report = read_report(baseline_file)
    old = {r["name"]: (baseline_file, r) for r in baseline_report["results"]}
    reports = [(file, read_report(file)) for file in sorted(work.glob(args.glob + "/report.json"))]
    if not reports:
        parser.error("No final reports match --glob")
    new = {}
    for file, report in reports:
        for result in report["results"]:
            name = result["name"]
            if name in new:
                parser.error(f"Duplicate final case {name}; use a narrower --glob")
            new[name] = (file, result)
    selected = set(args.cases.split(",")) if args.cases else set(new)
    if selected - set(new):
        parser.error("Unknown final cases: " + ", ".join(sorted(selected - set(new))))
    needed = set(selected)
    if not args.skip_listening:
        if args.listening_case not in old or args.listening_case not in new:
            parser.error("The listening case must exist in both baseline and final reports")
        needed.add(args.listening_case)
    jobs = [(version, name, wav_path(file, result)) for version, rows in [("old", old), ("new", new)]
            for name, (file, result) in rows.items() if name in needed]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        values = list(pool.map(lambda job: measure(args.ffmpeg, job[2]), jobs))
    measurements = {(version, name): value for (version, name, _), value in zip(jobs, values)}
    comparison = []
    for name in sorted(selected):
        file, result = new[name]
        baseline = old.get(name, (None, None))[1]
        if baseline and result["eventHash"] != baseline["eventHash"]:
            raise ValueError(f"Different authored events: {name}")
        comparison.append({"name": name, "sameAuthoredEvents": baseline is not None,
                           "eventHash": result["eventHash"], "old": measurements.get(("old", name)),
                           "new": {**measurements[("new", name)], "rmsDbFS": result["active"]["rmsDbFS"],
                                   "samplePeakDbFS": result["samplePeakDbFS"], "clippedSamples": result["clippedSamples"]},
                           "sourceBytes": result["download"]["bytes"], "decodedBytes": result["download"]["decodedBytes"],
                           "eventCount": result["eventCount"], "noteWindows": result.get("noteWindows"),
                           "tailWindows": result.get("tailWindows")})
    ffmpeg_version = subprocess.run([args.ffmpeg, "-version"], capture_output=True, text=True, encoding="utf-8", check=True).stdout.splitlines()[0]
    provenance = [{"report": relative(file, work), **{k: report[k] for k in ["label", "ref", "baseCommit", "sourceHashes", "assetHashes", "rendererVersion", "automationSanity"] if k in report}}
                  for file, report in reports]
    method = ("Same authored f8be94b fixture, actual production graph and PCM. Integrated LUFS is the LAST lavfi.r128.I metadata value from FFmpeg ebur128 (reported to 0.001 LU); true peak is its final oversampled summary (0.1 dB precision). Peak/RMS comes from offline float WAV. Native offline analytic automation portability workaround is retained for both versions. Does not evaluate subjective timbre, browser/network timing or CPU usage. Source bytes count each unique asset once; decoded bytes are actual engine float PCM, excluding graph overhead.")
    write_json(output / "comparison-final.json", {"schemaVersion": 2, "method": method, "ffmpegVersion": ffmpeg_version,
                                                  "reports": provenance, "comparison": comparison})
    verification = verify_sources(reports, root)
    write_json(output / "source-verification.json", verification)
    if not args.skip_listening:
        name = args.listening_case
        if old[name][1]["eventHash"] != new[name][1]["eventHash"]:
            raise ValueError("Listening pair must contain the same authored events")
        listening = output / "listening"
        listening.mkdir(parents=True, exist_ok=True)
        files = []
        target_tag = f"{abs(args.target_lufs):g}".replace(".", "p")
        for index, (version, label, rows) in enumerate([("old", "before", old), ("new", "natural", new)], 1):
            report_file, row = rows[name]
            source = wav_path(report_file, row)
            original = measurements[(version, name)]
            gain = round(args.target_lufs - original["integratedLUFS"], 6)
            if original["truePeakDbTP"] + gain > args.true_peak_ceiling:
                raise ValueError(f"Requested match risks exceeding peak ceiling for {label}; lower --target-lufs")
            dest = listening / f"{index:02d}-{label}-matched-{target_tag}LUFS.wav"
            subprocess.run([args.ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
                            "-af", f"volume={gain:.6f}dB", "-ar", "44100", "-c:a", "pcm_s24le", str(dest)], check=True)
            verified = measure(args.ffmpeg, dest)
            if abs(verified["integratedLUFS"] - args.target_lufs) > 0.05 or verified["truePeakDbTP"] > args.true_peak_ceiling:
                raise ValueError(f"Matched audio failed loudness/peak verification: {dest}")
            files.append({"version": label, "original": relative(source, work), "originalSHA256": sha256(source),
                          "originalLUFS": original["integratedLUFS"], "gainDb": gain,
                          "matchedLUFS": verified["integratedLUFS"], "matchedTruePeakDbTP": verified["truePeakDbTP"],
                          "wav": dest.name, "sha256": sha256(dest)})
        write_json(listening / "README.json", {"method": "Same authored four-bar performance and original release tail. Constant gain only, derived from the same LAST EBU r128 metadata used in comparison-final.json; no EQ, compressor, limiter or dynamic loudness processing. Stereo 44.1 kHz PCM24. Original float WAVs are retained. Input paths are relative to workdir; matched WAVs are adjacent to this README.",
                                              "case": name, "eventHash": new[name][1]["eventHash"],
                                              "ffmpegVersion": ffmpeg_version, "targetLUFS": args.target_lufs, "files": files})
    for row in comparison:
        print(f"{row['name']}: {row['new']['integratedLUFS']:.3f} LUFS, {row['new']['truePeakDbTP']:.1f} dBTP")
    print(f"Reports: {output}; source snapshots match current docs: {verification['allSnapshotsMatchCurrentDocs']}")


if __name__ == "__main__":
    main()
