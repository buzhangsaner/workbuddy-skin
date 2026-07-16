#!/bin/bash
set -euo pipefail
PORT="${PORT:-9336}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INJECTOR="$ROOT/scripts/injector.mjs"
pkill -f "node $INJECTOR" >/dev/null 2>&1 || true
sleep .3
node "$INJECTOR" --port "$PORT" --remove --once || true
echo "Dream Skin stopped and removed."
