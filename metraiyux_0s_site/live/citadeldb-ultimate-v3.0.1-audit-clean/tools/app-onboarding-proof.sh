#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/app-onboarding-proof-${STAMP}.txt"

{
  echo "CitadelDB App Onboarding Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in APP_ONBOARDING.md docs/FRAMEWORK_DATABASE_GUIDE.md release/APP_ONBOARDING_ACCEPTANCE.md templates/app-frameworks/frameworks.json operator-dashboard/server.mjs control-plane/gateway/src/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Framework template checks"
  for fw in node-express nextjs-prisma python-sqlalchemy django rails laravel; do
    if [ -f "templates/app-frameworks/${fw}.md" ]; then echo "PASS: ${fw}"; else echo "OPEN: missing ${fw}"; exit 1; fi
  done
  echo
  echo "3. Route checks"
  grep -q "/app-onboarding" operator-dashboard/server.mjs && echo "PASS: dashboard app onboarding route" || { echo "OPEN: dashboard app onboarding route missing"; exit 1; }
  grep -q "/admin/apps/:appSlug/onboarding-packet" control-plane/gateway/src/server.mjs && echo "PASS: onboarding packet endpoint" || { echo "OPEN: onboarding packet endpoint missing"; exit 1; }
  grep -q "/admin/apps/:appSlug/proof-packet" control-plane/gateway/src/server.mjs && echo "PASS: proof packet endpoint" || { echo "OPEN: proof packet endpoint missing"; exit 1; }
  echo
  echo "4. Setup wizard proof"
  ./tools/setup-wizard-proof.sh
  echo
  echo "App onboarding proof: PASS"
} | tee "$OUT"
