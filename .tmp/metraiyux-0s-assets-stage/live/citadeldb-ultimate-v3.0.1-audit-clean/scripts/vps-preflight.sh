#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof logs backups/manual backups/encrypted backups/manifests receipts exports/app-env exports/service-catalog
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/vps-preflight-${STAMP}.txt"
OPEN=0

check_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "PASS: command ${cmd}" | tee -a "$OUT"
  else
    echo "OPEN: missing command ${cmd}" | tee -a "$OUT"
    OPEN=$((OPEN + 1))
  fi
}

{
  echo "CitadelDB VPS Preflight"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} > "$OUT"

check_cmd docker
check_cmd psql
check_cmd pg_dump
check_cmd pg_restore
check_cmd openssl
check_cmd curl

if docker compose version >/dev/null 2>&1; then
  echo "PASS: docker compose v2" | tee -a "$OUT"
else
  echo "OPEN: docker compose v2 missing" | tee -a "$OUT"
  OPEN=$((OPEN + 1))
fi

available_kb="$(df -Pk . | awk 'NR==2 {print $4}')"
echo "INFO: available_disk_kb=${available_kb}" | tee -a "$OUT"
if [ "${available_kb:-0}" -lt 5242880 ]; then
  echo "OPEN: less than 5GB free disk" | tee -a "$OUT"
  OPEN=$((OPEN + 1))
else
  echo "PASS: disk floor" | tee -a "$OUT"
fi

if [ "$OPEN" -eq 0 ]; then
  echo "VPS preflight: PASS" | tee -a "$OUT"
else
  echo "VPS preflight: OPEN_FINDINGS=${OPEN}" | tee -a "$OUT"
  exit 1
fi
