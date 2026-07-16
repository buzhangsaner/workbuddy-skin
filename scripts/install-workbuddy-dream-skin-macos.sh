#!/bin/bash
set -euo pipefail
SOURCE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_ROOT="$HOME/Library/Application Support/WorkBuddyDreamSkin/app"
mkdir -p "$INSTALL_ROOT"
for folder in assets src scripts themes editor; do mkdir -p "$INSTALL_ROOT/$folder"; cp -R "$SOURCE_ROOT/$folder/." "$INSTALL_ROOT/$folder/"; done
if [[ -d "$SOURCE_ROOT/runtime" ]]; then mkdir -p "$INSTALL_ROOT/runtime"; cp -R "$SOURCE_ROOT/runtime/." "$INSTALL_ROOT/runtime/"; fi
cp "$SOURCE_ROOT/package.json" "$SOURCE_ROOT/README.md" "$INSTALL_ROOT/"
chmod +x "$INSTALL_ROOT/scripts/"*.sh
[[ ! -f "$INSTALL_ROOT/runtime/node" ]] || chmod +x "$INSTALL_ROOT/runtime/node"
cat > "$HOME/Desktop/WorkBuddy Dream Skin.command" <<EOF
#!/bin/bash
exec "$INSTALL_ROOT/scripts/start-workbuddy-dream-skin-macos.sh"
EOF
cat > "$HOME/Desktop/Restore WorkBuddy.command" <<EOF
#!/bin/bash
exec "$INSTALL_ROOT/scripts/restore-workbuddy-dream-skin-macos.sh"
EOF
cat > "$HOME/Desktop/Choose WorkBuddy Theme.command" <<EOF
#!/bin/bash
exec "$INSTALL_ROOT/scripts/switch-workbuddy-theme-macos.sh"
EOF
cat > "$HOME/Desktop/Dream Skin Editor.command" <<EOF
#!/bin/bash
open "$INSTALL_ROOT/editor/workbuddy-dream-skin-editor.html"
EOF
chmod +x "$HOME/Desktop/WorkBuddy Dream Skin.command" "$HOME/Desktop/Choose WorkBuddy Theme.command" "$HOME/Desktop/Restore WorkBuddy.command" "$HOME/Desktop/Dream Skin Editor.command"
echo "Installed at $INSTALL_ROOT"
