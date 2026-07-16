#!/bin/bash
set -euo pipefail

RESOURCE_APP="$(cd "$(dirname "$0")/../Resources/app" && pwd)"
INSTALL_ROOT="$HOME/Library/Application Support/WorkBuddyDreamSkin/app"

install_skin() {
  mkdir -p "$INSTALL_ROOT"
  ditto "$RESOURCE_APP" "$INSTALL_ROOT"
  chmod +x "$INSTALL_ROOT/scripts/"*.sh "$INSTALL_ROOT/runtime/node"

  cat > "$HOME/Desktop/WorkBuddy Dream Skin.command" <<EOF
#!/bin/bash
exec "$INSTALL_ROOT/scripts/start-workbuddy-dream-skin-macos.sh"
EOF
  cat > "$HOME/Desktop/Restore WorkBuddy.command" <<EOF
#!/bin/bash
exec "$INSTALL_ROOT/scripts/restore-workbuddy-dream-skin-macos.sh"
EOF
  cat > "$HOME/Desktop/Dream Skin Editor.command" <<EOF
#!/bin/bash
open "$INSTALL_ROOT/editor/workbuddy-dream-skin-editor.html"
EOF
  chmod +x "$HOME/Desktop/WorkBuddy Dream Skin.command" "$HOME/Desktop/Restore WorkBuddy.command" "$HOME/Desktop/Dream Skin Editor.command"
  "$INSTALL_ROOT/scripts/start-workbuddy-dream-skin-macos.sh"
}

if output="$(install_skin 2>&1)"; then
  osascript -e 'display dialog "WorkBuddy Dream Skin 已安装并启动。\n左侧菜单右边可切换、收起或自定义主题。" buttons {"完成"} default button "完成" with title "安装完成"'
else
  escaped="${output//\"/\\\"}"
  osascript -e "display dialog \"安装失败：\\n$escaped\" buttons {\"关闭\"} default button \"关闭\" with icon stop with title \"WorkBuddy Dream Skin\""
  exit 1
fi
