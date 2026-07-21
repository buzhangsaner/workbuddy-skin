#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHOICE="$(osascript <<'APPLESCRIPT'
choose from list {"粉系定制", "财神打工", "红白科幻", "清透定制", "灵感小宇宙", "紫夜限定", "初音未来", "舞台黑金", "人民智造", "赛博霓虹", "仙风翠玉", "极光废土", "机甲警戒", "墨韵山河", "海盐玻璃"} with title "WorkBuddy Dream Skin" with prompt "从 15 套主题中选择" default items {"粉系定制"}
APPLESCRIPT
)"
case "$CHOICE" in
  "粉系定制") ID="pink-custom" ;;
  "财神打工") ID="fortune-worker" ;;
  "红白科幻") ID="red-white-sci-fi" ;;
  "清透定制") ID="sage-clear" ;;
  "灵感小宇宙") ID="inspiration-universe" ;;
  "紫夜限定") ID="purple-night" ;;
  "初音未来") ID="miku-future" ;;
  "舞台黑金") ID="black-gold-stage" ;;
  "人民智造") ID="people-intelligence" ;;
  "赛博霓虹") ID="cyber-neon" ;;
  "仙风翠玉") ID="jade-immortal" ;;
  "极光废土") ID="aurora-wasteland" ;;
  "机甲警戒") ID="mecha-alert" ;;
  "墨韵山河") ID="ink-mountains" ;;
  "海盐玻璃") ID="sea-salt-glass" ;;
  *) exit 0 ;;
esac
THEME_ID="$ID" exec "$ROOT/scripts/start-workbuddy-dream-skin-macos.sh"
