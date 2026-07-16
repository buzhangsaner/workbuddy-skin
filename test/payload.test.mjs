import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRendererExpression } from '../src/payload.mjs';

test('builds a self-contained renderer expression without raw closing script tags', () => {
  const expression = buildRendererExpression({
    css: 'body::after{content:"</script>"}',
    integrationSource: '((css, theme, image) => ({ css, theme, image }))(__CSS__, __THEME__, __IMAGE__)',
    theme: { name: 'Fiona' },
    imageDataUrl: 'data:image/png;base64,AA==',
  });
  assert.doesNotMatch(expression, /__CSS__|__THEME__|__IMAGE__/);
  assert.match(expression, /\\u003c\/script\\u003e/);
  assert.doesNotThrow(() => new Function(`return ${expression}`));
});

test('serializes a safe theme catalog and selection mode into the renderer payload', () => {
  const themes = [
    { id: 'pink-custom', name: '粉系定制', colors: { accent: '#d65c7a' }, imageUrl: 'file:///safe/pink.png' },
    { id: 'black-gold-stage', name: '舞台黑金', colors: { accent: '#d1aa62' }, imageUrl: 'file:///safe/black.png' },
  ];
  const expression = buildRendererExpression({
    css: '.switcher{display:flex}',
    integrationSource: '((css, themes, requested, force) => ({css, themes, requested, force}))(__CSS__, __THEMES__, __REQUESTED_THEME_ID__, __FORCE_SELECTION__)',
    themes,
    requestedThemeId: 'pink-custom',
    forceSelection: false,
  });
  assert.doesNotMatch(expression, /__THEMES__|__REQUESTED_THEME_ID__|__FORCE_SELECTION__/);
  assert.match(expression, /file:\/\/\/safe\/pink\.png/);
  assert.match(expression, /pink-custom/);
  assert.match(expression, /false/);
  assert.doesNotThrow(() => new Function(`return ${expression}`));
});
