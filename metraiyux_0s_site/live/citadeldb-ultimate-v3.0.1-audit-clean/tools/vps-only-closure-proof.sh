#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/vps-only-closure-${STAMP}.txt"
GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT:-7313}"
AUTH_HEADER="Authorization: Bearer ${GATEWAY_ADMIN_TOKEN:-}"
APP_SLUG="${1:-${CITADEL_PROOF_APP_SLUG:-gray_customer_02}}"

{
  echo "CitadelDB VPS-Only Closure Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Proof app: ${APP_SLUG}"
  echo
  echo "1. Environment validation"
  ./cli/citadel validate-env
  echo
  echo "2. Runtime health"
  ./cli/citadel health
  echo
  echo "3. Architecture guard"
  ./cli/citadel architecture-guard
  echo
  echo "4. Skyegate bridge"
  ./cli/citadel skygate-bridge-proof
  echo
  echo "5. Owner handoff packet acceptance"
  PACKET_JSON="$(curl -fsS "${GATEWAY_URL}/admin/apps/${APP_SLUG}/owner-dashboard" -H "${AUTH_HEADER}")"
  PACKET_JSON="$PACKET_JSON" python3 - <<'PY'
import json, os
data = json.loads(os.environ["PACKET_JSON"])
packet = data.get("packet") or data
acceptance = packet.get("acceptance", {})
required = [
    "provisioned",
    "environmentRegistered",
    "connectionTested",
    "writeSmokePassed",
    "backupReceiptPresent",
    "restoreTestPassed",
]
missing = [key for key in required if not acceptance.get(key)]
print(json.dumps({
    "ok": data.get("ok"),
    "acceptedForOwnerHandoff": packet.get("acceptedForOwnerHandoff"),
    "acceptance": acceptance,
}, indent=2))
if missing or not packet.get("acceptedForOwnerHandoff"):
    raise SystemExit(f"owner handoff is not accepted; missing={missing}")
PY
  echo
  echo "6. VPS purchase gate"
  echo "OPEN: Gray must purchase/provision the VPS before public production cutover."
  echo
  echo "Closure result: CODE_READY_VPS_PURCHASE_REMAINING"
} | tee "$OUT"

echo "VPS-only closure proof receipt: $OUT"
