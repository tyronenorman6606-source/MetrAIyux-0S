#!/usr/bin/env bash
set -euo pipefail

DEVICE="${1:-}"
ISO="${2:-}"

if [[ -z "$DEVICE" ]]; then
  echo "Usage: sudo ./scripts/write-usb.sh /dev/sdX [path/to.iso]" >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Run as root because raw USB writes require elevated access." >&2
  exit 1
fi

if [[ ! -b "$DEVICE" ]]; then
  echo "Not a block device: $DEVICE" >&2
  exit 1
fi

if [[ "$DEVICE" =~ [0-9]$ ]]; then
  echo "Refusing to write to what looks like a partition: $DEVICE" >&2
  echo "Use the whole disk, for example /dev/sdb, not /dev/sdb1." >&2
  exit 1
fi

if [[ -z "$ISO" ]]; then
  ISO="$(find ./result/iso -maxdepth 1 -type f -name '*.iso' | head -n 1 || true)"
fi

if [[ -z "$ISO" || ! -f "$ISO" ]]; then
  echo "ISO not found. Pass it explicitly or build first with ./scripts/build-iso.sh" >&2
  exit 1
fi

lsblk "$DEVICE"
echo
echo "About to destroy all data on: $DEVICE"
echo "ISO: $ISO"
read -r -p "Type SOVE13 to continue: " CONFIRM

if [[ "$CONFIRM" != "SOVE13" ]]; then
  echo "Aborted."
  exit 1
fi

sync
dd if="$ISO" of="$DEVICE" bs=4M status=progress conv=fsync
sync

echo "USB write complete."
