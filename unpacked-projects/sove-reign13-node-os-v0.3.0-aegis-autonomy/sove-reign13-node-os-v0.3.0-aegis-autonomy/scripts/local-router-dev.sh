#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export ORYNTH_ROUTER_HOST="${ORYNTH_ROUTER_HOST:-127.0.0.1}"
export ORYNTH_ROUTER_PORT="${ORYNTH_ROUTER_PORT:-13131}"
export ORYNTH_SYSTEM_PROMPT_PATH="${ORYNTH_SYSTEM_PROMPT_PATH:-$PWD/prompts/orynth/ORYNTH_7_6_SYSTEM.md}"
python3 tools/orynth-router/router.py
