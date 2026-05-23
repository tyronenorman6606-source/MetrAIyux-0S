#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

mkdir -p exports/service-catalog proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="exports/service-catalog/catalog-${STAMP}.json"

curl -sS "http://127.0.0.1:${GATEWAY_PORT:-7313}/admin/service-catalog" \
  -H "Authorization: Bearer ${GATEWAY_ADMIN_TOKEN:-}" > "$OUT"

SHA="$(sha256sum "$OUT" | awk '{print $1}')"
RECEIPT="proof/service-catalog-export-${STAMP}.txt"

{
  echo "CitadelDB Service Catalog Export Receipt"
  echo "Path: ${OUT}"
  echo "SHA256: ${SHA}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"

echo "Service catalog exported: $OUT"
