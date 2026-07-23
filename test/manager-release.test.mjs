import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('0.6.2 release metadata and manager artifact names stay aligned', async () => {
  const [pkgSource, lockSource, renderer, iss, plist] = await Promise.all([
    read('package.json'), read('package-lock.json'), read('assets/renderer-inject.js'),
    read('packaging/windows/workbuddy-dream-skin.iss'), read('packaging/macos/Info.plist'),
  ]);
  const pkg = JSON.parse(pkgSource);
  const lock = JSON.parse(lockSource);
  assert.equal(pkg.version, '0.6.2');
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
  assert.match(renderer, /VERSION = '0\.6\.2'/);
  assert.match(iss, /#define AppVersion "0\.6\.2"/);
  assert.match(plist, /<string>0\.6\.2<\/string>/);
  assert.match(pkg.build.nsis.artifactName, /Setup/);
  assert.match(pkg.build.portable.artifactName, /Portable/);
  assert.match(pkg.build.mac.artifactName, /WorkBuddy-Skin-Manager/);
  assert.match(pkg.scripts['manager:dist:mac'], /--x64/);
  assert.match(pkg.scripts['manager:dist:mac'], /--arm64/);
});

test('GitHub release builds the Electron manager on Windows and macOS', async () => {
  const workflow = await read('.github/workflows/release.yml');
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run manager:dist:win/);
  assert.match(workflow, /npm run manager:dist:mac/);
  assert.match(workflow, /dist-manager\/\*\.exe/);
  assert.match(workflow, /dist-manager\/\*\.dmg/);
  assert.match(workflow, /gh release create/);
  assert.match(workflow, /find dist -type f -print0/);
});

test('README leads non-technical users to the manager EXE and DMG', async () => {
  const readme = await read('README.md');
  assert.match(readme, /WorkBuddy-Skin-Manager-Portable-0\.6\.2-x64\.exe/);
  assert.match(readme, /WorkBuddy-Skin-Manager-0\.6\.2-x64\.dmg/);
  assert.match(readme, /WorkBuddy-Skin-Manager-0\.6\.2-arm64\.dmg/);
  assert.match(readme, /双击/);
  assert.match(readme, /无需命令行/);
  assert.match(readme, /\.wbskin/);
});
