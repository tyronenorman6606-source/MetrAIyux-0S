#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/live-stack-e2e.mjs
