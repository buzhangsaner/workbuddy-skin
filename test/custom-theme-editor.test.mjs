import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('renderer defines a validated persistent custom theme without executable fields', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /const CUSTOM_ID = 'custom'/);
  assert.match(renderer, /const CUSTOM_STORAGE_KEY = 'workbuddy-dream-custom-theme-v1'/);
  assert.match(renderer, /const CUSTOMIZER_ROOT_ID = 'workbuddy-dream-customizer-root'/);
  assert.match(renderer, /sanitizeCustomTheme/);
  assert.match(renderer, /\^#\[0-9a-f\]\{6\}\$/i);
  assert.ok(renderer.includes('data:image\\/(?:png|jpeg|webp)'));
  assert.match(renderer, /localStorage\.setItem\(CUSTOM_STORAGE_KEY/);
  assert.doesNotMatch(renderer, /innerHTML\s*=\s*(?:draft|custom|theme)/);
});

test('switcher exposes an in-app editor with live fields and explicit save or cancel', async () => {
  const renderer = await read('assets/renderer-inject.js');
  for (const className of [
    'wb-dream-customizer',
    'wb-dream-customizer__title-input',
    'wb-dream-customizer__name-input',
    'wb-dream-customizer__quote-input',
    'wb-dream-customizer__color-input',
    'wb-dream-customizer__image-input',
    'wb-dream-customizer__cancel',
    'wb-dream-customizer__save',
  ]) assert.match(renderer, new RegExp(className));
  assert.match(renderer, /name: '自定义'/);
  assert.match(renderer, /applyTheme\(draft, false\)/);
  assert.match(renderer, /restoreCustomizerSelection/);
  assert.match(renderer, /writeCustomTheme\(customizerSession\.draft\)/);
  assert.match(renderer, /writeSelection\(CUSTOM_ID\)/);
  assert.match(renderer, /previous\?\.customizerSnapshot/);
  assert.match(renderer, /get customizerSnapshot\(\)/);
  assert.match(renderer, /if \(status\.textContent !== message\) status\.textContent = message/);
});

test('background images are locally downscaled and restricted before persistence', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.ok(renderer.includes('image\\/(png|jpeg|webp)'));
  assert.match(renderer, /1920/);
  assert.match(renderer, /1200/);
  assert.match(renderer, /canvas\.toDataURL\('image\/jpeg', \.88\)/);
  assert.match(renderer, /FileReader/);
  assert.match(renderer, /图片过大|图片格式/);
});

test('customizer is an interactive responsive glass drawer', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /#workbuddy-dream-customizer-root\s*\{[^}]*pointer-events:\s*auto[^}]*-webkit-app-region:\s*no-drag/s);
  assert.match(css, /\.wb-dream-customizer\s*\{[^}]*width:\s*360px[^}]*backdrop-filter:/s);
  assert.match(css, /\.wb-dream-customizer__colors\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.wb-dream-customizer\s*\{[^}]*width:\s*auto/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.wb-dream-customizer/);
});

test('cleanup removes the customizer root with the rest of the injected skin', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /document\.getElementById\(CUSTOMIZER_ROOT_ID\)\?\.remove\(\)/);
});
