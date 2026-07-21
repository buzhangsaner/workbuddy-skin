import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('package exposes WorkBuddy Skin Manager development and release commands', () => {
  assert.equal(pkg.main, 'manager/electron/main.cjs');
  assert.equal(pkg.scripts['manager:start'], 'electron .');
  assert.match(pkg.scripts['manager:dist:win'], /electron-builder --win/);
  assert.match(pkg.scripts['manager:dist:mac'], /electron-builder --mac/);
  assert.match(pkg.dependencies['adm-zip'], /^\^/);
  assert.match(pkg.devDependencies.electron, /^\^/);
  assert.match(pkg.devDependencies['electron-builder'], /^\^/);
});

test('electron-builder packages the manager and existing safe injector resources', () => {
  assert.equal(pkg.build.appId, 'com.workbuddy.skinmanager');
  assert.equal(pkg.build.productName, 'WorkBuddy Skin Manager');
  for (const pattern of ['manager/**/*', 'assets/**/*', 'src/**/*', 'scripts/**/*', 'themes/**/*']) {
    assert.ok(pkg.build.files.includes(pattern), `missing build file pattern ${pattern}`);
  }
  assert.deepEqual(pkg.build.win.target, ['nsis', 'portable']);
  assert.deepEqual(pkg.build.mac.target, ['dmg']);
  assert.equal(pkg.build.nsis.oneClick, false);
  assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
});
