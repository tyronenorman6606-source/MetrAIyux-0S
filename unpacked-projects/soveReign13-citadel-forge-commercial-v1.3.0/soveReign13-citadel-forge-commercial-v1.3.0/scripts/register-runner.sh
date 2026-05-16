#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

TOKEN="${FORGEJO_RUNNER_REGISTRATION_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Create a runner/token in Forgejo first, then run:" >&2
  echo "FORGEJO_RUNNER_REGISTRATION_TOKEN=... ./scripts/register-runner.sh" >&2
  exit 1
fi

RUNNER_NAME="$(grep -E '^RUNNER_NAME=' .env | head -n1 | cut -d= -f2-)"
RUNNER_FORGEJO_URL="$(grep -E '^RUNNER_FORGEJO_URL=' .env | head -n1 | cut -d= -f2-)"
SECRET="$(openssl rand -hex 32)"

mkdir -p runner
cat > runner/config.yml <<EOF_CFG
log:
  level: info
runner:
  file: /data/.runner
  capacity: 2
  timeout: 3h
  insecure: false
  fetch_timeout: 5s
cache:
  enabled: true
  dir: /data/cache
container:
  network: sovereign13-citadel-forge_citadel
  privileged: false
  options: "--cpus=2 --memory=4g"
server:
  connections:
    - address: "${RUNNER_FORGEJO_URL}"
      token: "${TOKEN}"
      name: "${RUNNER_NAME}"
      labels:
        - "docker:docker://node:22-alpine"
        - "ubuntu-latest:docker://node:22-alpine"
EOF_CFG

if grep -qE '^FORGEJO_RUNNER_SECRET=' .env; then
  sed -i "s|^FORGEJO_RUNNER_SECRET=.*|FORGEJO_RUNNER_SECRET=${SECRET}|" .env
else
  printf '\nFORGEJO_RUNNER_SECRET=%s\n' "$SECRET" >> .env
fi

docker compose --profile runner up -d forgejo-runner

echo "Runner config generated and runner container started. Verify inside Forgejo Actions runners UI."
