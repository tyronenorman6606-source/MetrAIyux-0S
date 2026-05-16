#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/gateway-worker-job-parity-proof.mjs
