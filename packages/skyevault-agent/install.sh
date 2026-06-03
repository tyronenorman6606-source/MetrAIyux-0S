#!/usr/bin/env bash
set -euo pipefail

package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install_dir="${SKYEVAULT_AGENT_INSTALL_DIR:-$HOME/.local/share/skyevault-agent}"
config_dir="${SKYEVAULT_AGENT_CONFIG_DIR:-$HOME/.config/skyevault-agent}"
env_file="${SKYEVAULT_AGENT_ENV_FILE:-$config_dir/skyevault-agent.env}"

mkdir -p "$install_dir" "$config_dir"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude ".git" \
    --exclude "node_modules" \
    "$package_dir/" "$install_dir/"
else
  rm -rf "$install_dir/bin" "$install_dir/templates"
  cp -R "$package_dir/bin" "$install_dir/bin"
  cp -R "$package_dir/templates" "$install_dir/templates"
  cp "$package_dir/package.json" "$package_dir/README.md" "$package_dir/RUNBOOK.md" "$install_dir/"
fi

if [ ! -f "$env_file" ]; then
  cp "$package_dir/templates/skyevault-agent.env.example" "$env_file"
  chmod 600 "$env_file" || true
fi

if command -v npm >/dev/null 2>&1; then
  (cd "$install_dir" && npm install --omit=dev --silent)
fi

if [ "${SKYEVAULT_AGENT_AUTO_INSTALL:-0}" = "1" ]; then
  auto_args=(
    "$install_dir/bin/skyevault-agent.mjs"
    auto-install
    "--install-dir=$install_dir"
    "--env-file=$env_file"
    "--workspace=${SKYEVAULT_WORKSPACE_ID:-customer-workspace}"
    "--repo=${SKYEVAULT_REPO_PATH:-$PWD}"
    "--vault-url=${SKYEVAULT_DROP_URL:-https://skyevault-drop.graylondonskyes.workers.dev}"
    "--interval-seconds=${SKYEVAULT_AGENT_INTERVAL_SECONDS:-600}"
    "--service=${SKYEVAULT_AGENT_SERVICE_MODE:-auto}"
  )
  if [ "${SKYEVAULT_AGENT_JSON:-0}" = "1" ]; then
    auto_args+=(--json)
  fi
  if [ "${SKYEVAULT_AGENT_RUN_FIRST_SYNC:-1}" = "0" ]; then
    auto_args+=(--no-first-sync)
  fi
  if [ "${SKYEVAULT_AGENT_UPLOAD:-1}" = "0" ]; then
    auto_args+=(--no-upload)
  else
    auto_args+=(--upload)
  fi
  if [ "${SKYEVAULT_AGENT_DRY_RUN_SERVICE:-0}" = "1" ]; then
    auto_args+=(--dry-run-service)
  fi
  node "${auto_args[@]}"
  exit $?
fi

cat <<EOF
Reape0r installed.

Runtime: $install_dir
Env file: $env_file

Next:
1. Edit $env_file with the SkyePay install-center values, or rerun with SKYEVAULT_AGENT_AUTO_INSTALL=1.
2. Run:
   set -a
   . "$env_file"
   set +a
   node "$install_dir/bin/skyevault-agent.mjs" doctor
   node "$install_dir/bin/skyevault-agent.mjs" init --workspace="\$SKYEVAULT_WORKSPACE_ID" --repo="\$SKYEVAULT_REPO_PATH" --vault-url="\$SKYEVAULT_DROP_URL"
   node "$install_dir/bin/skyevault-agent.mjs" sync --upload
   node "$install_dir/bin/skyevault-agent.mjs" watch --interval-seconds="\${SKYEVAULT_AGENT_INTERVAL_SECONDS:-600}" --upload
   node "$install_dir/bin/skyevault-agent.mjs" restore --receipt="\$HOME/.skyevault-agent/workspaces/\$SKYEVAULT_WORKSPACE_ID/current/current-receipt.json" --out=/path/to/repaired-repo

Service templates:
- $install_dir/templates/skyevault-agent.service
- $install_dir/templates/com.skyevault.reape0r.plist

Auto-install example:
SKYEVAULT_AGENT_AUTO_INSTALL=1 \\
SKYEVAULT_WORKSPACE_ID="your-workspace" \\
SKYEVAULT_REPO_PATH="/path/to/repo" \\
SKYEVAULT_DROP_URL="https://skyevault-drop.graylondonskyes.workers.dev" \\
SKYEVAULT_PORTAL_KEY="<workspace portal key>" \\
SKYEVAULT_AGENT_PASSPHRASE="<customer-owned unlock passphrase>" \\
./install.sh

Default custody model: one mutable encrypted current mirror. The installer does not create delta packs by default.
EOF
