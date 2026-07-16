import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('theme toolbar has one persisted accessible collapse toggle', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /const SWITCHER_COLLAPSED_KEY = 'workbuddy-dream-switcher-collapsed-v1'/);
  assert.match(renderer, /const readSwitcherCollapsed/);
  assert.match(renderer, /localStorage\.getItem\(SWITCHER_COLLAPSED_KEY\) === 'true'/);
  assert.match(renderer, /localStorage\.setItem\(SWITCHER_COLLAPSED_KEY, String\(value\)\)/);
  assert.match(renderer, /createSwitcherToggle/);
  assert.match(renderer, /button\.dataset\.switcherAction = 'toggle'/);
  assert.match(renderer, /button\.setAttribute\('aria-expanded', String\(!collapsed\)\)/);
  assert.match(renderer, /switcherRoot\.classList\.toggle\('is-collapsed', collapsed\)/);
  assert.match(renderer, /switcherCollapsed = !switcherCollapsed/);
});

test('collapsed toolbar becomes a small pull-down line and hides every other item', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /#workbuddy-dream-switcher-root\.is-collapsed\s*\{[^}]*width:\s*46px/s);
  assert.match(css, /\.is-collapsed \.wb-dream-switcher > :not\(\.wb-dream-switcher-toggle\)\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /\.wb-dream-switcher-toggle\s*\{[^}]*min-width:\s*28px[^}]*-webkit-app-region:\s*no-drag/s);
  assert.match(css, /\.is-collapsed \.wb-dream-switcher-toggle\s*\{[^}]*width:\s*44px[^}]*height:\s*20px/s);
  assert.match(css, /\.wb-dream-switcher-toggle__line::before/);
  assert.match(css, /\.wb-dream-switcher-toggle__line::after/);
  assert.match(css, /\.wb-dream-switcher-toggle:focus-visible/);
});

test('theme toolbar starts at the workspace edge and puts utility controls first', async () => {
  const renderer = await read('assets/renderer-inject.js');
  const css = await read('assets/dream-skin.css');
  assert.match(renderer, /\|workspace-left-v1`/);
  assert.match(renderer, /switcher\.replaceChildren\(\s*createSwitcherToggle\(\),\s*createGitHubLink\(\),\s*\.\.\.listedThemes\.map\(createThemeButton\)/s);
  assert.match(css, /#workbuddy-dream-switcher-root\s*\{[^}]*left:\s*274px;[^}]*right:\s*auto;/s);
  assert.match(css, /#workbuddy-dream-switcher-root\.is-collapsed\s*\{[^}]*left:\s*274px;[^}]*width:\s*46px/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*#workbuddy-dream-switcher-root\.is-collapsed\s*\{[^}]*left:\s*10px;[^}]*right:\s*auto;/s);
});
