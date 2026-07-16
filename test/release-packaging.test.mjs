import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
});

test('launchers prefer a bundled Node runtime and retain a system fallback', async () => {
  const [win, mac] = await Promise.all([
    read('scripts/start-workbuddy-dream-skin.ps1'),
    read('scripts/start-workbuddy-dream-skin-macos.sh'),
  ]);
  assert.match(win, /runtime\\node\.exe/);
  assert.match(win, /\$Node = if \(Test-Path -LiteralPath \$BundledNode\)/);
  assert.match(win, /& \$Node @ApplyArgs/);
  assert.match(win, /Start-Process -FilePath \$Node/);
  assert.match(mac, /NODE_BIN="\$ROOT\/runtime\/node"/);
  assert.match(mac, /command -v node/);
  assert.match(mac, /"\$NODE_BIN" "\$\{APPLY_ARGS\[@\]\}"/);
  assert.match(mac, /nohup "\$NODE_BIN"/);
});

test('Windows packaging creates a per-user self-contained one-click installer', async () => {
  const iss = await read('packaging/windows/workbuddy-dream-skin.iss');
  assert.match(iss, /AppName=WorkBuddy Dream Skin/);
  assert.match(iss, /PrivilegesRequired=lowest/);
  assert.match(iss, /DefaultDirName=\{localappdata\}\\WorkBuddyDreamSkin\\app/);
  assert.match(iss, /OutputBaseFilename=WorkBuddy-Dream-Skin-Setup/);
  assert.match(iss, /runtime\\node\.exe/);
  assert.match(iss, /start-workbuddy-dream-skin\.ps1/);
  assert.match(iss, /\[UninstallRun\][\s\S]*restore-workbuddy-dream-skin\.ps1/);
});

test('macOS packaging creates an app installer inside a DMG', async () => {
  const [build, install, plist] = await Promise.all([
    read('packaging/macos/build-dmg.sh'),
    read('packaging/macos/install.sh'),
    read('packaging/macos/Info.plist'),
  ]);
  assert.match(build, /WorkBuddy Dream Skin Installer\.app/);
  assert.match(build, /runtime\/node/);
  assert.match(build, /hdiutil create/);
  assert.match(build, /codesign --force --deep --sign -/);
  assert.match(install, /Library\/Application Support\/WorkBuddyDreamSkin\/app/);
  assert.match(install, /ditto/);
  assert.match(install, /start-workbuddy-dream-skin-macos\.sh/);
  assert.match(plist, /CFBundleExecutable/);
  assert.match(plist, /com\.buzhangsaner\.workbuddy-dream-skin\.installer/);
});

test('GitHub Actions builds both native packages and publishes version tags', async () => {
  const workflow = await read('.github/workflows/release.yml');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /tags:[\s\S]*'v\*'/);
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /windows-latest/);
  assert.match(workflow, /macos-latest/);
  assert.match(workflow, /ISCC\.exe/);
  assert.match(workflow, /packaging\/macos\/build-dmg\.sh/);
  assert.match(workflow, /LICENSE\.node\.txt/);
  assert.match(workflow, /upload-artifact@v4/);
  assert.match(workflow, /gh release create/);
});
