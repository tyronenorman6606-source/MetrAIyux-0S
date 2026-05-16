#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:8080}"
FREESCOUT_URL="${FREESCOUT_URL:-http://localhost:8081}"
ESPOCRM_URL="${ESPOCRM_URL:-http://localhost:8082}"
INVOICESHELF_URL="${INVOICESHELF_URL:-http://localhost:8083}"
FORMBRICKS_URL="${FORMBRICKS_URL:-http://localhost:8084}"
mkdir -p proof
OUT="proof/acceptance-$(date +%Y%m%d-%H%M%S).txt"
check(){ local name="$1"; local url="$2"; local code; printf "%-34s" "$name" | tee -a "$OUT"; code=$(curl -L -s -o /dev/null -w '%{http_code}' "$url" || true); if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" || "$code" == "401" || "$code" == "403" ]]; then echo " OK ($code)" | tee -a "$OUT"; else echo " FAIL $code ($url)" | tee -a "$OUT"; return 1; fi; }
FAIL=0
{
  echo "Skye Business Command Center Acceptance Report"
  echo "Generated: $(date -Is)"
  echo "Base URL: $BASE_URL"
  echo ""
} > "$OUT"
check "Product landing" "$BASE_URL/index.html" || FAIL=1
check "Setup walkthrough" "$BASE_URL/setup.html" || FAIL=1
check "Dashboard" "$BASE_URL/dashboard.html" || FAIL=1
check "Command center" "$BASE_URL/command-center.html" || FAIL=1
check "Client onboarding" "$BASE_URL/client-onboarding.html" || FAIL=1
check "Client handoff" "$BASE_URL/client-handoff.html" || FAIL=1
check "Launch room" "$BASE_URL/launch.html" || FAIL=1
check "Demo walkthrough" "$BASE_URL/demo.html" || FAIL=1
check "Proof page" "$BASE_URL/proof.html" || FAIL=1
check "Maintenance console" "$BASE_URL/maintenance.html" || FAIL=1
check "FreeScout" "$FREESCOUT_URL" || FAIL=1
check "EspoCRM" "$ESPOCRM_URL" || FAIL=1
check "InvoiceShelf" "$INVOICESHELF_URL" || FAIL=1
check "Formbricks" "$FORMBRICKS_URL" || FAIL=1
cat >> "$OUT" <<'EOF'

Manual acceptance still required:
- Real SMTP send/receive test.
- Support ticket assignment and reply.
- CRM lead creation and stage movement.
- Intake form submission visible in Formbricks.
- Estimate/invoice creation in InvoiceShelf.
- Client admin login verified.
EOF
if [[ "$FAIL" -eq 1 ]]; then echo "Acceptance checks failed. See $OUT"; exit 1; fi
echo "Acceptance checks passed. See $OUT"
