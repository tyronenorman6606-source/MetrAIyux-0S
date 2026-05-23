#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p release proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SEAL="release/final-package-seal-${STAMP}.json"
OUT="proof/final-package-seal-${STAMP}.txt"

python3 - <<'PY' > "$SEAL"
import json, hashlib, time
from pathlib import Path

important = [
  "VERSION",
  "README.md",
  "PUBLIC_ARCHITECTURE.md",
  "brand/BRAND_CONFIG.json",
  "architecture/CITADELDB_SOVEREIGN_ARCHITECTURE.md",
  "claims/PUBLIC_CLAIMS_PACK.md",
  "claims/FINAL_PROOF_GAP_LEDGER.md",
  "release/FINAL_RELEASE_NOTES.md",
  "release/FINAL_GO_NO_GO.md",
  "docs/PRODUCTION_INSTALL_QUICKSTART.md"
]

items = []
for path in important:
    p = Path(path)
    if p.exists():
        data = p.read_bytes()
        items.append({"path": path, "size_bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    else:
        items.append({"path": path, "missing": True})

seal_hash = hashlib.sha256()
for item in items:
    seal_hash.update(json.dumps(item, sort_keys=True).encode())

print(json.dumps({
  "kind": "citadeldb-final-package-seal",
  "version": "1.0.0",
  "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "seal_sha256": seal_hash.hexdigest(),
  "items": items
}, indent=2))
PY

SHA="$(sha256sum "$SEAL" | awk '{print $1}')"
{
  echo "CitadelDB Final Package Seal"
  echo "Seal: ${SEAL}"
  echo "SHA256: ${SHA}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT"
