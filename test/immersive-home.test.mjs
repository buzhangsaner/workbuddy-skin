import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('renderer creates and hot-updates a safe immersive theme story', async () => {
  const renderer = await read('assets/renderer-inject.js');
  for (const className of [
    'wb-dream-immersive',
    'wb-dream-immersive__eyebrow',
    'wb-dream-immersive__title',
    'wb-dream-immersive__description',
    'wb-dream-immersive__status',
  ]) assert.match(renderer, new RegExp(className));
  assert.match(renderer, /theme\.quote.*WORKBUDDY LAB/);
  assert.match(renderer, /immersiveTitle\.textContent = theme\.tagline/);
  assert.match(renderer, /immersiveStatus\.textContent = `\$\{theme\.name\}/);
  assert.doesNotMatch(renderer, /innerHTML\s*=\s*theme/);
});

test('hot upgrade backfills immersive story into an existing chrome root', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /if \(!chrome\.querySelector\('\.wb-dream-immersive'\)\)/);
  assert.match(renderer, /chrome\.append\(createImmersiveStory\(\)\)/);
});

test('chat hero becomes a full-height background stage behind native content', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /Original-style immersive home/);
  assert.match(css, /#workbuddy-dream-chrome\s*{[^}]*z-index:\s*0/s);
  assert.match(css, /data-wb-dream-route="chat"[^}]*#root[^}]*background:\s*transparent\s*!important/s);
  assert.match(css, /data-wb-dream-route="chat"[^}]*\.wb-dream-hero[^}]*height:\s*calc\(100vh - 30px\)[^}]*mask-image:\s*none/s);
  assert.match(css, /\.wb-dream-hero::after/);
});

test('native welcome controls are rearranged into title, card and composer bands', async () => {
  const css = await read('assets/dream-skin.css');
  for (const selector of [
    '.wb-home-page',
    '.wb-home-header',
    '.wb-scene-tabs',
    '.wb-home-composer',
    '.wb-home-composer__chips',
    '.quick-actions__list',
    '.quick-actions__item',
    '.wb-home-composer__input-slot',
  ]) assert.ok(css.includes(selector), `missing immersive layout selector: ${selector}`);
  assert.match(css, /\.quick-actions__list[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.quick-actions__item:nth-child\(1\)::after/);
  assert.match(css, /\.quick-actions__item:nth-child\(4\)::after/);
  assert.match(css, /data-wb-dream-route="chat"[^}]*\.wb-home-page\s*\{[^}]*left:\s*0\s*!important/s);
  assert.match(css, /data-wb-dream-route="chat"[^}]*\.wb-scene-tabs\s*\{[^}]*display:\s*none\s*!important/s);
});

test('sidebar and active conversation surfaces keep the selected theme', async () => {
  const css = await read('assets/dream-skin.css');
  for (const selector of [
    '.conversation-list',
    '.conversation-section-label',
    '.conversation-item',
    '.main-content--chat',
    '[class*="_chatMessageContainer_"]',
    '[class*="_input-area-container_"]',
  ]) assert.ok(css.includes(selector), `missing themed live-chat selector: ${selector}`);
  assert.match(css, /main-content--chat[^}]*background:[^;]*!important/s);
  assert.match(css, /main-content--chat[^}]*_mainArea_[^}]*background:[^;]*!important/s);
});

test('immersive layout has dark-glass and compact responsive fallbacks', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /black-gold-stage"\]\[data-wb-dream-route="chat"\][^}]*\.quick-actions__item/s);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*\.wb-dream-immersive/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.wb-dream-immersive[^}]*display:\s*none/s);
});
