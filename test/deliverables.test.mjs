import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('injector and lifecycle scripts keep WorkBuddy reversible', async () => {
  const [injector, start, restore] = await Promise.all([
    read('scripts/injector.mjs'),
    read('scripts/start-workbuddy-dream-skin.ps1'),
    read('scripts/restore-workbuddy-dream-skin.ps1'),
  ]);
  assert.match(injector, /127\.0\.0\.1/);
  assert.match(injector, /Runtime\.evaluate/);
  assert.match(injector, /Page\.captureScreenshot[\s\S]*30000/);
  assert.match(start, /WORKBUDDY_REMOTE_DEBUGGING_PORT/);
  assert.match(start, /remote-debugging-address=127\.0\.0\.1/);
  assert.match(start, /& \$Node @ApplyArgs/);
  assert.match(start, /if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(restore, /--remove/);
  assert.doesNotMatch(start + restore, /app\.asar[^\n]*(?:write|replace|patch)/i);
});

test('installer creates a self-contained local application copy', async () => {
  const [install, macInstall, macStart, macRestore] = await Promise.all([
    read('scripts/install-workbuddy-dream-skin.ps1'),
    read('scripts/install-workbuddy-dream-skin-macos.sh'),
    read('scripts/start-workbuddy-dream-skin-macos.sh'),
    read('scripts/restore-workbuddy-dream-skin-macos.sh'),
  ]);
  assert.match(install, /WorkBuddyDreamSkin/);
  for (const folder of ['assets', 'src', 'scripts', 'themes', 'editor']) {
    assert.match(install, new RegExp(`['"]${folder}['"]`));
  }
  assert.match(install, /Copy-Item/);
  assert.match(install, /LocalAppData/i);
  assert.match(install, /Shortcut\.WorkingDirectory\s*=\s*\$InstallRoot/);
  assert.match(macInstall, /Library\/Application Support\/WorkBuddyDreamSkin/);
  assert.match(macStart, /\/Applications\/WorkBuddy\.app\/Contents\/MacOS\/WorkBuddy/);
  assert.match(macStart, /remote-debugging-address=127\.0\.0\.1/);
  assert.match(macStart, /--theme-dir \"\$THEME_DIR\" --once/);
  assert.match(macRestore, /--remove/);
});

test('single-file editor supports live preview and safe import/export', async () => {
  const html = await read('editor/workbuddy-dream-skin-editor.html');
  assert.match(html, /id="preview"/);
  assert.match(html, /type="color"/);
  assert.match(html, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(html, /Export Theme/);
  assert.match(html, /Import Theme/);
  assert.match(html, /schemaVersion:\s*1/);
  assert.doesNotMatch(html, /eval\s*\(|new Function/);
});

test('decorative overlays never capture pointer input', async () => {
  const [css, renderer, start] = await Promise.all([
    read('assets/dream-skin.css'),
    read('assets/renderer-inject.js'),
    read('scripts/start-workbuddy-dream-skin.ps1'),
  ]);
  assert.match(css, /#workbuddy-dream-chrome[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /fiona-sit-limited/);
  assert.match(renderer, /wbDreamTheme/);
  assert.match(start, /ThemeId/);
});
