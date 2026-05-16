#!/usr/bin/env bash
set -euo pipefail

PORT="${ORYNTH_ROUTER_PORT:-13131}"
PROMPT="${1:-Confirm Orynth 7.6 router is online.}"

curl -fsS "http://127.0.0.1:${PORT}/health" | jq .

curl -fsS "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg prompt "$PROMPT" '{model:"local", messages:[{role:"user", content:$prompt}], stream:false}')" \
  | jq .
