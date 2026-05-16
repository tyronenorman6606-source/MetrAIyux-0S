#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
urls=(
  "$BASE/index.html"
  "$BASE/setup.html"
  "$BASE/dashboard.html"
  "$BASE/customer-portal.html"
  "$BASE/support.html"
  "$BASE/intake.html"
  "$BASE/billing.html"
  "$BASE/admin-tools.html"
  "$BASE/surface-map.html"
  "$BASE/command-center.html"
  "$BASE/pricing.html"
  "$BASE/client-onboarding.html"
  "$BASE/client-handoff.html"
  "$BASE/launch.html"
  "$BASE/demo.html"
  "$BASE/proof.html"
  "$BASE/maintenance.html"
  "$BASE/readiness.html"
  "$BASE/brain.html"
  "${FREESCOUT_URL:-http://localhost:8081}"
  "${ESPOCRM_URL:-http://localhost:8082}"
  "${INVOICESHELF_URL:-http://localhost:8083}"
  "${FORMBRICKS_URL:-http://localhost:8084}"
)

mkdir -p proof
out="proof/smoke-$(date +%Y%m%d-%H%M%S).txt"
fail=0

{
  echo "Skye Business Command Center Smoke Test"
  echo "Generated: $(date -Is)"
  echo
} | tee "$out"

for url in "${urls[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)
  echo "$code $url" | tee -a "$out"
  if [[ "$code" != "200" && "$code" != "301" && "$code" != "302" && "$code" != "401" && "$code" != "403" ]]; then
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "Smoke test failed. See $out"
  exit 1
fi

echo "Smoke test passed. See $out"


# Local brain checks
curl -fsS "${BASE_URL:-http://localhost:${HUB_PORT:-8080}}/brain.html" >/dev/null && echo "✅ Brain page responds" || echo "☐ Brain page missing"
curl -fsS "http://localhost:${BRAIN_SERVICE_PORT:-8099}/health" >/dev/null && echo "✅ Brain service responds" || echo "☐ Brain service not reachable; browser KB can still operate"
