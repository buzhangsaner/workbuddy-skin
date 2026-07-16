import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Fiona theme uses artwork without baked application UI', async () => {
  const theme = JSON.parse(await read('themes/fiona-sit-limited/theme.json'));
  assert.equal(theme.image, 'hero-clean-v2.png');
});

test('theme explicitly covers current WorkBuddy navigation and home actions', async () => {
  const css = await read('assets/dream-skin.css');
  for (const selector of [
    '.conversation-list-tab-button',
    '.conversation-list-tab-button.active',
    '.conversation-agent-card',
    '.wb-scene-tabs__pill',
    '.wb-scene-tabs__pill--active',
    '.quick-actions__item',
    '.growth-plan-entry',
  ]) assert.ok(css.includes(selector), `missing WorkBuddy selector: ${selector}`);
  assert.match(css, /\.conversation-list-tab-button\.active[\s\S]*background:[^;]+!important/);
  assert.match(css, /\.wb-scene-tabs__pill--active[\s\S]*background:[^;]+!important/);
  assert.match(css, /\.quick-actions__item[\s\S]*background:[^;]+!important/);
});
