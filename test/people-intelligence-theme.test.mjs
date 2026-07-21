import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readOptional = path => read(path).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));

test('people-intelligence is a declarative red-gold paper theme', async () => {
  const [catalogSource, themeSource] = await Promise.all([
    read('themes/catalog.json'),
    readOptional('themes/people-intelligence/theme.json'),
  ]);
  const catalog = JSON.parse(catalogSource);
  assert.ok(themeSource, 'missing people-intelligence theme.json');
  const theme = JSON.parse(themeSource);
  assert.ok(catalog.some(item => item.id === 'people-intelligence' && item.name === '人民智造'));
  assert.deepEqual(theme.colors, {
    accent: '#b51f1a',
    secondary: '#d6a23a',
    surface: '#fbf5e9',
    ink: '#2b2018',
  });
  assert.match(theme.image, /^hero-clean-v\d+\.(?:png|jpe?g|webp)$/);
});

test('people-intelligence changes visuals without theme-specific structure code', async () => {
  const [css, renderer] = await Promise.all([
    read('assets/dream-skin.css'),
    read('assets/renderer-inject.js'),
  ]);
  assert.doesNotMatch(renderer, /people-intelligence/);
  const blocks = css.match(/[^{}]*data-wb-dream-theme="people-intelligence"[^{}]*\{[^{}]*\}/g) || [];
  assert.ok(blocks.length >= 8, 'expected visual-only theme blocks');
  const declarations = blocks.join('\n');
  for (const property of [
    'display', 'position', 'inset', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'grid-template', 'flex-direction', 'order',
    'transform', 'margin', 'padding',
  ]) {
    assert.doesNotMatch(declarations, new RegExp(`(?:^|[;{]\\s*)${property}\\s*:`, 'm'));
  }
  for (const selector of [
    '.conversation-sidebar', '.main-content--welcome', '.quick-actions__item',
    '.wb-home-composer__input-slot', '.main-content--projects',
    '.main-content--projects .landing', '.project-grid__card',
    '.landing-template-card', '.cb-markdown',
  ]) assert.ok(declarations.includes(selector), `missing visual coverage for ${selector}`);
});

test('documentation and desktop picker include all built-in themes', async () => {
  const [readme, picker] = await Promise.all([
    read('README.md'),
    read('scripts/switch-workbuddy-theme.ps1'),
  ]);
  assert.match(readme, /15 套内置视觉方案/);
  assert.match(readme, /\| 人民智造 \| 宣纸、朱红、鎏金山河 \|/);
  assert.match(readme, /17 个胶囊按钮/);
  assert.match(picker, /Select one of the fifteen Codex Dream Skin themes:/);
});
