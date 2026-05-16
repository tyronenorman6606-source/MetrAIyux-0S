#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

required=(
  flake.nix
  nixos/iso.nix
  nixos/modules/branding.nix
  nixos/modules/operator-stack.nix
  nixos/modules/ai-stack.nix
  nixos/modules/orynth-router.nix
  nixos/modules/agent-stack.nix
  nixos/modules/workstation-cde.nix
  nixos/modules/command-center.nix
  nixos/modules/security.nix
  nixos/profiles/gpu-nvidia.nix
  nixos/profiles/gpu-amd-rocm.nix
  prompts/orynth/ORYNTH_7_6_SYSTEM.md
  tools/orynth-router/router.py
  tools/s13-agent/agent.py
  tools/s13-reliquary/reliquary.py
  tools/s13-system/doctor.py
  command-center/index.html
  command-center/styles.css
  command-center/app.js
  scripts/build-iso.sh
  scripts/check-prereqs.sh
  scripts/test-router.sh
  docs/DEPLOYMENT.md
  docs/AI-OPERATIONS.md
  docs/AEGIS-AGENT-OPERATIONS.md
  docs/RELIQUARY-OPERATIONS.md
  docs/PROOF-LEDGER.md
)

for file in "${required[@]}"; do
  if [[ ! -s "$file" ]]; then
    echo "Missing or empty: $file" >&2
    exit 1
  fi
done

echo "✅ File presence smoke passed."

bash -n scripts/*.sh
echo "✅ Bash syntax smoke passed."

python3 -m py_compile tools/orynth-router/router.py tools/s13-agent/agent.py tools/s13-reliquary/reliquary.py tools/s13-system/doctor.py
echo "✅ Python syntax smoke passed."

BAD_CREATOR="Dari""us"
if grep -R "$BAD_CREATOR" -n . --exclude-dir=.git --exclude="smoke.sh"; then
  echo "Forbidden creator name found." >&2
  exit 1
fi
echo "✅ Creator identity scan passed."

TMP_WS="$(mktemp -d)"
trap 'rm -rf "$TMP_WS"' EXIT
cp -a tools "$TMP_WS/tools"
cp README.md "$TMP_WS/README.md"
git -C "$TMP_WS" init >/dev/null 2>&1
python3 tools/s13-agent/agent.py --workspace "$TMP_WS" init >/dev/null
python3 tools/s13-agent/agent.py --workspace "$TMP_WS" scan >/dev/null
python3 tools/s13-agent/agent.py --workspace "$TMP_WS" plan --objective "smoke test plan" >/dev/null
python3 tools/s13-reliquary/reliquary.py backup --workspace "$TMP_WS" >/dev/null
echo "✅ Aegis scan/plan and Reliquary backup smoke passed."

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh
  echo "✅ Shellcheck passed."
else
  echo "☐ Shellcheck not installed; skipping shell lint."
fi

if command -v nix >/dev/null 2>&1; then
  nix --extra-experimental-features 'nix-command flakes' flake show "path:$PWD" --no-write-lock-file
  echo "✅ Nix flake show passed."
else
  echo "☐ Nix not installed; skipping flake evaluation."
fi
