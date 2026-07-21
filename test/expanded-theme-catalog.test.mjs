import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

const additions = [
  ['cyber-neon', '赛博霓虹', { accent: '#ff3b8d', secondary: '#24d7e8', surface: '#f7f2fb', ink: '#21162b' }],
  ['jade-immortal', '仙风翠玉', { accent: '#2f8b70', secondary: '#d6b968', surface: '#eef4ea', ink: '#1f3028' }],
  ['aurora-wasteland', '极光废土', { accent: '#4db9c6', secondary: '#f0a75e', surface: '#e9f1ee', ink: '#243038' }],
  ['mecha-alert', '机甲警戒', { accent: '#d84a32', secondary: '#f0b742', surface: '#eceae6', ink: '#211f1e' }],
  ['ink-mountains', '墨韵山河', { accent: '#425f54', secondary: '#b48b52', surface: '#f2efe5', ink: '#242823' }],
  ['sea-salt-glass', '海盐玻璃', { accent: '#2f91a8', secondary: '#e6b6a7', surface: '#edf7f7', ink: '#18343a' }],
];

test('catalog includes fifteen distinct built-in themes and six new palettes', async () => {
  const catalog = JSON.parse(await read('themes/catalog.json'));
  assert.equal(catalog.length, 15);
  assert.equal(new Set(catalog.map(item => item.id)).size, 15);
  assert.equal(new Set(catalog.map(item => item.name)).size, 15);

  for (const [id, name, colors] of additions) {
    assert.ok(catalog.some(item => item.id === id && item.name === name));
    const theme = JSON.parse(await read(`themes/${id}/theme.json`));
    assert.deepEqual(theme.colors, colors);
    assert.match(theme.image, /^hero-clean-v\d+\.(?:png|jpe?g|webp)$/);
    await access(new URL(`themes/${id}/${theme.image}`, root));
  }
});

test('new themes remain declarative and only add visual CSS overrides', async () => {
  const [css, renderer] = await Promise.all([
    read('assets/dream-skin.css'),
    read('assets/renderer-inject.js'),
  ]);

  for (const [id] of additions) {
    assert.doesNotMatch(renderer, new RegExp(id));
    const blocks = css.match(new RegExp(`[^{}]*data-wb-dream-theme="${id}"[^{}]*\\{[^{}]*\\}`, 'g')) || [];
    assert.ok(blocks.length >= 4, `expected visual coverage for ${id}`);
    const declarations = blocks.join('\n');
    for (const property of ['display', 'position', 'inset', 'top', 'right', 'bottom', 'left', 'width', 'height', 'grid-template', 'flex-direction', 'order', 'transform', 'margin', 'padding']) {
      assert.doesNotMatch(declarations, new RegExp(`(?:^|[;{]\\s*)${property}\\s*:`, 'm'), `${id} changes structure via ${property}`);
    }
  }
});

test('documentation and desktop pickers advertise fifteen themes', async () => {
  const [readme, windowsPicker, macPicker] = await Promise.all([
    read('README.md'),
    read('scripts/switch-workbuddy-theme.ps1'),
    read('scripts/switch-workbuddy-theme-macos.sh'),
  ]);
  assert.match(readme, /15 套内置视觉方案/);
  assert.match(readme, /17 个胶囊按钮/);
  assert.match(windowsPicker, /Select one of the fifteen Codex Dream Skin themes:/);
  assert.match(macPicker, /15 套/);
});
