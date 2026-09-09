"""Verify published production code and every recording requested by the PCM fixtures."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import time
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', default='.')
parser.add_argument('--ref', default='HEAD')
parser.add_argument('--report', default='notes/recordings-pcm-2026-09-09.json')
parser.add_argument('--out', default='notes/recordings-online-verification-2026-09-09.json')
parser.add_argument('--list-only', action='store_true')
a = parser.parse_args()
root = Path(a.root).resolve()
commit = subprocess.check_output(['git', 'rev-parse', a.ref], cwd=root, text=True).strip()
base = 'https://rexrockya.github.io/tuner/'
report = json.loads((root / a.report).read_text(encoding='utf-8'))
files = {'index.html', 'asset-loader.js', 'practice-samples.js', 'practice-audio.js',
         'practice-arrangement.js', 'practice.js', 'music-genres.js', 'practice-timbres.js',
         'assets/audio/recordings-credits.html'}
for run in report['reports']:
    files.update(k for k in run['assetHashes'] if k.startswith('assets/audio/natural-'))
# Each complete bank manifest, local license and one lossless WAV fallback.
for directory in sorted((root / 'docs/assets/audio').glob('natural-*')):
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    files.add((directory / 'manifest.json').relative_to(root / 'docs').as_posix())
    files.add((directory / manifest['samples'][0]['fallback']).relative_to(root / 'docs').as_posix())
    files.update(p.relative_to(root / 'docs').as_posix() for p in directory.iterdir()
                 if p.name.startswith('LICENSE') or p.name in ['README.md', 'CREDITS.md'])
if a.list_only:
    print(json.dumps({'commit': commit, 'fileCount': len(files), 'files': sorted(files)}, indent=2))
    raise SystemExit
pages = json.loads(subprocess.check_output(['gh', 'api', 'repos/rexrockya/tuner/pages/builds/latest'], cwd=root))
if pages.get('commit') != commit or pages.get('status') != 'built' or (pages.get('error') or {}).get('message'):
    raise SystemExit('Expected completed Pages build for ' + commit)

def check(name):
    expected = subprocess.check_output(['git', 'show', commit + ':docs/' + name], cwd=root)
    digest = hashlib.sha256(expected).hexdigest()
    result = {'file': name, 'expectedSHA256': digest}
    for attempt in range(3):
        try:
            req = urllib.request.Request(base + urllib.parse.quote(name, safe='/') + '?verify=' + commit[:12],
                                         headers={'User-Agent': 'tuner-release-verification', 'Accept-Encoding': 'identity'})
            with urllib.request.urlopen(req, timeout=45) as response:
                data = response.read()
                result.update(status=response.status, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            result['exact'] = result['sha256'] == digest
            if not result['exact']:
                raise RuntimeError('Published content differs from committed blob')
            result.pop('error', None)
            return result
        except Exception as error:
            result.update(exact=False, error=str(error))
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, sorted(files)))
result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'commit': commit,
          'baseUrl': base, 'pages': {k: pages.get(k) for k in ['status', 'commit', 'error', 'updated_at']},
          'scope': 'Production modules; all natural audio files actually requested by the 20 PCM cases; all seven bank manifests/licenses; one WAV fallback per bank. Not all recordings in the full banks.',
          'results': results, 'fileCount': len(results),
          'totalBytes': sum(r.get('bytes', 0) for r in results), 'allExact': all(r['exact'] for r in results)}
(root / a.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'results'}, ensure_ascii=False, indent=2))
if not result['allExact']:
    print(json.dumps([r for r in results if not r['exact']], ensure_ascii=False, indent=2))
    raise SystemExit(1)
