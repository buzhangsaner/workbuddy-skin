import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('renderer detects project and space pages from the live main container', async () => {
  const renderer = await read('assets/renderer-inject.js');
  assert.match(renderer, /document\.querySelector\('\.main-content--projects'\)/);
  assert.match(renderer, /return 'projects'/);
});

test('project canvas, artifact panel and markdown inherit the active theme', async () => {
  const css = await read('assets/dream-skin.css');
  for (const selector of [
    '.main-content--projects',
    '.workbuddy-collab',
    '.project-detail-view',
    '.workbuddy-topbar',
    '.detail-panel',
    '.detail-header',
    '.artifact-content',
    '.project-detail-view__input-area',
    '.collab-message__bubble',
    '.artifact-slot-panel__card',
    '[class*="_assistantTextContent_"]',
  ]) assert.ok(css.includes(selector), `missing project/space selector: ${selector}`);
  assert.match(css, /\.main-content--projects[\s\S]*background:[^;]+!important/);
  assert.match(css, /\.project-detail-view[\s\S]*color:\s*var\(--wb-dream-ink\)\s*!important/);
  assert.match(css, /\.cb-markdown\s*\{[^}]*color:\s*var\(--wb-dream-ink\)\s*!important/s);
  assert.match(css, /\.cb-markdown\s+table[\s\S]*background:[^;]+!important/);
  assert.match(css, /\.cb-markdown\s+(?:th|:where\(th, td\))[\s\S]*border-color:[^;]+!important/);
  assert.match(css, /\.project-detail-view__input-area[^}]*\[class\*="_mainArea_"\][\s\S]*background:[^;]+!important/);
  assert.match(css, /\.detail-header\s*\{[^}]*background:[^;]+!important/s);
  assert.match(css, /\.collab-message__bubble\s*\{[^}]*background:[^;]+!important/s);
  assert.match(css, /\.collab-message__bubble\s+:where\(div, p, span\)\s*\{[^}]*color:\s*inherit\s*!important/s);
  assert.match(css, /\.artifact-slot-panel__card\s*\{[^}]*background:[^;]+!important/s);
});

test('black-gold project selection and content use dark readable surfaces', async () => {
  const css = await read('assets/dream-skin.css');
  assert.match(css, /data-wb-dream-theme="black-gold-stage"[^}]*\.main-content--projects[\s\S]*background:\s*#11110f\s*!important/);
  assert.match(css, /data-wb-dream-theme="black-gold-stage"[^}]*\.conversation-agent-card\[class\*="_selected_"\][\s\S]*background:[^;]+!important/);
  assert.match(css, /data-wb-dream-theme="black-gold-stage"[^}]*\.cb-markdown[\s\S]*color:\s*#f4e8c8\s*!important/);
  assert.match(css, /data-wb-dream-theme="black-gold-stage"[^}]*\.project-detail-view__input-area[\s\S]*background:[^;]+!important/);
});
