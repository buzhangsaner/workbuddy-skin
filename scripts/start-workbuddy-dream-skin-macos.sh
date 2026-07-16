#!/bin/bash
set -euo pipefail
PORT="${PORT:-9336}"
if [[ -n "${THEME_ID+x}" ]]; then FORCE_THEME=1; else FORCE_THEME=0; fi
THEME_ID="${THEME_ID:-pink-custom}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXE="/Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy"
if [[ ! -x "$EXE" ]]; then echo "WorkBuddy.app was not found in /Applications." >&2; exit 1; fi
NODE_BIN="$ROOT/runtime/node"
if [[ ! -x "$NODE_BIN" ]]; then NODE_BIN="$(command -v node || true)"; fi
if [[ -z "$NODE_BIN" ]] || [[ "$("$NODE_BIN" -p 'Number(process.versions.node.split(`.`)[0])')" -lt 22 ]]; then echo "Node.js 22 or newer is required." >&2; exit 1; fi
if ! curl --noproxy '*' -fsS --max-time 2 "http://127.0.0.1:$PORT/json/list" >/dev/null 2>&1; then
  osascript -e 'tell application "WorkBuddy" to quit' >/dev/null 2>&1 || true
  for _ in {1..20}; do pgrep -x WorkBuddy >/dev/null || break; sleep .25; done
  WORKBUDDY_REMOTE_DEBUGGING_PORT="$PORT" "$EXE" --remote-debugging-address=127.0.0.1 >/dev/null 2>&1 &
  for _ in {1..40}; do curl --noproxy '*' -fsS --max-time 1 "http://127.0.0.1:$PORT/json/list" >/dev/null 2>&1 && break; sleep .25; done
fi
THEME_DIR="$ROOT/themes/$THEME_ID"
[[ -f "$THEME_DIR/theme.json" ]] || { echo "Theme not found: $THEME_ID" >&2; exit 1; }
pkill -f "node $ROOT/scripts/injector.mjs" >/dev/null 2>&1 || true
APPLY_ARGS=("$ROOT/scripts/injector.mjs" --port "$PORT" --theme-dir "$THEME_DIR" --once)
if [[ "$FORCE_THEME" -eq 0 ]]; then APPLY_ARGS+=(--respect-selection); fi
"$NODE_BIN" "${APPLY_ARGS[@]}"
nohup "$NODE_BIN" "$ROOT/scripts/injector.mjs" --port "$PORT" --theme-dir "$THEME_DIR" --respect-selection >/tmp/workbuddy-dream-skin.log 2>&1 &
echo "WorkBuddy Dream Skin started ($THEME_ID)."
