#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP="${1:-}"
if [ -z "$APP" ]; then
  echo "Usage: ./tools/create-app-onboarding-packet.sh <app-slug>" >&2
  exit 1
fi

SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
DIR="exports/onboarding/${SAFE_APP}"
mkdir -p "$DIR"

cat > "$DIR/README.md" <<EOF
# CitadelDB Onboarding Packet: ${SAFE_APP}

## App database

\`\`\`text
App slug: ${SAFE_APP}
Expected DB: app_${SAFE_APP}
Expected role: app_${SAFE_APP}_user
\`\`\`

## Required app env

\`\`\`env
DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://app_${SAFE_APP}_user:PASSWORD@citadeldb.internal:6432/app_${SAFE_APP}
CITADEL_APP_SLUG=${SAFE_APP}
\`\`\`

## Required proof

- provision receipt
- migration receipt
- backup receipt
- restore-test receipt
- app write smoke receipt

## Cutover checklist

☐ old Neon DATABASE_URL saved securely  
☐ CitadelDB database provisioned  
☐ data migrated  
☐ table counts verified  
☐ app env swapped  
☐ app write smoke passed  
☐ rollback path documented  
EOF

cat > "$DIR/cutover-checklist.md" <<EOF
# Cutover Checklist: ${SAFE_APP}

☐ Freeze writes or schedule maintenance window  
☐ Dump old database  
☐ Restore into CitadelDB  
☐ Verify counts  
☐ Change app DATABASE_URL  
☐ Restart app  
☐ Run app read smoke  
☐ Run app write smoke  
☐ Run backup  
☐ Run restore-test  
☐ Save receipts  
☐ Keep old DB untouched until acceptance  
EOF

echo "Onboarding packet created: $DIR"
