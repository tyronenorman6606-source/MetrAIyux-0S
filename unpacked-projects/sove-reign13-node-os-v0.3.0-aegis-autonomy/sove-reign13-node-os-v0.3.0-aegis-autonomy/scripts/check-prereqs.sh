#!/usr/bin/env bash
set -euo pipefail

if ! command -v nix >/dev/null 2>&1; then
  cat >&2 <<'MSG'
Nix is not installed.
Install Nix first, then rerun this script.
Reference route:
  https://nixos.org/download/
MSG
  exit 1
fi

echo "Nix found: $(nix --version)"

cd "$(dirname "$0")/.."

if ! nix --extra-experimental-features 'nix-command flakes' flake metadata "path:$PWD" >/dev/null; then
  cat >&2 <<'MSG'
Nix flakes are not usable from this shell.
Try:
  nix --extra-experimental-features 'nix-command flakes' flake metadata "path:$PWD"
MSG
  exit 1
fi

echo "Flake metadata resolved."
echo "Ready to build."
