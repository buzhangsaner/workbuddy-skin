import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('manager BrowserWindow keeps renderer privileges isolated and blocks navigation', async () => {
  const main = await read('manager/electron/main.cjs');
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.match(main, /will-navigate/);
  assert.match(main, /preventDefault\(\)/);
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /action:\s*'deny'/);
});

test('preload exposes a frozen explicit API without a generic invoke escape hatch', async () => {
  const preload = await read('manager/electron/preload.cjs');
  assert.match(preload, /contextBridge\.exposeInMainWorld\('workbuddySkinAPI'/);
  assert.match(preload, /Object\.freeze\(/);
  assert.doesNotMatch(preload, /invoke:\s*\(|invoke\(channel/);
  for (const operation of [
    'status', 'applyTheme', 'restore', 'importTheme', 'exportTheme',
    'chooseWallpaper', 'designTheme', 'deleteTheme', 'revealFile', 'openGitHub',
  ]) assert.match(preload, new RegExp(`${operation}\\s*:`), operation);
});

test('main process registers fixed channels and never accepts an arbitrary external URL', async () => {
  const main = await read('manager/electron/main.cjs');
  const service = await read('manager/core/service.cjs');
  assert.match(main, /https:\/\/github\.com\/buzhangsaner\/workbuddy-skin/);
  assert.doesNotMatch(main, /openExternal['"],\s*async\s*\([^)]*url/);
  for (const channel of [
    'manager:status', 'manager:apply', 'manager:restore', 'manager:import',
    'manager:export', 'manager:choose-wallpaper', 'manager:design',
    'manager:delete', 'manager:reveal', 'manager:github',
  ]) assert.match(main, new RegExp(`ipcMain\\.handle\\('${channel.replace(':', '\\:')}'`), channel);
  assert.match(service, /validateThemeId/);
  assert.match(service, /validateDesignPayload/);
  assert.match(service, /resolveThemeAsset/);
});

test('custom theme asset protocol resolves only service-approved files', async () => {
  const main = await read('manager/electron/main.cjs');
  assert.match(main, /theme-asset/);
  assert.match(main, /service\.resolveThemeAsset/);
  assert.match(main, /pathToFileURL/);
  assert.doesNotMatch(main, /bypassCSP:\s*true/);
});
