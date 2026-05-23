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
OUT="proof/skygate-bridge-proof-${STAMP}.txt"
GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT:-7313}"
AUTH_HEADER="Authorization: Bearer ${GATEWAY_ADMIN_TOKEN:-}"

if [ -z "${GATEWAY_ADMIN_TOKEN:-}" ]; then
  echo "Missing GATEWAY_ADMIN_TOKEN in .env" >&2
  exit 1
fi

{
  echo "CitadelDB Skyegate Bridge Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Gateway bridge status"
  STATUS_JSON="$(curl -fsS "${GATEWAY_URL}/admin/skygate/status" -H "${AUTH_HEADER}")"
  printf '%s\n' "$STATUS_JSON" | python3 -m json.tool
  STATUS_JSON="$STATUS_JSON" python3 - <<'PY'
import json, os
data = json.loads(os.environ["STATUS_JSON"])
sg = data.get("skyGate", {})
if not sg.get("configured"):
    raise SystemExit("Skyegate URL is not configured")
if sg.get("eventMirrorEnabled") and not sg.get("eventSecretConfigured"):
    raise SystemExit("Skyegate event mirroring is enabled without an event secret")
PY
  echo
  echo "2. Mirror proof event"
  EVENT_JSON="$(curl -fsS -X POST "${GATEWAY_URL}/admin/skygate/proof-event" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"citadeldb.skygate_bridge_proof\",\"meta\":{\"receipt\":\"${STAMP}\"}}")"
  printf '%s\n' "$EVENT_JSON" | python3 -m json.tool
  EVENT_JSON="$EVENT_JSON" python3 - <<'PY'
import json, os
data = json.loads(os.environ["EVENT_JSON"])
event = data.get("event", {})
enabled = data.get("skyGate", {}).get("eventMirrorEnabled")
if enabled and not event.get("ok"):
    raise SystemExit(f"Skyegate event mirror failed: {event}")
if not enabled and not event.get("skipped"):
    raise SystemExit("Skyegate event mirror returned an unexpected result")
PY
  echo
  echo "Skyegate bridge proof completed."
} | tee "$OUT"

echo "Skyegate bridge proof receipt: $OUT"
