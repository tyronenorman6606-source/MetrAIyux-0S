#!/usr/bin/env bash
set -euo pipefail

out="secrets.generated.env"
rand(){ openssl rand -base64 48 | tr -d '\n' | cut -c1-${1:-48}; }
laravel_key(){ printf 'base64:%s' "$(openssl rand -base64 32)"; }

cat > "$out" <<SECRETS
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Copy these values into .env. Do not commit live secrets.
FREESCOUT_DB_PASSWORD=$(rand 32)
ESPOCRM_DB_PASSWORD=$(rand 32)
INVOICESHELF_DB_PASSWORD=$(rand 32)
FORMBRICKS_DB_PASSWORD=$(rand 32)
REDIS_PASSWORD=$(rand 32)
FREESCOUT_ADMIN_PASSWORD=$(rand 40)
ESPOCRM_ADMIN_PASSWORD=$(rand 40)
INVOICESHELF_APP_KEY=$(laravel_key)
FORMBRICKS_ENCRYPTION_KEY=$(rand 32)
FORMBRICKS_NEXTAUTH_SECRET=$(rand 48)
FORMBRICKS_CRON_SECRET=$(rand 48)
SECRETS

cat <<MSG
Generated $out

Next steps:
1. Open $out
2. Copy generated values into .env
3. Generate an InvoiceShelf APP_KEY using the upstream app method after first boot if required.
MSG
