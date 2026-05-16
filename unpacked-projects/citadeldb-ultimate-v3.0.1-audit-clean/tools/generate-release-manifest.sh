#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p releases proof
VERSION="${1:-0.8.0}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="releases/citadeldb-release-${VERSION}-${STAMP}.json"

python3 - <<PY > "$OUT"
import json, hashlib, os, time
from pathlib import Path

ignore_parts = {"node_modules", ".git"}
items = []
for path in sorted(Path(".").rglob("*")):
    if not path.is_file():
        continue
    if any(part in ignore_parts for part in path.parts):
        continue
    if str(path).startswith("backups/") and not str(path).endswith(".gitkeep"):
        continue
    if str(path).startswith("proof/") and str(path).endswith(".txt"):
        continue
    data = path.read_bytes()
    items.append({
        "path": str(path),
        "size_bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest()
    })

print(json.dumps({
    "kind": "citadeldb-release-manifest",
    "version": "$VERSION",
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "file_count": len(items),
    "files": items
}, indent=2))
PY

SHA="$(sha256sum "$OUT" | awk '{print $1}')"
RECEIPT="proof/release-manifest-${VERSION}-${STAMP}.txt"

{
  echo "CitadelDB Release Manifest Receipt"
  echo "Version: ${VERSION}"
  echo "Manifest: ${OUT}"
  echo "SHA256: ${SHA}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"
