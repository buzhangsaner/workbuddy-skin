import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { validateTheme } from '../src/theme.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const expected = [
  'pink-custom', 'fortune-worker', 'red-white-sci-fi', 'sage-clear',
  'inspiration-universe', 'purple-night', 'miku-future', 'black-gold-stage',
];

test('catalog exposes all eight upstream-inspired skin sets', async () => {
  const catalog = JSON.parse(await read('themes/catalog.json'));
  assert.deepEqual(catalog.map(item => item.id), expected);
  assert.equal(new Set(catalog.map(item => item.name)).size, 8);
});

test('every catalog theme is valid and references a clean local hero', async () => {
  const catalog = JSON.parse(await read('themes/catalog.json'));
  for (const item of catalog) {
    const theme = validateTheme(JSON.parse(await read(`themes/${item.id}/theme.json`)));
    assert.equal(theme.id, item.id);
    assert.match(theme.image, /^hero-clean-v\d+\.(png|jpg|jpeg|webp)$/);
    await access(new URL(`themes/${item.id}/${theme.image}`, root));
  }
});

test('Windows and macOS have interactive theme switching entrypoints', async () => {
  const [win, mac, install] = await Promise.all([
    read('scripts/switch-workbuddy-theme.ps1'),
    read('scripts/switch-workbuddy-theme-macos.sh'),
    read('scripts/install-workbuddy-dream-skin.ps1'),
  ]);
  assert.match(win, /themes\\catalog\.json/);
  assert.match(win, /System\.Windows\.Forms/);
  assert.match(win, /foreach \(\$Entry in \$ParsedCatalog\)/);
  assert.match(mac, /choose from list/);
  assert.match(install, /Choose WorkBuddy Theme\.lnk/);
});

test('renderer refreshes existing hero content during hot theme switch', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /art\.src !== theme\.imageUrl/);
  assert.match(renderer, /name\.textContent = theme\.name/);
});

test('black-gold theme covers WorkBuddy outer grid, main canvas and sidebar list', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /black-gold-stage[^}]*\.teams-container/s);
  assert.match(css, /black-gold-stage[^}]*\.conversation-list/s);
  assert.match(css, /black-gold-stage[^}]*_gridViewItem_/s);
});
