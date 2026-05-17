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
OUT="proof/ai-debug-preflight-${STAMP}.txt"

{
  echo "CitadelDB AI Debug Preflight"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  if [ "${AI_ASSISTANT_ENABLED:-false}" = "true" ]; then echo "PASS: AI_ASSISTANT_ENABLED=true"; else echo "OPEN: AI_ASSISTANT_ENABLED is not true"; fi
  if [ -n "${OPENAI_API_KEY:-}" ]; then echo "PASS: OPENAI_API_KEY present"; else echo "OPEN: OPENAI_API_KEY missing"; fi
  if [ -n "${GEMINI_API_KEY:-}" ] || [ -n "${GOOGLE_API_KEY:-}" ]; then echo "PASS: Gemini key present"; else echo "OPEN: Gemini key missing"; fi
  echo
  echo "No provider request was sent. This only checks local configuration."
} | tee "$OUT"
