#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="sove-reign13-node-os-v0.3.0-aegis-autonomy"
OUT_DIR="${OUT_DIR:-/tmp}"
./scripts/smoke.sh
rm -f "$OUT_DIR/$NAME.zip" "$OUT_DIR/$NAME.zip.sha256"
cd ..
zip -qr "$OUT_DIR/$NAME.zip" "$(basename "$OLDPWD")" -x "*/.git/*" "*/result/*" "*/node_modules/*"
sha256sum "$OUT_DIR/$NAME.zip" > "$OUT_DIR/$NAME.zip.sha256"
echo "Release package: $OUT_DIR/$NAME.zip"
echo "SHA256: $OUT_DIR/$NAME.zip.sha256"
