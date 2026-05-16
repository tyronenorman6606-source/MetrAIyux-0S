#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

nix --extra-experimental-features 'nix-command flakes' build "path:$PWD#iso" --print-build-logs

cat <<'MSG'

Build complete.
ISO output should be under:
  ./result/iso/

Next:
  ls -lh ./result/iso/
  sudo ./scripts/write-usb.sh /dev/sdX
MSG
