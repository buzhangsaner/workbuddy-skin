import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('renderer creates an accessible live theme switcher with custom and native options', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /workbuddy-dream-skin-selection-v1/);
  assert.match(renderer, /wb-dream-switcher/);
  assert.match(renderer, /wb-dream-theme-chip/);
  assert.match(renderer, /aria-pressed/);
  assert.match(renderer, /恢复原主题/);
  assert.match(renderer, /localStorage\.setItem/);
  assert.match(renderer, /applyNative/);
});

test('switcher is interactive, responsive and has visible keyboard focus', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /#workbuddy-dream-switcher-root\s*{[^}]*position:\s*fixed[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.wb-dream-switcher\s*{[^}]*display:\s*flex[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.wb-dream-theme-chip\[aria-pressed="true"\]/);
  assert.match(css, /\.wb-dream-theme-chip:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*#workbuddy-dream-switcher-root/);
});

test('background injectors respect the selection made inside WorkBuddy', async () => {
  const [win, mac, injector] = await Promise.all([
    read('scripts/start-workbuddy-dream-skin.ps1'),
    read('scripts/start-workbuddy-dream-skin-macos.sh'),
    read('scripts/injector.mjs'),
  ]);
  assert.match(win, /--respect-selection/);
  assert.match(mac, /--respect-selection/);
  assert.match(injector, /respectSelection/);
});

test('default launch keeps the in-app choice while explicit desktop selection overrides it', async () => {
  const [win, mac] = await Promise.all([
    read('scripts/start-workbuddy-dream-skin.ps1'),
    read('scripts/start-workbuddy-dream-skin-macos.sh'),
  ]);
  assert.match(win, /PSBoundParameters\.ContainsKey\('ThemeId'\)/);
  assert.match(win, /if \(-not \$ForceTheme\)[^{]*\{[^}]*--respect-selection/s);
  assert.match(mac, /\$\{THEME_ID\+x\}/);
  assert.match(mac, /APPLY_ARGS/);
});

test('hot reinjection can cancel the previous live scheduled refresh', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /get scheduled\(\) \{ return scheduled; \}/);
  assert.match(renderer, /if \(previous\?\.scheduled\) clearTimeout\(previous\.scheduled\)/);
});

test('switcher uses its own interactive no-drag root outside decorative chrome', async () => {
  const [renderer, css] = await Promise.all([
    read('assets/renderer-inject.js'),
    read('assets/dream-skin.css'),
  ]);
  assert.match(renderer, /SWITCHER_ROOT_ID = 'workbuddy-dream-switcher-root'/);
  assert.match(renderer, /document\.body\.appendChild\(switcherRoot\)/);
  assert.match(renderer, /document\.getElementById\(SWITCHER_ROOT_ID\)\?\.remove\(\)/);
  assert.doesNotMatch(renderer, /chrome\.append\(switcher\)/);
  assert.match(css, /#workbuddy-dream-switcher-root\s*{[^}]*pointer-events:\s*auto[^}]*-webkit-app-region:\s*no-drag/s);
  assert.match(css, /\.wb-dream-theme-chip\s*{[^}]*-webkit-app-region:\s*no-drag/s);
});
