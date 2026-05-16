#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof release
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/package-integrity-${STAMP}.txt"
MANIFEST="release/package-integrity-${STAMP}.json"

python3 - <<'PY' > "$MANIFEST"
import json, hashlib, time
from pathlib import Path
skip_parts = {'.git', 'node_modules'}
skip_prefixes = ('proof/package-integrity-', 'release/package-integrity-')
files = []
for path in sorted(Path('.').rglob('*')):
    if not path.is_file():
        continue
    if any(part in skip_parts for part in path.parts):
        continue
    s = str(path)
    if s.startswith(skip_prefixes):
        continue
    data = path.read_bytes()
    files.append({"path": s, "size_bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
root_hash = hashlib.sha256()
for item in files:
    root_hash.update(item["path"].encode())
    root_hash.update(item["sha256"].encode())
print(json.dumps({
    "kind": "citadeldb-package-integrity",
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "file_count": len(files),
    "root_sha256": root_hash.hexdigest(),
    "files": files
}, indent=2))
PY

SHA="$(sha256sum "$MANIFEST" | awk '{print $1}')"
{
  echo "CitadelDB Package Integrity Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Manifest: ${MANIFEST}"
  echo "Manifest SHA256: ${SHA}"
  echo
  python3 - <<PY
import json
m=json.load(open("${MANIFEST}"))
print("File count:", m["file_count"])
print("Root SHA256:", m["root_sha256"])
PY
} | tee "$OUT"
