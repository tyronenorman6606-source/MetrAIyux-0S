#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
import yaml
for file in ['docker-compose.yml', 'runner/config.yml', 'examples/.forgejo/workflows/smoke.yml']:
    with open(file, 'r', encoding='utf-8') as f:
        yaml.safe_load(f)
print('YAML OK')
PY

for script in scripts/*.sh; do
  bash -n "$script"
done

node --check control-plane/src/server.js
node --check control-plane/src/auth.js
node --check control-plane/src/db.js
node --check control-plane/src/forgejo.js
node --check control-plane/src/limits.js
node --check control-plane/src/stripe.js
node --check control-plane/src/migrate.js

TMP_ENV="$(mktemp)"
cp .env.example "$TMP_ENV"
bash scripts/init-env.sh "$TMP_ENV" >/dev/null
bash -c 'set -euo pipefail; source "$1"; [[ -n "$CONTROL_DATABASE_URL" ]]; [[ -n "$FORGEJO_DB_PASSWORD" ]]; [[ -n "$CONTROL_DB_PASSWORD" ]]; [[ -n "$TRUSTED_HEADER_AUTH_SECRET" ]]; [[ "$SOVEREIGN_VERSION" == "1.3.0" ]]; [[ "$TRUSTED_HEADER_AUTH" == "false" ]]' _ "$TMP_ENV"
rm -f "$TMP_ENV"

if grep -R "TODO\|lorem ipsum\|FIXME" -n portal control-plane docs README.md \
  --exclude-dir=node_modules \
  --exclude='*.zip'; then
  echo 'Blocked unfinished marker found.' >&2
  exit 1
fi

if grep -q '^TRUSTED_HEADER_AUTH=true' .env.example; then
  echo 'Unsafe default: TRUSTED_HEADER_AUTH must not default to true.' >&2
  exit 1
fi

if ! grep -q 'requireGateSecret' control-plane/src/auth.js; then
  echo 'Trusted-header gate secret guard missing.' >&2
  exit 1
fi

if ! grep -q "/api/deployment/readiness" control-plane/src/server.js; then
  echo 'Deployment readiness endpoint missing.' >&2
  exit 1
fi

if ! grep -q "accounts/:id/repos" control-plane/src/server.js; then
  echo 'Control-plane repository creation route missing.' >&2
  exit 1
fi

echo "Package-level tests passed. Live Docker, DNS, SMTP, Stripe, Forgejo provisioning, runner job execution, and restore rehearsal still require a real server/provider env."
