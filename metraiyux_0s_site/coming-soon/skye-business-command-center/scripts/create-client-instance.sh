#!/usr/bin/env bash
set -euo pipefail
CLIENT_SLUG="${1:-}"
if [[ -z "$CLIENT_SLUG" ]]; then
  echo "Usage: bash scripts/create-client-instance.sh client-slug"
  exit 1
fi
DEST="../sbcc-${CLIENT_SLUG}"
if [[ -e "$DEST" ]]; then echo "Destination exists: $DEST"; exit 1; fi
rsync -a --exclude '.git' --exclude 'data' --exclude 'backups' --exclude 'exports' ./ "$DEST/"
mkdir -p "$DEST/data" "$DEST/backups" "$DEST/proof"
cp "$DEST/.env.example" "$DEST/.env"
echo "Created $DEST"
echo "Next: cd $DEST && bash scripts/generate-secrets.sh && edit .env"
