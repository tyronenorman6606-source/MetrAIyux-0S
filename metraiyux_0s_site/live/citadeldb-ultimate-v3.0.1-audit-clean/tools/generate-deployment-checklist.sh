#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP="${1:-citadeldb}"
mkdir -p exports/deployment-checklists
SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
OUT="exports/deployment-checklists/${SAFE_APP}-deployment-checklist.md"

cat > "$OUT" <<EOF
# CitadelDB Deployment Checklist: ${SAFE_APP}

## Identity

☐ Product name confirmed  
☐ Skyes Over London / SOLEnterprises owner line present  
☐ SoveReign13 family placement present  
☐ Public architecture uses Citadel-owned module names only  

## Infrastructure

☐ Docker installed  
☐ .env created from production template  
☐ Secrets replaced  
☐ Postgres private-only  
☐ Gateway/dashboard protected  
☐ Backups directory mounted  
☐ Object storage configured if required  

## Proof

☐ validate-env passes  
☐ health passes  
☐ policy-check passes  
☐ backup-now passes  
☐ restore-test passes  
☐ backup-manifest generated  
☐ architecture-guard passes  
☐ browser proof passes if dashboard is being sold/shown  

## App cutover

☐ app database provisioned  
☐ app role stored securely  
☐ migrations applied  
☐ app write smoke passes  
☐ rollback receipt template prepared  
EOF

echo "Deployment checklist written: $OUT"
