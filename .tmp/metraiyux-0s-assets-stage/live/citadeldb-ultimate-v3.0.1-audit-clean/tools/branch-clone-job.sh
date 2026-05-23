#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Worker-friendly wrapper around branch-clone-worker.sh.
# Requires SOURCE_DATABASE_URL and TARGET_DATABASE_URL in job runner env.
./tools/branch-clone-worker.sh
