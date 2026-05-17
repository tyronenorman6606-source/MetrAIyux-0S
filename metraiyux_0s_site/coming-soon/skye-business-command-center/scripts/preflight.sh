#!/usr/bin/env bash
set -euo pipefail

fail=0
check(){ if "$@" >/dev/null 2>&1; then echo "✅ $*"; else echo "☐ Missing or failing: $*"; fail=1; fi; }

[ -f .env ] && echo "✅ .env exists" || { echo "☐ .env missing. Run: cp .env.example .env"; fail=1; }
check docker --version
check docker compose version

for port in ${HUB_PORT:-8080} ${FREESCOUT_PORT:-8081} ${ESPOCRM_PORT:-8082} ${INVOICESHELF_PORT:-8083} ${FORMBRICKS_PORT:-8084}; do
  if command -v ss >/dev/null 2>&1 && ss -ltn | awk '{print $4}' | grep -q ":$port$"; then
    echo "☐ Port $port already appears in use"
    fail=1
  else
    echo "✅ Port $port available or not currently detected"
  fi
done

if grep -q "change-me\|REPLACE_ME" .env 2>/dev/null; then
  echo "☐ .env still contains placeholder secrets"
  fail=1
else
  echo "✅ .env does not contain obvious placeholder secrets"
fi

if [ "$fail" -eq 0 ]; then
  echo "✅ Preflight passed"
else
  echo "☐ Preflight found issues. Fix before production."
fi
exit "$fail"
