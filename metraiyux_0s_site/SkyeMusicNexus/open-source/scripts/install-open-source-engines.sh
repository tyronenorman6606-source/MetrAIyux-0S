#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENDOR_DIR="$ROOT_DIR/open-source/vendor"

mkdir -p "$VENDOR_DIR"
cd "$VENDOR_DIR"

clone_or_pull() {
  local name="$1"
  local repo="$2"

  if [ -d "$name/.git" ]; then
    echo "Updating $name..."
    git -C "$name" pull --ff-only || true
  else
    echo "Cloning $name from $repo..."
    git clone "$repo" "$name"
  fi
}

clone_or_pull "openDAW" "https://github.com/andremichelle/openDAW.git"
clone_or_pull "ardour" "https://github.com/Ardour/ardour.git"
clone_or_pull "lmms" "https://github.com/LMMS/lmms.git"
clone_or_pull "audacity" "https://github.com/audacity/audacity.git"

cat <<'MSG'

Open-source engines pulled into:
  SkyeMusicNexus/open-source/vendor/

Next:
  1. Build/run openDAW separately.
  2. Open SkyeMusicNexus/public/create.html.
  3. Set the openDAW URL field to the local/deployed openDAW URL.
  4. Keep AGPL/GPL notices intact.

MSG
