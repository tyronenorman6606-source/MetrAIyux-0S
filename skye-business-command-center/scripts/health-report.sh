#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="proof"
OUT_FILE="$OUT_DIR/health-report-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "$OUT_DIR"

{
  echo "Skye Business Command Center Health Report"
  echo "Generated: $(date -Is)"
  echo
  echo "== Docker Compose Services =="
  docker compose ps || true
  echo
  echo "== Disk Usage =="
  df -h . || true
  echo
  echo "== Docker Disk Usage =="
  docker system df || true
  echo
  echo "== Hub Smoke =="
  for url in \
    "http://localhost:8080/index.html" \
    "http://localhost:8080/setup.html" \
    "http://localhost:8080/dashboard.html" \
    "http://localhost:8080/command-center.html" \
    "http://localhost:8080/pricing.html" \
    "http://localhost:8080/client-onboarding.html" \
    "http://localhost:8080/client-handoff.html"; do
    code=$(curl -L -s -o /dev/null -w '%{http_code}' "$url" || true)
    echo "$code $url"
  done
} | tee "$OUT_FILE"

echo "Health report written to $OUT_FILE"
