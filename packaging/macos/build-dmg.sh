#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT="${1:-$ROOT/dist/WorkBuddy-Dream-Skin.dmg}"
STAGE="$(mktemp -d)"
APP="$STAGE/WorkBuddy Dream Skin Installer.app"
CONTENTS="$APP/Contents"

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

[[ -x "$ROOT/runtime/node" ]] || { echo "runtime/node is missing or not executable" >&2; exit 1; }
[[ -f "$ROOT/runtime/LICENSE.node.txt" ]] || { echo "Node.js license is missing" >&2; exit 1; }

mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources/app" "$(dirname "$OUTPUT")"
cp "$ROOT/packaging/macos/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT/packaging/macos/install.sh" "$CONTENTS/MacOS/install"
chmod +x "$CONTENTS/MacOS/install"

for folder in assets src scripts themes editor runtime; do
  ditto "$ROOT/$folder" "$CONTENTS/Resources/app/$folder"
done
cp "$ROOT/package.json" "$ROOT/README.md" "$CONTENTS/Resources/app/"
chmod +x "$CONTENTS/Resources/app/scripts/"*.sh "$CONTENTS/Resources/app/runtime/node"

codesign --force --deep --sign - "$APP"
hdiutil create -volname "WorkBuddy Dream Skin" -srcfolder "$STAGE" -ov -format UDZO "$OUTPUT"
echo "$OUTPUT"
