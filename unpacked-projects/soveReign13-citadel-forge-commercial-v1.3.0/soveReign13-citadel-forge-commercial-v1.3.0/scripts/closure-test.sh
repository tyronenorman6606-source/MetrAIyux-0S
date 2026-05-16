#!/usr/bin/env bash
set -euo pipefail

./scripts/package-test.sh

if command -v docker >/dev/null 2>&1; then
  docker compose config >/tmp/s13-compose-rendered.yml
  echo "Docker Compose config rendered. Live container boot still requires ./scripts/deploy.sh."
else
  echo "Docker not found; container boot skipped. Package-level closure still passed."
fi

python3 - <<'PY'
from pathlib import Path
required = [
  'docs/CLOSURE_LEDGER_V1_3.md',
  'docs/GATE_INTEGRATION_CONTRACT.md',
  'docs/LIVE_ACCEPTANCE_GATES.md',
  'control-plane/public/command-center.html',
]
missing = [p for p in required if not Path(p).exists()]
if missing:
    raise SystemExit(f'Missing closure files: {missing}')
print('Closure file inventory OK')
PY

echo "Closure test complete."
