#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups/manifests proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MANIFEST="backups/manifests/backup-manifest-${STAMP}.json"
TMP="$(mktemp)"

python3 - <<'PY' > "$TMP"
import json, hashlib, os, time
from pathlib import Path

items = []
for path in sorted(Path("backups").rglob("*")):
    if not path.is_file() or "manifests" in path.parts:
        continue
    h = hashlib.sha256(path.read_bytes()).hexdigest()
    items.append({
        "path": str(path),
        "size_bytes": path.stat().st_size,
        "sha256": h,
        "modified_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(path.stat().st_mtime))
    })

print(json.dumps({
    "kind": "citadeldb-backup-manifest",
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "count": len(items),
    "items": items
}, indent=2))
PY

mv "$TMP" "$MANIFEST"
SHA="$(sha256sum "$MANIFEST" | awk '{print $1}')"
RECEIPT="proof/backup-manifest-${STAMP}.txt"

{
  echo "CitadelDB Backup Manifest Receipt"
  echo "Manifest: ${MANIFEST}"
  echo "SHA256: ${SHA}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"

echo "Backup manifest written: $MANIFEST"
